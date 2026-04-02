'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Car, MapPin, Calendar, User } from 'lucide-react';
import { VehiclePhoto } from '@/components/VehiclePhoto';

interface Vehicle {
  id: string;
  type: string;
  driveSide: string | null;
  make: string;
  model: string;
  color: string;
  year: number;
  mileage: number | null;
  condition: string;
  specialFeatures: string[];
  location: string;
  status: string;
  owner: { id: string; name: string; email: string; phone: string | null };
  photos: { id: string; url: string; originalUrl: string | null; order: number }[];
  documents: { id: string; type: string; status: string }[];
  availability: { id: string; startDate: string; endDate: string; reason: string | null }[];
  options: { id: string; status: string; startDate: string; endDate: string; queuePosition: number }[];
}

const statusBadge: Record<string, 'warning' | 'success' | 'danger' | 'default'> = {
  PENDING_REVIEW: 'warning',
  ACTIVE: 'success',
  SUSPENDED: 'danger',
  REMOVED: 'danger',
};

export default function AdminVehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/vehicles/${params.id}`)
      .then((r) => r.json())
      .then(setVehicle)
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleAction(action: 'REMOVE' | 'ACTIVATE') {
    if (!vehicle) return;
    if (action === 'REMOVE' && !confirm('Remove this listing? This will decline all pending options.')) return;
    const res = await fetch('/api/admin/vehicles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleId: vehicle.id, action }),
    });
    if (res.ok) {
      const newStatus = action === 'REMOVE' ? 'REMOVED' : 'ACTIVE';
      setVehicle((prev) => prev ? { ...prev, status: newStatus } : prev);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-1/3 mb-4" />
        <div className="h-64 bg-gray-800 rounded" />
      </div>
    );
  }

  if (!vehicle) {
    return <p className="text-white/50">Vehicle not found.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push('/admin/vehicles')}
        className="flex items-center gap-2 text-sm text-white/60 hover:text-white mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to vehicles
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-white/50">
            <MapPin className="h-4 w-4" /> {vehicle.location}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusBadge[vehicle.status] || 'default'}>
            {vehicle.status.replace('_', ' ')}
          </Badge>
          {['PENDING_REVIEW', 'SUSPENDED', 'REMOVED'].includes(vehicle.status) && (
            <Button size="sm" onClick={() => handleAction('ACTIVATE')}>Activate</Button>
          )}
          {vehicle.status !== 'REMOVED' && (
            <Button size="sm" variant="danger" onClick={() => handleAction('REMOVE')}>Remove</Button>
          )}
        </div>
      </div>

      {/* Photos */}
      {vehicle.photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
          {vehicle.photos.map((photo) => (
            <div key={photo.id} className="aspect-video rounded-lg overflow-hidden bg-gray-800">
              <VehiclePhoto src={photo.originalUrl || photo.url} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 bg-gray-950 rounded-xl border border-white/10 mb-6">
          <div className="text-center text-white/40">
            <Car className="h-10 w-10 mx-auto mb-2" />
            <p className="text-sm">No photos uploaded</p>
          </div>
        </div>
      )}

      {/* Owner Info */}
      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Owner</h2></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <User className="h-5 w-5 text-white/40" />
            </div>
            <div>
              <p className="font-medium text-white">{vehicle.owner.name}</p>
              <p className="text-sm text-white/50">{vehicle.owner.email}</p>
              {vehicle.owner.phone && (
                <p className="text-sm text-white/50">{vehicle.owner.phone}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Details */}
      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Details</h2></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-white/50">Type</dt><dd className="font-medium capitalize">{vehicle.type.toLowerCase().replace('_', ' ')}</dd></div>
            {vehicle.driveSide && (
              <div><dt className="text-white/50">Drive</dt><dd className="font-medium">{vehicle.driveSide === 'LEFT' ? 'Left-Hand Drive' : 'Right-Hand Drive'}</dd></div>
            )}
            <div><dt className="text-white/50">Color</dt><dd className="font-medium">{vehicle.color}</dd></div>
            <div><dt className="text-white/50">Condition</dt><dd className="font-medium capitalize">{vehicle.condition.toLowerCase()}</dd></div>
            {vehicle.mileage && <div><dt className="text-white/50">Mileage</dt><dd className="font-medium">{vehicle.mileage.toLocaleString()} km</dd></div>}
          </dl>
          {vehicle.specialFeatures.length > 0 && (
            <div className="mt-4">
              <span className="text-sm text-white/50">Special Features</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {vehicle.specialFeatures.map((f) => (
                  <Badge key={f}>{f}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Documents</h2></CardHeader>
        <CardContent>
          {vehicle.documents.length === 0 ? (
            <p className="text-sm text-white/50">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {vehicle.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <span className="text-sm font-medium">{doc.type.replace('_', ' ')}</span>
                  <Badge variant={doc.status === 'APPROVED' ? 'success' : doc.status === 'FLAGGED' ? 'danger' : 'warning'}>
                    {doc.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked Dates */}
      {vehicle.availability.length > 0 && (
        <Card className="mb-6">
          <CardHeader><h2 className="text-lg font-semibold">Blocked Dates</h2></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vehicle.availability.map((block) => (
                <div key={block.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-white/40" />
                    <span className="font-medium">
                      {new Date(block.startDate).toLocaleDateString('en-ZA')} — {new Date(block.endDate).toLocaleDateString('en-ZA')}
                    </span>
                    {block.reason && <span className="text-white/50">({block.reason})</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Options */}
      {vehicle.options.length > 0 && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold">Active Options</h2></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vehicle.options.map((opt) => (
                <div key={opt.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg text-sm">
                  <div>
                    <span className="font-medium">Position #{opt.queuePosition}</span>
                    <span className="ml-2 text-white/50">
                      {new Date(opt.startDate).toLocaleDateString('en-ZA')} — {new Date(opt.endDate).toLocaleDateString('en-ZA')}
                    </span>
                  </div>
                  <Badge variant={opt.status === 'ACCEPTED' ? 'success' : 'warning'}>
                    {opt.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
