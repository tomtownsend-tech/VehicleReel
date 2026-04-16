import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { safeNotify } from '@/lib/services/notification';
import { setupReminderEmail } from '@/lib/services/email';

const DOC_LABELS: Record<string, string> = {
  SA_ID: 'South African ID',
  DRIVERS_LICENSE: "Driver's License",
  COMPANY_REGISTRATION: 'Company Registration',
  VEHICLE_REGISTRATION: 'Vehicle License Disk',
};

/** GET: Preview how many users would receive a reminder (no emails sent) */
export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const incompleteUsers = await findIncompleteUsers();
  return NextResponse.json({
    count: incompleteUsers.length,
    users: incompleteUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      missingItems: u.missingItems,
    })),
  });
}

/** POST: Send document reminder emails to all incomplete users */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const userId = (body as { userId?: string }).userId;

  // If userId provided, send to that user only; otherwise send to all incomplete users
  const incompleteUsers = await findIncompleteUsers(userId);

  if (incompleteUsers.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No users with incomplete setup found.' });
  }

  let sent = 0;
  const details: { name: string; email: string; items: number }[] = [];

  for (const user of incompleteUsers) {
    await safeNotify({
      userId: user.id,
      type: 'DOCUMENT_EXPIRING',
      title: 'Complete Your VehicleReel Setup',
      message: user.missingItems.length === 1
        ? user.missingItems[0]
        : `${user.missingItems.length} items to complete your setup`,
      data: { actionItems: user.missingItems, adminTriggered: true },
      emailContent: setupReminderEmail(user.name, user.missingItems, user.role),
    });
    sent++;
    details.push({ name: user.name, email: user.email, items: user.missingItems.length });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'SEND_REMINDERS',
      entityType: 'USER',
      entityId: userId || 'BULK',
      details: { sent, targetUsers: details.map((d) => d.email) },
    },
  });

  return NextResponse.json({ sent, details });
}

interface IncompleteUser {
  id: string;
  name: string;
  email: string;
  role: string;
  missingItems: string[];
}

async function findIncompleteUsers(specificUserId?: string): Promise<IncompleteUser[]> {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['OWNER', 'PRODUCTION', 'ART_DEPARTMENT'] },
      status: { not: 'BANNED' },
      isTestAccount: false,
      ...(specificUserId ? { id: specificUserId } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  const results: IncompleteUser[] = [];

  for (const user of users) {
    const missingItems: string[] = [];

    // Check required profile documents
    const requiredDocs = user.role === 'PRODUCTION'
      ? ['SA_ID', 'COMPANY_REGISTRATION'] as const
      : user.role === 'ART_DEPARTMENT'
        ? ['SA_ID'] as const
        : ['SA_ID', 'DRIVERS_LICENSE'] as const;

    const userDocs = await prisma.document.findMany({
      where: { userId: user.id, type: { in: [...requiredDocs] } },
      select: { type: true, status: true },
    });

    for (const docType of requiredDocs) {
      if (!userDocs.some((d) => d.type === docType && d.status === 'APPROVED')) {
        missingItems.push(`Upload your ${DOC_LABELS[docType]}`);
      }
    }

    // For owners, check vehicles for missing photos and licence discs
    if (user.role === 'OWNER') {
      const vehicles = await prisma.vehicle.findMany({
        where: { ownerId: user.id, status: { not: 'REMOVED' } },
        select: {
          make: true,
          model: true,
          _count: { select: { photos: true } },
          documents: {
            where: { type: { in: ['VEHICLE_REGISTRATION', 'VEHICLE_PERMIT'] } },
            select: { status: true },
          },
        },
      });

      for (const vehicle of vehicles) {
        const vName = `${vehicle.make} ${vehicle.model}`;
        if (vehicle._count.photos < 5) {
          const missing = 5 - vehicle._count.photos;
          missingItems.push(`Upload ${missing} more photo${missing > 1 ? 's' : ''} for your ${vName}`);
        }
        const hasApprovedDoc = vehicle.documents.some((d) => d.status === 'APPROVED');
        if (!hasApprovedDoc) {
          missingItems.push(`Upload Vehicle License Disk for your ${vName}`);
        }
      }
    }

    if (missingItems.length > 0) {
      results.push({ id: user.id, name: user.name, email: user.email, role: user.role, missingItems });
    }
  }

  return results;
}
