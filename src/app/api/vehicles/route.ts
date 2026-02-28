import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createVehicleSchema } from '@/lib/validators/vehicle';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const requestedOwnerId = searchParams.get('ownerId');

  // Owners see their own vehicles; admins can query any; others see only ACTIVE vehicles
  let where: Record<string, unknown>;
  if (session.user.role === 'ADMIN') {
    where = requestedOwnerId ? { ownerId: requestedOwnerId } : {};
  } else if (session.user.role === 'OWNER') {
    where = { ownerId: session.user.id };
  } else {
    // Production users can only see active vehicles
    where = requestedOwnerId ? { ownerId: requestedOwnerId, status: 'ACTIVE' } : { status: 'ACTIVE' };
  }

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: {
        photos: { orderBy: { order: 'asc' } },
        owner: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return NextResponse.json({
    data: vehicles,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Only owners can create vehicles' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createVehicleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      ...parsed.data,
      ownerId: session.user.id,
      status: 'PENDING_REVIEW',
    },
    include: {
      photos: true,
    },
  });

  return NextResponse.json(vehicle, { status: 201 });
}
