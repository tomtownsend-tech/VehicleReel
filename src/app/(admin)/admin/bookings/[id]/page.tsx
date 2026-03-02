'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, Clock, FileText, ExternalLink } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DailyDetail { id: string; date: string; callTime: string | null }
interface CheckIn { id: string; date: string; checkedInAt: string }
interface InsuranceDoc { id: string; status: string; fileUrl: string; fileName: string }
interface Coordinator { id: string; name: string; email: string }

interface Booking {
  id: string;
  rateType: string;
  rateCents: number;
  ownerPayoutCents: number;
  startDate: string;
  endDate: string;
  logistics: string;
  status: string;
  coordinatorId: string | null;
  locationAddress: string | null;
  locationPin: string | null;
  specialInstructions: string | null;
  option: { vehicle: { make: string; model: string; year: number; location: string; owner: { name: string } } };
  productionUser: { name: string; email: string; companyName: string | null };
  coordinator: Coordinator | null;
  dailyDetails: DailyDetail[];
  checkIns: CheckIn[];
  documents: InsuranceDoc[];
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  CONFIRMED: 'success',
  PAYMENT_READY: 'warning',
  COMPLETED: 'default',
  CANCELLED: 'danger',
};

export default function AdminBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [coordinators, setCoordinators] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedCoordinator, setSelectedCoordinator] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/${params.id}`)
      .then((r) => r.json())
      .then((data) => { if (data && !data.error) setBooking(data); })
      .catch(() => {});

    fetch('/api/admin/users/coordinators')
      .then((r) => r.json())
      .then((data) => setCoordinators(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [params.id]);

  async function assignCoordinator() {
    if (!selectedCoordinator || !booking) return;
    setAssigning(true);
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, coordinatorId: selectedCoordinator }),
      });
      if (res.ok) {
        // Refresh booking
        const bookingRes = await fetch(`/api/bookings/${booking.id}`);
        const updated = await bookingRes.json();
        if (updated && !updated.error) setBooking(updated);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to assign coordinator');
      }
    } finally {
      setAssigning(false);
    }
  }

  async function markCompleted() {
    if (!booking) return;
    setCompleting(true);
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, action: 'COMPLETE' }),
      });
      if (res.ok) {
        const bookingRes = await fetch(`/api/bookings/${booking.id}`);
        const updated = await bookingRes.json();
        if (updated && !updated.error) setBooking(updated);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to complete booking');
      }
    } finally {
      setCompleting(false);
    }
  }

  if (!booking) return <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded" /></div>;

  const checkedDates = new Set(booking.checkIns.map((c) => c.date.split('T')[0]));
  const insuranceDoc = booking.documents?.[0] || null;

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.push('/admin/bookings')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {booking.option.vehicle.year} {booking.option.vehicle.make} {booking.option.vehicle.model}
        </h1>
        <Badge variant={statusVariant[booking.status] || 'default'}>{booking.status}</Badge>
      </div>

      {/* Booking Info */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-gray-500">Production</dt><dd className="font-medium">{booking.productionUser.name}{booking.productionUser.companyName && ` (${booking.productionUser.companyName})`}</dd></div>
            <div><dt className="text-gray-500">Owner</dt><dd className="font-medium">{booking.option.vehicle.owner.name}</dd></div>
            <div><dt className="text-gray-500">Dates</dt><dd className="font-medium">{formatDate(booking.startDate)} — {formatDate(booking.endDate)}</dd></div>
            <div><dt className="text-gray-500">Rate</dt><dd className="font-medium">{formatCurrency(booking.rateCents)}{booking.rateType === 'PER_DAY' ? '/day' : ' package'}</dd></div>
            <div><dt className="text-gray-500">Owner Payout</dt><dd className="font-medium">{formatCurrency(booking.ownerPayoutCents)}{booking.rateType === 'PER_DAY' ? '/day' : ' package'}</dd></div>
            <div><dt className="text-gray-500">Logistics</dt><dd className="font-medium">{booking.logistics === 'OWNER_DELIVERY' ? 'Owner delivers' : 'Vehicle collection'}</dd></div>
            {booking.locationAddress && <div><dt className="text-gray-500">Shoot Location</dt><dd className="font-medium">{booking.locationAddress}</dd></div>}
            {booking.locationPin && <div><dt className="text-gray-500">Location Pin</dt><dd><a href={booking.locationPin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Open in Maps</a></dd></div>}
            {booking.specialInstructions && <div className="col-span-2"><dt className="text-gray-500">Instructions</dt><dd className="font-medium">{booking.specialInstructions}</dd></div>}
          </dl>
        </CardContent>
      </Card>

      {/* Coordinator Assignment */}
      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Coordinator</h2></CardHeader>
        <CardContent>
          {booking.coordinator ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{booking.coordinator.name}</p>
                <p className="text-xs text-gray-500">{booking.coordinator.email}</p>
              </div>
              <Badge variant="success">Assigned</Badge>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <select
                value={selectedCoordinator}
                onChange={(e) => setSelectedCoordinator(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select coordinator...</option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                ))}
              </select>
              <Button onClick={assignCoordinator} loading={assigning} disabled={!selectedCoordinator}>
                Assign
              </Button>
            </div>
          )}
          {coordinators.length === 0 && !booking.coordinator && (
            <p className="text-xs text-gray-400 mt-2">No coordinator users found. Promote a user to COORDINATOR role first.</p>
          )}
        </CardContent>
      </Card>

      {/* Daily Schedule & Check-Ins */}
      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Daily Schedule & Check-Ins</h2></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {booking.dailyDetails.map((d) => {
              const dateStr = d.date.split('T')[0];
              const isCheckedIn = checkedDates.has(dateStr);
              return (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium w-32">{formatDate(d.date)}</span>
                    {d.callTime && <span className="text-sm text-gray-500">Call: {d.callTime}</span>}
                  </div>
                  {isCheckedIn ? (
                    <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1 inline" />Checked In</Badge>
                  ) : (
                    <Badge variant="default"><Clock className="h-3 w-3 mr-1 inline" />Pending</Badge>
                  )}
                </div>
              );
            })}
            {booking.dailyDetails.length === 0 && <p className="text-sm text-gray-500">No daily details available.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Insurance */}
      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Insurance</h2></CardHeader>
        <CardContent>
          {insuranceDoc ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">{insuranceDoc.fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={insuranceDoc.status === 'APPROVED' ? 'success' : insuranceDoc.status === 'FLAGGED' ? 'danger' : 'warning'}>
                  {insuranceDoc.status}
                </Badge>
                <a href={insuranceDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No insurance document uploaded.</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {booking.status === 'PAYMENT_READY' && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">All days have been checked in.</p>
                <p className="text-xs text-gray-500">Mark this booking as completed to finalize.</p>
              </div>
              <Button onClick={markCompleted} loading={completing}>
                Mark as Completed
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
