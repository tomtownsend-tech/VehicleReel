import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { promoteQueue } from '@/lib/services/option';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const results = { expiredResponse: 0, expiredConfirmation: 0 };

  // Expire response deadlines
  const expiredResponse = await prisma.option.findMany({
    where: {
      status: 'PENDING_RESPONSE',
      responseDeadlineAt: { lte: now },
    },
  });

  for (const option of expiredResponse) {
    await prisma.option.update({
      where: { id: option.id },
      data: { status: 'EXPIRED_RESPONSE' },
    });
    await promoteQueue(option.vehicleId, option.startDate, option.endDate);
    results.expiredResponse++;
  }

  // Expire confirmation windows
  const expiredConfirmation = await prisma.option.findMany({
    where: {
      status: 'ACCEPTED',
      confirmationDeadlineAt: { lte: now },
    },
  });

  for (const option of expiredConfirmation) {
    await prisma.option.update({
      where: { id: option.id },
      data: { status: 'EXPIRED_CONFIRMATION' },
    });
    await promoteQueue(option.vehicleId, option.startDate, option.endDate);
    results.expiredConfirmation++;
  }

  return NextResponse.json(results);
}
