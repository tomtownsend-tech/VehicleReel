import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSupabase } from '@/lib/supabase';
import { detectAndBlurPlates } from '@/lib/services/plate-blur';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } });
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    if (vehicle.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `Could not read uploaded files: ${msg}` }, { status: 400 });
    }

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

    const orderOverride = formData.get('order');
    const existingCount = await prisma.vehiclePhoto.count({ where: { vehicleId: params.id } });

    const photos = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const contentType = file.type || 'image/jpeg';
      const path = `vehicles/${params.id}/${Date.now()}-${i}.${ext}`;

      const buffer = Buffer.from(await file.arrayBuffer());

      // Detect and blur license plates
      const { processedBuffer, hasPlates } = await detectAndBlurPlates(buffer);

      // Upload processed (blurred) image as public photo
      const { error } = await supabase.storage
        .from('vehicle-photos')
        .upload(path, processedBuffer, { contentType });

      if (error) {
        console.error('Supabase upload error:', error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('vehicle-photos')
        .getPublicUrl(path);

      // If plates were found, also upload original for owner/admin viewing
      let originalUrl: string | null = null;
      if (hasPlates) {
        const originalPath = `vehicles/${params.id}/originals/${Date.now()}-${i}.${ext}`;
        const { error: origError } = await supabase.storage
          .from('vehicle-photos')
          .upload(originalPath, buffer, { contentType });

        if (!origError) {
          const { data: origUrlData } = supabase.storage
            .from('vehicle-photos')
            .getPublicUrl(originalPath);
          originalUrl = origUrlData.publicUrl;
        } else {
          console.error('Original photo upload error:', origError);
        }
      }

      const photoOrder = orderOverride !== null ? parseInt(orderOverride as string) : existingCount + i;

      const photo = await prisma.vehiclePhoto.create({
        data: {
          vehicleId: params.id,
          url: urlData.publicUrl,
          originalUrl,
          order: photoOrder,
        },
      });
      photos.push(photo);
    }

    return NextResponse.json(photos, { status: 201 });
  } catch (err) {
    console.error('Photo upload error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
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

    const path = photo.url.split('/vehicle-photos/')[1];
    const pathsToDelete: string[] = [];
    if (path) pathsToDelete.push(path);
    if (photo.originalUrl) {
      const origPath = photo.originalUrl.split('/vehicle-photos/')[1];
      if (origPath) pathsToDelete.push(origPath);
    }
    if (pathsToDelete.length > 0) {
      await supabase.storage.from('vehicle-photos').remove(pathsToDelete);
    }

    await prisma.vehiclePhoto.delete({ where: { id: photoId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Photo delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
