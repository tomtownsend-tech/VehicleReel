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
    return <div><h1 className="text-2xl font-bold text-white mb-6">My Options</h1><div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />)}</div></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">My Options</h1>

      {options.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-white/10 p-12 text-center">
          <FileText className="h-12 w-12 text-white/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No options placed yet</h3>
          <p className="text-white/50 mb-4">Search for vehicles and place your first option.</p>
          <Link href="/production/search" className="text-white/70 hover:text-white font-medium text-sm">
            Search vehicles
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {options.map((opt) => (
            <Card key={opt.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-24 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0">
                      {opt.vehicle.photos[0]?.url ? (
                        <img src={opt.vehicle.photos[0].url} alt={`${opt.vehicle.year} ${opt.vehicle.make} ${opt.vehicle.model}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-white/30 text-xs">No photo</div>
                      )}
                    </div>
                    <div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-white">
                        {opt.vehicle.year} {opt.vehicle.make} {opt.vehicle.model}
                      </span>
                      <Badge variant={statusVariant[opt.status] || 'default'}>
                        {OPTION_STATUS_LABELS[opt.status] || opt.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
                      <span>{formatDate(opt.startDate)} — {formatDate(opt.endDate)}</span>
                      <span>
                        {formatCurrency(opt.rateCents)}
                        {opt.rateType === 'PER_DAY' ? '/day' : ' package'}
                      </span>
                      <span>Position #{opt.queuePosition}</span>
                    </div>
                    {opt.status === 'PENDING_RESPONSE' && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-amber-400">
                        <Clock className="h-3 w-3" />
                        Owner must respond by {new Date(opt.responseDeadlineAt).toLocaleString('en-ZA')}
                      </div>
                    )}
                    {opt.status === 'ACCEPTED' && opt.confirmationDeadlineAt && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-white/70">
                        <Clock className="h-3 w-3" />
                        Confirm by {new Date(opt.confirmationDeadlineAt).toLocaleString('en-ZA')}
                      </div>
                    )}
                  </div>
                  </div>
                  <div className="flex gap-2">
                    {opt.status === 'ACCEPTED' && opt.queuePosition === 1 && (
                      <Link href={`/production/options/${opt.id}/confirm`}>
                        <button className="px-4 py-2 rounded-lg bg-emerald-400 text-gray-900 text-sm font-medium hover:bg-emerald-300">
                          Confirm
                        </button>
                      </Link>
                    )}
                    {opt.booking && (
                      <Link href={`/production/bookings/${opt.booking.id}`}>
                        <button className="px-4 py-2 rounded-lg bg-white text-gray-900 text-sm font-medium hover:bg-gray-200">
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
