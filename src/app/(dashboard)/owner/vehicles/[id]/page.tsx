'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MapPin, Calendar, ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface Vehicle {
  id: string;
  type: string;
  make: string;
  model: string;
  color: string;
  year: number;
  mileage: number | null;
  condition: string;
  specialFeatures: string[];
  location: string;
  status: string;
  photos: { id: string; url: string; order: number }[];
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

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [showBlockForm, setShowBlockForm] = useState(false);

  useEffect(() => {
    fetch(`/api/vehicles/${params.id}`)
      .then((r) => r.json())
      .then(setVehicle)
      .finally(() => setLoading(false));
  }, [params.id]);

  async function addBlock() {
    if (!blockStart || !blockEnd) return;
    const res = await fetch(`/api/vehicles/${params.id}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: blockStart, endDate: blockEnd, reason: blockReason }),
    });
    if (res.ok) {
      const block = await res.json();
      setVehicle((prev) => prev ? { ...prev, availability: [...prev.availability, block] } : prev);
      setBlockStart('');
      setBlockEnd('');
      setBlockReason('');
      setShowBlockForm(false);
    }
  }

  async function removeBlock(blockId: string) {
    const res = await fetch(`/api/vehicles/${params.id}/availability?blockId=${blockId}`, { method: 'DELETE' });
    if (res.ok) {
      setVehicle((prev) =>
        prev ? { ...prev, availability: prev.availability.filter((b) => b.id !== blockId) } : prev
      );
    }
  }

  if (loading) {
    return <div className="animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/3 mb-4" /><div className="h-64 bg-gray-200 rounded" /></div>;
  }

  if (!vehicle) {
    return <p className="text-gray-500">Vehicle not found.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push('/owner/vehicles')}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to vehicles
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-gray-500">
            <MapPin className="h-4 w-4" /> {vehicle.location}
          </div>
        </div>
        <Badge variant={statusBadge[vehicle.status] || 'default'}>
          {vehicle.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Photos */}
      {vehicle.photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {vehicle.photos.map((photo) => (
            <div key={photo.id} className="aspect-video rounded-lg overflow-hidden bg-gray-100">
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Details */}
      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Details</h2></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-gray-500">Type</dt><dd className="font-medium capitalize">{vehicle.type.toLowerCase().replace('_', ' ')}</dd></div>
            <div><dt className="text-gray-500">Color</dt><dd className="font-medium">{vehicle.color}</dd></div>
            <div><dt className="text-gray-500">Condition</dt><dd className="font-medium capitalize">{vehicle.condition.toLowerCase()}</dd></div>
            {vehicle.mileage && <div><dt className="text-gray-500">Mileage</dt><dd className="font-medium">{vehicle.mileage.toLocaleString()} km</dd></div>}
          </dl>
          {vehicle.specialFeatures.length > 0 && (
            <div className="mt-4">
              <span className="text-sm text-gray-500">Special Features</span>
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
            <p className="text-sm text-gray-500">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {vehicle.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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

      {/* Availability Calendar */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Blocked Dates</h2>
            <Button size="sm" variant="outline" onClick={() => setShowBlockForm(!showBlockForm)}>
              <Plus className="h-4 w-4 mr-1" /> Block Dates
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showBlockForm && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input id="blockStart" label="Start Date" type="date" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} />
                <Input id="blockEnd" label="End Date" type="date" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} />
              </div>
              <Input id="blockReason" label="Reason (optional)" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="e.g. Personal use" />
              <div className="flex gap-2">
                <Button size="sm" onClick={addBlock} disabled={!blockStart || !blockEnd}>Block Dates</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowBlockForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
          {vehicle.availability.length === 0 ? (
            <p className="text-sm text-gray-500">No dates blocked. Your vehicle is available for all dates.</p>
          ) : (
            <div className="space-y-2">
              {vehicle.availability.map((block) => (
                <div key={block.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {new Date(block.startDate).toLocaleDateString('en-ZA')} — {new Date(block.endDate).toLocaleDateString('en-ZA')}
                      </span>
                    </div>
                    {block.reason && <p className="text-xs text-gray-500 ml-6 mt-0.5">{block.reason}</p>}
                  </div>
                  <button onClick={() => removeBlock(block.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Options */}
      {vehicle.options.length > 0 && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold">Active Options</h2></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vehicle.options.map((opt) => (
                <div key={opt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <div>
                    <span className="font-medium">Position #{opt.queuePosition}</span>
                    <span className="ml-2 text-gray-500">
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
