import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import LookbookClient from './LookbookClient';

// Subtle background tints that cycle across sections
const BG_TINTS = [
  '#1a1a1a', // charcoal
  '#1c1916', // warm dark
  '#161a1c', // cool dark
  '#1a1717', // muted wine
  '#17191a', // slate
  '#1a1a17', // olive dark
];

export default async function LookbookPage({
  params,
}: {
  params: { id: string };
}) {
  const project = await prisma.project.findUnique({
    where: { shareToken: params.id },
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
    notFound();
  }

  const vehicles = project.projectOptions.map((po, i) => {
    const { vehicle } = po.option;
    return {
      id: vehicle.id,
      title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      color: vehicle.color,
      type: vehicle.type,
      location: vehicle.location,
      photoUrl: vehicle.photos[0]?.url ?? null,
      bgTint: BG_TINTS[i % BG_TINTS.length],
    };
  });

  const companyName = project.productionUser.companyName || project.productionUser.name;

  return (
    <LookbookClient
      projectName={project.name}
      companyName={companyName}
      vehicles={vehicles}
    />
  );
}
