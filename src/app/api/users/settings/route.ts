import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      emailNotifications: true,
      emailOptionsBookings: true,
      emailDocuments: true,
      emailMessages: true,
      emailShootLogistics: true,
      emailListings: true,
    },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json(user);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { email, ...notificationFields } = body;

  // Handle email update (test accounts only)
  if (email !== undefined) {
    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.isTestAccount) {
      return NextResponse.json({ error: 'Email editing is only available for test accounts' }, { status: 403 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { email },
    });

    return NextResponse.json({ success: true });
  }

  // Handle notification preferences update
  const allowedFields = [
    'emailNotifications',
    'emailOptionsBookings',
    'emailDocuments',
    'emailMessages',
    'emailShootLogistics',
    'emailListings',
  ] as const;

  const data: Record<string, boolean> = {};
  for (const field of allowedFields) {
    if (typeof notificationFields[field] === 'boolean') {
      data[field] = notificationFields[field];
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data,
  });

  return NextResponse.json({ success: true });
}
