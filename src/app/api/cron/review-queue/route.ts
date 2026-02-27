import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { reviewDocument } from '@/lib/services/document-review';

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find pending and failed-but-retriable items
  const queueItems = await prisma.documentReviewQueue.findMany({
    where: {
      OR: [
        { status: 'PENDING' },
        {
          status: 'FAILED',
          retryCount: { lt: 3 },
          nextRetryAt: { lte: new Date() },
        },
      ],
    },
    include: { document: true },
    take: 10,
    orderBy: { createdAt: 'asc' },
  });

  const results = [];
  for (const item of queueItems) {
    // Mark as processing
    await prisma.documentReviewQueue.update({
      where: { id: item.id },
      data: { status: 'PROCESSING' },
    });

    const result = await reviewDocument(item.documentId);
    results.push({ documentId: item.documentId, ...result });
  }

  return NextResponse.json({ processed: results.length, results });
}
