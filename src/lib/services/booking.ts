import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { createNotification } from './notification';
import { bookingConfirmedEmail, optionDeclinedEmail } from './email';

export async function confirmBooking(optionId: string, productionUserId: string, logistics: 'VEHICLE_COLLECTION' | 'OWNER_DELIVERY') {
  // Create booking and update option in a transaction (validation inside tx to prevent races)
  const result = await prisma.$transaction(async (tx) => {
    const option = await tx.option.findUnique({
      where: { id: optionId },
      include: {
        vehicle: {
          include: { owner: { select: { id: true, name: true, email: true, phone: true } } },
        },
      },
    });

    if (!option) throw new Error('Option not found');
    if (option.productionUserId !== productionUserId) throw new Error('Not authorized');
    if (option.status !== 'ACCEPTED') throw new Error('Option must be accepted first');
    if (option.queuePosition !== 1) throw new Error('Only first-position options can be confirmed');
    if (!option.confirmationDeadlineAt || new Date() > option.confirmationDeadlineAt) {
      throw new Error('Confirmation window has expired');
    }

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

    // Create availability block for the booked dates
    await tx.availabilityBlock.create({
      data: {
        vehicleId: option.vehicleId,
        startDate: option.startDate,
        endDate: option.endDate,
        reason: `Booked: ${newBooking.id}`,
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
      include: {
        productionUser: { select: { id: true, name: true, email: true } },
      },
    });

    for (const opt of overlapping) {
      await tx.option.update({
        where: { id: opt.id },
        data: { status: 'DECLINED_OVERLAP' },
      });
    }

    return { booking: newBooking, overlapping, vehicle: option.vehicle };
  });

  // Send notifications (outside transaction for non-blocking)
  const { booking, overlapping, vehicle } = result;
  const vehicleName = `${vehicle.make} ${vehicle.model}`;
  const datesDisplay = `${format(booking.startDate, 'MMM d, yyyy')} - ${format(booking.endDate, 'MMM d, yyyy')}`;
  const rateDisplay = booking.rateType === 'PER_DAY' ? `R${(booking.rateCents / 100).toFixed(0)}/day` : `R${(booking.rateCents / 100).toFixed(0)} package`;
  const logisticsDisplay = logistics === 'OWNER_DELIVERY' ? 'Owner delivers to set' : 'Vehicle collection';

  // Notify owner
  await createNotification({
    userId: vehicle.owner.id,
    type: 'BOOKING_CONFIRMED',
    title: 'Booking Confirmed',
    message: `Your ${vehicleName} has been booked for ${datesDisplay} at ${rateDisplay}.`,
    data: { bookingId: booking.id, vehicleId: vehicle.id },
    emailContent: bookingConfirmedEmail(
      vehicle.owner.name, vehicleName, datesDisplay, rateDisplay, logisticsDisplay,
      booking.productionUser.name, booking.productionUser.email, booking.productionUser.phone,
    ),
  });

  // Notify production user
  await createNotification({
    userId: productionUserId,
    type: 'BOOKING_CONFIRMED',
    title: 'Booking Confirmed',
    message: `Your booking for ${vehicleName} on ${datesDisplay} is confirmed!`,
    data: { bookingId: booking.id, vehicleId: vehicle.id },
    emailContent: bookingConfirmedEmail(
      booking.productionUser.name, vehicleName, datesDisplay, rateDisplay, logisticsDisplay,
      vehicle.owner.name, vehicle.owner.email, vehicle.owner.phone,
    ),
  });

  // Notify declined overlapping option holders
  for (const opt of overlapping) {
    await createNotification({
      userId: opt.productionUser.id,
      type: 'OPTION_DECLINED',
      title: 'Option Declined - Dates Booked',
      message: `Your option on ${vehicleName} has been declined because the vehicle was booked for overlapping dates.`,
      data: { optionId: opt.id, vehicleId: vehicle.id },
      emailContent: optionDeclinedEmail(opt.productionUser.name, vehicleName),
    });
  }

  return booking;
}
