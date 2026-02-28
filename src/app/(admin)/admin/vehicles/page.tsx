'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Car } from 'lucide-react';

interface VehicleItem {
  id: string;
  type: string;
  make: string;
  model: string;
  year: number;
  color: string;
  location: string;
  status: string;
  owner: { name: string; email: string };
  photos: { url: string }[];
  _count: { options: number };
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  ACTIVE: 'success',
  PENDING_REVIEW: 'warning',
  SUSPENDED: 'danger',
  REMOVED: 'danger',
};

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/vehicles')
      .then((r) => r.json())
      .then((res) => setVehicles(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleAction(vehicleId: string, action: 'REMOVE' | 'ACTIVATE') {
    if (action === 'REMOVE' && !confirm('Remove this listing? This will decline all pending options.')) return;
    const res = await fetch('/api/admin/vehicles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleId, action }),
    });
    if (res.ok) {
      const newStatus = action === 'REMOVE' ? 'REMOVED' : 'ACTIVE';
      setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? { ...v, status: newStatus } : v)));
    }
  }

  if (loading) {
    return <div><h1 className="text-2xl font-bold text-gray-900 mb-6">Vehicle Management</h1><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Vehicle Management</h1>
      <div className="space-y-3">
        {vehicles.map((v) => (
          <Card key={v.id}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    {v.photos[0] ? (
                      <img src={v.photos[0].url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Car className="h-6 w-6 text-gray-300" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{v.year} {v.make} {v.model}</span>
                      <Badge variant={statusVariant[v.status] || 'default'}>{v.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">{v.owner.name} · {v.location} · {v._count.options} options</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {['PENDING_REVIEW', 'SUSPENDED', 'REMOVED'].includes(v.status) && (
                    <Button size="sm" onClick={() => handleAction(v.id, 'ACTIVATE')}>Activate</Button>
                  )}
                  {v.status !== 'REMOVED' && (
                    <Button size="sm" variant="danger" onClick={() => handleAction(v.id, 'REMOVE')}>Remove</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
