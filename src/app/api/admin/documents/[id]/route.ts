import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { safeNotify } from '@/lib/services/notification';
import { documentStatusEmail } from '@/lib/services/email';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { status } = body;

  if (!['APPROVED', 'FLAGGED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const document = await prisma.document.update({
    where: { id: params.id },
    data: { status },
    include: { user: { select: { id: true, name: true } } },
  });

  const docTypeLabels: Record<string, string> = {
    SA_ID: 'South African ID',
    DRIVERS_LICENSE: "Driver's License",
    VEHICLE_REGISTRATION: 'Vehicle License Disk',
    COMPANY_REGISTRATION: 'Company Registration',
  };
  const docLabel = docTypeLabels[document.type] || document.type;

  // If approving, check if user/vehicle should be activated
  if (status === 'APPROVED') {
    // Fetch user role for role-aware document requirements
    const docUser = await prisma.user.findUnique({
      where: { id: document.userId },
      select: { role: true },
    });

    const allUserDocs = await prisma.document.findMany({
      where: { userId: document.userId },
    });

    // Role-aware: OWNER needs SA_ID + DRIVERS_LICENSE, PRODUCTION needs SA_ID + COMPANY_REGISTRATION
    const requiredTypes = docUser?.role === 'PRODUCTION'
      ? ['SA_ID', 'COMPANY_REGISTRATION']
      : ['SA_ID', 'DRIVERS_LICENSE'];

    const personalApproved = requiredTypes.every((type) =>
      allUserDocs.some((d) => d.type === type && d.status === 'APPROVED')
    );

    if (personalApproved) {
      await prisma.user.update({
        where: { id: document.userId },
        data: { status: 'VERIFIED' },
      });
    }

    if (document.vehicleId) {
      const vehicleDocs = allUserDocs.filter(
        (d) => d.vehicleId === document.vehicleId && d.type === 'VEHICLE_REGISTRATION'
      );
      const userIsVerified = personalApproved || docUser?.role === 'OWNER' && (await prisma.user.findUnique({ where: { id: document.userId }, select: { status: true } }))?.status === 'VERIFIED';
      if (userIsVerified && vehicleDocs.length > 0 && vehicleDocs.every((d) => d.status === 'APPROVED')) {
        await prisma.vehicle.update({
          where: { id: document.vehicleId },
          data: { status: 'ACTIVE' },
        });

        // Notify owner their listing is activated
        await safeNotify({
          userId: document.userId,
          type: 'LISTING_ACTIVATED',
          title: 'Vehicle Listing Activated',
          message: 'Your vehicle listing is now active and searchable by production teams.',
          data: { vehicleId: document.vehicleId },
        });
      }
    }

    // Notify user about document approval
    await safeNotify({
      userId: document.userId,
      type: 'DOCUMENT_APPROVED',
      title: 'Document Approved',
      message: `Your ${docLabel} has been approved.`,
      data: { documentId: document.id },
      emailContent: documentStatusEmail(document.user.name, docLabel, 'APPROVED'),
    });
  } else {
    // Notify user about document being flagged
    await safeNotify({
      userId: document.userId,
      type: 'DOCUMENT_FLAGGED',
      title: 'Document Under Review',
      message: `Your ${docLabel} has been flagged for further review. Please check your documents.`,
      data: { documentId: document.id },
      emailContent: documentStatusEmail(document.user.name, docLabel, 'FLAGGED'),
    });
  }

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: `DOCUMENT_${status}`,
      entityType: 'DOCUMENT',
      entityId: params.id,
      details: { manualReview: true },
    },
  });

  return NextResponse.json(document);
}
