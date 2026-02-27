import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
  });

  // If approving, check if user/vehicle should be activated
  if (status === 'APPROVED') {
    const allUserDocs = await prisma.document.findMany({
      where: { userId: document.userId },
    });

    const personalApproved = allUserDocs
      .filter((d) => ['SA_ID', 'DRIVERS_LICENSE'].includes(d.type) && !d.vehicleId)
      .every((d) => d.status === 'APPROVED');

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
      if (personalApproved && vehicleDocs.every((d) => d.status === 'APPROVED')) {
        await prisma.vehicle.update({
          where: { id: document.vehicleId },
          data: { status: 'ACTIVE' },
        });
      }
    }
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
