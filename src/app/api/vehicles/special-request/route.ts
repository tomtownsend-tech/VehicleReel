import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { specialVehicleRequestEmail } from '@/lib/services/email';
import { safeNotify } from '@/lib/services/notification';
import { z } from 'zod';

const specialRequestSchema = z.object({
  vehicleDescription: z.string().min(1, 'Vehicle description is required').max(1000),
  shootDates: z.string().min(1, 'Shoot dates are required').max(200),
  additionalNotes: z.string().max(2000).optional().default(''),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'PRODUCTION') {
    return NextResponse.json({ error: 'Only production users can submit special requests' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = specialRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, companyName: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Get all admin users
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, email: true, emailNotifications: true },
  });

  const emailContent = specialVehicleRequestEmail(
    user.name,
    user.email,
    user.phone,
    user.companyName,
    parsed.data.vehicleDescription,
    parsed.data.shootDates,
    parsed.data.additionalNotes,
  );

  // Send email and in-app notification to all admins
  for (const admin of admins) {
    await safeNotify({
      userId: admin.id,
      type: 'SPECIAL_REQUEST',
      title: 'Special Vehicle Request',
      message: `${user.name} is looking for: ${parsed.data.vehicleDescription}`,
      data: {
        productionUserId: session.user.id,
        productionUserName: user.name,
        productionUserEmail: user.email,
        vehicleDescription: parsed.data.vehicleDescription,
        shootDates: parsed.data.shootDates,
      },
      emailContent,
    });
  }

  return NextResponse.json({ success: true });
}
