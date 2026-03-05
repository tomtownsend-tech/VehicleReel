import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail, emailVerificationEmail } from '@/lib/services/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Mode 1: Verify token
    if (body.token) {
      const { token } = body;
      if (typeof token !== 'string') {
        return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
      }

      const verificationToken = await prisma.emailVerificationToken.findUnique({ where: { token } });
      if (!verificationToken) {
        return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 });
      }
      if (verificationToken.expiresAt < new Date()) {
        await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });
        return NextResponse.json({ error: 'Verification link has expired. Please request a new one.' }, { status: 400 });
      }

      await prisma.user.update({
        where: { email: verificationToken.email },
        data: { emailVerified: true },
      });

      await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });

      return NextResponse.json({ success: true });
    }

    // Mode 2: Resend verification email
    if (body.resend) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { name: true, email: true, emailVerified: true },
      });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      if (user.emailVerified) {
        return NextResponse.json({ error: 'Email already verified' }, { status: 400 });
      }

      // Delete existing tokens for this email
      await prisma.emailVerificationToken.deleteMany({ where: { email: user.email } });

      const token = crypto.randomUUID();
      await prisma.emailVerificationToken.create({
        data: {
          email: user.email,
          token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const baseUrl = process.env.NEXTAUTH_URL || 'https://vehiclereel.co.za';
      const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
      const { subject, html } = emailVerificationEmail(user.name, verifyUrl);
      await sendEmail({ to: user.email, subject, html });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
