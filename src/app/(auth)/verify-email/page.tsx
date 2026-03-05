'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update } = useSession();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const verifyToken = useCallback(async (t: string) => {
    setStatus('verifying');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setError(data.error || 'Verification failed');
        return;
      }
      setStatus('success');
      // Refresh the session so emailVerified updates in the JWT
      const updated = await update();
      // Redirect to role-based dashboard after a brief pause
      setTimeout(() => {
        const role = updated?.user?.role || session?.user?.role;
        if (role === 'OWNER') router.push('/owner/vehicles/new');
        else if (role === 'PRODUCTION') router.push('/production/documents');
        else if (role === 'COORDINATOR') router.push('/coordinator/bookings');
        else if (role === 'ADMIN') router.push('/admin/analytics');
        else router.push('/');
        router.refresh();
      }, 1500);
    } catch {
      setStatus('error');
      setError('Something went wrong. Please try again.');
    }
  }, [router, session, update]);

  useEffect(() => {
    if (token && status === 'idle') {
      verifyToken(token);
    }
  }, [token, status, verifyToken]);

  async function handleResend() {
    setResendLoading(true);
    setResendSuccess(false);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resend: true }),
      });
      if (res.ok) {
        setResendSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to resend email');
      }
    } catch {
      setError('Failed to resend verification email');
    } finally {
      setResendLoading(false);
    }
  }

  // Token verification mode
  if (token) {
    return (
      <div className="text-center space-y-4">
        {status === 'verifying' && (
          <>
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
            <p className="text-white/70">Verifying your email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl">&#10003;</div>
            <h2 className="text-xl font-semibold text-white">Email Verified!</h2>
            <p className="text-white/60">Redirecting you to your dashboard...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="bg-red-400/10 text-red-400 text-sm rounded-lg p-3">{error}</div>
            <Button onClick={handleResend} loading={resendLoading} className="w-full">
              Resend Verification Email
            </Button>
            {resendSuccess && (
              <p className="text-green-400 text-sm">Verification email sent! Check your inbox.</p>
            )}
          </>
        )}
      </div>
    );
  }

  // Check-your-email mode (no token)
  return (
    <div className="text-center space-y-4">
      <div className="text-4xl">&#9993;</div>
      <h2 className="text-xl font-semibold text-white">Check Your Email</h2>
      <p className="text-white/60">
        We&apos;ve sent a verification link to <strong className="text-white">{session?.user?.email || 'your email'}</strong>.
        Click the link to verify your account.
      </p>
      <p className="text-white/40 text-sm">The link expires in 24 hours.</p>

      <div className="pt-2">
        <Button onClick={handleResend} loading={resendLoading} variant="outline" className="w-full">
          Resend Verification Email
        </Button>
        {resendSuccess && (
          <p className="text-green-400 text-sm mt-2">Verification email sent! Check your inbox.</p>
        )}
        {error && !resendSuccess && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">VehicleReel</h1>
          <p className="mt-2 text-white/60">Email Verification</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Suspense fallback={<div className="h-48" />}>
              <VerifyEmailContent />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
