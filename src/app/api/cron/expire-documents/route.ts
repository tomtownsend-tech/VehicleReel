import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addDays, subHours } from 'date-fns';
import { todayUTC } from '@/lib/utils/date';
import { safeNotify } from '@/lib/services/notification';
import { setupReminderEmail } from '@/lib/services/email';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = todayUTC();
  const thirtyDaysFromNow = addDays(now, 30);
  const results = { setupReminders: 0, expired: 0, suspended: 0 };

  // Send 24-hour setup reminder to users who registered > 24h ago and have outstanding items
  const twentyFourHoursAgo = subHours(new Date(), 24);
  const incompleteUsers = await prisma.user.findMany({
    where: {
      createdAt: { lte: twentyFourHoursAgo },
      role: { in: ['OWNER', 'PRODUCTION'] },
      isTestAccount: false,
    },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  const docLabels: Record<string, string> = {
    SA_ID: 'South African ID',
    DRIVERS_LICENSE: "Driver's License",
    COMPANY_REGISTRATION: 'Company Registration',
    VEHICLE_REGISTRATION: 'Vehicle License Disk',
  };

  for (const user of incompleteUsers) {
    // Check if we already sent a setup reminder in the last 24 hours
    const recentReminder = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: 'DOCUMENT_EXPIRING',
        title: 'Complete Your Setup',
        createdAt: { gte: twentyFourHoursAgo },
      },
    });
    if (recentReminder) continue;

    const actionItems: string[] = [];

    // 1. Check profile documents
    const requiredProfileDocs = user.role === 'PRODUCTION'
      ? ['SA_ID', 'COMPANY_REGISTRATION'] as const
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
      const summary = actionItems.length === 1
        ? actionItems[0]
        : `${actionItems.length} items to complete your setup`;
      await safeNotify({
        userId: user.id,
        type: 'DOCUMENT_EXPIRING',
        title: 'Complete Your Setup',
        message: summary,
        data: { actionItems },
        emailContent: setupReminderEmail(user.name, actionItems, user.role),
      });
      results.setupReminders++;
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
