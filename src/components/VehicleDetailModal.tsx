'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { VehiclePhoto } from '@/components/VehiclePhoto';

interface VehicleDetail {
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
  photos: { id: string; url: string }[];
  owner: { name: string };
}

interface VehicleDetailModalProps {
  vehicleId: string | null;
  onClose: () => void;
}

export function VehicleDetailModal({ vehicleId, onClose }: VehicleDetailModalProps) {
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    if (!vehicleId) {
      setVehicle(null);
      setActivePhoto(0);
      return;
    }
    setLoading(true);
    fetch(`/api/vehicles/${vehicleId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setVehicle(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [vehicleId]);

  return (
    <Modal
      open={!!vehicleId}
      onClose={onClose}
      title={vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicle Details'}
      className="max-w-2xl"
    >
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="aspect-video bg-gray-800 rounded-lg" />
          <div className="h-4 bg-gray-800 rounded w-1/2" />
          <div className="h-4 bg-gray-800 rounded w-1/3" />
        </div>
      ) : vehicle ? (
        <div className="space-y-4">
          {/* Photos */}
          {vehicle.photos.length > 0 && (
            <div>
              <div className="aspect-video rounded-lg overflow-hidden bg-gray-800">
                <VehiclePhoto
                  src={vehicle.photos[activePhoto]?.url}
                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                />
              </div>
              {vehicle.photos.length > 1 && (
                <div className="flex gap-2 mt-2 overflow-x-auto">
                  {vehicle.photos.map((photo, i) => (
                    <button
                      key={photo.id}
                      onClick={() => setActivePhoto(i)}
                      className={`h-14 w-20 rounded overflow-hidden flex-shrink-0 border-2 transition-colors ${
                        i === activePhoto ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <VehiclePhoto src={photo.url} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-white/50">
            <MapPin className="h-4 w-4" />
            {vehicle.location}
          </div>

          {/* Specs */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-white/50">Type</dt>
              <dd className="font-medium capitalize">{vehicle.type.toLowerCase().replace(/_/g, ' ')}</dd>
            </div>
            {vehicle.driveSide && (
              <div>
                <dt className="text-white/50">Drive</dt>
                <dd className="font-medium">{vehicle.driveSide === 'LEFT' ? 'Left-Hand Drive' : 'Right-Hand Drive'}</dd>
              </div>
            )}
            <div>
              <dt className="text-white/50">Color</dt>
              <dd className="font-medium">{vehicle.color}</dd>
            </div>
            <div>
              <dt className="text-white/50">Condition</dt>
              <dd className="font-medium capitalize">{vehicle.condition.toLowerCase()}</dd>
            </div>
            {vehicle.mileage && (
              <div>
                <dt className="text-white/50">Mileage</dt>
                <dd className="font-medium">{vehicle.mileage.toLocaleString()} km</dd>
              </div>
            )}
            <div>
              <dt className="text-white/50">Owner</dt>
              <dd className="font-medium">{vehicle.owner.name}</dd>
            </div>
          </dl>

          {/* Special Features */}
          {vehicle.specialFeatures.length > 0 && (
            <div>
              <span className="text-sm text-white/50">Special Features</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {vehicle.specialFeatures.map((f) => (
                  <Badge key={f}>{f}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-white/50 py-4 text-center">Vehicle not found.</p>
      )}
    </Modal>
  );
}
