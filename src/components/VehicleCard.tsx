'use client';

import { useState } from 'react';
import { Check, Plus, MapPin } from 'lucide-react';

interface VehicleCardProps {
  id: string;
  photoUrl: string | null;
  year: number;
  make: string;
  model: string;
  color: string;
  type: string;
  location: string;
  isAdded?: boolean;
  onToggle?: (id: string) => void;
}

export function VehicleCard({
  id,
  photoUrl,
  year,
  make,
  model,
  color,
  type,
  location,
  isAdded = false,
  onToggle,
}: VehicleCardProps) {
  const [added, setAdded] = useState(isAdded);
  const title = `${year} ${make} ${model}`;

  function handleToggle() {
    setAdded(!added);
    onToggle?.(id);
  }

  return (
    <div
      className={`group relative rounded-xl overflow-hidden bg-gray-900 transition-all duration-200 ${
        added ? 'ring-2 ring-white/50' : ''
      }`}
    >
      {/* Image with 3:2 aspect ratio */}
      <div className="aspect-[3/2] relative bg-gray-800 overflow-hidden">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
            No photo
          </div>
        )}

        {/* Hover overlay with details */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <p className="text-white font-semibold text-sm">{title}</p>
            <p className="text-white/70 text-xs mt-0.5">
              {color} &middot; {type.replace(/_/g, ' ')}
            </p>
            <p className="text-white/50 text-xs mt-0.5 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {location}
            </p>
          </div>
        </div>

        {/* Add to Presentation button */}
        {onToggle && (
          <button
            onClick={handleToggle}
            className={`absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
              added
                ? 'bg-white text-black'
                : 'bg-white/80 text-gray-900 hover:bg-white/90'
            }`}
          >
            {added ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Added
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Add
              </>
            )}
          </button>
        )}
      </div>

      {/* Card body — always visible (mobile-friendly, no hover dependency) */}
      <div className="p-3">
        <p className="text-white font-semibold text-sm">{title}</p>
        <p className="text-gray-400 text-xs mt-0.5">
          {color} &middot; {type.replace(/_/g, ' ')}
        </p>
        <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {location}
        </p>
      </div>
    </div>
  );
}
