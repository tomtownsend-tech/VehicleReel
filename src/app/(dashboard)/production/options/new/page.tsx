'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Modal } from '@/components/ui/modal';
import { Card, CardContent } from '@/components/ui/card';
import { RESPONSE_DEADLINE_PRESETS, CONFIRMATION_WINDOW_PRESETS, VEHICLE_USAGE_TYPES } from '@/lib/constants';
import { ArrowLeft, Plus } from 'lucide-react';

function PlaceOptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get('vehicleId') || '';

  const [vehicle, setVehicle] = useState<{
    make: string; model: string; year: number;
    availability: { startDate: string; endDate: string }[];
    bookings: { startDate: string; endDate: string }[];
  } | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    rateType: 'PER_DAY',
    rateRand: '',
    startDate: '',
    endDate: '',
    responseDeadlineHours: '24',
    confirmationWindowHours: '24',
    usageTypes: [] as string[],
    precisionDriverRequired: false,
    usageDescription: '',
    projectId: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectStart, setNewProjectStart] = useState('');
  const [newProjectEnd, setNewProjectEnd] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  useEffect(() => {
    if (vehicleId) {
      fetch(`/api/vehicles/${vehicleId}`)
        .then((r) => r.json())
        .then(setVehicle);
    }
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => setProjects((data.data || []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))));
  }, [vehicleId]);

  async function handleCreateProject() {
    if (!newProjectName || !newProjectStart || !newProjectEnd) return;
    setCreatingProject(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, startDate: newProjectStart, endDate: newProjectEnd }),
      });
      if (res.ok) {
        const project = await res.json();
        setProjects((prev) => [...prev, { id: project.id, name: project.name }]);
        setForm((prev) => ({ ...prev, projectId: project.id }));
        setShowNewProject(false);
        setNewProjectName('');
        setNewProjectStart('');
        setNewProjectEnd('');
      }
    } finally {
      setCreatingProject(false);
    }
  }

  // Build unavailable date ranges from bookings + owner-blocked dates
  const unavailableRanges = [
    ...(vehicle?.bookings || []),
    ...(vehicle?.availability || []),
  ];

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const rateCents = Math.round(parseFloat(form.rateRand) * 100);
      const res = await fetch('/api/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          rateType: form.rateType,
          rateCents,
          startDate: form.startDate,
          endDate: form.endDate,
          responseDeadlineHours: parseInt(form.responseDeadlineHours),
          confirmationWindowHours: parseInt(form.confirmationWindowHours),
          usageTypes: form.usageTypes,
          precisionDriverRequired: form.precisionDriverRequired,
          usageDescription: form.usageDescription || undefined,
          projectId: form.projectId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        // Show specific validation errors when available
        if (data.details?.fieldErrors) {
          const msgs = Object.values(data.details.fieldErrors).flat() as string[];
          setError(msgs.join('. ') || data.error || 'Failed to place option');
        } else if (data.details?.formErrors?.length) {
          setError(data.details.formErrors.join('. '));
        } else {
          setError(data.error || 'Failed to place option');
        }
        return;
      }

      router.push('/production/options');
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Place Option</h1>
      {vehicle && (
        <p className="text-gray-500 mb-6">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </p>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>
            )}

            <div className="space-y-1">
              <label htmlFor="projectId" className="block text-sm font-medium text-gray-700">
                Add to Project
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="projectId"
                  value={form.projectId}
                  onChange={(e) => updateField('projectId', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewProject(true)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" /> New
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DatePicker
                id="startDate"
                label="Start Date"
                value={form.startDate}
                onChange={(v) => updateField('startDate', v)}
                unavailableRanges={unavailableRanges}
                required
              />
              <DatePicker
                id="endDate"
                label="End Date"
                value={form.endDate}
                onChange={(v) => updateField('endDate', v)}
                unavailableRanges={unavailableRanges}
                required
              />
            </div>

            <Select
              id="rateType"
              label="Rate Type"
              options={[
                { value: 'PER_DAY', label: 'Per Day' },
                { value: 'PACKAGE', label: 'Package (flat total)' },
              ]}
              value={form.rateType}
              onChange={(e) => updateField('rateType', e.target.value)}
            />

            <Input
              id="rate"
              label={form.rateType === 'PER_DAY' ? 'Rate per Day (ZAR)' : 'Package Rate (ZAR)'}
              type="number"
              value={form.rateRand}
              onChange={(e) => updateField('rateRand', e.target.value)}
              placeholder="e.g. 2500"
              required
            />

            <Select
              id="responseDeadline"
              label="Response Deadline"
              options={RESPONSE_DEADLINE_PRESETS.map((p) => ({
                value: p.value.toString(),
                label: p.label,
              }))}
              value={form.responseDeadlineHours}
              onChange={(e) => updateField('responseDeadlineHours', e.target.value)}
            />

            <Select
              id="confirmationWindow"
              label="Confirmation Window"
              options={CONFIRMATION_WINDOW_PRESETS.map((p) => ({
                value: p.value.toString(),
                label: p.label,
              }))}
              value={form.confirmationWindowHours}
              onChange={(e) => updateField('confirmationWindowHours', e.target.value)}
            />

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Vehicle Usage</h3>

              <div className="space-y-2 mb-4">
                <label className="text-sm text-gray-600">How will the vehicle be used? *</label>
                <div className="grid grid-cols-2 gap-2">
                  {VEHICLE_USAGE_TYPES.map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.usageTypes.includes(type)}
                        onChange={(e) => {
                          setForm((prev) => ({
                            ...prev,
                            usageTypes: e.target.checked
                              ? [...prev.usageTypes, type]
                              : prev.usageTypes.filter((t) => t !== type),
                          }));
                        }}
                        className="rounded border-gray-300 text-black focus:ring-black"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm mb-4">
                <input
                  type="checkbox"
                  checked={form.precisionDriverRequired}
                  onChange={(e) => setForm((prev) => ({ ...prev, precisionDriverRequired: e.target.checked }))}
                  className="rounded border-gray-300 text-black focus:ring-black"
                />
                Precision driver required
              </label>

              <div>
                <label htmlFor="usageDescription" className="block text-sm text-gray-600 mb-1">
                  Storyboard / Description (optional)
                </label>
                <textarea
                  id="usageDescription"
                  rows={3}
                  value={form.usageDescription}
                  onChange={(e) => setForm((prev) => ({ ...prev, usageDescription: e.target.value }))}
                  placeholder="Describe how the vehicle will be used in the scene..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Place Option
            </Button>
          </form>
        </CardContent>
      </Card>

      <Modal open={showNewProject} onClose={() => setShowNewProject(false)} title="New Project">
        <div className="space-y-4">
          <Input
            id="new-project-name"
            label="Project Name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="e.g. BMW Campaign Q2"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              id="new-project-start"
              label="Start Date"
              value={newProjectStart}
              onChange={setNewProjectStart}
              required
            />
            <DatePicker
              id="new-project-end"
              label="End Date"
              value={newProjectEnd}
              onChange={setNewProjectEnd}
              required
            />
          </div>
          <Button onClick={handleCreateProject} className="w-full" loading={creatingProject}>
            Create Project
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function NewOptionPage() {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <PlaceOptionForm />
    </Suspense>
  );
}
