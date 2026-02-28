'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Clock } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { OPTION_STATUS_LABELS } from '@/lib/constants';

interface OptionItem {
  id: string;
  status: string;
  rateType: string;
  rateCents: number;
  startDate: string;
  endDate: string;
  queuePosition: number;
  responseDeadlineAt: string;
  confirmationDeadlineAt: string | null;
  vehicle: { id: string; make: string; model: string; year: number; photos: { url: string }[] };
  booking: { id: string } | null;
}

const statusVariant: Record<string, 'warning' | 'success' | 'danger' | 'info' | 'default'> = {
  PENDING_RESPONSE: 'warning',
  ACCEPTED: 'info',
  CONFIRMED: 'success',
  DECLINED_BY_OWNER: 'danger',
  EXPIRED_RESPONSE: 'danger',
  EXPIRED_CONFIRMATION: 'danger',
  DECLINED_OVERLAP: 'danger',
  DECLINED_BLOCKED: 'danger',
  DECLINED_ADMIN: 'danger',
};

export default function ProductionOptionsPage() {
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/options')
      .then((r) => r.json())
      .then((res) => setOptions(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div><h1 className="text-2xl font-bold text-gray-900 mb-6">My Options</h1><div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Options</h1>

      {options.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No options placed yet</h3>
          <p className="text-gray-500 mb-4">Search for vehicles and place your first option.</p>
          <Link href="/production/search" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            Search vehicles
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {options.map((opt) => (
            <Card key={opt.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">
                        {opt.vehicle.year} {opt.vehicle.make} {opt.vehicle.model}
                      </span>
                      <Badge variant={statusVariant[opt.status] || 'default'}>
                        {OPTION_STATUS_LABELS[opt.status] || opt.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>{formatDate(opt.startDate)} — {formatDate(opt.endDate)}</span>
                      <span>
                        {formatCurrency(opt.rateCents)}
                        {opt.rateType === 'PER_DAY' ? '/day' : ' package'}
                      </span>
                      <span>Position #{opt.queuePosition}</span>
                    </div>
                    {opt.status === 'PENDING_RESPONSE' && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-orange-600">
                        <Clock className="h-3 w-3" />
                        Owner must respond by {new Date(opt.responseDeadlineAt).toLocaleString('en-ZA')}
                      </div>
                    )}
                    {opt.status === 'ACCEPTED' && opt.confirmationDeadlineAt && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
                        <Clock className="h-3 w-3" />
                        Confirm by {new Date(opt.confirmationDeadlineAt).toLocaleString('en-ZA')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {opt.status === 'ACCEPTED' && opt.queuePosition === 1 && (
                      <Link href={`/production/options/${opt.id}/confirm`}>
                        <button className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">
                          Confirm
                        </button>
                      </Link>
                    )}
                    {opt.booking && (
                      <Link href={`/production/bookings/${opt.booking.id}`}>
                        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                          View Booking
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
