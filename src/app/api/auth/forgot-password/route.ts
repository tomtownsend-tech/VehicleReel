import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail, passwordResetEmail } from '@/lib/services/email';

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Always return 200 to not reveal if email exists
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ success: true });
  }

  // Delete any existing tokens for this email
  await prisma.passwordResetToken.deleteMany({ where: { email } });

  // Create new token with 1-hour expiry
  const token = crypto.randomUUID();
  await prisma.passwordResetToken.create({
    data: {
      email,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  // Send email
  const baseUrl = process.env.NEXTAUTH_URL || 'https://vehiclereel.co.za';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const { subject, html, text } = passwordResetEmail(user.name, resetUrl);
  await sendEmail({ to: email, subject, html, text });

  return NextResponse.json({ success: true });
}
