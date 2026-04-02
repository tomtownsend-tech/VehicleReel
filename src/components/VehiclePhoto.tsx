'use client';

import { useState } from 'react';
import { Car } from 'lucide-react';

interface VehiclePhotoProps {
  src: string | undefined | null;
  alt?: string;
  className?: string;
}

export function VehiclePhoto({ src, alt = '', className = 'w-full h-full object-cover' }: VehiclePhotoProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Car className="h-10 w-10 text-white/20" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
