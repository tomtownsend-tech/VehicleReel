import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSupabase } from '@/lib/supabase';

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
  const supabase = getSupabase();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const type = formData.get('type') as string;
  const vehicleId = formData.get('vehicleId') as string | null;

  if (!file || !type) {
    return NextResponse.json({ error: 'File and type are required' }, { status: 400 });
  }

  const validTypes = ['SA_ID', 'DRIVERS_LICENSE', 'VEHICLE_REGISTRATION', 'COMPANY_REGISTRATION'];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
  }

  // Validate file size (10MB max for documents)
  const MAX_DOC_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_DOC_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
  }

  // Validate MIME type
  const ALLOWED_DOC_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (!ALLOWED_DOC_MIMES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Allowed: PDF, JPEG, PNG, WebP.' }, { status: 400 });
  }

  // Validate file extension matches MIME type
  const MIME_TO_EXT: Record<string, string[]> = {
    'application/pdf': ['pdf'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
  };
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !MIME_TO_EXT[file.type]?.includes(ext)) {
    return NextResponse.json({ error: 'File extension does not match file type.' }, { status: 400 });
  }

  const path = `documents/${session.user.id}/${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from('documents')
    .upload(path, buffer, { contentType: file.type });

  if (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);

  const document = await prisma.document.create({
    data: {
      userId: session.user.id,
      vehicleId,
      type: type as 'SA_ID' | 'DRIVERS_LICENSE' | 'VEHICLE_REGISTRATION' | 'COMPANY_REGISTRATION',
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
}
