import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSupabase } from '@/lib/supabase';
import { detectAndBlurPlates } from '@/lib/services/plate-blur';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Get all photos that haven't been processed yet (no originalUrl)
  const photos = await prisma.vehiclePhoto.findMany({
    where: { originalUrl: null },
    include: { vehicle: { select: { id: true } } },
  });

  const results = { total: photos.length, platesFound: 0, processed: 0, errors: 0 };

  for (const photo of photos) {
    try {
      // Download current image
      const response = await fetch(photo.url);
      if (!response.ok) {
        results.errors++;
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { processedBuffer, hasPlates } = await detectAndBlurPlates(buffer);

      if (!hasPlates) {
        results.processed++;
        continue;
      }

      // Upload blurred version to a new path
      const ext = photo.url.split('.').pop()?.split('?')[0] || 'jpg';
      const blurredPath = `vehicles/${photo.vehicle.id}/blurred/${Date.now()}-${photo.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicle-photos')
        .upload(blurredPath, processedBuffer, { contentType: 'image/jpeg' });

      if (uploadError) {
        console.error('Backfill upload error:', uploadError);
        results.errors++;
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('vehicle-photos')
        .getPublicUrl(blurredPath);

      // Current url becomes originalUrl, blurred becomes new url
      await prisma.vehiclePhoto.update({
        where: { id: photo.id },
        data: {
          originalUrl: photo.url,
          url: urlData.publicUrl,
        },
      });

      results.platesFound++;
      results.processed++;
    } catch (err) {
      console.error(`Backfill error for photo ${photo.id}:`, err);
      results.errors++;
    }
  }

  return NextResponse.json(results);
}
