import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cancelBooking } from '@/lib/services/booking';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role !== 'PRODUCTION') {
    return NextResponse.json({ error: 'Only production companies can cancel bookings' }, { status: 403 });
  }

  const body = await request.json();
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason) {
    return NextResponse.json({ error: 'Cancellation reason is required' }, { status: 400 });
  }
  if (reason.length > 500) {
    return NextResponse.json({ error: 'Reason must be under 500 characters' }, { status: 400 });
  }

  try {
    const booking = await cancelBooking(params.id, session.user.id, reason);
    return NextResponse.json(booking);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Cancellation failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
