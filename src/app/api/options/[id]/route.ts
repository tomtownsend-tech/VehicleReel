import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { acceptOption, declineOption } from '@/lib/services/option';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const option = await prisma.option.findUnique({
    where: { id: params.id },
    include: {
      vehicle: {
        include: {
          photos: { take: 1, orderBy: { order: 'asc' } },
          owner: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
      productionUser: { select: { id: true, name: true, email: true, companyName: true, phone: true } },
      booking: true,
    },
  });

  if (!option) return NextResponse.json({ error: 'Option not found' }, { status: 404 });
  return NextResponse.json(option);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { action } = body;

  try {
    if (action === 'accept') {
      const option = await acceptOption(params.id, session.user.id);
      return NextResponse.json(option);
    } else if (action === 'decline') {
      const option = await declineOption(params.id, session.user.id);
      return NextResponse.json(option);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Action failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
