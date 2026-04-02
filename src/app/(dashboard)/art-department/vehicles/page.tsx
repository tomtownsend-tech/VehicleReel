'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, MapPin, Filter, X, Calendar } from 'lucide-react';
import { VehiclePhoto } from '@/components/VehiclePhoto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

import { VEHICLE_TYPES, COLORS, LOCATIONS, DRIVE_SIDES } from '@/lib/constants';

interface Vehicle {
  id: string;
  type: string;
  make: string;
  model: string;
  color: string;
  year: number;
  location: string;
  condition: string;
  specialFeatures: string[];
  photos: { url: string }[];
  owner: { name: string };
}

export default function ArtDepartmentVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    type: '', make: '', model: '', color: '', location: '',
    yearMin: '', yearMax: '', startDate: '', endDate: '', driveSide: '', specialFeatures: '',
  });

  function updateFilter(field: string, value: string) {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSearch() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    try {
      const res = await fetch(`/api/vehicles/search?${params}`);
      const data = await res.json();
      setVehicles(data.vehicles || []);
      setTotal(data.pagination?.total || 0);
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { handleSearch(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Browse Vehicles</h1>
        <button onClick={() => setShowFilters(!showFilters)} className="lg:hidden flex items-center gap-2 text-sm text-white/60">
          <Filter className="h-4 w-4" /> {showFilters ? 'Hide' : 'Show'} Filters
        </button>
      </div>

      {showFilters && (
        <div className="bg-gray-900 rounded-xl border border-white/10 p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <Select id="type" options={VEHICLE_TYPES.map((t) => ({ value: t.value, label: t.label }))} value={filters.type} onChange={(e) => updateFilter('type', e.target.value)} placeholder="Vehicle type" />
            {(filters.type === 'CAR' || filters.type === 'RACING_CAR') && (
              <Select id="driveSide" options={DRIVE_SIDES.map((d) => ({ value: d.value, label: d.label }))} value={filters.driveSide} onChange={(e) => updateFilter('driveSide', e.target.value)} placeholder="Drive side" />
            )}
            <Input id="make" value={filters.make} onChange={(e) => updateFilter('make', e.target.value)} placeholder="Make" />
            <Input id="model" value={filters.model} onChange={(e) => updateFilter('model', e.target.value)} placeholder="Model" />
            <Select id="color" options={COLORS.map((c) => ({ value: c, label: c }))} value={filters.color} onChange={(e) => updateFilter('color', e.target.value)} placeholder="Color" />
            <Select id="location" options={LOCATIONS.map((l) => ({ value: l, label: l }))} value={filters.location} onChange={(e) => updateFilter('location', e.target.value)} placeholder="Location" />
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 md:col-span-2 overflow-hidden">
              <div className="relative min-w-0">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none z-10" />
                {!filters.startDate && <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-white/40 pointer-events-none">Start date</span>}
                <input id="startDate" type="date" value={filters.startDate} onChange={(e) => updateFilter('startDate', e.target.value)} className="block w-full min-w-0 rounded-lg border border-white/15 pl-9 pr-2 py-2 text-sm bg-gray-900 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 dark-select" style={!filters.startDate ? { color: 'transparent' } : undefined} />
              </div>
              <div className="relative min-w-0">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none z-10" />
                {!filters.endDate && <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-white/40 pointer-events-none">End date</span>}
                <input id="endDate" type="date" value={filters.endDate} onChange={(e) => updateFilter('endDate', e.target.value)} className="block w-full min-w-0 rounded-lg border border-white/15 pl-9 pr-2 py-2 text-sm bg-gray-900 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 dark-select" style={!filters.endDate ? { color: 'transparent' } : undefined} />
              </div>
            </div>
            <Input id="yearMin" type="number" value={filters.yearMin} onChange={(e) => updateFilter('yearMin', e.target.value)} placeholder="Year from" />
            <Input id="yearMax" type="number" value={filters.yearMax} onChange={(e) => updateFilter('yearMax', e.target.value)} placeholder="Year to" />
            <div className="sm:col-span-2 md:col-span-4">
              <Input id="specialFeatures" value={filters.specialFeatures} onChange={(e) => updateFilter('specialFeatures', e.target.value)} placeholder="Special features (e.g. police, taxi, military)" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={handleSearch} loading={loading}><Search className="h-4 w-4 mr-2" />Search</Button>
            <Button variant="ghost" onClick={() => { setFilters({ type: '', make: '', model: '', color: '', location: '', yearMin: '', yearMax: '', startDate: '', endDate: '', driveSide: '', specialFeatures: '' }); setTimeout(() => handleSearch(), 0); }}><X className="h-4 w-4 mr-1" />Clear</Button>
          </div>
        </div>
      )}

      <p className="text-sm text-white/50 mb-4">{total} vehicle{total !== 1 ? 's' : ''} found</p>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-gray-900 rounded-xl border border-white/10 p-4 animate-pulse"><div className="aspect-video bg-gray-800 rounded-lg mb-3" /><div className="h-5 bg-gray-800 rounded w-2/3 mb-2" /><div className="h-4 bg-gray-800 rounded w-1/3" /></div>)}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-white/10 p-12 text-center">
          <Search className="h-12 w-12 text-white/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No vehicles found</h3>
          <p className="text-white/50">Try adjusting your filters or search criteria.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <Link key={vehicle.id} href={`/art-department/vehicles/${vehicle.id}`} className="bg-gray-900 rounded-xl border border-white/10 overflow-hidden hover:border-white/20 transition-colors">
              <div className="aspect-video bg-gray-800 relative">
                <VehiclePhoto src={vehicle.photos[0]?.url} alt={`${vehicle.make} ${vehicle.model}`} />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h3>
                <div className="flex items-center gap-1 mt-1 text-sm text-white/50"><MapPin className="h-3.5 w-3.5" />{vehicle.location}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-white/50 capitalize">{vehicle.type.toLowerCase().replace(/_/g, ' ')}</span>
                  <span className="text-xs text-white/30">|</span>
                  <span className="text-xs text-white/50">{vehicle.color}</span>
                  <span className="text-xs text-white/30">|</span>
                  <span className="text-xs text-white/50 capitalize">{vehicle.condition.toLowerCase()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
