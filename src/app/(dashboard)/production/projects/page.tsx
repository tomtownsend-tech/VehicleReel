'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { DatePicker } from '@/components/ui/date-picker';
import { FolderOpen, Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  shareToken: string;
  optionCount: number;
  thumbnails: string[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '', shootDayHours: 10 });

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data.data || []);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          startDate: form.startDate,
          endDate: form.endDate,
          shootDayHours: form.shootDayHours,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create project');
        return;
      }

      setShowModal(false);
      setForm({ name: '', description: '', startDate: '', endDate: '', shootDayHours: 10 });
      fetchProjects();
    } catch {
      setError('Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-40 bg-gray-800 rounded-xl" />)}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">My Projects</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="h-12 w-12 text-white/30 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-white mb-2">No projects yet</h2>
          <p className="text-white/50 mb-6">Group your vehicle options into projects to present to clients.</p>
          <Button onClick={() => setShowModal(true)}>Create your first project</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/production/projects/${project.id}`}
              className="block rounded-xl border border-white/10 bg-gray-900 hover:border-white/20 transition-colors overflow-hidden"
            >
              <div className="h-32 bg-gray-800 flex">
                {project.thumbnails.length > 0 ? (
                  project.thumbnails.map((url, i) => (
                    <div key={i} className="flex-1 relative">
                      <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <FolderOpen className="h-8 w-8 text-white/30" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-white truncate">{project.name}</h3>
                  <span className="text-xs bg-white/5 text-white/70 px-2 py-0.5 rounded-full font-medium">
                    {project.optionCount} option{project.optionCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-sm text-white/50">
                  {formatDate(project.startDate)} &ndash; {formatDate(project.endDate)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Project">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="bg-red-400/10 text-red-400 text-sm rounded-lg p-3">{error}</div>}

          <Input
            id="project-name"
            label="Project Name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. BMW Campaign Q2"
            required
          />

          <div className="space-y-1">
            <label htmlFor="project-desc" className="block text-sm font-medium text-white/70">
              Description (optional)
            </label>
            <textarea
              id="project-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this project..."
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/40 focus:ring-1 focus:ring-white/20"
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DatePicker
              id="project-startDate"
              label="Start Date"
              value={form.startDate}
              onChange={(v) => setForm((prev) => ({ ...prev, startDate: v }))}
              required
            />
            <DatePicker
              id="project-endDate"
              label="End Date"
              value={form.endDate}
              onChange={(v) => setForm((prev) => ({ ...prev, endDate: v }))}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-white/70">Shoot Day Length</label>
            <div className="flex gap-2">
              {[10, 12].map((hours) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, shootDayHours: hours }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.shootDayHours === hours
                      ? 'border-white bg-white text-gray-900'
                      : 'border-white/15 bg-white/5 text-white/70 hover:border-white/30'
                  }`}
                >
                  {hours}-hour day
                </button>
              ))}
            </div>
            {form.shootDayHours === 12 && (
              <p className="text-xs text-amber-400 mt-1">12-hour days have 7-day post-invoice payment terms.</p>
            )}
          </div>

          <Button type="submit" className="w-full" loading={creating}>
            Create Project
          </Button>
        </form>
      </Modal>
    </div>
  );
}
