'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { LookbookSection } from '@/components/LookbookSection';
import { LookbookProgress } from '@/components/LookbookProgress';
import vrLogoWhite from '@/assets/branding/vr-logo-white.png';

interface Vehicle {
  id: string;
  title: string;
  color: string;
  type: string;
  location: string;
  photoUrl: string | null;
  bgTint: string;
}

interface LookbookClientProps {
  projectName: string;
  companyName: string;
  vehicles: Vehicle[];
}

export default function LookbookClient({
  projectName,
  companyName,
  vehicles,
}: LookbookClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleVisible = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  if (vehicles.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/40 text-lg">No vehicles in this lookbook.</p>
      </div>
    );
  }

  return (
    <div className="lookbook-scroll">
      <LookbookProgress total={vehicles.length} current={currentIndex} />

      {/* Title section */}
      <div className="lookbook-section h-screen flex flex-col items-center justify-center bg-black px-4">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight text-center opacity-0 animate-slide-up">
          {projectName}
        </h1>
        <p
          className="text-base sm:text-lg text-white/40 font-light mt-4 opacity-0 animate-fade-in"
          style={{ animationDelay: '400ms' }}
        >
          {companyName}
        </p>
        <div
          className="mt-8 text-xs tracking-widest text-white/20 uppercase opacity-0 animate-fade-in"
          style={{ animationDelay: '800ms' }}
        >
          {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Vehicle sections */}
      {vehicles.map((vehicle, i) => (
        <LookbookSection
          key={vehicle.id}
          photoUrl={vehicle.photoUrl}
          title={vehicle.title}
          color={vehicle.color}
          type={vehicle.type}
          location={vehicle.location}
          bgTint={vehicle.bgTint}
          onVisible={() => handleVisible(i)}
        />
      ))}

      {/* Footer */}
      <div className="lookbook-section h-screen flex flex-col items-center justify-center bg-black gap-2">
        <Image src={vrLogoWhite} alt="VehicleReel" height={24} className="w-auto opacity-20" />
      </div>
    </div>
  );
}
