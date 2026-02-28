import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/services/notification';
import { messageReceivedEmail } from '@/lib/services/email';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
  });

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.ownerId !== session.user.id && booking.productionUserId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { bookingId: params.id },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(messages);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      option: { include: { vehicle: { select: { make: true, model: true } } } },
    },
  });

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.ownerId !== session.user.id && booking.productionUserId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Only allow messages on confirmed bookings
  if (booking.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Cannot send messages on a cancelled booking.' }, { status: 403 });
  }

  // Check if booking dates have passed (read-only)
  if (new Date() > booking.endDate) {
    return NextResponse.json({ error: 'This conversation is archived. No new messages allowed.' }, { status: 403 });
  }

  const body = await request.json();
  const { content } = body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Message content required' }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      bookingId: params.id,
      senderId: session.user.id,
      content: content.trim(),
    },
    include: { sender: { select: { id: true, name: true } } },
  });

  // Notify the other party
  const recipientId = session.user.id === booking.ownerId ? booking.productionUserId : booking.ownerId;
  const vehicleName = `${booking.option.vehicle.make} ${booking.option.vehicle.model}`;

  await createNotification({
    userId: recipientId,
    type: 'MESSAGE_RECEIVED',
    title: 'New Message',
    message: `${session.user.name} sent a message about your ${vehicleName} booking.`,
    data: { bookingId: params.id },
    emailContent: messageReceivedEmail(
      recipientId === booking.ownerId ? 'there' : 'there',
      session.user.name || 'Someone',
      vehicleName,
    ),
  });

  return NextResponse.json(message, { status: 201 });
}
