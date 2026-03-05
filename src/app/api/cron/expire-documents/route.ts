import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addDays, subHours } from 'date-fns';
import { todayUTC } from '@/lib/utils/date';
import { safeNotify } from '@/lib/services/notification';
import { pendingDocumentReminderEmail } from '@/lib/services/email';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = todayUTC();
  const thirtyDaysFromNow = addDays(now, 30);
  const results = { reminders: 0, expired: 0, suspended: 0, pendingReminders: 0 };

  // Send 24-hour reminder to users with PENDING_VERIFICATION who registered > 24h ago
  const twentyFourHoursAgo = subHours(new Date(), 24);
  const pendingUsers = await prisma.user.findMany({
    where: {
      status: 'PENDING_VERIFICATION',
      createdAt: { lte: twentyFourHoursAgo },
    },
    select: { id: true, name: true, email: true, role: true },
  });

  for (const user of pendingUsers) {
    // Check if we already sent a reminder in the last 24 hours
    const recentReminder = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: 'DOCUMENT_EXPIRING',
        title: 'Document Upload Reminder',
        createdAt: { gte: twentyFourHoursAgo },
      },
    });
    if (recentReminder) continue;

    const requiredTypes = user.role === 'PRODUCTION'
      ? ['SA_ID', 'COMPANY_REGISTRATION'] as const
      : ['SA_ID', 'DRIVERS_LICENSE'] as const;

    const userDocs = await prisma.document.findMany({
      where: { userId: user.id, type: { in: [...requiredTypes] } },
    });

    const missingTypes = requiredTypes.filter(
      (type) => !userDocs.some((d) => d.type === type && d.status === 'APPROVED')
    );

    if (missingTypes.length > 0) {
      const labels: Record<string, string> = {
        SA_ID: 'South African ID',
        DRIVERS_LICENSE: "Driver's License",
        COMPANY_REGISTRATION: 'Company Registration',
      };
      const missingLabels = missingTypes.map((t) => labels[t] || t).join(' and ');
      await safeNotify({
        userId: user.id,
        type: 'DOCUMENT_EXPIRING',
        title: 'Document Upload Reminder',
        message: `Please upload your ${missingLabels} to complete verification.`,
        data: { missingTypes },
        emailContent: pendingDocumentReminderEmail(user.name, missingLabels),
      });
      results.pendingReminders++;
    }
  }

  // Send 30-day expiry reminders
  const expiringSoon = await prisma.document.findMany({
    where: {
      status: 'APPROVED',
      expiryDate: {
        gte: now,
        lte: thirtyDaysFromNow,
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  for (const doc of expiringSoon) {
    // Create notification
    await prisma.notification.create({
      data: {
        userId: doc.userId,
        type: 'DOCUMENT_EXPIRING',
        title: 'Document Expiring Soon',
        message: `Your ${doc.type.replace(/_/g, ' ')} expires on ${doc.expiryDate?.toLocaleDateString('en-ZA')}. Please upload a renewed document.`,
        data: { documentId: doc.id, expiryDate: doc.expiryDate?.toISOString() },
      },
    });
    results.reminders++;
  }

  // Expire documents past their expiry date
  const expiredDocs = await prisma.document.findMany({
    where: {
      status: 'APPROVED',
      expiryDate: { lt: now },
    },
    include: {
      vehicle: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  for (const doc of expiredDocs) {
    await prisma.document.update({
      where: { id: doc.id },
      data: { status: 'EXPIRED' },
    });
    results.expired++;

    // Suspend vehicle listing if vehicle registration expired
    if (doc.vehicleId && doc.type === 'VEHICLE_REGISTRATION') {
      await prisma.vehicle.update({
        where: { id: doc.vehicleId },
        data: { status: 'SUSPENDED' },
      });

      // Decline any pending options on this vehicle
      const pendingOptions = await prisma.option.findMany({
        where: {
          vehicleId: doc.vehicleId,
          status: { in: ['PENDING_RESPONSE', 'ACCEPTED'] },
        },
      });

      for (const option of pendingOptions) {
        await prisma.option.update({
          where: { id: option.id },
          data: { status: 'DECLINED_ADMIN' },
        });
      }

      // Notify owner
      await prisma.notification.create({
        data: {
          userId: doc.userId,
          type: 'LISTING_SUSPENDED',
          title: 'Listing Suspended',
          message: `Your vehicle listing has been suspended because the registration document has expired. Please upload a renewed document.`,
          data: { vehicleId: doc.vehicleId },
        },
      });

      results.suspended++;
    }

    // Notify about expired document
    await prisma.notification.create({
      data: {
        userId: doc.userId,
        type: 'DOCUMENT_EXPIRED',
        title: 'Document Expired',
        message: `Your ${doc.type.replace(/_/g, ' ')} has expired. Please upload a renewed document.`,
        data: { documentId: doc.id },
      },
    });
  }

  return NextResponse.json(results);
}
