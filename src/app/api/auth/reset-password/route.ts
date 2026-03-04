import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const { token, password } = await request.json();

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken) {
    return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
  }
  if (resetToken.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
    return NextResponse.json({ error: 'Reset link has expired' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { email: resetToken.email },
    data: { passwordHash },
  });

  // Delete the used token
  await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });

  return NextResponse.json({ success: true });
}
