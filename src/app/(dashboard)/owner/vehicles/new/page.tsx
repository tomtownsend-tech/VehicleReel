'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { VEHICLE_TYPES, VEHICLE_CONDITIONS, COLORS, LOCATIONS, DRIVE_SIDES } from '@/lib/constants';
import { Upload, X, Check } from 'lucide-react';
import { compressImage } from '@/lib/utils/compress-image';

type Step = 'details' | 'photos' | 'documents';

const STEPS: { key: Step; label: string }[] = [
  { key: 'details', label: 'Vehicle Details' },
  { key: 'photos', label: 'Photos' },
  { key: 'documents', label: 'Documents' },
];

export default function NewVehiclePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vehicleId, setVehicleId] = useState<string | null>(null);

  // Vehicle details
  const [details, setDetails] = useState({
    type: '',
    customType: '',
    make: '',
    model: '',
    color: '',
    year: '',
    mileage: '',
    condition: '',
    location: '',
    specialFeatures: '',
    driveSide: '',
  });

  // Required photo slots
  const REQUIRED_PHOTO_LABELS = ['Front', 'Back', 'Left', 'Right', 'Interior'] as const;
  const [requiredPhotos, setRequiredPhotos] = useState<Record<string, { file: File; preview: string } | null>>({
    Front: null, Back: null, Left: null, Right: null, Interior: null,
  });

  // Additional optional photos
  const [extraPhotoFiles, setExtraPhotoFiles] = useState<File[]>([]);
  const [extraPreviews, setExtraPreviews] = useState<string[]>([]);

  // Documents — vehicle doc type depends on whether type is OTHER
  const isOtherType = details.type === 'OTHER';
  const [documents, setDocuments] = useState<{ type: string; file: File | null; uploaded: boolean; isPersonal: boolean }[]>([
    { type: 'SA_ID', file: null, uploaded: false, isPersonal: true },
    { type: 'DRIVERS_LICENSE', file: null, uploaded: false, isPersonal: true },
    { type: 'VEHICLE_REGISTRATION', file: null, uploaded: false, isPersonal: false },
  ]);

  function updateDetail(field: string, value: string) {
    setDetails((prev) => ({ ...prev, [field]: value }));
    // When type changes, update the vehicle document requirement
    if (field === 'type') {
      const newVehicleDoc = value === 'OTHER' ? 'VEHICLE_PERMIT' : 'VEHICLE_REGISTRATION';
      setDocuments((prev) => prev.map((d, i) => i === 2 ? { ...d, type: newVehicleDoc, file: null, uploaded: false } : d));
    }
  }

  async function handleDetailsSubmit() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...details,
          year: parseInt(details.year),
          mileage: details.mileage ? parseInt(details.mileage) : undefined,
          customType: details.type === 'OTHER' ? details.customType : undefined,
          driveSide: details.driveSide || undefined,
          specialFeatures: details.specialFeatures
            ? details.specialFeatures.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create vehicle');
        return;
      }

      const vehicle = await res.json();
      setVehicleId(vehicle.id);
      setStep('photos');
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleRequiredPhotoSelect(label: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRequiredPhotos((prev) => ({ ...prev, [label]: { file: compressed, preview: ev.target?.result as string } }));
    };
    reader.readAsDataURL(compressed);
  }

  async function handleExtraPhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFiles = Array.from(e.target.files || []);
    const compressed = await Promise.all(rawFiles.map((f) => compressImage(f)));
    setExtraPhotoFiles((prev) => [...prev, ...compressed]);
    compressed.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setExtraPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeExtraPhoto(index: number) {
    setExtraPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setExtraPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  const allRequiredPhotosAdded = REQUIRED_PHOTO_LABELS.every((label) => requiredPhotos[label] !== null);

  async function handlePhotosSubmit() {
    if (!vehicleId) return;
    if (!allRequiredPhotosAdded) {
      setError('Please upload all 5 required photos before continuing.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      // Upload required photos first (in order), then extras
      const allFiles: File[] = [
        ...REQUIRED_PHOTO_LABELS.map((label) => requiredPhotos[label]!.file),
        ...extraPhotoFiles,
      ];

      let failures = 0;
      for (const file of allFiles) {
        const formData = new FormData();
        formData.append('photos', file);
        const res = await fetch(`/api/vehicles/${vehicleId}/photos`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) failures++;
      }

      // Verify server-side that at least 5 photos were saved
      const checkRes = await fetch(`/api/vehicles/${vehicleId}/photos/count`);
      const { count } = await checkRes.json();

      if (count < 5) {
        setError(`Only ${count} of 5 required photos uploaded successfully. Please re-upload the missing ones.`);
        return;
      }

      if (failures > 0) {
        setError(`${failures} extra photo(s) failed, but all required photos are uploaded. Continuing...`);
      }
      setStep('documents');
    } catch {
      setError('Photo upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleDocSelect(index: number, file: File) {
    setDocuments((prev) =>
      prev.map((d, i) => (i === index ? { ...d, file } : d))
    );
  }

  async function handleFinish() {
    if (!vehicleId) return;
    setLoading(true);
    setError('');

    // Final server-side check: vehicle must have at least 5 photos
    try {
      const checkRes = await fetch(`/api/vehicles/${vehicleId}/photos/count`);
      const { count } = await checkRes.json();
      if (count < 5) {
        setError('Your vehicle needs at least 5 photos. Please go back and upload them.');
        setLoading(false);
        return;
      }
    } catch {
      setError('Could not verify photos. Please try again.');
      setLoading(false);
      return;
    }

    try {
      // Upload all pending documents
      const pending = documents.filter((d) => d.file && !d.uploaded);
      if (pending.length > 0) {
        const results = await Promise.allSettled(
          pending.map(async (doc) => {
            if (!doc.file || !vehicleId) return;
            const formData = new FormData();
            formData.append('file', doc.file);
            formData.append('type', doc.type);
            // Personal docs (SA_ID, DRIVERS_LICENSE) don't get a vehicleId
            if (!doc.isPersonal) {
              formData.append('vehicleId', vehicleId);
            }
            const res = await fetch('/api/documents', { method: 'POST', body: formData });
            if (!res.ok) {
              const data = await res.json().catch(() => null);
              throw new Error(data?.error || 'Upload failed');
            }
          })
        );
        const failed = results.filter((r) => r.status === 'rejected');
        if (failed.length > 0) {
          setError(`${failed.length} document(s) failed to upload. You can retry from settings later.`);
        }
      }
    } catch {
      // Continue to redirect even if some uploads fail
    }
    setLoading(false);
    router.push('/owner/vehicles');
    router.refresh();
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const docLabels: Record<string, string> = {
    SA_ID: 'SA ID / Passport',
    DRIVERS_LICENSE: "Driver's License",
    VEHICLE_REGISTRATION: 'Vehicle License Disk',
    VEHICLE_PERMIT: 'Vehicle Permit / Declaration',
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Add a Vehicle</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < stepIndex
                  ? 'bg-emerald-400/10 text-emerald-400'
                  : i === stepIndex
                  ? 'bg-white text-gray-900'
                  : 'bg-white/10 text-white/40'
              }`}
            >
              {i < stepIndex ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm ${i === stepIndex ? 'font-medium text-white' : 'text-white/50'}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-white/15" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-400/10 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>
      )}

      {/* Step 1: Details */}
      {step === 'details' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Select
              id="type"
              label="Vehicle Type"
              options={VEHICLE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              value={details.type}
              onChange={(e) => updateDetail('type', e.target.value)}
              placeholder="Select type..."
            />
            {details.type === 'OTHER' && (
              <Input
                id="customType"
                label="Describe the vehicle type"
                value={details.customType}
                onChange={(e) => updateDetail('customType', e.target.value)}
                placeholder="e.g. Helicopter, Yacht, Steam Train, Food Truck"
                required
              />
            )}
            {(details.type === 'CAR' || details.type === 'RACING_CAR') && (
              <Select
                id="driveSide"
                label="Drive Side"
                options={DRIVE_SIDES.map((d) => ({ value: d.value, label: d.label }))}
                value={details.driveSide}
                onChange={(e) => updateDetail('driveSide', e.target.value)}
                placeholder="Select drive side..."
              />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="make"
                label="Make"
                value={details.make}
                onChange={(e) => updateDetail('make', e.target.value)}
                placeholder="e.g. Toyota"
                required
              />
              <Input
                id="model"
                label="Model"
                value={details.model}
                onChange={(e) => updateDetail('model', e.target.value)}
                placeholder="e.g. Hilux"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                id="color"
                label="Color"
                options={COLORS.map((c) => ({ value: c, label: c }))}
                value={details.color}
                onChange={(e) => updateDetail('color', e.target.value)}
                placeholder="Select color..."
              />
              <Input
                id="year"
                label="Year"
                type="number"
                value={details.year}
                onChange={(e) => updateDetail('year', e.target.value)}
                placeholder="e.g. 2021"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="mileage"
                label="Mileage (km)"
                type="number"
                value={details.mileage}
                onChange={(e) => updateDetail('mileage', e.target.value)}
                placeholder="e.g. 45000"
              />
              <Select
                id="condition"
                label="Condition"
                options={VEHICLE_CONDITIONS.map((c) => ({ value: c.value, label: c.label }))}
                value={details.condition}
                onChange={(e) => updateDetail('condition', e.target.value)}
                placeholder="Select condition..."
              />
            </div>
            <Select
              id="location"
              label="Location"
              options={LOCATIONS.map((l) => ({ value: l, label: l }))}
              value={details.location}
              onChange={(e) => updateDetail('location', e.target.value)}
              placeholder="Select location..."
            />
            <Input
              id="specialFeatures"
              label="Special Features (comma separated)"
              value={details.specialFeatures}
              onChange={(e) => updateDetail('specialFeatures', e.target.value)}
              placeholder="e.g. Roof rack, Bull bar, GPS"
            />
            <Button
              onClick={handleDetailsSubmit}
              loading={loading}
              disabled={!details.type || !details.make || !details.model || !details.color || !details.year || !details.condition || !details.location || (details.type === 'OTHER' && !details.customType)}
              className="w-full"
            >
              Next: Add Photos
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Photos */}
      {step === 'photos' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-white/60">
              Upload photos of your vehicle. The 5 required angles help production teams evaluate your vehicle.
            </p>

            <div>
              <h3 className="text-sm font-medium text-white mb-3">Required Photos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {REQUIRED_PHOTO_LABELS.map((label) => {
                  const photo = requiredPhotos[label];
                  return (
                    <div key={label} className="relative">
                      <label className={`flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed cursor-pointer transition-colors overflow-hidden ${
                        photo ? 'border-emerald-400/30 bg-emerald-400/5' : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                      }`}>
                        {photo ? (
                          <img src={photo.preview} alt={label} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-white/40 mb-1" />
                            <span className="text-xs text-white/50">{label} *</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleRequiredPhotoSelect(label, e)}
                        />
                      </label>
                      {photo && (
                        <button
                          onClick={() => setRequiredPhotos((prev) => ({ ...prev, [label]: null }))}
                          className="absolute top-1 right-1 p-1 bg-gray-900/80 rounded-full hover:bg-gray-900 z-10"
                        >
                          <X className="h-3 w-3 text-white/60" />
                        </button>
                      )}
                      {photo && (
                        <span className="absolute bottom-1 left-1 text-xs bg-gray-900/90 text-white/70 px-1.5 py-0.5 rounded font-medium">{label}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <h3 className="text-sm font-medium text-white mb-2">Additional Photos (optional)</h3>
              <p className="text-xs text-white/40 mb-3">Engine bay, boot/trunk, detail shots, etc.</p>
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-white/40 hover:bg-white/5 transition-colors">
                <Upload className="h-6 w-6 text-white/40 mb-1" />
                <span className="text-sm text-white/50">Click to upload more photos</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleExtraPhotoSelect}
                />
              </label>
              {extraPreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                  {extraPreviews.map((preview, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-800">
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeExtraPhoto(i)}
                        className="absolute top-1 right-1 p-1 bg-gray-900/80 rounded-full hover:bg-gray-900"
                      >
                        <X className="h-4 w-4 text-white/60" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('details')} className="flex-1">
                Back
              </Button>
              <Button onClick={handlePhotosSubmit} loading={loading} disabled={!allRequiredPhotosAdded} className="flex-1">
                Next: Documents
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Documents */}
      {step === 'documents' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-white/60">
              Upload your verification documents to activate your listing. You can skip this and upload them later from your vehicle page.
            </p>
            <h3 className="text-sm font-medium text-white">Personal Documents</h3>
            {documents.map((doc, i) => {
              if (i === 2) {
                return (
                  <div key="vehicle-header">
                    <h3 className="text-sm font-medium text-white mt-2">Vehicle Documents</h3>
                    {isOtherType && (
                      <p className="text-xs text-white/50 mt-1 mb-2">
                        Upload a permit or licence for your vehicle (e.g. aviation licence, boat registration). If no permit exists, upload a signed and dated letter explaining why.
                      </p>
                    )}
                    <div className="border border-white/10 rounded-lg p-4 mt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">{docLabels[doc.type]}</span>
                        {doc.uploaded && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Uploaded
                          </span>
                        )}
                      </div>
                      {!doc.uploaded && (
                        <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-white/40 transition-colors">
                          {doc.file ? (
                            <span className="text-sm text-white/70">{doc.file.name}</span>
                          ) : (
                            <span className="text-sm text-white/40">Click to select file</span>
                          )}
                          <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocSelect(i, f); }} />
                        </label>
                      )}
                    </div>
                  </div>
                );
              }
              return (
                <div key={doc.type} className="border border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{docLabels[doc.type]}</span>
                    {doc.uploaded && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Uploaded
                      </span>
                    )}
                  </div>
                  {!doc.uploaded && (
                    <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-white/40 transition-colors">
                      {doc.file ? (
                        <span className="text-sm text-white/70">{doc.file.name}</span>
                      ) : (
                        <span className="text-sm text-white/40">Click to select file</span>
                      )}
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocSelect(i, f); }} />
                    </label>
                  )}
                </div>
              );
            })}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('photos')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleFinish} loading={loading} className="flex-1">
                {documents.some((d) => d.file) ? 'Upload & Finish' : 'Finish'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
