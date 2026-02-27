'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { VEHICLE_TYPES, VEHICLE_CONDITIONS, COLORS, LOCATIONS } from '@/lib/constants';
import { Upload, X, Check } from 'lucide-react';

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
    make: '',
    model: '',
    color: '',
    year: '',
    mileage: '',
    condition: '',
    location: '',
    specialFeatures: '',
  });

  // Photos
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Documents
  const [documents, setDocuments] = useState<{ type: string; file: File | null; uploaded: boolean }[]>([
    { type: 'SA_ID', file: null, uploaded: false },
    { type: 'DRIVERS_LICENSE', file: null, uploaded: false },
    { type: 'VEHICLE_REGISTRATION', file: null, uploaded: false },
  ]);

  function updateDetail(field: string, value: string) {
    setDetails((prev) => ({ ...prev, [field]: value }));
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

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setPhotoFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(index: number) {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePhotosSubmit() {
    if (!vehicleId || photoFiles.length === 0) {
      setStep('documents');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      photoFiles.forEach((file) => formData.append('photos', file));

      const res = await fetch(`/api/vehicles/${vehicleId}/photos`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        setError('Failed to upload photos');
        return;
      }

      setStep('documents');
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleDocSelect(index: number, file: File) {
    setDocuments((prev) =>
      prev.map((d, i) => (i === index ? { ...d, file } : d))
    );
  }

  async function uploadDocument(index: number) {
    const doc = documents[index];
    if (!doc.file || !vehicleId) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', doc.file);
      formData.append('type', doc.type);
      formData.append('vehicleId', vehicleId);

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setDocuments((prev) =>
          prev.map((d, i) => (i === index ? { ...d, uploaded: true } : d))
        );
      }
    } catch {
      setError('Failed to upload document');
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish() {
    // Upload any remaining documents
    for (let i = 0; i < documents.length; i++) {
      if (documents[i].file && !documents[i].uploaded) {
        await uploadDocument(i);
      }
    }
    router.push('/owner/vehicles');
    router.refresh();
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const docLabels: Record<string, string> = {
    SA_ID: 'South African ID',
    DRIVERS_LICENSE: "Driver's License",
    VEHICLE_REGISTRATION: 'Vehicle Registration',
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add a Vehicle</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < stepIndex
                  ? 'bg-green-100 text-green-700'
                  : i === stepIndex
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < stepIndex ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm ${i === stepIndex ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">{error}</div>
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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
              disabled={!details.type || !details.make || !details.model || !details.color || !details.year || !details.condition || !details.location}
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
            <p className="text-sm text-gray-600">
              Upload photos of your vehicle. More photos help production teams make decisions.
            </p>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Click to upload photos</span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </label>
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {photoPreviews.map((preview, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 p-1 bg-white/80 rounded-full hover:bg-white"
                    >
                      <X className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('details')} className="flex-1">
                Back
              </Button>
              <Button onClick={handlePhotosSubmit} loading={loading} className="flex-1">
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
            <p className="text-sm text-gray-600">
              Upload your verification documents. These will be reviewed to activate your listing.
            </p>
            {documents.map((doc, i) => (
              <div key={doc.type} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{docLabels[doc.type]}</span>
                  {doc.uploaded && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Uploaded
                    </span>
                  )}
                </div>
                {!doc.uploaded && (
                  <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                    {doc.file ? (
                      <span className="text-sm text-gray-700">{doc.file.name}</span>
                    ) : (
                      <span className="text-sm text-gray-400">Click to select file</span>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleDocSelect(i, f);
                      }}
                    />
                  </label>
                )}
              </div>
            ))}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('photos')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleFinish} loading={loading} className="flex-1">
                Submit for Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
