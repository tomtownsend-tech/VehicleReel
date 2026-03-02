'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, MapPin, Car, Filter, X, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
  options: { id: string; status: string; startDate: string; endDate: string; queuePosition: number }[];
}

export default function ProductionSearchPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [total, setTotal] = useState(0);
  const [showSpecialRequest, setShowSpecialRequest] = useState(false);
  const [specialRequest, setSpecialRequest] = useState({ vehicleDescription: '', shootDates: '', additionalNotes: '' });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const [filters, setFilters] = useState({
    type: '',
    make: '',
    model: '',
    color: '',
    location: '',
    yearMin: '',
    yearMax: '',
    startDate: '',
    endDate: '',
    driveSide: '',
    specialFeatures: '',
  });

  function updateFilter(field: string, value: string) {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSearch() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });

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

  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getOptionBadge(vehicle: Vehicle) {
    if (vehicle.options.length === 0) return null;
    const count = vehicle.options.length;
    return (
      <Badge variant="info">
        {count === 1 ? '1st option pending' : `${count} options pending`}
      </Badge>
    );
  }

  async function handleSpecialRequest() {
    if (!specialRequest.vehicleDescription || !specialRequest.shootDates) return;
    setSubmittingRequest(true);
    try {
      const res = await fetch('/api/vehicles/special-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specialRequest),
      });
      if (res.ok) {
        setRequestSent(true);
        setSpecialRequest({ vehicleDescription: '', shootDates: '', additionalNotes: '' });
      }
    } catch {
      // silently fail
    } finally {
      setSubmittingRequest(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Search Vehicles</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="lg:hidden flex items-center gap-2 text-sm text-gray-600"
        >
          <Filter className="h-4 w-4" />
          {showFilters ? 'Hide' : 'Show'} Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select
              id="type"
              options={VEHICLE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              value={filters.type}
              onChange={(e) => updateFilter('type', e.target.value)}
              placeholder="Vehicle type"
            />
            {(filters.type === 'CAR' || filters.type === 'RACING_CAR') && (
              <Select
                id="driveSide"
                options={DRIVE_SIDES.map((d) => ({ value: d.value, label: d.label }))}
                value={filters.driveSide}
                onChange={(e) => updateFilter('driveSide', e.target.value)}
                placeholder="Drive side"
              />
            )}
            <Input
              id="make"
              value={filters.make}
              onChange={(e) => updateFilter('make', e.target.value)}
              placeholder="Make"
            />
            <Input
              id="model"
              value={filters.model}
              onChange={(e) => updateFilter('model', e.target.value)}
              placeholder="Model"
            />
            <Select
              id="color"
              options={COLORS.map((c) => ({ value: c, label: c }))}
              value={filters.color}
              onChange={(e) => updateFilter('color', e.target.value)}
              placeholder="Color"
            />
            <Select
              id="location"
              options={LOCATIONS.map((l) => ({ value: l, label: l }))}
              value={filters.location}
              onChange={(e) => updateFilter('location', e.target.value)}
              placeholder="Location"
            />
            <Input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => updateFilter('startDate', e.target.value)}
              placeholder="Start date"
            />
            <Input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => updateFilter('endDate', e.target.value)}
              placeholder="End date"
            />
            <div className="flex gap-2">
              <Input
                id="yearMin"
                type="number"
                value={filters.yearMin}
                onChange={(e) => updateFilter('yearMin', e.target.value)}
                placeholder="Year from"
              />
              <Input
                id="yearMax"
                type="number"
                value={filters.yearMax}
                onChange={(e) => updateFilter('yearMax', e.target.value)}
                placeholder="Year to"
              />
            </div>
            <div className="col-span-2 md:col-span-4">
              <Input
                id="specialFeatures"
                value={filters.specialFeatures}
                onChange={(e) => updateFilter('specialFeatures', e.target.value)}
                placeholder="Special features (e.g. police, taxi, military)"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={handleSearch} loading={loading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const cleared = { type: '', make: '', model: '', color: '', location: '', yearMin: '', yearMax: '', startDate: '', endDate: '', driveSide: '', specialFeatures: '' };
                setFilters(cleared);
                // Trigger search with cleared filters
                setTimeout(() => handleSearch(), 0);
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      <p className="text-sm text-gray-500 mb-4">{total} vehicle{total !== 1 ? 's' : ''} found</p>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="aspect-video bg-gray-200 rounded-lg mb-3" />
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles found</h3>
          <p className="text-gray-500">Try adjusting your filters or search criteria.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <Link
              key={vehicle.id}
              href={`/production/vehicles/${vehicle.id}`}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-video bg-gray-100 relative">
                {vehicle.photos[0] ? (
                  <img
                    src={vehicle.photos[0].url}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Car className="h-12 w-12 text-gray-300" />
                  </div>
                )}
                {getOptionBadge(vehicle) && (
                  <div className="absolute top-3 right-3">{getOptionBadge(vehicle)}</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {vehicle.location}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500 capitalize">
                    {vehicle.type.toLowerCase().replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-300">|</span>
                  <span className="text-xs text-gray-500">{vehicle.color}</span>
                  <span className="text-xs text-gray-300">|</span>
                  <span className="text-xs text-gray-500 capitalize">{vehicle.condition.toLowerCase()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Special Request Section */}
      <Card className="mt-8 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Can&apos;t find what you need?</h3>
            <p className="text-sm text-gray-500 mt-1">
              We can source specific vehicles that aren&apos;t listed on the platform. Tell us what you&apos;re looking for and our team will get back to you.
            </p>
            {!showSpecialRequest && !requestSent && (
              <Button className="mt-3" onClick={() => setShowSpecialRequest(true)}>
                <Send className="h-4 w-4 mr-2" />
                Submit a Special Request
              </Button>
            )}
            {requestSent && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">Request sent! Our team will be in touch shortly.</p>
                <button
                  className="text-sm text-green-600 underline mt-1"
                  onClick={() => { setRequestSent(false); setShowSpecialRequest(false); }}
                >
                  Submit another request
                </button>
              </div>
            )}
            {showSpecialRequest && !requestSent && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    What vehicle are you looking for? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="e.g. 1970s muscle car, red Porsche 911, vintage VW Beetle, military vehicle..."
                    value={specialRequest.vehicleDescription}
                    onChange={(e) => setSpecialRequest(prev => ({ ...prev, vehicleDescription: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shoot dates <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="specialShootDates"
                    placeholder="e.g. March 15-18, 2026"
                    value={specialRequest.shootDates}
                    onChange={(e) => setSpecialRequest(prev => ({ ...prev, shootDates: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional notes
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="Budget, location preferences, special requirements..."
                    value={specialRequest.additionalNotes}
                    onChange={(e) => setSpecialRequest(prev => ({ ...prev, additionalNotes: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSpecialRequest}
                    loading={submittingRequest}
                    disabled={!specialRequest.vehicleDescription || !specialRequest.shootDates}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Request
                  </Button>
                  <Button variant="ghost" onClick={() => setShowSpecialRequest(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
