'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Car, Film } from 'lucide-react';

export default function Home() {
  const [showGreeting, setShowGreeting] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [showCTAs, setShowCTAs] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowGreeting(true), 100);
    const t2 = setTimeout(() => setShowTagline(true), 1500);
    const t3 = setTimeout(() => setShowCTAs(true), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 sm:gap-8">
        <h1
          className={`text-5xl sm:text-7xl md:text-8xl font-bold text-white tracking-tight transition-opacity duration-700 ${
            showGreeting ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Hello.
        </h1>

        <p
          className={`text-lg sm:text-2xl md:text-3xl text-gray-300 font-light tracking-wide transition-opacity duration-700 ${
            showTagline ? 'opacity-100' : 'opacity-0'
          }`}
        >
          We know why you&apos;re here.
        </p>

        <div
          className={`flex flex-col items-center gap-4 mt-4 sm:mt-8 transition-opacity duration-700 ${
            showCTAs ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href="/register?role=OWNER"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-gray-200 transition-colors"
            >
              <Car className="h-5 w-5" />
              List my vehicle
            </Link>
            <Link
              href="/register?role=PRODUCTION"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-white text-white font-medium hover:bg-white/10 transition-colors"
            >
              <Film className="h-5 w-5" />
              Find vehicles
            </Link>
          </div>

          <Link
            href="/login"
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors mt-2"
          >
            Sign In
          </Link>
        </div>
      </div>

      <div
        className={`absolute bottom-8 text-xs tracking-widest text-gray-600 uppercase transition-opacity duration-700 ${
          showCTAs ? 'opacity-100' : 'opacity-0'
        }`}
      >
        VehicleReel
      </div>
    </div>
  );
}
