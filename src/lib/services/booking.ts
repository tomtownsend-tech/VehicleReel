import { prisma } from '@/lib/prisma';
import { format, subHours, differenceInHours } from 'date-fns';
import { safeNotify } from './notification';
import { bookingConfirmedEmail, optionDeclinedEmail, insuranceReminderEmail, bookingCancelledEmail } from './email';

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
        ownerPayoutCents: option.ownerPayoutCents,
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

    // Seed daily detail rows for each calendar day
    const dailyDetails: { bookingId: string; date: Date }[] = [];
    const current = new Date(option.startDate);
    const end = new Date(option.endDate);
    while (current <= end) {
      dailyDetails.push({ bookingId: newBooking.id, date: new Date(current) });
      current.setDate(current.getDate() + 1);
    }
    if (dailyDetails.length > 0) {
      await tx.bookingDailyDetail.createMany({ data: dailyDetails });
    }

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
  const ownerPayoutDisplay = booking.rateType === 'PER_DAY' ? `R${(booking.ownerPayoutCents / 100).toFixed(0)}/day` : `R${(booking.ownerPayoutCents / 100).toFixed(0)} package`;
  const logisticsDisplay = logistics === 'OWNER_DELIVERY' ? 'Owner delivers to set' : 'Vehicle collection';

  // Notify owner (show payout amount, not full rate)
  await safeNotify({
    userId: vehicle.owner.id,
    type: 'BOOKING_CONFIRMED',
    title: 'Booking Confirmed',
    message: `Your ${vehicleName} has been booked for ${datesDisplay} at ${ownerPayoutDisplay}.`,
    data: { bookingId: booking.id, vehicleId: vehicle.id },
    emailContent: bookingConfirmedEmail(
      vehicle.owner.name, vehicleName, datesDisplay, ownerPayoutDisplay, logisticsDisplay,
      booking.productionUser.name, booking.productionUser.email, booking.productionUser.phone,
    ),
  });

  // Notify production user (show full rate)
  await safeNotify({
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

  // Send initial insurance reminder to production user
  const insuranceDeadline = subHours(new Date(booking.startDate), 24);
  const deadlineDisplay = format(insuranceDeadline, 'MMM d, yyyy HH:mm');
  await safeNotify({
    userId: productionUserId,
    type: 'INSURANCE_REMINDER',
    title: 'Upload Vehicle Insurance',
    message: `Please upload vehicle insurance for your ${vehicleName} booking by ${deadlineDisplay}.`,
    data: { bookingId: booking.id },
    emailContent: insuranceReminderEmail(booking.productionUser.name, vehicleName, deadlineDisplay, booking.id),
  });

  // Notify declined overlapping option holders
  for (const opt of overlapping) {
    await safeNotify({
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

export async function assignCoordinator(bookingId: string, coordinatorId: string, adminUserId: string) {
  const coordinator = await prisma.user.findUnique({ where: { id: coordinatorId }, select: { role: true, name: true } });
  if (!coordinator || coordinator.role !== 'COORDINATOR') throw new Error('User is not a coordinator');

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { coordinatorId },
    include: {
      option: { include: { vehicle: { select: { make: true, model: true } } } },
      productionUser: { select: { name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      action: 'COORDINATOR_ASSIGNED',
      entityType: 'BOOKING',
      entityId: bookingId,
      details: { coordinatorId, coordinatorName: coordinator.name },
    },
  });

  const vehicleName = `${booking.option.vehicle.make} ${booking.option.vehicle.model}`;
  const datesDisplay = `${format(booking.startDate, 'MMM d, yyyy')} - ${format(booking.endDate, 'MMM d, yyyy')}`;

  await safeNotify({
    userId: coordinatorId,
    type: 'COORDINATOR_ASSIGNED',
    title: 'New Booking Assignment',
    message: `You have been assigned to coordinate the ${vehicleName} booking (${datesDisplay}) for ${booking.productionUser.name}.`,
    data: { bookingId },
  });

  return booking;
}

export async function checkInDay(bookingId: string, date: string, productionUserId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { dailyDetails: true, checkIns: true, option: { include: { vehicle: { select: { make: true, model: true } } } } },
  });
  if (!booking) throw new Error('Booking not found');
  if (booking.productionUserId !== productionUserId) throw new Error('Not authorized');

  const checkDate = new Date(date + 'T00:00:00.000Z');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (checkDate > today) throw new Error('Cannot check in for a future date');

  const checkIn = await prisma.bookingCheckIn.create({
    data: { bookingId, date: checkDate, checkedInBy: productionUserId },
  });

  const vehicleName = `${booking.option.vehicle.make} ${booking.option.vehicle.model}`;
  const dateDisplay = format(checkDate, 'MMM d, yyyy');

  // Notify owner of check-in
  await safeNotify({
    userId: booking.ownerId,
    type: 'VEHICLE_CHECKED_IN',
    title: 'Vehicle Checked In',
    message: `Your ${vehicleName} has been checked in for ${dateDisplay}.`,
    data: { bookingId },
  });

  // Notify coordinator of check-in
  if (booking.coordinatorId) {
    await safeNotify({
      userId: booking.coordinatorId,
      type: 'VEHICLE_CHECKED_IN',
      title: 'Vehicle Checked In',
      message: `The ${vehicleName} has been checked in for ${dateDisplay}.`,
      data: { bookingId },
    });
  }

  // Check if all days are now checked in
  const totalDays = booking.dailyDetails.length;
  const checkedInCount = booking.checkIns.length + 1; // +1 for the one we just created
  if (checkedInCount >= totalDays && totalDays > 0) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'PAYMENT_READY' },
    });

    if (booking.coordinatorId) {
      await safeNotify({
        userId: booking.coordinatorId,
        type: 'BOOKING_PAYMENT_READY',
        title: 'All Days Checked In',
        message: `All shoot days have been checked in for the ${vehicleName} booking. Payment is now ready.`,
        data: { bookingId },
      });
    }
  }

  return checkIn;
}

