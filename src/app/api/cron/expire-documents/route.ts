import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addDays, subHours } from 'date-fns';
import { todayUTC } from '@/lib/utils/date';
import { safeNotify } from '@/lib/services/notification';
import { setupReminderEmail } from '@/lib/services/email';

// Reminder schedule: send on Day 1, Day 3, Day 7, Day 14, Day 30 after signup
const REMINDER_THRESHOLDS_HOURS = [24, 72, 168, 336, 720] as const;
const MAX_REMINDERS = REMINDER_THRESHOLDS_HOURS.length;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = todayUTC();
  const thirtyDaysFromNow = addDays(now, 30);
  const results = { setupReminders: 0, expired: 0, suspended: 0 };

  // Send Day 1 / Day 3 / Day 7 setup reminders to users with outstanding items
  const incompleteUsers = await prisma.user.findMany({
    where: {
      role: { in: ['OWNER', 'PRODUCTION', 'ART_DEPARTMENT'] },
      isTestAccount: false,
      setupReminderCount: { lt: MAX_REMINDERS },
    },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, setupReminderCount: true },
  });

  const docLabels: Record<string, string> = {
    SA_ID: 'South African ID',
    DRIVERS_LICENSE: "Driver's License",
    COMPANY_REGISTRATION: 'Company Registration',
    VEHICLE_REGISTRATION: 'Vehicle License Disk',
  };

  for (const user of incompleteUsers) {
    // Check if enough time has passed for the next reminder
    const thresholdHours = REMINDER_THRESHOLDS_HOURS[user.setupReminderCount];
    const thresholdTime = subHours(new Date(), thresholdHours);
    if (user.createdAt > thresholdTime) continue;

    const actionItems: string[] = [];

    // 1. Check profile documents
    const requiredProfileDocs = user.role === 'PRODUCTION'
      ? ['SA_ID', 'COMPANY_REGISTRATION'] as const
      : user.role === 'ART_DEPARTMENT'
        ? ['SA_ID'] as const
        : ['SA_ID', 'DRIVERS_LICENSE'] as const;

    const userDocs = await prisma.document.findMany({
      where: { userId: user.id, type: { in: [...requiredProfileDocs] } },
    });

    for (const docType of requiredProfileDocs) {
      if (!userDocs.some((d) => d.type === docType && d.status === 'APPROVED')) {
        actionItems.push(`Upload your ${docLabels[docType]}`);
      }
    }

    // 2. For owners, check each vehicle for missing photos and docs
    if (user.role === 'OWNER') {
      const vehicles = await prisma.vehicle.findMany({
        where: { ownerId: user.id },
        select: {
          id: true,
          make: true,
          model: true,
          _count: { select: { photos: true } },
          documents: { where: { type: 'VEHICLE_REGISTRATION' }, select: { status: true } },
        },
      });

      for (const vehicle of vehicles) {
        const vName = `${vehicle.make} ${vehicle.model}`;
        if (vehicle._count.photos < 5) {
          const missing = 5 - vehicle._count.photos;
          actionItems.push(`Upload ${missing} more photo${missing > 1 ? 's' : ''} for your ${vName}`);
        }
        const hasApprovedReg = vehicle.documents.some((d) => d.status === 'APPROVED');
        if (!hasApprovedReg) {
          actionItems.push(`Upload Vehicle License Disk for your ${vName}`);
        }
      }
    }

    // Only send if there are outstanding items
    if (actionItems.length > 0) {
      const reminderNumber = user.setupReminderCount + 1;
      const summary = actionItems.length === 1
        ? actionItems[0]
        : `${actionItems.length} items to complete your setup`;
      await safeNotify({
        userId: user.id,
        type: 'DOCUMENT_EXPIRING',
        title: `Complete Your Setup (Reminder ${reminderNumber} of ${MAX_REMINDERS})`,
        message: summary,
        data: { actionItems, reminderNumber },
        emailContent: setupReminderEmail(user.name, actionItems, user.role, reminderNumber),
      });

      // Increment the reminder count
      await prisma.user.update({
        where: { id: user.id },
        data: { setupReminderCount: reminderNumber },
      });

      results.setupReminders++;
    } else {
      // User has completed setup — mark as done so we stop checking
      await prisma.user.update({
        where: { id: user.id },
        data: { setupReminderCount: MAX_REMINDERS },
      });
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
    results.setupReminders++;
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
      await prisma.option.updateMany({
        where: {
          vehicleId: doc.vehicleId,
          status: { in: ['PENDING_RESPONSE', 'ACCEPTED'] },
        },
        data: { status: 'DECLINED_ADMIN' },
      });

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
