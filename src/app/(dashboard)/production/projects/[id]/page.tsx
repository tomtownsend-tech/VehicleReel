'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Link2, Plus, X, MapPin, Check, Users, UserPlus, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { downloadProjectImages } from '@/lib/utils/download-project';
import { VehicleDetailModal } from '@/components/VehicleDetailModal';

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
  projectOptions: ProjectOption[];
  members: Member[];
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
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'COORDINATOR' | 'ART_DIRECTOR'>('ART_DIRECTOR');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

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

  async function addMember() {
    if (!memberEmail) return;
    setAddingMember(true);
    setMemberError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: memberEmail, role: memberRole }),
      });
      if (res.ok) {
        setMemberEmail('');
        setMemberError('');
        fetchProject();
      } else {
        const data = await res.json();
        setMemberError(data.error || 'Failed to add member');
      }
    } finally {
      setAddingMember(false);
    }
  }

  async function removeMember(userId: string) {
    await fetch(`/api/projects/${projectId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    fetchProject();
  }

  if (loading || !project) {
    return <div className="animate-pulse space-y-4"><div className="h-10 bg-gray-800 rounded w-48" /><div className="h-64 bg-gray-800 rounded-xl" /></div>;
  }

  return (
    <div>
      <Link
        href="/production/projects"
        className="flex items-center gap-2 text-sm text-white/60 hover:text-white mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Projects
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          <p className="text-sm text-white/50 mt-1">
            {formatDate(project.startDate)} &ndash; {formatDate(project.endDate)}
            <span className="mx-2">&middot;</span>
            {project.projectOptions.length} option{project.projectOptions.length !== 1 ? 's' : ''}
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
            {copied ? 'Copied!' : 'Share Presentation'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowTeamModal(true)}>
            <Users className="h-4 w-4 mr-1" />
            Team ({project.members.length})
          </Button>
          <Button size="sm" onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-1" />
            Add Options
          </Button>
        </div>
      </div>

      {/* Team Members */}
      {project.members.length > 0 && (
        <div className="mb-6 p-4 bg-gray-900 rounded-xl border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-white/50" />
            <h3 className="text-sm font-medium text-white">Team Members</h3>
          </div>
          <div className="space-y-2">
            {project.members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-white">{m.user.name}</span>
                  <span className="text-white/40 ml-2">{m.user.email}</span>
                  <Badge variant="default" className="ml-2 text-xs">{m.role === 'COORDINATOR' ? 'Coordinator' : 'Art Director'}</Badge>
                </div>
                <button onClick={() => removeMember(m.userId)} className="text-white/30 hover:text-red-400 p-1" title="Remove">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {project.projectOptions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/15 rounded-xl">
          <p className="text-white/50 mb-4">No vehicles in this project yet.</p>
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
                className={`relative rounded-xl border border-white/10 bg-gray-900 overflow-hidden cursor-pointer hover:border-white/20 transition-colors ${isDeclined ? 'opacity-50' : ''}`}
                onClick={() => setSelectedVehicleId(vehicle.id)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); removeOption(po.optionId); }}
                  className="absolute top-2 right-2 z-10 bg-gray-900/90 hover:bg-gray-900 rounded-full p-1"
                  title="Remove from project"
                >
                  <X className="h-4 w-4 text-white/50" />
                </button>
                <div className="aspect-video bg-gray-800 relative">
                  {photo ? (
                    <img src={photo} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">No photo</div>
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

      <Modal open={showTeamModal} onClose={() => { setShowTeamModal(false); setMemberError(''); }} title="Manage Team">
        <div className="space-y-4">
          <p className="text-sm text-white/50">Add coordinators or art directors to this project by email.</p>
          {memberError && <p className="text-sm text-red-400">{memberError}</p>}
          <div className="flex gap-2">
            <select
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value as 'COORDINATOR' | 'ART_DIRECTOR')}
              className="px-3 py-2 border border-white/15 rounded-lg text-sm bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <option value="ART_DIRECTOR">Art Director</option>
              <option value="COORDINATOR">Coordinator</option>
            </select>
            <Input
              id="memberEmail"
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-1"
            />
            <Button onClick={addMember} loading={addingMember} disabled={!memberEmail}>
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
          {project.members.length > 0 && (
            <div className="border-t border-white/10 pt-3 space-y-2">
              {project.members.map((m) => (
                <div key={m.userId} className="flex items-center justify-between text-sm p-2 rounded-lg bg-white/5">
                  <div>
                    <span className="text-white">{m.user.name}</span>
                    <span className="text-white/40 ml-2 text-xs">{m.user.email}</span>
                    <Badge variant="default" className="ml-2 text-xs">{m.role === 'COORDINATOR' ? 'Coordinator' : 'Art Director'}</Badge>
                  </div>
                  <button onClick={() => removeMember(m.userId)} className="text-white/30 hover:text-red-400 p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Options to Project">
        {loadingOptions ? (
          <div className="py-8 text-center text-white/50">Loading options...</div>
        ) : availableOptions.length === 0 ? (
          <div className="py-8 text-center text-white/50">
            All your options are already in this project, or you have no options yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableOptions.map((opt) => (
              <div key={opt.id} className="flex items-center gap-3 p-2 rounded-lg border border-white/10 hover:bg-white/5">
                <div className="h-12 w-16 rounded bg-gray-800 overflow-hidden flex-shrink-0">
                  {opt.vehicle.photos[0]?.url && (
                    <img src={opt.vehicle.photos[0].url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {opt.vehicle.year} {opt.vehicle.make} {opt.vehicle.model}
                  </p>
                  <p className="text-xs text-white/50">
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

      <VehicleDetailModal vehicleId={selectedVehicleId} onClose={() => setSelectedVehicleId(null)} />
    </div>
  );
}
