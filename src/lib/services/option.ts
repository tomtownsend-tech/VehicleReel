import { prisma } from '@/lib/prisma';
import { addHours, format } from 'date-fns';
import { createNotification } from './notification';
import { optionPlacedEmail, optionAcceptedEmail, optionDeclinedEmail } from './email';

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

  // Use a transaction to prevent race conditions
  const option = await prisma.$transaction(async (tx) => {
    // Check vehicle exists and is active
    const vehicle = await tx.vehicle.findUnique({
      where: { id: vehicleId },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    if (!vehicle) throw new Error('Vehicle not found');
    if (vehicle.status !== 'ACTIVE') throw new Error('Vehicle is not available for options');

    // Check for confirmed bookings on these dates
    const confirmedBooking = await tx.booking.findFirst({
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

    // Check for availability blocks (owner-blocked dates)
    const availabilityBlock = await tx.availabilityBlock.findFirst({
      where: {
        vehicleId,
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    if (availabilityBlock) {
      throw new Error('Vehicle is not available for these dates');
    }

    // Calculate queue position using MAX + 1 to avoid duplicates
    const maxPositionOption = await tx.option.findFirst({
      where: {
        vehicleId,
        status: { in: ['PENDING_RESPONSE', 'ACCEPTED'] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      orderBy: { queuePosition: 'desc' },
      select: { queuePosition: true },
    });

    const queuePosition = (maxPositionOption?.queuePosition ?? 0) + 1;
    const responseDeadlineAt = addHours(new Date(), responseDeadlineHours);

    const newOption = await tx.option.create({
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

    return newOption;
  });

  // Send notification to vehicle owner (outside transaction for non-blocking)
  const vehicleName = `${option.vehicle.make} ${option.vehicle.model}`;
  const rateDisplay = rateType === 'PER_DAY' ? `R${(rateCents / 100).toFixed(0)}/day` : `R${(rateCents / 100).toFixed(0)} package`;
  const datesDisplay = `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
  const deadlineDisplay = `${responseDeadlineHours} hours`;

  await createNotification({
    userId: option.vehicle.owner.id,
    type: 'OPTION_PLACED',
    title: 'New Option on Your Vehicle',
    message: `${option.productionUser.companyName || option.productionUser.name} placed an option on your ${vehicleName} for ${datesDisplay} at ${rateDisplay}.`,
    data: { optionId: option.id, vehicleId: option.vehicleId },
    emailContent: optionPlacedEmail(option.vehicle.owner.name, vehicleName, option.productionUser.companyName || option.productionUser.name, rateDisplay, datesDisplay, deadlineDisplay),
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

  // Notify the production user
  const vehicleName = `${updated.vehicle.make} ${updated.vehicle.model}`;
  const confirmDeadline = format(confirmationDeadlineAt, 'MMM d, yyyy h:mm a');

  await createNotification({
    userId: updated.productionUser.id,
    type: 'OPTION_ACCEPTED',
    title: 'Option Accepted',
    message: `Your option on ${vehicleName} has been accepted! Confirm by ${confirmDeadline}.`,
    data: { optionId: updated.id, vehicleId: updated.vehicleId },
    emailContent: optionAcceptedEmail(updated.productionUser.name, vehicleName, confirmDeadline),
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

  // Notify the production user
  const vehicleName = `${updated.vehicle.make} ${updated.vehicle.model}`;

  await createNotification({
    userId: updated.productionUser.id,
    type: 'OPTION_DECLINED',
    title: 'Option Declined',
    message: `The owner has declined your option on ${vehicleName}.`,
    data: { optionId: updated.id, vehicleId: updated.vehicleId },
    emailContent: optionDeclinedEmail(updated.productionUser.name, vehicleName),
  });

  // Promote queue
  await promoteQueue(option.vehicleId, option.startDate, option.endDate);

  return updated;
}

export async function promoteQueue(vehicleId: string, startDate: Date, endDate: Date) {
  // Find accepted options for overlapping dates, ordered by queue position
  const acceptedOptions = await prisma.option.findMany({
    where: {
      vehicleId,
      status: 'ACCEPTED',
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    orderBy: { queuePosition: 'asc' },
    include: { vehicle: { select: { make: true, model: true } }, productionUser: { select: { id: true, name: true } } },
  });

  // Recalculate queue positions for accepted options
  for (let i = 0; i < acceptedOptions.length; i++) {
    const newPosition = i + 1;
    const option = acceptedOptions[i];
    const oldPosition = option.queuePosition;

    const updateData: Record<string, unknown> = { queuePosition: newPosition };

    // If promoted to first position and has less than 12 hours remaining, extend
    if (newPosition === 1 && oldPosition !== 1 && option.confirmationDeadlineAt) {
      const now = new Date();
      const remainingMs = option.confirmationDeadlineAt.getTime() - now.getTime();
      const remainingHours = remainingMs / (1000 * 60 * 60);

      if (remainingHours < 12) {
        updateData.confirmationDeadlineAt = addHours(now, 12);
        updateData.promotedAt = now;
      }

      // Notify production user about promotion
      const vehicleName = `${option.vehicle.make} ${option.vehicle.model}`;
      await createNotification({
        userId: option.productionUser.id,
        type: 'OPTION_PROMOTED',
        title: 'Option Promoted',
        message: `Your option on ${vehicleName} has been promoted to position ${newPosition}.`,
        data: { optionId: option.id, vehicleId },
      });
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

  const acceptedCount = acceptedOptions.length;
  for (let i = 0; i < pendingOptions.length; i++) {
    const newPosition = acceptedCount + i + 1;
    const option = pendingOptions[i];

    const updateData: Record<string, unknown> = { queuePosition: newPosition };

    // If a PENDING_RESPONSE option is promoted to position 1 (all accepted expired),
    // extend response deadline if less than 12 hours remain
    if (newPosition === 1 && option.queuePosition !== 1) {
      const now = new Date();
      const remainingMs = option.responseDeadlineAt.getTime() - now.getTime();
      const remainingHours = remainingMs / (1000 * 60 * 60);

      if (remainingHours < 12) {
        updateData.responseDeadlineAt = addHours(now, 12);
        updateData.promotedAt = now;
      }
    }

    await prisma.option.update({
      where: { id: option.id },
      data: updateData,
    });
  }
}
