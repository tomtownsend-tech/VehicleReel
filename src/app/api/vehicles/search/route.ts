import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type');
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  const color = searchParams.get('color');
  const yearMin = searchParams.get('yearMin');
  const yearMax = searchParams.get('yearMax');
  const location = searchParams.get('location');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const where: Prisma.VehicleWhereInput = {
    status: 'ACTIVE',
  };

  if (type) where.type = type as Prisma.EnumVehicleTypeFilter;
  if (make) where.make = { contains: make, mode: 'insensitive' };
  if (model) where.model = { contains: model, mode: 'insensitive' };
  if (color) where.color = { contains: color, mode: 'insensitive' };
  if (location) where.location = location;
  if (yearMin || yearMax) {
    where.year = {};
    if (yearMin) (where.year as Prisma.IntFilter).gte = parseInt(yearMin);
    if (yearMax) (where.year as Prisma.IntFilter).lte = parseInt(yearMax);
  }

  // Filter out vehicles with blocked dates or confirmed bookings on requested dates
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Exclude vehicles with blocked dates overlapping the requested range
    where.NOT = {
      OR: [
        {
          availability: {
            some: {
              startDate: { lte: end },
              endDate: { gte: start },
            },
          },
        },
        {
          options: {
            some: {
              status: 'CONFIRMED',
              startDate: { lte: end },
              endDate: { gte: start },
            },
          },
        },
      ],
    };
  }

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: {
        photos: { orderBy: { order: 'asc' }, take: 1 },
        owner: { select: { id: true, name: true } },
        options: {
          where: { status: { in: ['PENDING_RESPONSE', 'ACCEPTED'] } },
          select: { id: true, status: true, startDate: true, endDate: true, queuePosition: true },
          orderBy: { queuePosition: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return NextResponse.json({
    vehicles,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
