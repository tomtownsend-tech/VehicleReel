'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Car, Plus, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Vehicle {
  id: string;
  type: string;
  make: string;
  model: string;
  color: string;
  year: number;
  location: string;
  status: string;
  photos: { id: string; url: string }[];
}

const statusBadge: Record<string, 'warning' | 'success' | 'danger' | 'default'> = {
  PENDING_REVIEW: 'warning',
  ACTIVE: 'success',
  SUSPENDED: 'danger',
  REMOVED: 'danger',
};

export default function OwnerVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/vehicles')
      .then((r) => r.json())
      .then((res) => setVehicles(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">My Vehicles</h1>
        <Link
          href="/owner/vehicles/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-900 text-sm font-medium hover:bg-gray-200"
        >
          <Plus className="h-4 w-4" />
          Add Vehicle
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gray-900 rounded-xl border border-white/10 p-4 animate-pulse">
              <div className="aspect-video bg-gray-800 rounded-lg mb-3" />
              <div className="h-5 bg-gray-800 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-white/10 p-12 text-center">
          <Car className="h-12 w-12 text-white/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No vehicles listed yet</h3>
          <p className="text-white/50 mb-4">
            Add your first vehicle to start receiving options from production teams.
          </p>
          <Link
            href="/owner/vehicles/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-900 text-sm font-medium hover:bg-gray-200"
          >
            <Plus className="h-4 w-4" />
            Add Vehicle
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {vehicles.map((vehicle) => (
            <Link
              key={vehicle.id}
              href={`/owner/vehicles/${vehicle.id}`}
              className="bg-gray-900 rounded-xl border border-white/10 overflow-hidden hover:border-white/20 transition-colors"
            >
              <div className="aspect-video bg-gray-800 relative">
                {vehicle.photos[0] ? (
                  <img
                    src={vehicle.photos[0].url}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Car className="h-12 w-12 text-white/30" />
                  </div>
                )}
                <Badge variant={statusBadge[vehicle.status] || 'default'} className="absolute top-3 right-3">
                  {vehicle.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                <div className="flex items-center gap-1 mt-1 text-sm text-white/50">
                  <MapPin className="h-3.5 w-3.5" />
                  {vehicle.location}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-white/50 capitalize">{vehicle.type.toLowerCase().replace('_', ' ')}</span>
                  <span className="text-xs text-white/30">|</span>
                  <span className="text-xs text-white/50">{vehicle.color}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
