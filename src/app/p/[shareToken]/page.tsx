import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MapPin } from 'lucide-react';

export default async function PublicPresentationPage({
  params,
}: {
  params: { shareToken: string };
}) {
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
    notFound();
  }

  const companyName = project.productionUser.companyName || project.productionUser.name;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-500 mt-2">{companyName}</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {project.projectOptions.length === 0 ? (
          <p className="text-center text-gray-500 py-16">No vehicles to display.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {project.projectOptions.map((po) => {
              const { vehicle } = po.option;
              const photo = vehicle.photos[0]?.url;

              return (
                <div key={po.optionId} className="rounded-xl bg-white shadow-sm overflow-hidden border border-gray-200">
                  <div className="aspect-video bg-gray-100 relative">
                    {photo ? (
                      <img
                        src={photo}
                        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-gray-900">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {vehicle.color} &middot; {vehicle.type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {vehicle.location}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="py-6 text-center">
        <p className="text-xs text-gray-400">Powered by VehicleReel</p>
      </footer>
    </div>
  );
}
