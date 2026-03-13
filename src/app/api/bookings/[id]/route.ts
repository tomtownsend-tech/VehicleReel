import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      option: {
        include: {
          vehicle: {
            include: {
              owner: { select: { id: true, name: true, email: true, phone: true } },
            },
          },
          projectOptions: {
            include: { project: { select: { shootDayHours: true } } },
            take: 1,
          },
        },
      },
      productionUser: { select: { id: true, name: true, email: true, phone: true, companyName: true } },
      dailyDetails: { orderBy: { date: 'asc' } },
      checkIns: { orderBy: { date: 'asc' } },
      documents: {
        where: { type: 'INSURANCE' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  // Check authorization: owner, production user, admin, or project member (coordinator/art director)
  let isAuthorized = booking.ownerId === session.user.id
    || booking.productionUserId === session.user.id
    || session.user.role === 'ADMIN';
  if (!isAuthorized) {
    const membership = await prisma.projectMember.findFirst({
      where: {
        userId: session.user.id,
        project: {
          projectOptions: { some: { optionId: booking.optionId } },
        },
      },
    });
    isAuthorized = !!membership;
  }
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Backfill daily details for bookings created before the coordinator migration
  if (booking.dailyDetails.length === 0) {
    const days: { bookingId: string; date: Date }[] = [];
    const current = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    while (current <= end) {
      days.push({ bookingId: booking.id, date: new Date(current) });
      current.setDate(current.getDate() + 1);
    }
    if (days.length > 0) {
      await prisma.bookingDailyDetail.createMany({ data: days, skipDuplicates: true });
      const refreshed = await prisma.bookingDailyDetail.findMany({
        where: { bookingId: booking.id },
        orderBy: { date: 'asc' },
      });
      booking.dailyDetails = refreshed;
    }
  }

  // Extract shootDayHours from the first linked project (if any)
  const shootDayHours = booking.option.projectOptions?.[0]?.project?.shootDayHours ?? 10;

  return NextResponse.json({ ...booking, shootDayHours });
}
