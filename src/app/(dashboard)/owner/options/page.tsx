'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Clock, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { OPTION_STATUS_LABELS } from '@/lib/constants';

interface OptionItem {
  id: string;
  status: string;
  rateType: string;
  rateCents: number;
  ownerPayoutCents: number;
  startDate: string;
  endDate: string;
  queuePosition: number;
  responseDeadlineAt: string;
  confirmationDeadlineAt: string | null;
  usageTypes: string[];
  precisionDriverRequired: boolean;
  usageDescription: string | null;
  vehicle: { make: string; model: string; year: number; photos: { url: string }[] };
  productionUser: { name: string; email: string; companyName: string | null };
  booking: { id: string; status: string } | null;
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

export default function OwnerOptionsPage() {
  const router = useRouter();
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/options')
      .then((r) => r.json())
      .then((res) => setOptions(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  async function handleAction(optionId: string, action: 'accept' | 'decline') {
    const res = await fetch(`/api/options/${optionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const updated = await res.json();
      setOptions((prev) => prev.map((o) => (o.id === optionId ? { ...o, ...updated } : o)));
    }
  }

  if (loading) {
    return <div><h1 className="text-2xl font-bold text-gray-900 mb-6">Options</h1><div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Options</h1>

      {options.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No options yet</h3>
          <p className="text-gray-500">Options from production teams will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {options.map((opt) => (
            <div
              key={opt.id}
              className={opt.booking ? 'cursor-pointer' : ''}
              onClick={() => opt.booking && router.push(`/owner/bookings/${opt.booking.id}`)}
            >
            <Card className={opt.booking ? 'hover:border-blue-300 transition-colors' : ''}>
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
                    <p className="text-sm text-gray-500 mt-1">
                      From: {opt.productionUser.name}
                      {opt.productionUser.companyName && ` (${opt.productionUser.companyName})`}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>{formatDate(opt.startDate)} — {formatDate(opt.endDate)}</span>
                      <span>
                        {formatCurrency(opt.ownerPayoutCents)}
                        {opt.rateType === 'PER_DAY' ? '/day' : ' package'}
                      </span>
                      <span>Queue #{opt.queuePosition}</span>
                    </div>
                    {opt.usageTypes?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {opt.usageTypes.map((type) => (
                          <span key={type} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {type}
                          </span>
                        ))}
                        {opt.precisionDriverRequired && (
                          <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                            Precision Driver
                          </span>
                        )}
                      </div>
                    )}
                    {opt.usageDescription && (
                      <p className="mt-1.5 text-sm text-gray-500 italic">&ldquo;{opt.usageDescription}&rdquo;</p>
                    )}
                    {opt.status === 'PENDING_RESPONSE' && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-orange-600">
                        <Clock className="h-3 w-3" />
                        Respond by {new Date(opt.responseDeadlineAt).toLocaleString('en-ZA')}
                      </div>
                    )}
                  </div>
                  {opt.status === 'PENDING_RESPONSE' && (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" onClick={() => handleAction(opt.id, 'accept')}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => handleAction(opt.id, 'decline')}>Decline</Button>
                    </div>
                  )}
                  {opt.booking && (
                    <ChevronRight className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                  )}
                </div>
              </CardContent>
            </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
