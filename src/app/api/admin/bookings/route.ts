import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      include: {
        option: {
          include: { vehicle: { select: { make: true, model: true, year: true } } },
        },
        productionUser: { select: { name: true, companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.booking.count(),
  ]);

  return NextResponse.json({
    data: bookings,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
