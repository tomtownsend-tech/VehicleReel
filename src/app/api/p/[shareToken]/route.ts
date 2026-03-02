import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { shareToken: string } },
) {
  const project = await prisma.project.findUnique({
    where: { shareToken: params.shareToken },
    include: {
      productionUser: { select: { name: true, companyName: true } },
      projectOptions: {
        include: {
          option: {
            include: {
              vehicle: {
                include: {
                  photos: { take: 1, orderBy: { order: 'asc' } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const vehicles = project.projectOptions.map((po) => ({
    photo: po.option.vehicle.photos[0]?.url ?? null,
    year: po.option.vehicle.year,
    make: po.option.vehicle.make,
    model: po.option.vehicle.model,
    color: po.option.vehicle.color,
    type: po.option.vehicle.type,
    location: po.option.vehicle.location,
  }));

  return NextResponse.json({
    name: project.name,
    productionUser: project.productionUser.companyName || project.productionUser.name,
    vehicles,
  });
}
