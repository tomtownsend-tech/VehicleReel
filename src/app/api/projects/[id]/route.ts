import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateProjectSchema } from '@/lib/validators/project';
import { toUTCDate } from '@/lib/utils/date';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      productionUser: { select: { id: true, name: true, companyName: true } },
      projectOptions: {
        include: {
          option: {
            include: {
              vehicle: {
                include: {
                  photos: { take: 1, orderBy: { order: 'asc' } },
                },
              },
              booking: { select: { id: true, status: true } },
            },
          },
        },
      },
      members: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Allow production owner, admin, or project members
  const isOwner = project.productionUserId === session.user.id;
  const isAdmin = session.user.role === 'ADMIN';
  const isMember = project.members.some((m) => m.userId === session.user.id);
  if (!isOwner && !isAdmin && !isMember) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'PRODUCTION') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project || project.productionUserId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.startDate) updateData.startDate = toUTCDate(parsed.data.startDate);
  if (parsed.data.endDate) updateData.endDate = toUTCDate(parsed.data.endDate);
  if (parsed.data.shootDayHours !== undefined) updateData.shootDayHours = parsed.data.shootDayHours;

  const updated = await prisma.project.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'PRODUCTION') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project || project.productionUserId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.project.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
