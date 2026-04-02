'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { VehiclePhoto } from '@/components/VehiclePhoto';

interface LookbookSectionProps {
  photoUrl: string | null;
  title: string;
  color: string;
  type: string;
  location: string;
  bgTint: string;
  onVisible?: () => void;
}

export function LookbookSection({
  photoUrl,
  title,
  color,
  type,
  location,
  bgTint,
  onVisible,
}: LookbookSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          onVisible?.();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible]);

  return (
    <div
      ref={sectionRef}
      className="lookbook-section relative h-screen w-full flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: bgTint }}
    >
      {/* Full-bleed image */}
      {photoUrl ? (
        <VehiclePhoto
          src={photoUrl}
          alt={title}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[600ms] ease-out ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/20 text-lg">
          No photo
        </div>
      )}

      {/* Gradient overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      {/* Text overlay */}
      <div
        className={`absolute bottom-16 left-6 sm:left-12 md:left-20 z-10 max-w-xl opacity-0 ${
          isVisible ? 'animate-slide-up' : ''
        }`}
        style={{
          animationDelay: '200ms',
          willChange: isVisible ? 'auto' : 'transform, opacity',
        }}
      >
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight">
          {title}
        </h2>
        <div className="mt-3 flex flex-col gap-1">
          <p className="text-base sm:text-lg text-white/70 font-light">
            {color} &middot; {type.replace(/_/g, ' ')}
          </p>
          <p className="text-sm sm:text-base text-white/50 font-light flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {location}
          </p>
        </div>
      </div>
    </div>
  );
}
