'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { RESPONSE_DEADLINE_PRESETS, CONFIRMATION_WINDOW_PRESETS } from '@/lib/constants';
import { ArrowLeft } from 'lucide-react';

function PlaceOptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get('vehicleId') || '';

  const [vehicle, setVehicle] = useState<{ make: string; model: string; year: number } | null>(null);
  const [form, setForm] = useState({
    rateType: 'PER_DAY',
    rateRand: '',
    startDate: '',
    endDate: '',
    responseDeadlineHours: '24',
    confirmationWindowHours: '24',
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
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to place option');
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
              <Input
                id="startDate"
                label="Start Date"
                type="date"
                value={form.startDate}
                onChange={(e) => updateField('startDate', e.target.value)}
                required
              />
              <Input
                id="endDate"
                label="End Date"
                type="date"
                value={form.endDate}
                onChange={(e) => updateField('endDate', e.target.value)}
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
