import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSupabase } from '@/lib/supabase';
import { updateVehicleSchema } from '@/lib/validators/vehicle';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: params.id },
    include: {
      photos: { orderBy: { order: 'asc' } },
      owner: { select: { id: true, name: true, email: true, phone: true } },
      documents: { select: { id: true, type: true, status: true } },
      availability: { orderBy: { startDate: 'asc' } },
      options: {
        where: { status: { in: ['PENDING_RESPONSE', 'ACCEPTED'] } },
        select: { id: true, status: true, startDate: true, endDate: true, queuePosition: true },
        orderBy: { queuePosition: 'asc' },
      },
    },
  });

  if (!vehicle) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  }

  // Non-admin, non-owner users should only see active vehicles
  if (session.user.role !== 'ADMIN' && vehicle.ownerId !== session.user.id && vehicle.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  }

  // Fetch confirmed bookings separately (Booking relates to Vehicle via vehicleId)
  const confirmedBookings = await prisma.booking.findMany({
    where: { vehicleId: params.id, status: 'CONFIRMED' },
    select: { id: true, startDate: true, endDate: true },
    orderBy: { startDate: 'asc' },
  });

  return NextResponse.json({ ...vehicle, bookings: confirmedBookings });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } });
  if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  if (vehicle.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateVehicleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.vehicle.update({
    where: { id: params.id },
    data: parsed.data,
    include: { photos: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } });
  if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  if (vehicle.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Clean up storage files
  const photos = await prisma.vehiclePhoto.findMany({
    where: { vehicleId: params.id },
    select: { url: true, originalUrl: true },
  });
  const documents = await prisma.document.findMany({
    where: { vehicleId: params.id },
    select: { fileUrl: true },
  });

  const supabase = getSupabase();
  const photoPaths = photos.flatMap((p) => {
    const paths: string[] = [];
    if (p.url) paths.push(p.url.split('/vehicle-photos/')[1]);
    if (p.originalUrl) paths.push(p.originalUrl.split('/vehicle-photos/')[1]);
    return paths;
  }).filter(Boolean);
  const docPaths = documents.map((d) => d.fileUrl.split('/documents/')[1]).filter(Boolean);

  if (photoPaths.length > 0) await supabase.storage.from('vehicle-photos').remove(photoPaths);
  if (docPaths.length > 0) await supabase.storage.from('documents').remove(docPaths);

  await prisma.vehicle.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
