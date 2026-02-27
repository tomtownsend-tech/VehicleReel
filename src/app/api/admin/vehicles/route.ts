import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const vehicles = await prisma.vehicle.findMany({
    include: {
      owner: { select: { id: true, name: true, email: true } },
      photos: { take: 1, orderBy: { order: 'asc' } },
      _count: { select: { options: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(vehicles);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { vehicleId, action } = body;

  if (!vehicleId || action !== 'REMOVE') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status: 'REMOVED' },
  });

  // Decline pending options
  const declined = await prisma.option.updateMany({
    where: {
      vehicleId,
      status: { in: ['PENDING_RESPONSE', 'ACCEPTED'] },
    },
    data: { status: 'DECLINED_ADMIN' },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'VEHICLE_REMOVED',
      entityType: 'VEHICLE',
      entityId: vehicleId,
      details: { declinedOptions: declined.count },
    },
  });

  return NextResponse.json({ success: true });
}
