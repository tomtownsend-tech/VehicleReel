'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Link2, Plus, X, MapPin, Check } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { downloadProjectImages } from '@/lib/utils/download-project';

interface VehiclePhoto {
  url: string;
}

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

interface OptionItem {
  id: string;
  status: string;
  vehicle: Vehicle;
}

interface ProjectOption {
  optionId: string;
  option: OptionItem;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  shareToken: string;
  projectOptions: ProjectOption[];
}

interface AvailableOption {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
    photos: VehiclePhoto[];
  };
}

const DECLINED_STATUSES = ['DECLINED_BY_OWNER', 'EXPIRED_RESPONSE', 'EXPIRED_CONFIRMATION', 'DECLINED_OVERLAP', 'DECLINED_BLOCKED', 'DECLINED_ADMIN'];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableOptions, setAvailableOptions] = useState<AvailableOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) { router.push('/production/projects'); return; }
    const data = await res.json();
    setProject(data);
    setLoading(false);
  }, [projectId, router]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  async function openAddModal() {
    setShowAddModal(true);
    setLoadingOptions(true);
    const res = await fetch('/api/options?limit=100');
    const data = await res.json();
    const existingIds = new Set(project?.projectOptions.map((po) => po.optionId) || []);
    setAvailableOptions(
      (data.data || []).filter((o: AvailableOption) => !existingIds.has(o.id)),
    );
    setLoadingOptions(false);
  }

  async function addOption(optionId: string) {
    await fetch(`/api/projects/${projectId}/options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId }),
    });
    setShowAddModal(false);
    fetchProject();
  }

  async function removeOption(optionId: string) {
    await fetch(`/api/projects/${projectId}/options`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId }),
    });
    fetchProject();
  }

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
    return <div className="animate-pulse space-y-4"><div className="h-10 bg-gray-100 rounded w-48" /><div className="h-64 bg-gray-100 rounded-xl" /></div>;
  }

  return (
    <div>
      <Link
        href="/production/projects"
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Projects
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(project.startDate)} &ndash; {formatDate(project.endDate)}
            <span className="mx-2">&middot;</span>
            {project.projectOptions.length} option{project.projectOptions.length !== 1 ? 's' : ''}
          </p>
          {project.description && (
            <p className="text-sm text-gray-600 mt-2">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading || project.projectOptions.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            {downloading ? 'Downloading...' : 'Download Images'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
            {copied ? 'Copied!' : 'Share Presentation'}
          </Button>
          <Button size="sm" onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-1" />
            Add Options
          </Button>
        </div>
      </div>

      {project.projectOptions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-300 rounded-xl">
          <p className="text-gray-500 mb-4">No vehicles in this project yet.</p>
          <Button variant="outline" onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add your first option
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {project.projectOptions.map((po) => {
            const { option } = po;
            const { vehicle } = option;
            const photo = vehicle.photos[0]?.url;
            const isDeclined = DECLINED_STATUSES.includes(option.status);

            return (
              <div
                key={po.optionId}
                className={`relative rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden ${isDeclined ? 'opacity-50' : ''}`}
              >
                <button
                  onClick={() => removeOption(po.optionId)}
                  className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-white rounded-full p-1 shadow-sm"
                  title="Remove from project"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
                <div className="aspect-video bg-gray-100 relative">
                  {photo ? (
                    <img src={photo} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">No photo</div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-gray-900 text-sm">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {vehicle.color} &middot; {vehicle.type.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
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

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Options to Project">
        {loadingOptions ? (
          <div className="py-8 text-center text-gray-500">Loading options...</div>
        ) : availableOptions.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            All your options are already in this project, or you have no options yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableOptions.map((opt) => (
              <div key={opt.id} className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                <div className="h-12 w-16 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                  {opt.vehicle.photos[0]?.url && (
                    <img src={opt.vehicle.photos[0].url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {opt.vehicle.year} {opt.vehicle.make} {opt.vehicle.model}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(opt.startDate)} &ndash; {formatDate(opt.endDate)}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => addOption(opt.id)}>
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
