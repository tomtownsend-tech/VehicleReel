import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { promoteQueue } from '@/lib/services/option';
import { safeNotify } from '@/lib/services/notification';
import { optionExpiredEmail } from '@/lib/services/email';

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
    include: {
      productionUser: { select: { id: true, name: true, email: true } },
      vehicle: { include: { owner: { select: { id: true, name: true } }, } },
    },
  });

  for (const option of expiredResponse) {
    // Idempotency guard: only update if status hasn't changed since findMany
    const result = await prisma.option.updateMany({
      where: { id: option.id, status: 'PENDING_RESPONSE' },
      data: { status: 'EXPIRED_RESPONSE' },
    });
    if (result.count === 0) continue; // Status changed concurrently, skip

    await promoteQueue(option.vehicleId, option.startDate, option.endDate);
    results.expiredResponse++;

    const vehicleName = `${option.vehicle.make} ${option.vehicle.model}`;

    // Notify production user their option expired
    await safeNotify({
      userId: option.productionUser.id,
      type: 'OPTION_EXPIRED',
      title: 'Option Expired',
      message: `Your option on ${vehicleName} expired because the owner did not respond in time.`,
      data: { optionId: option.id, vehicleId: option.vehicleId },
      emailContent: optionExpiredEmail(option.productionUser.name, vehicleName, 'The owner did not respond within the deadline.'),
    });

    // Notify owner the option expired
    await safeNotify({
      userId: option.vehicle.owner.id,
      type: 'OPTION_EXPIRED',
      title: 'Option Expired',
      message: `An option on your ${vehicleName} expired because you did not respond in time.`,
      data: { optionId: option.id, vehicleId: option.vehicleId },
    });
  }

  // Expire confirmation windows
  const expiredConfirmation = await prisma.option.findMany({
    where: {
      status: 'ACCEPTED',
      confirmationDeadlineAt: { lte: now },
    },
    include: {
      productionUser: { select: { id: true, name: true, email: true } },
      vehicle: { include: { owner: { select: { id: true, name: true } }, } },
    },
  });

  for (const option of expiredConfirmation) {
    // Idempotency guard: only update if status hasn't changed since findMany
    const result = await prisma.option.updateMany({
      where: { id: option.id, status: 'ACCEPTED' },
      data: { status: 'EXPIRED_CONFIRMATION' },
    });
    if (result.count === 0) continue; // Status changed concurrently, skip

    await promoteQueue(option.vehicleId, option.startDate, option.endDate);
    results.expiredConfirmation++;

    const vehicleName = `${option.vehicle.make} ${option.vehicle.model}`;

    // Notify production user their confirmation window expired
    await safeNotify({
      userId: option.productionUser.id,
      type: 'OPTION_EXPIRED',
      title: 'Confirmation Window Expired',
      message: `Your option on ${vehicleName} expired because you did not confirm in time.`,
      data: { optionId: option.id, vehicleId: option.vehicleId },
      emailContent: optionExpiredEmail(option.productionUser.name, vehicleName, 'You did not confirm within the confirmation window.'),
    });

    // Notify owner the confirmation expired
    await safeNotify({
      userId: option.vehicle.owner.id,
      type: 'OPTION_EXPIRED',
      title: 'Confirmation Window Expired',
      message: `A booking for your ${vehicleName} was not confirmed in time by the production user.`,
      data: { optionId: option.id, vehicleId: option.vehicleId },
    });
  }

  return NextResponse.json(results);
}
