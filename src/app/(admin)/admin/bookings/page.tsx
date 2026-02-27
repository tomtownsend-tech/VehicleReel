'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';

interface BookingItem {
  id: string;
  rateType: string;
  rateCents: number;
  startDate: string;
  endDate: string;
  logistics: string;
  status: string;
  createdAt: string;
  option: { vehicle: { make: string; model: string; year: number } };
  productionUser: { name: string; companyName: string | null };
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/bookings')
      .then((r) => r.json())
      .then(setBookings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div><h1 className="text-2xl font-bold text-gray-900 mb-6">Bookings</h1><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bookings ({bookings.length})</h1>
      {bookings.length === 0 ? (
        <p className="text-gray-500">No bookings yet.</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Card key={b.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {b.option.vehicle.year} {b.option.vehicle.make} {b.option.vehicle.model}
                      </span>
                      <Badge variant="success">{b.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {b.productionUser.name}{b.productionUser.companyName && ` (${b.productionUser.companyName})`}
                      {' · '}{formatDate(b.startDate)} — {formatDate(b.endDate)}
                      {' · '}{formatCurrency(b.rateCents)}{b.rateType === 'PER_DAY' ? '/day' : ' pkg'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(b.createdAt).toLocaleDateString('en-ZA')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
