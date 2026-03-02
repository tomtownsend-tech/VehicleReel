import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assignCoordinator } from '@/lib/services/booking';

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
        coordinator: { select: { id: true, name: true } },
        checkIns: true,
        dailyDetails: true,
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

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { bookingId, coordinatorId, action } = body;

  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId required' }, { status: 400 });
  }

  // Assign coordinator
  if (coordinatorId) {
    try {
      const booking = await assignCoordinator(bookingId, coordinatorId, session.user.id);
      return NextResponse.json(booking);
    } catch (e: unknown) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
    }
  }

  // Complete booking
  if (action === 'COMPLETE') {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.status !== 'PAYMENT_READY') {
      return NextResponse.json({ error: 'Booking must be in PAYMENT_READY status' }, { status: 400 });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'COMPLETED' },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BOOKING_COMPLETED',
        entityType: 'BOOKING',
        entityId: bookingId,
      },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
