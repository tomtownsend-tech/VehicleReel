'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent } from '@/components/ui/card';
import { RESPONSE_DEADLINE_PRESETS, CONFIRMATION_WINDOW_PRESETS, VEHICLE_USAGE_TYPES } from '@/lib/constants';
import { ArrowLeft } from 'lucide-react';

function PlaceOptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get('vehicleId') || '';

  const [vehicle, setVehicle] = useState<{
    make: string; model: string; year: number;
    availability: { startDate: string; endDate: string }[];
    bookings: { startDate: string; endDate: string }[];
  } | null>(null);
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
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicleId) {
      fetch(`/api/vehicles/${vehicleId}`)
        .then((r) => r.json())
        .then(setVehicle);
    }
  }, [vehicleId]);

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
