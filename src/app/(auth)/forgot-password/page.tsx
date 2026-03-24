'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import vrLogoWhite from '@/assets/branding/vr-logo-white.png';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src={vrLogoWhite} alt="VehicleReel" height={48} className="w-auto mx-auto" priority />
          <p className="mt-2 text-white/60">Reset your password</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {sent ? (
              <div className="text-center space-y-4">
                <div className="bg-green-400/10 text-green-400 text-sm rounded-lg p-3">
                  If an account exists with that email, we&apos;ve sent a password reset link.
                </div>
                <p className="text-sm text-white/60">Check your inbox and spam folder.</p>
                <Link href="/login" className="text-white/70 hover:text-white text-sm font-medium">
                  Back to login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-400/10 text-red-400 text-sm rounded-lg p-3">
                    {error}
                  </div>
                )}

                <p className="text-sm text-white/60">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </p>

                <Input
                  id="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />

                <Button type="submit" className="w-full" loading={loading}>
                  Send reset link
                </Button>

                <p className="text-center text-sm text-white/60">
                  <Link href="/login" className="text-white/70 hover:text-white font-medium">
                    Back to login
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
