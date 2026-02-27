import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { availabilityBlockSchema } from '@/lib/validators/vehicle';
import { blockDatesAndDeclineOptions } from '@/lib/services/availability';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const blocks = await prisma.availabilityBlock.findMany({
    where: { vehicleId: params.id },
    orderBy: { startDate: 'asc' },
  });

  return NextResponse.json(blocks);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } });
  if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  if (vehicle.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = availabilityBlockSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const { block } = await blockDatesAndDeclineOptions(
    params.id,
    new Date(parsed.data.startDate),
    new Date(parsed.data.endDate),
    parsed.data.reason,
  );

  return NextResponse.json(block, { status: 201 });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DELETE(
  request: NextRequest,
  _context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const blockId = searchParams.get('blockId');
  if (!blockId) return NextResponse.json({ error: 'Block ID required' }, { status: 400 });

  const block = await prisma.availabilityBlock.findUnique({
    where: { id: blockId },
    include: { vehicle: true },
  });

  if (!block) return NextResponse.json({ error: 'Block not found' }, { status: 404 });
  if (block.vehicle.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.availabilityBlock.delete({ where: { id: blockId } });
  return NextResponse.json({ success: true });
}
