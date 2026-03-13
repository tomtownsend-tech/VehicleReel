import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ART_DEPARTMENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find all projects where this user is a member
  const memberships = await prisma.projectMember.findMany({
    where: { userId: session.user.id },
    include: {
      project: {
        include: {
          productionUser: { select: { id: true, name: true, companyName: true } },
          projectOptions: {
            include: {
              option: {
                include: {
                  vehicle: {
                    include: { photos: { take: 1, orderBy: { order: 'asc' } } },
                  },
                  booking: { select: { id: true, status: true } },
                },
              },
            },
          },
          members: {
            include: { user: { select: { id: true, name: true, role: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const projects = memberships.map((m) => ({
    ...m.project,
    memberRole: m.role,
  }));

  return NextResponse.json(projects);
}
