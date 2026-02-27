import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { confirmBooking } from '@/lib/services/booking';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'PRODUCTION') {
    return NextResponse.json({ error: 'Only production users can confirm' }, { status: 403 });
  }

  const body = await request.json();
  const { logistics } = body;

  if (!['VEHICLE_COLLECTION', 'OWNER_DELIVERY'].includes(logistics)) {
    return NextResponse.json({ error: 'Invalid logistics type' }, { status: 400 });
  }

  try {
    const booking = await confirmBooking(params.id, session.user.id, logistics);
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to confirm';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
