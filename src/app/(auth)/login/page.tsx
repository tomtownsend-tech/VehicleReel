'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl');
  const resetSuccess = searchParams.get('reset') === 'success';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        // Sanitize callbackUrl to prevent open redirect
        if (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) {
          router.push(callbackUrl);
        } else {
          // Fetch session to get role for redirect
          const res = await fetch('/api/auth/session');
          const session = await res.json();
          const role = session?.user?.role;
          if (role === 'ADMIN') router.push('/admin/analytics');
          else if (role === 'COORDINATOR') router.push('/coordinator/bookings');
          else if (role === 'OWNER') router.push('/owner/vehicles');
          else if (role === 'PRODUCTION') router.push('/production/search');
          else router.push('/');
        }
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {resetSuccess && (
        <div className="bg-green-400/10 text-green-400 text-sm rounded-lg p-3">
          Password reset successfully. Sign in with your new password.
        </div>
      )}
      {error && (
        <div className="bg-red-400/10 text-red-400 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <Input
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
      />

      <Input
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
      />

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs text-white/50 hover:text-white/80">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" className="w-full" loading={loading}>
        Sign in
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">VehicleReel</h1>
          <p className="mt-2 text-white/60">Sign in to your account</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Suspense fallback={<div className="h-48" />}>
              <LoginForm />
            </Suspense>

            <p className="mt-4 text-center text-sm text-white/60">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-white/70 hover:text-white font-medium">
                Register
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
