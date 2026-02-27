import { prisma } from '@/lib/prisma';
import { getGeminiModel } from '@/lib/gemini/client';
import { REVIEW_PROMPTS } from '@/lib/gemini/prompts';

export async function reviewDocument(documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { user: true, vehicle: true },
  });

  if (!document) throw new Error('Document not found');

  const review = await prisma.documentReview.create({
    data: {
      documentId,
      status: 'PROCESSING',
    },
  });

  try {
    const model = getGeminiModel();
    const prompt = REVIEW_PROMPTS[document.type];

    if (!prompt) throw new Error(`No prompt for document type: ${document.type}`);

    // Fetch the document image
    const response = await fetch(document.fileUrl);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = document.fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64,
          mimeType,
        },
      },
    ]);

    const text = result.response.text();
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse Gemini response');

    const reviewResult = JSON.parse(jsonMatch[0]);

    // Update the review
    await prisma.documentReview.update({
      where: { id: review.id },
      data: {
        status: 'COMPLETED',
        result: reviewResult,
        confidenceScore: reviewResult.confidence || 0,
        completedAt: new Date(),
      },
    });

    // Update document status based on review
    const newStatus = reviewResult.recommendation === 'APPROVE' ? 'APPROVED' : 'FLAGGED';
    const expiryDate = reviewResult.extractedFields?.expiryDate
      ? new Date(reviewResult.extractedFields.expiryDate)
      : null;

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: newStatus,
        extractedData: reviewResult.extractedFields || {},
        ...(expiryDate && !isNaN(expiryDate.getTime()) ? { expiryDate } : {}),
      },
    });

    // Check if all user documents are approved — activate listing/user
    await checkAndActivateUser(document.userId, document.vehicleId);

    // Update queue entry
    await prisma.documentReviewQueue.updateMany({
      where: { documentId, status: { in: ['PENDING', 'PROCESSING'] } },
      data: { status: 'COMPLETED' },
    });

    return { success: true, result: reviewResult };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.documentReview.update({
      where: { id: review.id },
      data: { status: 'FAILED', errorMessage },
    });

    // Update queue for retry
    await prisma.documentReviewQueue.updateMany({
      where: { documentId, status: { in: ['PENDING', 'PROCESSING'] } },
      data: {
        status: 'FAILED',
        errorMessage,
        retryCount: { increment: 1 },
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min backoff
      },
    });

    return { success: false, error: errorMessage };
  }
}

async function checkAndActivateUser(userId: string, vehicleId: string | null) {
  // Check personal docs (SA_ID, DRIVERS_LICENSE)
  const personalDocs = await prisma.document.findMany({
    where: { userId, type: { in: ['SA_ID', 'DRIVERS_LICENSE'] }, vehicleId: null },
  });
  const allPersonalApproved = personalDocs.length >= 2 &&
    personalDocs.every((d) => d.status === 'APPROVED');

  if (allPersonalApproved) {
    // Activate user
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'VERIFIED' },
    });
  }

  // Check vehicle docs
  if (vehicleId) {
    const vehicleDocs = await prisma.document.findMany({
      where: { vehicleId, type: 'VEHICLE_REGISTRATION' },
    });
    const vehicleDocsApproved = vehicleDocs.length > 0 &&
      vehicleDocs.every((d) => d.status === 'APPROVED');

    if (allPersonalApproved && vehicleDocsApproved) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { status: 'ACTIVE' },
      });
    }
  }
}
