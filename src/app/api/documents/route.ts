import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  // Only admins can query other users' documents
  const requestedUserId = searchParams.get('userId');
  const userId = (session.user.role === 'ADMIN' && requestedUserId) ? requestedUserId : session.user.id;
  const vehicleId = searchParams.get('vehicleId');

  const where: Record<string, string> = { userId };
  if (vehicleId) where.vehicleId = vehicleId;

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.document.count({ where }),
  ]);

  return NextResponse.json({
    data: documents,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (e) {
      console.error('FormData parse error:', e);
      return NextResponse.json({ error: 'Could not read uploaded file. The file may be too large (max 4.5MB on Vercel).' }, { status: 400 });
    }

    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const vehicleId = formData.get('vehicleId') as string | null;

    if (!file || !type) {
      return NextResponse.json({ error: 'File and type are required' }, { status: 400 });
    }

    const validTypes = ['SA_ID', 'DRIVERS_LICENSE', 'VEHICLE_REGISTRATION', 'COMPANY_REGISTRATION', 'INSURANCE'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    const bookingId = formData.get('bookingId') as string | null;

    // Insurance documents require a bookingId and must be uploaded by the production user
    if (type === 'INSURANCE') {
      if (!bookingId) {
        return NextResponse.json({ error: 'Booking ID is required for insurance documents' }, { status: 400 });
      }
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      if (booking.productionUserId !== session.user.id) {
        return NextResponse.json({ error: 'Only the production user can upload insurance for this booking' }, { status: 403 });
      }
      // Block duplicate upload if one is already PENDING_REVIEW or APPROVED (allow re-upload if FLAGGED)
      const existingInsurance = await prisma.document.findFirst({
        where: { bookingId, type: 'INSURANCE', status: { in: ['PENDING_REVIEW', 'APPROVED'] } },
      });
      if (existingInsurance) {
        return NextResponse.json({ error: 'An insurance document is already uploaded for this booking' }, { status: 409 });
      }
    }

    // Validate file size (4MB max to stay within Vercel limits)
    const MAX_DOC_SIZE = 4 * 1024 * 1024;
    if (file.size > MAX_DOC_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 4MB.' }, { status: 400 });
    }

    // Validate MIME type — allow common document and image types
    if (file.type && !file.type.startsWith('image/') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Invalid file type. Allowed: PDF, JPEG, PNG, WebP.' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const contentType = file.type || 'application/octet-stream';
    const path = `documents/${session.user.id}/${Date.now()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage
      .from('documents')
      .upload(path, buffer, { contentType });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);

    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        vehicleId,
        bookingId: type === 'INSURANCE' ? bookingId : undefined,
        type: type as 'SA_ID' | 'DRIVERS_LICENSE' | 'VEHICLE_REGISTRATION' | 'COMPANY_REGISTRATION' | 'INSURANCE',
        fileUrl: urlData.publicUrl,
        fileName: file.name,
        status: 'PENDING_REVIEW',
      },
    });

    // Queue for AI review
    await prisma.documentReviewQueue.create({
      data: {
        documentId: document.id,
        status: 'PENDING',
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (err) {
    console.error('Document upload handler error:', err);
    return NextResponse.json({ error: 'Internal server error during document upload' }, { status: 500 });
  }
}
