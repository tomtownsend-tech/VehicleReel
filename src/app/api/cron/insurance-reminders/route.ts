import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format, subHours, startOfDay } from 'date-fns';
import { safeNotify } from '@/lib/services/notification';
import { insuranceReminderEmail, insuranceOverdueEmail } from '@/lib/services/email';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const todayStart = startOfDay(now);
  const results = { reminders: 0, overdue: 0 };

  // Find CONFIRMED bookings starting within 48 hours that have no APPROVED insurance doc
  const bookings = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      startDate: { lte: in48Hours },
      endDate: { gte: now },
    },
    include: {
      productionUser: { select: { id: true, name: true, email: true } },
      option: {
        include: {
          vehicle: { select: { make: true, model: true } },
        },
      },
      documents: {
        where: { type: 'INSURANCE' },
      },
    },
  });

  for (const booking of bookings) {
    // Skip if an APPROVED insurance doc already exists
    const hasApprovedInsurance = booking.documents.some((d) => d.status === 'APPROVED');
    if (hasApprovedInsurance) continue;

    const vehicleName = `${booking.option.vehicle.make} ${booking.option.vehicle.model}`;
    const deadline = subHours(new Date(booking.startDate), 24);
    const isPastDeadline = now >= deadline;
    const notificationType = isPastDeadline ? 'INSURANCE_OVERDUE' : 'INSURANCE_REMINDER';

    // Deduplicate: skip if same notification type was already sent today for this booking
    const alreadySentToday = await prisma.notification.findFirst({
      where: {
        userId: booking.productionUserId,
        type: notificationType,
        createdAt: { gte: todayStart },
        data: { path: ['bookingId'], equals: booking.id },
      },
    });
    if (alreadySentToday) continue;

    if (isPastDeadline) {
      await safeNotify({
        userId: booking.productionUserId,
        type: 'INSURANCE_OVERDUE',
        title: 'Insurance Upload Overdue',
        message: `The insurance deadline has passed for your ${vehicleName} booking. Please upload it now.`,
        data: { bookingId: booking.id },
        emailContent: insuranceOverdueEmail(booking.productionUser.name, vehicleName, booking.id),
      });
      results.overdue++;
    } else {
      const deadlineDisplay = format(deadline, 'MMM d, yyyy HH:mm');
      await safeNotify({
        userId: booking.productionUserId,
        type: 'INSURANCE_REMINDER',
        title: 'Insurance Reminder',
        message: `Please upload vehicle insurance for your ${vehicleName} booking by ${deadlineDisplay}.`,
        data: { bookingId: booking.id },
        emailContent: insuranceReminderEmail(booking.productionUser.name, vehicleName, deadlineDisplay, booking.id),
      });
      results.reminders++;
    }
  }

  return NextResponse.json(results);
}
