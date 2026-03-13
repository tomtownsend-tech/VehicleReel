'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function ConsentBanner() {
  const searchParams = useSearchParams();
  const { update } = useSession();
  const showConsent = searchParams.get('consent') === 'required';
  const [acceptTc, setAcceptTc] = useState(false);
  const [acceptPopia, setAcceptPopia] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (!showConsent || done) return null;

  async function handleConsent() {
    setSaving(true);
    try {
      const res = await fetch('/api/users/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptTc, acceptPopia }),
      });
      if (res.ok) {
        setDone(true);
        await update();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-6 border-amber-400/30 bg-amber-950/20">
      <CardHeader>
        <h2 className="text-lg font-semibold text-amber-400">Updated Terms &amp; Conditions</h2>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-white/60 mb-4">
          Our Terms &amp; Conditions have been updated. Please review and accept them to continue using VehicleReel.
        </p>
        <div className="space-y-3 mb-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTc}
              onChange={(e) => setAcceptTc(e.target.checked)}
              className="mt-0.5 rounded border-white/15 text-white focus:ring-white/20 bg-white/5"
            />
            <span className="text-sm text-white/60">
              I agree to the updated{' '}
              <Link href="/terms" target="_blank" className="text-amber-400 underline hover:text-amber-300">
                Terms &amp; Conditions
              </Link>
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptPopia}
              onChange={(e) => setAcceptPopia(e.target.checked)}
              className="mt-0.5 rounded border-white/15 text-white focus:ring-white/20 bg-white/5"
            />
            <span className="text-sm text-white/60">
              I consent to the processing of my personal information in accordance with{' '}
              <Link href="/terms#popia" target="_blank" className="text-amber-400 underline hover:text-amber-300">
                POPIA
              </Link>
            </span>
          </label>
        </div>
        <Button
          onClick={handleConsent}
          loading={saving}
          disabled={!acceptTc || !acceptPopia}
        >
          Accept &amp; Continue
        </Button>
      </CardContent>
    </Card>
  );
}
