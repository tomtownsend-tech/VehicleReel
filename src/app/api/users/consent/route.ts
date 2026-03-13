import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CURRENT_TC_VERSION } from '@/lib/constants/tc-version';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (body.acceptTc !== true || body.acceptPopia !== true) {
    return NextResponse.json({ error: 'Both consents are required' }, { status: 400 });
  }

  const now = new Date();
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      tcVersion: CURRENT_TC_VERSION,
      tcConsentAt: now,
      popiaConsentAt: now,
    },
  });

  return NextResponse.json({ success: true, tcVersion: CURRENT_TC_VERSION });
}
