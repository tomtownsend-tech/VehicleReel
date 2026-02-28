import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSupabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } });
  if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  if (vehicle.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const files = formData.getAll('photos') as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  // Validate all files before processing any
  const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
  const ALLOWED_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
  const MIME_TO_EXT: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
  };

  for (const file of files) {
    if (file.size > MAX_PHOTO_SIZE) {
      return NextResponse.json({ error: `File "${file.name}" too large. Maximum size is 5MB per photo.` }, { status: 400 });
    }
    if (!ALLOWED_PHOTO_MIMES.includes(file.type)) {
      return NextResponse.json({ error: `File "${file.name}" has invalid type. Allowed: JPEG, PNG, WebP.` }, { status: 400 });
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !MIME_TO_EXT[file.type]?.includes(ext)) {
      return NextResponse.json({ error: `File "${file.name}" extension does not match file type.` }, { status: 400 });
    }
  }

  const existingCount = await prisma.vehiclePhoto.count({ where: { vehicleId: params.id } });

  const photos = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const path = `vehicles/${params.id}/${Date.now()}-${i}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage
      .from('vehicle-photos')
      .upload(path, buffer, { contentType: file.type });

    if (error) {
      console.error('Upload error:', error);
      continue;
    }

    const { data: urlData } = supabase.storage
      .from('vehicle-photos')
      .getPublicUrl(path);

    const photo = await prisma.vehiclePhoto.create({
      data: {
        vehicleId: params.id,
        url: urlData.publicUrl,
        order: existingCount + i,
      },
    });
    photos.push(photo);
  }

  return NextResponse.json(photos, { status: 201 });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DELETE(
  request: NextRequest,
  _context: { params: { id: string } }
) {
  const supabase = getSupabase();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const photoId = searchParams.get('photoId');
  if (!photoId) return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });

  const photo = await prisma.vehiclePhoto.findUnique({
    where: { id: photoId },
    include: { vehicle: true },
  });

  if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  if (photo.vehicle.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete from Supabase storage
  const path = photo.url.split('/vehicle-photos/')[1];
  if (path) {
    await supabase.storage.from('vehicle-photos').remove([path]);
  }

  await prisma.vehiclePhoto.delete({ where: { id: photoId } });
  return NextResponse.json({ success: true });
}
