import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { emailNotifications, email } = body;

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

  // Handle email notifications toggle
  if (typeof emailNotifications !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { emailNotifications },
  });

  return NextResponse.json({ success: true });
}
