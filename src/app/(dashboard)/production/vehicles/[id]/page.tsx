'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, ArrowLeft, Calendar } from 'lucide-react';

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
  photos: { id: string; url: string }[];
  owner: { name: string };
  options: { id: string; status: string; startDate: string; endDate: string; queuePosition: number }[];
}

export default function ProductionVehicleDetailPage() {
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

  if (loading) {
    return <div className="animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/3 mb-4" /><div className="h-64 bg-gray-200 rounded" /></div>;
  }

  if (!vehicle) {
    return <p className="text-gray-500">Vehicle not found.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push('/production/search')}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to search
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
        <Link href={`/production/options/new?vehicleId=${vehicle.id}`}>
          <Button>Place Option</Button>
        </Link>
      </div>

      {/* Photos */}
      {vehicle.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-6">
          {vehicle.photos.map((photo, i) => (
            <div key={photo.id} className={`${i === 0 ? 'col-span-2' : ''} aspect-video rounded-lg overflow-hidden bg-gray-100`}>
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
            <div><dt className="text-gray-500">Type</dt><dd className="font-medium capitalize">{vehicle.type.toLowerCase().replace(/_/g, ' ')}</dd></div>
            <div><dt className="text-gray-500">Color</dt><dd className="font-medium">{vehicle.color}</dd></div>
            <div><dt className="text-gray-500">Condition</dt><dd className="font-medium capitalize">{vehicle.condition.toLowerCase()}</dd></div>
            {vehicle.mileage && <div><dt className="text-gray-500">Mileage</dt><dd className="font-medium">{vehicle.mileage.toLocaleString()} km</dd></div>}
            <div><dt className="text-gray-500">Owner</dt><dd className="font-medium">{vehicle.owner.name}</dd></div>
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

      {/* Active Options */}
      {vehicle.options.length > 0 && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold">Current Options</h2></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vehicle.options.map((opt) => (
                <div key={opt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                      {new Date(opt.startDate).toLocaleDateString('en-ZA')} — {new Date(opt.endDate).toLocaleDateString('en-ZA')}
                    </span>
                  </div>
                  <Badge variant={opt.status === 'ACCEPTED' ? 'success' : 'warning'}>
                    #{opt.queuePosition} — {opt.status.replace(/_/g, ' ')}
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
