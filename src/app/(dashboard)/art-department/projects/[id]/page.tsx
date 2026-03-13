'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Users, Download, Link2, Check } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { downloadProjectImages } from '@/lib/utils/download-project';
import { VehicleDetailModal } from '@/components/VehicleDetailModal';

interface VehiclePhoto { url: string }

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  type: string;
  location: string;
  photos: VehiclePhoto[];
}

interface ProjectOption {
  optionId: string;
  option: {
    id: string;
    status: string;
    vehicle: Vehicle;
    booking: { id: string; status: string } | null;
  };
}

interface Member {
  userId: string;
  role: string;
  user: { id: string; name: string; email: string; role: string };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  shareToken: string;
  productionUser: { name: string; companyName: string | null };
  projectOptions: ProjectOption[];
  members: Member[];
}

const DECLINED_STATUSES = ['DECLINED_BY_OWNER', 'EXPIRED_RESPONSE', 'EXPIRED_CONFIRMATION', 'DECLINED_OVERLAP', 'DECLINED_BLOCKED', 'DECLINED_ADMIN'];

export default function ArtDepartmentProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) { router.push('/art-department/projects'); return; }
    const data = await res.json();
    setProject(data);
    setLoading(false);
  }, [projectId, router]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  async function handleDownload() {
    if (!project) return;
    setDownloading(true);
    try {
      const vehicles = project.projectOptions
        .filter((po) => po.option.vehicle.photos[0]?.url)
        .map((po) => ({
          photoUrl: po.option.vehicle.photos[0].url,
          year: po.option.vehicle.year,
          make: po.option.vehicle.make,
          model: po.option.vehicle.model,
        }));
      await downloadProjectImages(project.name, vehicles);
    } finally {
      setDownloading(false);
    }
  }

  function handleShare() {
    if (!project) return;
    const url = `${window.location.origin}/p/${project.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || !project) {
    return <div className="animate-pulse space-y-4"><div className="h-10 bg-gray-800 rounded w-48" /><div className="h-64 bg-gray-800 rounded-xl" /></div>;
  }

  const coordinators = project.members.filter((m) => m.role === 'COORDINATOR');
  const artDirectors = project.members.filter((m) => m.role === 'ART_DIRECTOR');

  return (
    <div>
      <Link
        href="/art-department/projects"
        className="flex items-center gap-2 text-sm text-white/60 hover:text-white mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Projects
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          <p className="text-sm text-white/50 mt-1">
            {project.productionUser.companyName || project.productionUser.name}
            <span className="mx-2">&middot;</span>
            {formatDate(project.startDate)} &ndash; {formatDate(project.endDate)}
            <span className="mx-2">&middot;</span>
            {project.projectOptions.length} vehicle{project.projectOptions.length !== 1 ? 's' : ''}
          </p>
          {project.description && (
            <p className="text-sm text-white/60 mt-2">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading || project.projectOptions.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            {downloading ? 'Downloading...' : 'Download Images'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
            {copied ? 'Copied!' : 'Share'}
          </Button>
        </div>
      </div>

      {/* Team */}
      {(coordinators.length > 0 || artDirectors.length > 0) && (
        <div className="mb-6 p-4 bg-gray-900 rounded-xl border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-white/50" />
            <h3 className="text-sm font-medium text-white">Team</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {coordinators.map((m) => (
              <Badge key={m.userId} variant="default">{m.user.name} (Coordinator)</Badge>
            ))}
            {artDirectors.map((m) => (
              <Badge key={m.userId} variant="default">{m.user.name} (Art Director)</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Vehicles Grid */}
      {project.projectOptions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/15 rounded-xl">
          <p className="text-white/50">No vehicles in this project yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {project.projectOptions.map((po) => {
            const { option } = po;
            const { vehicle } = option;
            const photo = vehicle.photos[0]?.url;
            const isDeclined = DECLINED_STATUSES.includes(option.status);
            const isBooked = option.booking?.status === 'CONFIRMED';

            return (
              <div
                key={po.optionId}
                className={`relative rounded-xl border border-white/10 bg-gray-900 overflow-hidden cursor-pointer hover:border-white/20 transition-colors ${isDeclined ? 'opacity-50' : ''}`}
                onClick={() => setSelectedVehicleId(vehicle.id)}
              >
                <div className="aspect-video bg-gray-800 relative">
                  {photo ? (
                    <img src={photo} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">No photo</div>
                  )}
                  {isBooked && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="success">Booked</Badge>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-white text-sm">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </p>
                  <p className="text-xs text-white/50 mt-0.5">
                    {vehicle.color} &middot; {vehicle.type.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-white/50 mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {vehicle.location}
                  </p>
                  {isDeclined && (
                    <Badge variant="danger" className="mt-2 text-xs">
                      {option.status.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <VehicleDetailModal vehicleId={selectedVehicleId} onClose={() => setSelectedVehicleId(null)} />
    </div>
  );
}
