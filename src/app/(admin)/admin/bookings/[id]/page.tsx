'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, Clock, FileText, ExternalLink } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DailyDetail { id: string; date: string; callTime: string | null; locationAddress: string | null; locationPin: string | null; notes: string | null }
interface CheckIn { id: string; date: string; checkedInAt: string }
interface InsuranceDoc { id: string; status: string; fileUrl: string; fileName: string }


interface Booking {
  id: string;
  rateType: string;
  rateCents: number;
  ownerPayoutCents: number;
  startDate: string;
  endDate: string;
  logistics: string;
  status: string;
  locationAddress: string | null;
  locationPin: string | null;
  specialInstructions: string | null;
  option: {
    vehicle: { make: string; model: string; year: number; location: string; owner: { name: string } };
    projectOptions?: { project: { id: string; name: string; members: { role: string; user: { id: string; name: string } }[] } }[];
  };
  productionUser: { name: string; email: string; companyName: string | null };
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
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/${params.id}`)
      .then((r) => r.json())
      .then((data) => { if (data && !data.error) setBooking(data); })
      .catch(() => {});
  }, [params.id]);

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

  if (!booking) return <div className="animate-pulse"><div className="h-64 bg-gray-800 rounded" /></div>;

  const checkedDates = new Set(booking.checkIns.map((c) => c.date.split('T')[0]));
  const insuranceDoc = booking.documents?.[0] || null;

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.push('/admin/bookings')} className="flex items-center gap-2 text-sm text-white/60 hover:text-white mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          {booking.option.vehicle.year} {booking.option.vehicle.make} {booking.option.vehicle.model}
        </h1>
        <Badge variant={statusVariant[booking.status] || 'default'}>{booking.status}</Badge>
      </div>

      {/* Booking Info */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><dt className="text-white/50">Production</dt><dd className="font-medium text-white">{booking.productionUser.name}{booking.productionUser.companyName && ` (${booking.productionUser.companyName})`}</dd></div>
            <div><dt className="text-white/50">Owner</dt><dd className="font-medium text-white">{booking.option.vehicle.owner.name}</dd></div>
            <div><dt className="text-white/50">Dates</dt><dd className="font-medium text-white">{formatDate(booking.startDate)} — {formatDate(booking.endDate)}</dd></div>
            <div><dt className="text-white/50">Rate</dt><dd className="font-medium text-white">{formatCurrency(booking.rateCents)}{booking.rateType === 'PER_DAY' ? '/day' : ' package'}</dd></div>
            <div><dt className="text-white/50">Owner Payout</dt><dd className="font-medium text-white">{formatCurrency(booking.ownerPayoutCents)}{booking.rateType === 'PER_DAY' ? '/day' : ' package'}</dd></div>
            <div><dt className="text-white/50">Logistics</dt><dd className="font-medium text-white">{booking.logistics === 'OWNER_DELIVERY' ? 'Owner delivers' : 'Vehicle collection'}</dd></div>
            {booking.locationAddress && <div><dt className="text-white/50">Shoot Location</dt><dd className="font-medium text-white">{booking.locationAddress}</dd></div>}
            {booking.locationPin && <div><dt className="text-white/50">Location Pin</dt><dd><a href={booking.locationPin} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:underline text-sm">Open in Maps</a></dd></div>}
            {booking.specialInstructions && <div className="col-span-2"><dt className="text-white/50">Instructions</dt><dd className="font-medium text-white">{booking.specialInstructions}</dd></div>}
          </dl>
        </CardContent>
      </Card>

      {/* Project Team */}
      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Project Team</h2></CardHeader>
        <CardContent>
          {(() => {
            const projectInfo = booking.option.projectOptions?.[0]?.project;
            if (!projectInfo) return <p className="text-sm text-white/50">Not linked to a project.</p>;
            const coordinators = projectInfo.members.filter((m) => m.role === 'COORDINATOR');
            const artDirectors = projectInfo.members.filter((m) => m.role === 'ART_DIRECTOR');
            return (
              <div className="space-y-2">
                <p className="text-sm text-white/60">Project: <span className="font-medium text-white">{projectInfo.name}</span></p>
                {coordinators.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {coordinators.map((m) => <Badge key={m.user.id} variant="success">{m.user.name} (Coordinator)</Badge>)}
                  </div>
                )}
                {artDirectors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {artDirectors.map((m) => <Badge key={m.user.id} variant="default">{m.user.name} (Art Director)</Badge>)}
                  </div>
                )}
                {coordinators.length === 0 && artDirectors.length === 0 && (
                  <p className="text-xs text-white/40">No team members assigned. Production can manage team from the project page.</p>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Daily Schedule & Check-Ins */}
      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Daily Schedule & Check-Ins</h2></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {booking.dailyDetails.map((d) => {
              const dateStr = d.date.split('T')[0];
              const isCheckedIn = checkedDates.has(dateStr);
              const hasDetails = d.callTime || d.locationAddress || d.locationPin || d.notes;
              return (
                <div key={d.id} className="border border-white/10 rounded-lg p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-white/5 last:border-0 gap-1">
                    <span className="text-sm font-semibold text-white">{formatDate(d.date)}</span>
                    {isCheckedIn ? (
                      <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1 inline" />Checked In</Badge>
                    ) : (
                      <Badge variant="default"><Clock className="h-3 w-3 mr-1 inline" />Pending</Badge>
                    )}
                  </div>
                  {hasDetails ? (
                    <dl className="space-y-1 text-sm mt-2">
                      {d.callTime && <div className="flex gap-2"><dt className="text-white/50 w-24 flex-shrink-0">Call Time</dt><dd className="font-medium text-white">{d.callTime}</dd></div>}
                      {d.locationAddress && <div className="flex gap-2"><dt className="text-white/50 w-24 flex-shrink-0">Location</dt><dd className="font-medium text-white">{d.locationAddress}</dd></div>}
                      {d.locationPin && <div className="flex gap-2"><dt className="text-white/50 w-24 flex-shrink-0">Map Pin</dt><dd><a href={d.locationPin} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:underline text-sm">Open in Maps</a></dd></div>}
                      {d.notes && <div className="flex gap-2"><dt className="text-white/50 w-24 flex-shrink-0">Notes</dt><dd className="font-medium text-white">{d.notes}</dd></div>}
                    </dl>
                  ) : (
                    <p className="text-xs text-white/40 mt-1">No details provided yet</p>
                  )}
                </div>
              );
            })}
            {booking.dailyDetails.length === 0 && <p className="text-sm text-white/50">No daily details available.</p>}
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
                <FileText className="h-4 w-4 text-white/50" />
                <span className="text-sm font-medium">{insuranceDoc.fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={insuranceDoc.status === 'APPROVED' ? 'success' : insuranceDoc.status === 'FLAGGED' ? 'danger' : 'warning'}>
                  {insuranceDoc.status}
                </Badge>
                <a href={insuranceDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/50">No insurance document uploaded.</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {booking.status === 'PAYMENT_READY' && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">All days have been checked in.</p>
                <p className="text-xs text-white/50">Mark this booking as completed to finalize.</p>
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
