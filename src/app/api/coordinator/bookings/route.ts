import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'COORDINATOR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find all bookings on projects where this user is a coordinator member
  const bookings = await prisma.booking.findMany({
    where: {
      option: {
        projectOptions: {
          some: {
            project: {
              members: {
                some: { userId: session.user.id, role: 'COORDINATOR' },
              },
            },
          },
        },
      },
    },
    include: {
      option: {
        include: {
          vehicle: {
            include: {
              owner: { select: { id: true, name: true } },
              photos: { take: 1, orderBy: { order: 'asc' } },
            },
          },
          projectOptions: {
            include: { project: { select: { id: true, name: true } } },
            take: 1,
          },
        },
      },
      productionUser: { select: { id: true, name: true, companyName: true } },
      dailyDetails: { orderBy: { date: 'asc' } },
      checkIns: { orderBy: { date: 'asc' } },
      documents: {
        where: { type: 'INSURANCE' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { startDate: 'asc' },
  });

  return NextResponse.json(bookings);
}
