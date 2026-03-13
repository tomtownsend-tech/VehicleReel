'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  memberRole: string;
  productionUser: { name: string; companyName: string | null };
  projectOptions: { option: { vehicle: { make: string; model: string; year: number; photos: { url: string }[] }; booking: { status: string } | null } }[];
  members: { user: { name: string; role: string } }[];
}

export default function ArtDepartmentProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/art-department/projects')
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">My Projects</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">My Projects ({projects.length})</h1>

      {projects.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/15 rounded-xl">
          <FolderOpen className="h-12 w-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/50 mb-2">No projects yet.</p>
          <p className="text-sm text-white/40">You&apos;ll see projects here once a production company adds you to one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const vehicleCount = project.projectOptions.length;
            const bookedCount = project.projectOptions.filter((po) => po.option.booking?.status === 'CONFIRMED').length;

            return (
              <Link key={project.id} href={`/art-department/projects/${project.id}`}>
                <Card className="hover:border-white/20 transition-colors cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="font-semibold text-white">{project.name}</h2>
                          <Badge variant="default">{project.memberRole === 'ART_DIRECTOR' ? 'Art Director' : 'Coordinator'}</Badge>
                        </div>
                        <p className="text-sm text-white/50">
                          {project.productionUser.companyName || project.productionUser.name}
                        </p>
                        <div className="flex items-center gap-1 text-sm text-white/40 mt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(project.startDate)} &ndash; {formatDate(project.endDate)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-white/50">
                        <span>{vehicleCount} vehicle{vehicleCount !== 1 ? 's' : ''}</span>
                        <span>{bookedCount} booked</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
