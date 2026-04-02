'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MapPin, Calendar, ArrowLeft, Plus, Trash2, Upload, X, Ban, FileUp, Check, Loader2 } from 'lucide-react';
import { compressImage } from '@/lib/utils/compress-image';
import { VehiclePhoto } from '@/components/VehiclePhoto';

interface Vehicle {
  id: string;
  type: string;
  customType: string | null;
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
  photos: { id: string; url: string; originalUrl: string | null; order: number }[];
  documents: { id: string; type: string; status: string }[];
  availability: { id: string; startDate: string; endDate: string; reason: string | null }[];
  bookings: { id: string; startDate: string; endDate: string }[];
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
  const [photoUploading, setPhotoUploading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [docUploading, setDocUploading] = useState<string | null>(null);
  const [personalDocs, setPersonalDocs] = useState<{ id: string; type: string; status: string }[]>([]);
  const [showDeleteVehicle, setShowDeleteVehicle] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletingVehicle, setDeletingVehicle] = useState(false);

  const REQUIRED_PHOTO_LABELS = ['Front', 'Back', 'Left', 'Right', 'Interior'] as const;

  useEffect(() => {
    fetch(`/api/vehicles/${params.id}`)
      .then((r) => r.json())
      .then(setVehicle)
      .finally(() => setLoading(false));
    fetch('/api/documents?limit=50')
      .then((r) => r.json())
      .then((res) => {
        const personal = (res.data || []).filter((d: { type: string }) => d.type === 'SA_ID' || d.type === 'DRIVERS_LICENSE');
        setPersonalDocs(personal);
      })
      .catch(() => {});
  }, [params.id]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>, slotOrder?: number) {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;
    setPhotoUploading(true);
    try {
      const compressed = await Promise.all(rawFiles.map((f) => compressImage(f)));
      for (const file of compressed) {
        const formData = new FormData();
        formData.append('photos', file);
        if (slotOrder !== undefined) {
          formData.append('order', slotOrder.toString());
        }
        const res = await fetch(`/api/vehicles/${params.id}/photos`, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const newPhotos = await res.json();
          setVehicle((prev) =>
            prev ? { ...prev, photos: [...prev.photos, ...newPhotos].sort((a, b) => a.order - b.order) } : prev
          );
        }
      }
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  }

  async function deletePhoto(photoId: string) {
    if (!confirm('Delete this photo?')) return;
    setDeletingPhotoId(photoId);
    try {
      const res = await fetch(`/api/vehicles/${params.id}/photos?photoId=${photoId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setVehicle((prev) =>
          prev ? { ...prev, photos: prev.photos.filter((p) => p.id !== photoId) } : prev
        );
      }
    } finally {
      setDeletingPhotoId(null);
    }
  }

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

  const PERSONAL_DOC_TYPES = [
    { type: 'SA_ID', label: 'SA ID / Passport' },
    { type: 'DRIVERS_LICENSE', label: "Driver's License" },
  ] as const;

  const VEHICLE_DOC_TYPES = vehicle?.type === 'OTHER'
    ? [{ type: 'VEHICLE_PERMIT', label: 'Vehicle Permit / Declaration' }] as const
    : [{ type: 'VEHICLE_REGISTRATION', label: 'Vehicle License Disk' }] as const;

  async function handleDeleteVehicle() {
    setDeletingVehicle(true);
    try {
      const res = await fetch(`/api/vehicles/${params.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/owner/vehicles');
      }
    } finally {
      setDeletingVehicle(false);
    }
  }

  async function handleDocUpload(docType: string, e: React.ChangeEvent<HTMLInputElement>, isPersonal = false) {
    const file = e.target.files?.[0];
    if (!file || !vehicle) return;
    setDocUploading(docType);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', docType);
      if (!isPersonal) {
        formData.append('vehicleId', vehicle.id);
      }
      const res = await fetch('/api/documents', { method: 'POST', body: formData });
      if (res.ok) {
        const doc = await res.json();
        if (isPersonal) {
          setPersonalDocs((prev) => [...prev, { id: doc.id, type: doc.type, status: doc.status }]);
        } else {
          setVehicle((prev) =>
            prev ? { ...prev, documents: [...prev.documents, { id: doc.id, type: doc.type, status: doc.status }] } : prev
          );
        }
      }
    } finally {
      setDocUploading(null);
      e.target.value = '';
    }
  }

  if (loading) {
    return <div className="animate-pulse"><div className="h-8 bg-gray-800 rounded w-1/3 mb-4" /><div className="h-64 bg-gray-800 rounded" /></div>;
  }

  if (!vehicle) {
    return <p className="text-white/50">Vehicle not found.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push('/owner/vehicles')}
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
        <Badge variant={statusBadge[vehicle.status] || 'default'}>
          {vehicle.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Photos */}
      <div className="mb-6">
        {(() => {
          const photosByOrder = new Map(vehicle.photos.map((p) => [p.order, p]));
          const missingSlots = REQUIRED_PHOTO_LABELS.filter((_, i) => !photosByOrder.has(i));
          const extraPhotos = vehicle.photos.filter((p) => p.order >= 5).sort((a, b) => a.order - b.order);

          return (
            <>
              {missingSlots.length > 0 && (
                <div className="mb-4 bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">
                  <p className="text-sm text-amber-400 font-medium">
                    Missing required photo{missingSlots.length > 1 ? 's' : ''}: {missingSlots.join(', ')}
                  </p>
                </div>
              )}

              <h3 className="text-sm font-medium text-white mb-2">Required Photos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
                {REQUIRED_PHOTO_LABELS.map((label, i) => {
                  const photo = photosByOrder.get(i);
                  return (
                    <div key={label} className="relative">
                      {photo ? (
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-800 group">
                          <VehiclePhoto src={photo.originalUrl || photo.url} alt={label} />
                          <span className="absolute bottom-1 left-1 text-xs bg-gray-900/90 text-white/70 px-1.5 py-0.5 rounded font-medium">{label}</span>
                          <button
                            onClick={() => deletePhoto(photo.id)}
                            disabled={deletingPhotoId === photo.id}
                            className="absolute top-1 right-1 p-1 bg-gray-900/80 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-900 transition-opacity"
                          >
                            <X className="h-4 w-4 text-white/60" />
                          </button>
                        </div>
                      ) : (
                        <label className={`flex flex-col items-center justify-center aspect-square border-2 border-dashed border-red-400/30 bg-red-400/5 rounded-lg cursor-pointer hover:border-white/40 hover:bg-white/5 transition-colors ${photoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                          <Upload className="h-5 w-5 text-red-400 mb-1" />
                          <span className="text-xs text-red-400 font-medium">{label} *</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(e, i)}
                            disabled={photoUploading}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>

              <h3 className="text-sm font-medium text-white mb-2">Additional Photos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {extraPhotos.map((photo) => (
                  <div key={photo.id} className="relative aspect-video rounded-lg overflow-hidden bg-gray-800 group">
                    <VehiclePhoto src={photo.originalUrl || photo.url} />
                    <button
                      onClick={() => deletePhoto(photo.id)}
                      disabled={deletingPhotoId === photo.id}
                      className="absolute top-1 right-1 p-1 bg-gray-900/80 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-900 transition-opacity"
                    >
                      <X className="h-4 w-4 text-white/60" />
                    </button>
                  </div>
                ))}
                <label className={`flex flex-col items-center justify-center aspect-video border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-white/40 hover:bg-white/5 transition-colors ${photoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload className="h-5 w-5 text-white/40 mb-1" />
                  <span className="text-xs text-white/50">{photoUploading ? 'Uploading...' : 'Add More'}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e)}
                    disabled={photoUploading}
                  />
                </label>
              </div>
            </>
          );
        })()}
      </div>

      {/* Details */}
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
          <h3 className="text-sm font-medium text-white/70 mb-2">Personal Documents</h3>
          <div className="space-y-3 mb-4">
            {PERSONAL_DOC_TYPES.map(({ type, label }) => {
              const existing = personalDocs.filter((d) => d.type === type);
              const approved = existing.find((d) => d.status === 'APPROVED');
              const pending = existing.find((d) => d.status === 'PENDING_REVIEW');
              const flagged = existing.find((d) => d.status === 'FLAGGED');
              const canUpload = !approved && !pending;

              return (
                <div key={type} className="border border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{label}</span>
                    {approved ? (
                      <Badge variant="success"><Check className="h-3 w-3 mr-1" /> Approved</Badge>
                    ) : pending ? (
                      <Badge variant="warning">Pending Review</Badge>
                    ) : flagged ? (
                      <Badge variant="danger">Flagged</Badge>
                    ) : (
                      <Badge variant="default">Not Uploaded</Badge>
                    )}
                  </div>
                  {flagged && <p className="text-xs text-red-400 mt-1">This document was flagged. Please re-upload.</p>}
                  {canUpload && (
                    <label className={`mt-3 flex items-center justify-center gap-2 w-full h-12 border-2 border-dashed border-white/15 rounded-lg cursor-pointer hover:border-white/40 hover:bg-white/5 transition-colors ${docUploading === type ? 'opacity-50 pointer-events-none' : ''}`}>
                      {docUploading === type ? (
                        <><Loader2 className="h-4 w-4 text-white/50 animate-spin" /><span className="text-sm text-white/50">Uploading...</span></>
                      ) : (
                        <><FileUp className="h-4 w-4 text-white/50" /><span className="text-sm text-white/50">Upload {label}</span></>
                      )}
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleDocUpload(type, e, true)} disabled={docUploading === type} />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          <h3 className="text-sm font-medium text-white/70 mb-2">Vehicle Documents</h3>
          {vehicle.type === 'OTHER' && (
            <p className="text-xs text-white/50 mb-2">
              Upload a permit or licence for your vehicle (e.g. aviation licence, boat registration). If no permit exists, upload a signed and dated letter explaining why.
            </p>
          )}
          <div className="space-y-3">
            {VEHICLE_DOC_TYPES.map(({ type, label }) => {
              const existing = vehicle.documents.filter((d) => d.type === type);
              const approved = existing.find((d) => d.status === 'APPROVED');
              const pending = existing.find((d) => d.status === 'PENDING_REVIEW');
              const flagged = existing.find((d) => d.status === 'FLAGGED');
              const canUpload = !approved && !pending;

              return (
                <div key={type} className="border border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{label}</span>
                    {approved ? (
                      <Badge variant="success">
                        <Check className="h-3 w-3 mr-1" /> Approved
                      </Badge>
                    ) : pending ? (
                      <Badge variant="warning">Pending Review</Badge>
                    ) : flagged ? (
                      <Badge variant="danger">Flagged</Badge>
                    ) : (
                      <Badge variant="default">Not Uploaded</Badge>
                    )}
                  </div>
                  {flagged && (
                    <p className="text-xs text-red-400 mt-1">This document was flagged. Please re-upload.</p>
                  )}
                  {canUpload && (
                    <label className={`mt-3 flex items-center justify-center gap-2 w-full h-12 border-2 border-dashed border-white/15 rounded-lg cursor-pointer hover:border-white/40 hover:bg-white/5 transition-colors ${docUploading === type ? 'opacity-50 pointer-events-none' : ''}`}>
                      {docUploading === type ? (
                        <><Loader2 className="h-4 w-4 text-white/50 animate-spin" /><span className="text-sm text-white/50">Uploading...</span></>
                      ) : (
                        <><FileUp className="h-4 w-4 text-white/50" /><span className="text-sm text-white/50">Upload {label}</span></>
                      )}
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleDocUpload(type, e)}
                        disabled={docUploading === type}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Booked Dates */}
      {vehicle.bookings.length > 0 && (
        <Card className="mb-6">
          <CardHeader><h2 className="text-lg font-semibold">Booked Dates</h2></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vehicle.bookings.map((b) => (
                <div key={b.id} className="flex items-center gap-2 p-3 bg-red-400/10 rounded-lg text-sm">
                  <Ban className="h-4 w-4 text-red-400 shrink-0" />
                  <span className="text-red-400 font-medium">
                    {new Date(b.startDate).toLocaleDateString('en-ZA')} — {new Date(b.endDate).toLocaleDateString('en-ZA')}
                  </span>
                  <Badge variant="danger">Booked</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocked Dates */}
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
            <div className="mb-4 p-4 bg-gray-800 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          {vehicle.availability.filter((b) => !b.reason?.startsWith('Booked:')).length === 0 ? (
            <p className="text-sm text-white/50">No dates blocked. Your vehicle is available for all dates.</p>
          ) : (
            <div className="space-y-2">
              {vehicle.availability.filter((b) => !b.reason?.startsWith('Booked:')).map((block) => (
                <div key={block.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-white/40" />
                      <span className="font-medium">
                        {new Date(block.startDate).toLocaleDateString('en-ZA')} — {new Date(block.endDate).toLocaleDateString('en-ZA')}
                      </span>
                    </div>
                    {block.reason && <p className="text-xs text-white/50 ml-6 mt-0.5">{block.reason}</p>}
                  </div>
                  <button onClick={() => removeBlock(block.id)} className="text-white/40 hover:text-red-400">
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
        <Card className="mb-6">
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

      {/* Danger Zone */}
      <Card className="border-red-400/20">
        <CardHeader><h2 className="text-lg font-semibold text-red-400">Danger Zone</h2></CardHeader>
        <CardContent>
          <p className="text-sm text-white/60 mb-3">Permanently delete this vehicle, its photos, documents, and all associated data. This action cannot be undone.</p>
          <Button variant="outline" className="border-red-400/40 text-red-400 hover:bg-red-400/10" onClick={() => setShowDeleteVehicle(true)}>
            Delete Vehicle
          </Button>
        </CardContent>
      </Card>

      {showDeleteVehicle && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Vehicle</h3>
            <p className="text-sm text-white/60 mb-4">
              This will permanently delete your <span className="font-semibold text-white">{vehicle.year} {vehicle.make} {vehicle.model}</span> and all its data. Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm.
            </p>
            <Input
              id="deleteVehicleConfirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE to confirm"
            />
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => { setShowDeleteVehicle(false); setDeleteConfirm(''); }}>Cancel</Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                disabled={deleteConfirm !== 'DELETE'}
                loading={deletingVehicle}
                onClick={handleDeleteVehicle}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
