import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let step = 'init';
  try {
    step = 'getSupabase';
    const supabase = getSupabase();
    step = 'getSession';
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    step = 'findVehicle';
    const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } });
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    if (vehicle.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    step = 'parseFormData';
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `Could not read uploaded files: ${msg}` }, { status: 400 });
    }

    step = 'getFiles';
    const files = formData.getAll('photos') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate all files before processing any
    const MAX_PHOTO_SIZE = 4 * 1024 * 1024;

    for (const file of files) {
      if (file.size > MAX_PHOTO_SIZE) {
        return NextResponse.json({ error: `File "${file.name}" too large. Maximum size is 4MB per photo.` }, { status: 400 });
      }
      if (file.type && !file.type.startsWith('image/')) {
        return NextResponse.json({ error: `File "${file.name}" is not an image. Please upload JPEG, PNG, WebP, or HEIC photos.` }, { status: 400 });
      }
    }

    step = 'countExisting';
    const existingCount = await prisma.vehiclePhoto.count({ where: { vehicleId: params.id } });

    const photos = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const contentType = file.type || 'image/jpeg';
      const path = `vehicles/${params.id}/${Date.now()}-${i}.${ext}`;

      step = `upload-${i}-arrayBuffer`;
      const buffer = Buffer.from(await file.arrayBuffer());
      step = `upload-${i}-supabase`;
      const { error } = await supabase.storage
        .from('vehicle-photos')
        .upload(path, buffer, { contentType });

      if (error) {
        console.error('Supabase upload error:', error);
        continue;
      }

      step = `upload-${i}-getUrl`;
      const { data: urlData } = supabase.storage
        .from('vehicle-photos')
        .getPublicUrl(path);

      step = `upload-${i}-createRecord`;
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Photo upload error at step="${step}":`, err);
    return NextResponse.json({ error: `Upload failed at step: ${step}. ${msg}` }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DELETE(
  request: NextRequest,
  _context: { params: { id: string } }
) {
  try {
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
  } catch (err) {
    console.error('Photo delete handler error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
