import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkInSchema } from '@/lib/validators/booking';
import { checkInDay } from '@/lib/services/booking';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = checkInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  try {
    const checkIn = await checkInDay(params.id, parsed.data.date, session.user.id);
    return NextResponse.json(checkIn, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Already checked in for this date' }, { status: 409 });
    }
    const status = message === 'Not authorized' ? 403 : message === 'Booking not found' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
