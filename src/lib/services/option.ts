import { prisma } from '@/lib/prisma';
import { addHours } from 'date-fns';

export async function placeOption({
  vehicleId,
  productionUserId,
  rateType,
  rateCents,
  startDate,
  endDate,
  responseDeadlineHours,
  confirmationWindowHours,
}: {
  vehicleId: string;
  productionUserId: string;
  rateType: 'PER_DAY' | 'PACKAGE';
  rateCents: number;
  startDate: string;
  endDate: string;
  responseDeadlineHours: number;
  confirmationWindowHours: number;
}) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Check for confirmed bookings on these dates
  const confirmedBooking = await prisma.booking.findFirst({
    where: {
      vehicleId,
      status: 'CONFIRMED',
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });

  if (confirmedBooking) {
    throw new Error('Vehicle is already booked for these dates');
  }

  // Calculate queue position
  const existingOptions = await prisma.option.count({
    where: {
      vehicleId,
      status: { in: ['PENDING_RESPONSE', 'ACCEPTED'] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });

  const queuePosition = existingOptions + 1;
  const responseDeadlineAt = addHours(new Date(), responseDeadlineHours);

  const option = await prisma.option.create({
    data: {
      vehicleId,
      productionUserId,
      rateType,
      rateCents,
      startDate: start,
      endDate: end,
      responseDeadlineHours,
      confirmationWindowHours,
      responseDeadlineAt,
      queuePosition,
      status: 'PENDING_RESPONSE',
    },
    include: {
      vehicle: { include: { owner: { select: { id: true, name: true, email: true } } } },
      productionUser: { select: { id: true, name: true, email: true, companyName: true } },
    },
  });

  return option;
}

export async function acceptOption(optionId: string, ownerId: string) {
  const option = await prisma.option.findUnique({
    where: { id: optionId },
    include: { vehicle: true },
  });

  if (!option) throw new Error('Option not found');
  if (option.vehicle.ownerId !== ownerId) throw new Error('Not authorized');
  if (option.status !== 'PENDING_RESPONSE') throw new Error('Option cannot be accepted');
  if (new Date() > option.responseDeadlineAt) throw new Error('Response deadline has passed');

  const now = new Date();
  const confirmationDeadlineAt = addHours(now, option.confirmationWindowHours);

  const updated = await prisma.option.update({
    where: { id: optionId },
    data: {
      status: 'ACCEPTED',
      acceptedAt: now,
      confirmationDeadlineAt,
    },
    include: {
      vehicle: true,
      productionUser: { select: { id: true, name: true, email: true } },
    },
  });

  return updated;
}

export async function declineOption(optionId: string, ownerId: string) {
  const option = await prisma.option.findUnique({
    where: { id: optionId },
    include: { vehicle: true },
  });

  if (!option) throw new Error('Option not found');
  if (option.vehicle.ownerId !== ownerId) throw new Error('Not authorized');
  if (!['PENDING_RESPONSE', 'ACCEPTED'].includes(option.status)) throw new Error('Option cannot be declined');

  const updated = await prisma.option.update({
    where: { id: optionId },
    data: { status: 'DECLINED_BY_OWNER' },
    include: {
      vehicle: true,
      productionUser: { select: { id: true, name: true, email: true } },
    },
  });

  // Promote queue
  await promoteQueue(option.vehicleId, option.startDate, option.endDate);

  return updated;
}

export async function promoteQueue(vehicleId: string, startDate: Date, endDate: Date) {
  // Find accepted options for overlapping dates, ordered by queue position
  const options = await prisma.option.findMany({
    where: {
      vehicleId,
      status: 'ACCEPTED',
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    orderBy: { queuePosition: 'asc' },
  });

  // Recalculate queue positions
  for (let i = 0; i < options.length; i++) {
    const newPosition = i + 1;
    const option = options[i];

    const updateData: Record<string, unknown> = { queuePosition: newPosition };

    // If promoted to first position and has less than 12 hours remaining, extend
    if (newPosition === 1 && option.confirmationDeadlineAt) {
      const now = new Date();
      const remainingMs = option.confirmationDeadlineAt.getTime() - now.getTime();
      const remainingHours = remainingMs / (1000 * 60 * 60);

      if (remainingHours < 12) {
        updateData.confirmationDeadlineAt = addHours(now, 12);
        updateData.promotedAt = now;
      }
    }

    await prisma.option.update({
      where: { id: option.id },
      data: updateData,
    });
  }

  // Also recalculate pending_response options
  const pendingOptions = await prisma.option.findMany({
    where: {
      vehicleId,
      status: 'PENDING_RESPONSE',
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    orderBy: { createdAt: 'asc' },
  });

  const acceptedCount = options.length;
  for (let i = 0; i < pendingOptions.length; i++) {
    await prisma.option.update({
      where: { id: pendingOptions[i].id },
      data: { queuePosition: acceptedCount + i + 1 },
    });
  }
}
