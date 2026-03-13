'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Car, Film, Upload, ShieldCheck, Search, CalendarCheck, MessageSquare, ClipboardList, CreditCard, ChevronDown } from 'lucide-react';

const OWNER_STEPS = [
  { icon: Upload, title: 'Register & Upload', desc: 'Create an account, upload your SA ID, Driver\'s License, and Vehicle License Disk.' },
  { icon: ShieldCheck, title: 'Get Verified', desc: 'AI reviews your documents in minutes. Once approved, your vehicle goes live.' },
  { icon: CalendarCheck, title: 'Receive Options', desc: 'Production companies place holds on your vehicle for specific shoot dates.' },
  { icon: CreditCard, title: 'Get Paid', desc: 'After the shoot, VehicleReel invoices the production company and pays you out.' },
];

const PRODUCTION_STEPS = [
  { icon: Film, title: 'Register Your Company', desc: 'Create an account with your SA ID and Company Registration to get verified.' },
  { icon: Search, title: 'Search Vehicles', desc: 'Filter by type, make, model, color, year, location, and date availability.' },
  { icon: ClipboardList, title: 'Place Options & Book', desc: 'Reserve vehicles with date holds. Once the owner accepts, confirm your booking.' },
  { icon: MessageSquare, title: 'Coordinate the Shoot', desc: 'Upload insurance, set call times and locations, and manage logistics through the platform.' },
];

export default function Home() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 1500);
    const t3 = setTimeout(() => setStep(3), 3000);
    const t4 = setTimeout(() => setStep(4), 3200);
    const t5 = setTimeout(() => setStep(5), 3400);
    const t6 = setTimeout(() => setStep(6), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); clearTimeout(t6); };
  }, []);

  return (
    <div className="bg-black">
      {/* Hero */}
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
        <div className="flex flex-col items-center gap-6 sm:gap-8">
          <h1
            className={`text-7xl sm:text-8xl md:text-9xl font-bold text-white tracking-tight opacity-0 ${step >= 1 ? 'animate-slide-up' : ''}`}
            style={{ willChange: step >= 1 && step < 6 ? 'transform, opacity' : 'auto' }}
          >
            Hello.
          </h1>
          <p
            className={`text-lg sm:text-2xl md:text-3xl text-gray-300 font-light tracking-wide opacity-0 ${step >= 2 ? 'animate-slide-up' : ''}`}
            style={{ willChange: step >= 2 && step < 6 ? 'transform, opacity' : 'auto' }}
          >
            We know why you&apos;re here.
          </p>
          <div className="flex flex-col items-center gap-4 mt-4 sm:mt-8">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                href="/register?role=OWNER"
                className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white text-black font-medium transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-white/10 opacity-0 ${step >= 3 ? 'animate-slide-left' : ''}`}
                style={{ willChange: step >= 3 && step < 6 ? 'transform, opacity' : 'auto' }}
              >
                <Car className="h-5 w-5" /> List my vehicle
              </Link>
              <Link
                href="/register?role=PRODUCTION"
                className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-white text-white font-medium transition-all duration-300 hover:bg-white/10 opacity-0 ${step >= 4 ? 'animate-slide-right' : ''}`}
                style={{ willChange: step >= 4 && step < 6 ? 'transform, opacity' : 'auto' }}
              >
                <Film className="h-5 w-5" /> Find vehicles
              </Link>
            </div>
            <Link
              href="/login"
              className={`text-sm text-gray-500 transition-colors duration-[400ms] ease-in-out hover:text-gray-300 mt-2 opacity-0 ${step >= 5 ? 'animate-fade-in' : ''}`}
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <button
          onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
          className={`absolute bottom-8 flex flex-col items-center gap-1 text-gray-600 hover:text-gray-400 transition-colors opacity-0 ${step >= 6 ? 'animate-fade-in' : ''}`}
        >
          <span className="text-xs tracking-widest uppercase">How it works</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </button>
      </div>

      {/* How It Works */}
      <section id="how-it-works" className="px-4 py-20 sm:py-28 max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-16">How It Works</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Owner Column */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <Car className="h-6 w-6 text-white" />
              <h3 className="text-xl font-semibold text-white">Vehicle Owners</h3>
            </div>
            <div className="space-y-8">
              {OWNER_STEPS.map((s, i) => (
                <div key={s.title} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                    <s.icon className="h-5 w-5 text-white/70" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">
                      <span className="text-white/40 mr-2">{i + 1}.</span>{s.title}
                    </p>
                    <p className="text-sm text-white/50 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
              <Link
                href="/register?role=OWNER"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                <Car className="h-4 w-4" /> List my vehicle
              </Link>
            </div>
          </div>

          {/* Production Column */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <Film className="h-6 w-6 text-white" />
              <h3 className="text-xl font-semibold text-white">Production Companies</h3>
            </div>
            <div className="space-y-8">
              {PRODUCTION_STEPS.map((s, i) => (
                <div key={s.title} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                    <s.icon className="h-5 w-5 text-white/70" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">
                      <span className="text-white/40 mr-2">{i + 1}.</span>{s.title}
                    </p>
                    <p className="text-sm text-white/50 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
              <Link
                href="/register?role=PRODUCTION"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white text-white text-sm font-medium hover:bg-white/10 transition-colors"
              >
                <Film className="h-4 w-4" /> Find vehicles
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer watermark */}
      <div className="pb-8 text-center">
        <span className="text-xs tracking-widest text-gray-600 uppercase">VehicleReel</span>
      </div>
    </div>
  );
}
