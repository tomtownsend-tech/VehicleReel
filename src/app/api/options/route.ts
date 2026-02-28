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
  const status = searchParams.get('status');

  // Use the actual session role, not a query parameter
  const where: Record<string, unknown> = {};

  if (session.user.role === 'OWNER') {
    where.vehicle = { ownerId: session.user.id };
  } else if (session.user.role === 'PRODUCTION') {
    where.productionUserId = session.user.id;
  }
  // ADMIN sees all options (no filter)

  if (status) {
    where.status = status;
  }

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

  const [options, total] = await Promise.all([
    prisma.option.findMany({
      where,
      include: {
        vehicle: {
          include: {
            photos: { take: 1, orderBy: { order: 'asc' } },
            owner: { select: { id: true, name: true, email: true } },
          },
        },
        productionUser: { select: { id: true, name: true, email: true, companyName: true } },
        booking: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.option.count({ where }),
  ]);

  return NextResponse.json({
    data: options,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'PRODUCTION') {
    return NextResponse.json({ error: 'Only production users can place options' }, { status: 403 });
  }
  if (session.user.status !== 'VERIFIED') {
    return NextResponse.json({ error: 'Account must be verified to place options' }, { status: 403 });
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
