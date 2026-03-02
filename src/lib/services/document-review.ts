import { prisma } from '@/lib/prisma';
import { getGeminiModel } from '@/lib/gemini/client';
import { REVIEW_PROMPTS, DOCUMENT_TYPE_LABELS } from '@/lib/gemini/prompts';
import { safeNotify } from './notification';
import { documentFlaggedEmail } from './email';

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

    // Determine status and build feedback message
    const expectedType = DOCUMENT_TYPE_LABELS[document.type] || document.type;
    const isWrongType = reviewResult.correctDocumentType === false;
    const issues: string[] = reviewResult.issues || [];
    let newStatus: 'APPROVED' | 'FLAGGED';
    let flagReason = '';

    if (isWrongType) {
      newStatus = 'FLAGGED';
      const detected = reviewResult.detectedDocumentType || 'an unrecognised document';
      flagReason = `Wrong document type: you uploaded ${detected}, but we need your ${expectedType}.`;
    } else if (!reviewResult.valid) {
      newStatus = 'FLAGGED';
      flagReason = `This does not appear to be a valid ${expectedType}.`;
      if (issues.length > 0) flagReason += ` Issues: ${issues.join('. ')}.`;
    } else if (!reviewResult.readable) {
      newStatus = 'FLAGGED';
      flagReason = 'The document is not clearly readable. Please upload a clearer photo.';
    } else if (reviewResult.recommendation === 'APPROVE') {
      newStatus = 'APPROVED';
    } else {
      newStatus = 'FLAGGED';
      flagReason = issues.length > 0
        ? `Issues found: ${issues.join('. ')}.`
        : 'The document could not be verified. Please re-upload or contact support.';
    }

    const expiryDate = reviewResult.extractedFields?.expiryDate
      ? new Date(reviewResult.extractedFields.expiryDate)
      : null;

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: newStatus,
        extractedData: {
          ...(reviewResult.extractedFields || {}),
          ...(flagReason ? { flagReason } : {}),
          ...(isWrongType ? { detectedDocumentType: reviewResult.detectedDocumentType } : {}),
        },
        ...(expiryDate && !isNaN(expiryDate.getTime()) ? { expiryDate } : {}),
      },
    });

    // Notify the user of the result
    const docTypeLabel = expectedType.replace(/_/g, ' ');
    if (newStatus === 'FLAGGED') {
      await safeNotify({
        userId: document.userId,
        type: 'DOCUMENT_FLAGGED',
        title: 'Document Rejected',
        message: flagReason,
        data: { documentId, documentType: document.type },
        emailContent: documentFlaggedEmail(document.user.name, docTypeLabel, flagReason),
      });
    } else {
      await safeNotify({
        userId: document.userId,
        type: 'DOCUMENT_APPROVED',
        title: 'Document Approved',
        message: `Your ${docTypeLabel} has been approved.`,
        data: { documentId, documentType: document.type },
      });
    }

    // Check if all user documents are approved — activate listing/user
    // Skip for insurance docs (booking-specific, not user-verification)
    if (document.type !== 'INSURANCE') {
      await checkAndActivateUser(document.userId, document.vehicleId);
    }

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
