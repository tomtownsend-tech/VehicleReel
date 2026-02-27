'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  vehicle: { make: string; model: string; year: number; photos: { url: string }[] };
  productionUser: { name: string; email: string; companyName: string | null };
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
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/options?role=OWNER')
      .then((r) => r.json())
      .then(setOptions)
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
      setOptions((prev) => prev.map((o) => (o.id === optionId ? { ...o, status: updated.status } : o)));
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
                    <p className="text-sm text-gray-500 mt-1">
                      From: {opt.productionUser.name}
                      {opt.productionUser.companyName && ` (${opt.productionUser.companyName})`}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>{formatDate(opt.startDate)} — {formatDate(opt.endDate)}</span>
                      <span>
                        {formatCurrency(opt.rateCents)}
                        {opt.rateType === 'PER_DAY' ? '/day' : ' package'}
                      </span>
                      <span>Queue #{opt.queuePosition}</span>
                    </div>
                    {opt.status === 'PENDING_RESPONSE' && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-orange-600">
                        <Clock className="h-3 w-3" />
                        Respond by {new Date(opt.responseDeadlineAt).toLocaleString('en-ZA')}
                      </div>
                    )}
                  </div>
                  {opt.status === 'PENDING_RESPONSE' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAction(opt.id, 'accept')}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => handleAction(opt.id, 'decline')}>Decline</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
