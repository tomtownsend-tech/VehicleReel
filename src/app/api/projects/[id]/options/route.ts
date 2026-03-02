import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addOptionSchema } from '@/lib/validators/project';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'PRODUCTION') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project || project.productionUserId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const parsed = addOptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const option = await prisma.option.findUnique({ where: { id: parsed.data.optionId } });
  if (!option || option.productionUserId !== session.user.id) {
    return NextResponse.json({ error: 'Option not found' }, { status: 404 });
  }

  const existing = await prisma.projectOption.findUnique({
    where: { projectId_optionId: { projectId: params.id, optionId: parsed.data.optionId } },
  });
  if (existing) {
    return NextResponse.json({ error: 'Option already in project' }, { status: 409 });
  }

  const projectOption = await prisma.projectOption.create({
    data: { projectId: params.id, optionId: parsed.data.optionId },
  });

  return NextResponse.json(projectOption, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'PRODUCTION') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project || project.productionUserId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const parsed = addOptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.projectOption.deleteMany({
    where: { projectId: params.id, optionId: parsed.data.optionId },
  });

  return NextResponse.json({ success: true });
}
