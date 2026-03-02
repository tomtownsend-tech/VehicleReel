import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { bookingDetailsSchema } from '@/lib/validators/booking';
import { updateBookingDetails } from '@/lib/services/booking';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = bookingDetailsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const booking = await updateBookingDetails(params.id, session.user.id, parsed.data);
    return NextResponse.json(booking);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    const status = message === 'Not authorized' ? 403 : message === 'Booking not found' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
