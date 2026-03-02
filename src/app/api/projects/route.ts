import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createProjectSchema } from '@/lib/validators/project';
import { toUTCDate } from '@/lib/utils/date';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'PRODUCTION') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const projects = await prisma.project.findMany({
    where: { productionUserId: session.user.id },
    include: {
      projectOptions: {
        include: {
          option: {
            include: {
              vehicle: {
                include: {
                  photos: { take: 4, orderBy: { order: 'asc' } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const data = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    startDate: p.startDate,
    endDate: p.endDate,
    shareToken: p.shareToken,
    createdAt: p.createdAt,
    optionCount: p.projectOptions.length,
    thumbnails: p.projectOptions
      .slice(0, 4)
      .map((po) => po.option.vehicle.photos[0]?.url)
      .filter(Boolean),
  }));

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'PRODUCTION') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      productionUserId: session.user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      startDate: toUTCDate(parsed.data.startDate),
      endDate: toUTCDate(parsed.data.endDate),
    },
  });

  return NextResponse.json(project, { status: 201 });
}
