'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { Calendar, CheckCircle, AlertCircle } from 'lucide-react';

interface CoordinatorBooking {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  option: { vehicle: { make: string; model: string; year: number; owner: { name: string } } };
  productionUser: { name: string; companyName: string | null };
  dailyDetails: { id: string }[];
  checkIns: { id: string }[];
  documents: { status: string }[];
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  CONFIRMED: 'success',
  PAYMENT_READY: 'warning',
  COMPLETED: 'default',
  CANCELLED: 'danger',
};

export default function CoordinatorBookingsPage() {
  const [bookings, setBookings] = useState<CoordinatorBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/coordinator/bookings')
      .then((r) => r.json())
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div><h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h1><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings ({bookings.length})</h1>
      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No bookings assigned to you yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const checkedIn = b.checkIns.length;
            const totalDays = b.dailyDetails.length;
            const hasInsurance = b.documents.length > 0;
            const insuranceApproved = b.documents[0]?.status === 'APPROVED';

            return (
              <Link key={b.id} href={`/coordinator/bookings/${b.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {b.option.vehicle.year} {b.option.vehicle.make} {b.option.vehicle.model}
                          </span>
                          <Badge variant={statusVariant[b.status] || 'default'}>{b.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {b.productionUser.name}{b.productionUser.companyName && ` (${b.productionUser.companyName})`}
                          {' · Owner: '}{b.option.vehicle.owner.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(b.startDate)} — {formatDate(b.endDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1" title="Check-in progress">
                          {checkedIn === totalDays ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                          <span className="text-gray-600">{checkedIn}/{totalDays}</span>
                        </div>
                        <Badge variant={insuranceApproved ? 'success' : hasInsurance ? 'warning' : 'danger'}>
                          {insuranceApproved ? 'Insured' : hasInsurance ? 'Pending' : 'No Insurance'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
