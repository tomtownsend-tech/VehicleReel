import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validators/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { sendEmail, emailVerificationEmail } from '@/lib/services/email';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 registrations per 15 minutes per IP
    const ip = getClientIp(request);
    const { success } = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
    if (!success) {
      return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password, role, phone, companyName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        phone,
        companyName,
        status: 'PENDING_VERIFICATION',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    // Send verification email
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

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