export async function updateBookingDetails(
  bookingId: string,
  productionUserId: string,
  details: {
    locationAddress?: string;
    locationPin?: string;
    specialInstructions?: string;
    days?: { date: string; callTime?: string; locationAddress?: string; locationPin?: string; notes?: string }[];
  }
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { option: { include: { vehicle: { select: { make: true, model: true } } } } },
  });
  if (!booking) throw new Error('Booking not found');
  if (booking.productionUserId !== productionUserId) throw new Error('Not authorized');

  // Update booking-level fields
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      locationAddress: details.locationAddress,
      locationPin: details.locationPin,
      specialInstructions: details.specialInstructions,
    },
  });

  // Update per-day details
  if (details.days) {
    for (const day of details.days) {
      await prisma.bookingDailyDetail.updateMany({
        where: { bookingId, date: new Date(day.date + 'T00:00:00.000Z') },
        data: {
          callTime: day.callTime ?? null,
          locationAddress: day.locationAddress ?? null,
          locationPin: day.locationPin ?? null,
          notes: day.notes ?? null,
        },
      });
    }
  }

  // Notify owner
  const vehicleName = `${booking.option.vehicle.make} ${booking.option.vehicle.model}`;
  await safeNotify({
    userId: booking.ownerId,
    type: 'SHOOT_DETAILS_UPDATED',
    title: 'Shoot Details Updated',
    message: `Shoot details have been updated for your ${vehicleName} booking.`,
    data: { bookingId },
  });

  // Notify coordinator if assigned
  if (booking.coordinatorId) {
    await safeNotify({
      userId: booking.coordinatorId,
      type: 'SHOOT_DETAILS_UPDATED',
      title: 'Shoot Details Updated',
      message: `Shoot details have been updated for the ${vehicleName} booking.`,
      data: { bookingId },
    });
  }

  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: { dailyDetails: { orderBy: { date: 'asc' } }, checkIns: true },
  });
}

function getCancellationFeePct(startDate: Date): number {
  const hoursUntilShoot = differenceInHours(startDate, new Date());
  if (hoursUntilShoot >= 48) return 0;
  if (hoursUntilShoot >= 24) return 50;
  return 100;
}

export async function cancelBooking(bookingId: string, productionUserId: string, reason: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      option: {
        include: {
          vehicle: {
            include: { owner: { select: { id: true, name: true, email: true } } },
          },
        },
      },
      productionUser: { select: { id: true, name: true, email: true, companyName: true } },
      coordinator: { select: { id: true, name: true } },
    },
  });

  if (!booking) throw new Error('Booking not found');
  if (booking.productionUserId !== productionUserId) throw new Error('Not authorized');
  if (booking.status !== 'CONFIRMED') throw new Error('Only confirmed bookings can be cancelled');

  const feePct = getCancellationFeePct(new Date(booking.startDate));

  const updated = await prisma.$transaction(async (tx) => {
    // Cancel the booking
    const cancelled = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason,
        cancellationFeePct: feePct,
        cancelledAt: new Date(),
      },
    });

    // Remove the availability block that was created on confirmation
    await tx.availabilityBlock.deleteMany({
      where: {
        vehicleId: booking.vehicleId,
        reason: `Booked: ${bookingId}`,
      },
    });

    return cancelled;
  });

  // Send notifications
  const vehicleName = `${booking.option.vehicle.make} ${booking.option.vehicle.model}`;
  const datesDisplay = `${format(booking.startDate, 'MMM d, yyyy')} - ${format(booking.endDate, 'MMM d, yyyy')}`;
  const cancelledByName = booking.productionUser.companyName || booking.productionUser.name;

  // Notify owner
  await safeNotify({
    userId: booking.option.vehicle.owner.id,
    type: 'BOOKING_CANCELLED',
    title: 'Booking Cancelled',
    message: `The booking for your ${vehicleName} (${datesDisplay}) has been cancelled by ${cancelledByName}.`,
    data: { bookingId, vehicleId: booking.vehicleId },
    emailContent: bookingCancelledEmail(
      booking.option.vehicle.owner.name, vehicleName, datesDisplay, cancelledByName,
      reason, feePct, booking.rateCents, booking.rateType,
    ),
  });

  // Notify production user (confirmation)
  await safeNotify({
    userId: productionUserId,
    type: 'BOOKING_CANCELLED',
    title: 'Booking Cancelled',
    message: `Your booking for ${vehicleName} (${datesDisplay}) has been cancelled.`,
    data: { bookingId, vehicleId: booking.vehicleId },
    emailContent: bookingCancelledEmail(
      booking.productionUser.name, vehicleName, datesDisplay, cancelledByName,
      reason, feePct, booking.rateCents, booking.rateType,
    ),
  });

  // Notify coordinator if assigned
  if (booking.coordinator) {
    await safeNotify({
      userId: booking.coordinator.id,
      type: 'BOOKING_CANCELLED',
      title: 'Booking Cancelled',
      message: `The ${vehicleName} booking (${datesDisplay}) has been cancelled by ${cancelledByName}.`,
      data: { bookingId, vehicleId: booking.vehicleId },
    });
  }

  return updated;
}
