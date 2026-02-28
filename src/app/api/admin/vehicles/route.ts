import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { safeNotify } from '@/lib/services/notification';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        photos: { take: 1, orderBy: { order: 'asc' } },
        _count: { select: { options: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vehicle.count(),
  ]);

  return NextResponse.json({
    data: vehicles,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { vehicleId, action } = body;

  if (!vehicleId || !['REMOVE', 'ACTIVATE'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { owner: { select: { id: true, name: true } } },
  });

  if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

  if (action === 'REMOVE') {
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: 'REMOVED' },
    });

    // Decline pending options and notify affected production users
    const pendingOptions = await prisma.option.findMany({
      where: {
        vehicleId,
        status: { in: ['PENDING_RESPONSE', 'ACCEPTED'] },
      },
      include: { productionUser: { select: { id: true, name: true } } },
    });

    await prisma.option.updateMany({
      where: {
        vehicleId,
        status: { in: ['PENDING_RESPONSE', 'ACCEPTED'] },
      },
      data: { status: 'DECLINED_ADMIN' },
    });

    const vehicleName = `${vehicle.make} ${vehicle.model}`;

    // Notify vehicle owner
    await safeNotify({
      userId: vehicle.owner.id,
      type: 'LISTING_SUSPENDED',
      title: 'Vehicle Listing Removed',
      message: `Your ${vehicleName} listing has been removed by an administrator.`,
      data: { vehicleId },
    });

    // Notify affected production users
    for (const opt of pendingOptions) {
      await safeNotify({
        userId: opt.productionUser.id,
        type: 'OPTION_DECLINED',
        title: 'Option Declined - Listing Removed',
        message: `Your option on the ${vehicleName} has been declined because the listing was removed.`,
        data: { optionId: opt.id, vehicleId },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'VEHICLE_REMOVED',
        entityType: 'VEHICLE',
        entityId: vehicleId,
        details: { declinedOptions: pendingOptions.length },
      },
    });
  } else if (action === 'ACTIVATE') {
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: 'ACTIVE' },
    });

    const vehicleName = `${vehicle.make} ${vehicle.model}`;

    await safeNotify({
      userId: vehicle.owner.id,
      type: 'LISTING_ACTIVATED',
      title: 'Vehicle Listing Activated',
      message: `Your ${vehicleName} listing has been activated and is now searchable.`,
      data: { vehicleId },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'VEHICLE_ACTIVATED',
        entityType: 'VEHICLE',
        entityId: vehicleId,
        details: {},
      },
    });
  }

  return NextResponse.json({ success: true });
}
