'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Car, Film } from 'lucide-react';

export default function Home() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 100);      // greeting
    const t2 = setTimeout(() => setStep(2), 1500);      // tagline
    const t3 = setTimeout(() => setStep(3), 3000);      // CTA #1
    const t4 = setTimeout(() => setStep(4), 3200);      // CTA #2
    const t5 = setTimeout(() => setStep(5), 3400);      // sign-in
    const t6 = setTimeout(() => setStep(6), 3800);      // watermark
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 overflow-hidden">
      <div className="flex flex-col items-center gap-6 sm:gap-8">
        {/* Greeting */}
        <h1
          className={`text-7xl sm:text-8xl md:text-9xl font-bold text-white tracking-tight opacity-0 ${
            step >= 1 ? 'animate-slide-up' : ''
          }`}
          style={{ willChange: step >= 1 && step < 6 ? 'transform, opacity' : 'auto' }}
        >
          Hello.
        </h1>

        {/* Tagline */}
        <p
          className={`text-lg sm:text-2xl md:text-3xl text-gray-300 font-light tracking-wide opacity-0 ${
            step >= 2 ? 'animate-slide-up' : ''
          }`}
          style={{ willChange: step >= 2 && step < 6 ? 'transform, opacity' : 'auto' }}
        >
          We know why you&apos;re here.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-4 mt-4 sm:mt-8">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Primary CTA — slides from left */}
            <Link
              href="/register?role=OWNER"
              className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white text-black font-medium transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-white/10 opacity-0 ${
                step >= 3 ? 'animate-slide-left' : ''
              }`}
              style={{ willChange: step >= 3 && step < 6 ? 'transform, opacity' : 'auto' }}
            >
              <Car className="h-5 w-5" />
              List my vehicle
            </Link>

            {/* Secondary CTA — slides from right */}
            <Link
              href="/register?role=PRODUCTION"
              className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-white text-white font-medium transition-all duration-300 hover:bg-white/10 opacity-0 ${
                step >= 4 ? 'animate-slide-right' : ''
              }`}
              style={{ willChange: step >= 4 && step < 6 ? 'transform, opacity' : 'auto' }}
            >
              <Film className="h-5 w-5" />
              Find vehicles
            </Link>
          </div>

          {/* Sign in link */}
          <Link
            href="/login"
            className={`text-sm text-gray-500 transition-colors duration-[400ms] ease-in-out hover:text-gray-300 mt-2 opacity-0 ${
              step >= 5 ? 'animate-fade-in' : ''
            }`}
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Watermark */}
      <div
        className={`absolute bottom-8 text-xs tracking-widest text-gray-600 uppercase opacity-0 ${
          step >= 6 ? 'animate-slide-up' : ''
        }`}
      >
        VehicleReel
      </div>
    </div>
  );
}
