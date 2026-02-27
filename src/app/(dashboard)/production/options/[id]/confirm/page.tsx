'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface OptionDetail {
  id: string;
  rateType: string;
  rateCents: number;
  startDate: string;
  endDate: string;
  vehicle: { make: string; model: string; year: number; location: string; owner: { name: string } };
}

export default function ConfirmOptionPage() {
  const params = useParams();
  const router = useRouter();
  const [option, setOption] = useState<OptionDetail | null>(null);
  const [logistics, setLogistics] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/options/${params.id}`)
      .then((r) => r.json())
      .then(setOption);
  }, [params.id]);

  async function handleConfirm() {
    if (!logistics) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/options/${params.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logistics }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to confirm');
        return;
      }

      const booking = await res.json();
      setConfirmed(true);
      setTimeout(() => router.push(`/production/bookings/${booking.id}`), 2000);
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (!option) return <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded" /></div>;

  if (confirmed) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
        <p className="text-gray-500">Redirecting to your booking...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Confirm Booking</h1>

      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Booking Summary</h2></CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Vehicle</dt><dd className="font-medium">{option.vehicle.year} {option.vehicle.make} {option.vehicle.model}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Location</dt><dd className="font-medium">{option.vehicle.location}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Owner</dt><dd className="font-medium">{option.vehicle.owner.name}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Dates</dt><dd className="font-medium">{formatDate(option.startDate)} — {formatDate(option.endDate)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Rate</dt><dd className="font-medium">{formatCurrency(option.rateCents)}{option.rateType === 'PER_DAY' ? '/day' : ' package'}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>}

          <Select
            id="logistics"
            label="Logistics"
            options={[
              { value: 'VEHICLE_COLLECTION', label: 'I will collect the vehicle' },
              { value: 'OWNER_DELIVERY', label: 'Owner delivers to set' },
            ]}
            value={logistics}
            onChange={(e) => setLogistics(e.target.value)}
            placeholder="Select logistics..."
          />

          <Button onClick={handleConfirm} loading={loading} disabled={!logistics} className="w-full">
            Confirm Booking
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
