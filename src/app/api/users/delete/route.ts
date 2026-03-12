import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSupabase } from '@/lib/supabase';

const VALID_REASON_CATEGORIES = [
  'too_complicated',
  'dont_want_to_share',
  'concerned_about_insurance',
  'changed_my_mind',
  'other',
] as const;

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role === 'ADMIN') {
    return NextResponse.json({ error: 'Admin accounts cannot be deleted via this endpoint' }, { status: 403 });
  }

  const userId = session.user.id;

  // Parse optional deletion reason from request body
  let reasonCategory: string | undefined;
  let reasonText: string | undefined;
  try {
    const body = await request.json();
    if (body.reasonCategory && VALID_REASON_CATEGORIES.includes(body.reasonCategory)) {
      reasonCategory = body.reasonCategory;
    }
    if (typeof body.reasonText === 'string') {
      reasonText = body.reasonText.slice(0, 500);
    }
  } catch {
    // No body or invalid JSON — reason is optional
  }

  // Log the deletion reason before deleting the user
  if (reasonCategory) {
    await prisma.deletionLog.create({
      data: {
        email: session.user.email!,
        role: session.user.role as 'OWNER' | 'PRODUCTION' | 'COORDINATOR',
        reasonCategory,
        reasonText: reasonText || null,
      },
    });
  }

  const supabase = getSupabase();

  // Gather storage paths for cleanup
  const documents = await prisma.document.findMany({
    where: { userId },
    select: { fileUrl: true },
  });

  const vehicles = await prisma.vehicle.findMany({
    where: { ownerId: userId },
    select: { photos: { select: { url: true } } },
  });

  // Extract Supabase storage paths from URLs
  const docPaths = documents
    .map((d) => extractStoragePath(d.fileUrl, 'documents'))
    .filter(Boolean) as string[];

  const photoPaths = vehicles
    .flatMap((v) => v.photos.map((p) => extractStoragePath(p.url, 'vehicle-photos')))
    .filter(Boolean) as string[];

  // Remove files from Supabase storage
  if (docPaths.length > 0) {
    await supabase.storage.from('documents').remove(docPaths);
  }
  if (photoPaths.length > 0) {
    await supabase.storage.from('vehicle-photos').remove(photoPaths);
  }

  // Delete user — Prisma cascades handle related records
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ success: true });
}

function extractStoragePath(url: string, bucket: string): string | null {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.substring(idx + marker.length));
  } catch {
    return null;
  }
}
