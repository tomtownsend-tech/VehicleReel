import { prisma } from '@/lib/prisma';

export async function confirmBooking(optionId: string, productionUserId: string, logistics: 'VEHICLE_COLLECTION' | 'OWNER_DELIVERY') {
  const option = await prisma.option.findUnique({
    where: { id: optionId },
    include: { vehicle: true },
  });

  if (!option) throw new Error('Option not found');
  if (option.productionUserId !== productionUserId) throw new Error('Not authorized');
  if (option.status !== 'ACCEPTED') throw new Error('Option must be accepted first');
  if (option.queuePosition !== 1) throw new Error('Only first-position options can be confirmed');
  if (option.confirmationDeadlineAt && new Date() > option.confirmationDeadlineAt) {
    throw new Error('Confirmation window has expired');
  }

  // Create booking and update option in a transaction
  const booking = await prisma.$transaction(async (tx) => {
    // Update option to confirmed
    await tx.option.update({
      where: { id: optionId },
      data: { status: 'CONFIRMED' },
    });

    // Create booking
    const newBooking = await tx.booking.create({
      data: {
        optionId,
        vehicleId: option.vehicleId,
        ownerId: option.vehicle.ownerId,
        productionUserId,
        rateType: option.rateType,
        rateCents: option.rateCents,
        startDate: option.startDate,
        endDate: option.endDate,
        logistics,
        status: 'CONFIRMED',
      },
      include: {
        option: true,
        productionUser: { select: { id: true, name: true, email: true, phone: true, companyName: true } },
      },
    });

    // Decline all overlapping options
    const overlapping = await tx.option.findMany({
      where: {
        vehicleId: option.vehicleId,
        id: { not: optionId },
        status: { in: ['PENDING_RESPONSE', 'ACCEPTED'] },
        startDate: { lte: option.endDate },
        endDate: { gte: option.startDate },
      },
    });

    for (const opt of overlapping) {
      await tx.option.update({
        where: { id: opt.id },
        data: { status: 'DECLINED_OVERLAP' },
      });
    }

    return newBooking;
  });

  return booking;
}
