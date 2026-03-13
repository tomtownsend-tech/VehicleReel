import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { safeNotify } from '@/lib/services/notification';
import { messageReceivedEmail } from '@/lib/services/email';
import { MessageThread } from '@prisma/client';

const VALID_THREADS: MessageThread[] = ['PRODUCTION_COORDINATOR', 'OWNER_COORDINATOR'];

async function getBookingCoordinatorIds(bookingId: string, optionId: string): Promise<string[]> {
  const members = await prisma.projectMember.findMany({
    where: {
      role: 'COORDINATOR',
      project: {
        projectOptions: { some: { optionId } },
      },
    },
    select: { userId: true },
  });
  return members.map((m) => m.userId);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
  });

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const thread = request.nextUrl.searchParams.get('thread') as MessageThread | null;

  // If thread param provided, use coordinator-based messaging
  if (thread) {
    if (!VALID_THREADS.includes(thread)) {
      return NextResponse.json({ error: 'Invalid thread' }, { status: 400 });
    }

    const coordinatorIds = await getBookingCoordinatorIds(params.id, booking.optionId);
    if (coordinatorIds.length === 0) {
      return NextResponse.json({ error: 'No coordinator assigned yet' }, { status: 409 });
    }

    // Thread access control
    const role = session.user.role;
    const userId = session.user.id;
    if (role === 'PRODUCTION' && thread !== 'PRODUCTION_COORDINATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (role === 'OWNER' && thread !== 'OWNER_COORDINATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (role === 'COORDINATOR' && !coordinatorIds.includes(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (role !== 'COORDINATOR' && role !== 'ADMIN') {
      if (booking.productionUserId !== userId && booking.ownerId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const messages = await prisma.message.findMany({
      where: { bookingId: params.id, thread },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return NextResponse.json(messages);
  }

  // Legacy: no thread param — old direct messaging (backward compat)
  if (booking.ownerId !== session.user.id && booking.productionUserId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { bookingId: params.id, thread: null },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
    take: 100,
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

  if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Cannot send messages on this booking.' }, { status: 403 });
  }

  const body = await request.json();
  const { content, thread } = body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Message content required' }, { status: 400 });
  }

  const vehicleName = `${booking.option.vehicle.make} ${booking.option.vehicle.model}`;

  // Threaded messaging
  if (thread) {
    if (!VALID_THREADS.includes(thread)) {
      return NextResponse.json({ error: 'Invalid thread' }, { status: 400 });
    }

    const coordinatorIds = await getBookingCoordinatorIds(params.id, booking.optionId);
    if (coordinatorIds.length === 0) {
      return NextResponse.json({ error: 'No coordinator assigned yet' }, { status: 409 });
    }

    const role = session.user.role;
    const userId = session.user.id;

    if (thread === 'PRODUCTION_COORDINATOR') {
      if (role === 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (role === 'PRODUCTION' && booking.productionUserId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (role === 'COORDINATOR' && !coordinatorIds.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (thread === 'OWNER_COORDINATOR') {
      if (role === 'PRODUCTION') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (role === 'OWNER' && booking.ownerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (role === 'COORDINATOR' && !coordinatorIds.includes(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        bookingId: params.id,
        senderId: session.user.id,
        content: content.trim(),
        thread,
      },
      include: { sender: { select: { id: true, name: true } } },
    });

    // Determine recipients for notification
    if (role === 'COORDINATOR') {
      const recipientId = thread === 'PRODUCTION_COORDINATOR' ? booking.productionUserId : booking.ownerId;
      await safeNotify({
        userId: recipientId,
        type: 'MESSAGE_RECEIVED',
        title: 'New Message',
        message: `${session.user.name} sent a message about the ${vehicleName} booking.`,
        data: { bookingId: params.id },
        emailContent: messageReceivedEmail('there', session.user.name || 'Someone', vehicleName),
      });
    } else {
      // Production or owner messaging — notify all project coordinators
      for (const coordId of coordinatorIds) {
        await safeNotify({
          userId: coordId,
          type: 'MESSAGE_RECEIVED',
          title: 'New Message',
          message: `${session.user.name} sent a message about the ${vehicleName} booking.`,
          data: { bookingId: params.id },
          emailContent: messageReceivedEmail('there', session.user.name || 'Someone', vehicleName),
        });
      }
    }

    return NextResponse.json(message, { status: 201 });
  }

  // Legacy: no thread — old direct messaging
  if (booking.ownerId !== session.user.id && booking.productionUserId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (new Date() > booking.endDate) {
    return NextResponse.json({ error: 'This conversation is archived. No new messages allowed.' }, { status: 403 });
  }

  const message = await prisma.message.create({
    data: {
      bookingId: params.id,
      senderId: session.user.id,
      content: content.trim(),
    },
    include: { sender: { select: { id: true, name: true } } },
  });

  const recipientId = session.user.id === booking.ownerId ? booking.productionUserId : booking.ownerId;
  await safeNotify({
    userId: recipientId,
    type: 'MESSAGE_RECEIVED',
    title: 'New Message',
    message: `${session.user.name} sent a message about your ${vehicleName} booking.`,
    data: { bookingId: params.id },
    emailContent: messageReceivedEmail('there', session.user.name || 'Someone', vehicleName),
  });

  return NextResponse.json(message, { status: 201 });
}
