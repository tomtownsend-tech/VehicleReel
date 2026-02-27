import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      _count: { select: { vehicles: true, optionsAsProduction: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { userId, action } = body;

  if (!userId || !['BAN', 'UNBAN'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const newStatus = action === 'BAN' ? 'BANNED' : 'VERIFIED';

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: newStatus },
  });

  // If banning, suspend all their vehicles and decline pending options
  if (action === 'BAN') {
    const vehicles = await prisma.vehicle.findMany({
      where: { ownerId: userId },
    });

    for (const vehicle of vehicles) {
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { status: 'REMOVED' },
      });

      await prisma.option.updateMany({
        where: {
          vehicleId: vehicle.id,
          status: { in: ['PENDING_RESPONSE', 'ACCEPTED'] },
        },
        data: { status: 'DECLINED_ADMIN' },
      });
    }

    await prisma.notification.create({
      data: {
        userId,
        type: 'USER_BANNED',
        title: 'Account Banned',
        message: 'Your account has been banned by an administrator.',
      },
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: `USER_${action}`,
      entityType: 'USER',
      entityId: userId,
      details: { targetUser: user.email },
    },
  });

  return NextResponse.json(user);
}
