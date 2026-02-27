import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createOptionSchema } from '@/lib/validators/option';
import { placeOption } from '@/lib/services/option';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const role = searchParams.get('role') || session.user.role;
  const status = searchParams.get('status');

  const where: Record<string, unknown> = {};

  if (role === 'OWNER') {
    where.vehicle = { ownerId: session.user.id };
  } else if (role === 'PRODUCTION') {
    where.productionUserId = session.user.id;
  }

  if (status) {
    where.status = status;
  }

  const options = await prisma.option.findMany({
    where,
    include: {
      vehicle: {
        include: {
          photos: { take: 1, orderBy: { order: 'asc' } },
          owner: { select: { id: true, name: true, email: true } },
        },
      },
      productionUser: { select: { id: true, name: true, email: true, companyName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(options);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'PRODUCTION') {
    return NextResponse.json({ error: 'Only production users can place options' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createOptionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const option = await placeOption({
      ...parsed.data,
      productionUserId: session.user.id,
    });

    return NextResponse.json(option, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to place option';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
