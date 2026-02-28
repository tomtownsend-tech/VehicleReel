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

  const documents = await prisma.document.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(documents);
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

  const ext = file.name.split('.').pop();
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
