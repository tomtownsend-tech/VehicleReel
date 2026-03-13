import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { safeNotify } from '@/lib/services/notification';

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['COORDINATOR', 'ART_DIRECTOR']),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { productionUserId: true },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // Allow production owner, admin, or project members to view team
  const isOwner = project.productionUserId === session.user.id;
  const isAdmin = session.user.role === 'ADMIN';
  const isMember = !isOwner && !isAdmin && await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: params.id, userId: session.user.id } },
  });

  if (!isOwner && !isAdmin && !isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId: params.id },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(members);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { productionUserId: true, name: true },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // Only the production owner or admin can add members
  if (project.productionUserId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
  }

  const { email, role } = parsed.data;

  // Find the user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'No user found with that email address' }, { status: 404 });
  }

  // Validate user role matches member role
  if (role === 'COORDINATOR' && user.role !== 'COORDINATOR') {
    return NextResponse.json({ error: 'User is not registered as a coordinator' }, { status: 400 });
  }
  if (role === 'ART_DIRECTOR' && user.role !== 'ART_DEPARTMENT') {
    return NextResponse.json({ error: 'User is not registered as art department' }, { status: 400 });
  }

  // Check if already a member
  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: params.id, userId: user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: 'User is already a member of this project' }, { status: 409 });
  }

  const member = await prisma.projectMember.create({
    data: {
      projectId: params.id,
      userId: user.id,
      role,
    },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  // Notify the added user
  await safeNotify({
    userId: user.id,
    type: 'COORDINATOR_ASSIGNED',
    title: `Added to Project: ${project.name}`,
    message: `You have been added to the project "${project.name}" as ${role === 'COORDINATOR' ? 'a coordinator' : 'an art director'}.`,
    data: { projectId: params.id },
  });

  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { productionUserId: true },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  if (project.productionUserId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId: params.id, userId } },
  }).catch(() => null);

  return NextResponse.json({ success: true });
}
