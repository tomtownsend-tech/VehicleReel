import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateVehicleSchema } from '@/lib/validators/vehicle';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: params.id },
    include: {
      photos: { orderBy: { order: 'asc' } },
      owner: { select: { id: true, name: true, email: true, phone: true } },
      documents: { select: { id: true, type: true, status: true } },
      availability: { orderBy: { startDate: 'asc' } },
      options: {
        where: { status: { in: ['PENDING_RESPONSE', 'ACCEPTED'] } },
        select: { id: true, status: true, startDate: true, endDate: true, queuePosition: true },
        orderBy: { queuePosition: 'asc' },
      },
    },
  });

  if (!vehicle) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  }

  // Non-admin, non-owner users should only see active vehicles
  if (session.user.role !== 'ADMIN' && vehicle.ownerId !== session.user.id && vehicle.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  }

  return NextResponse.json(vehicle);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } });
  if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  if (vehicle.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateVehicleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.vehicle.update({
    where: { id: params.id },
    data: parsed.data,
    include: { photos: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } });
  if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  if (vehicle.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.vehicle.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
