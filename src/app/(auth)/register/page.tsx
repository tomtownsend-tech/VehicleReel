'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: searchParams.get('role') || '',
    phone: '',
    companyName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        router.push('/login');
      } else {
        // Redirect to onboarding - owners add their vehicle, production users to settings for doc upload
        if (form.role === 'OWNER') {
          router.push('/owner/vehicles/new');
        } else {
          router.push('/production/settings');
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
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {!form.role && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">I am a...</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updateField('role', 'OWNER')}
              className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <span className="text-2xl mb-1">🚗</span>
              <span className="font-medium text-gray-900">Vehicle Owner</span>
              <span className="text-xs text-gray-500 mt-1">List my vehicles</span>
            </button>
            <button
              type="button"
              onClick={() => updateField('role', 'PRODUCTION')}
              className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <span className="text-2xl mb-1">🎬</span>
              <span className="font-medium text-gray-900">Production</span>
              <span className="text-xs text-gray-500 mt-1">Find vehicles</span>
            </button>
          </div>
        </div>
      )}

      {form.role && (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              Registering as: <strong>{form.role === 'OWNER' ? 'Vehicle Owner' : 'Production'}</strong>
            </span>
            <button
              type="button"
              onClick={() => updateField('role', '')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Change
            </button>
          </div>

          <Input
            id="name"
            label="Full Name"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="John Smith"
            required
          />

          <Input
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="you@example.com"
            required
          />

          <Input
            id="phone"
            label="Phone (optional)"
            type="tel"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="+27 82 123 4567"
          />

          {form.role === 'PRODUCTION' && (
            <Input
              id="companyName"
              label="Company Name"
              value={form.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              placeholder="Production company name"
            />
          )}

          <Input
            id="password"
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            placeholder="Min 8 characters"
            required
            minLength={8}
          />

          <Button type="submit" className="w-full" loading={loading}>
            Create Account
          </Button>
        </>
      )}
    </form>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">VehicleReel</h1>
          <p className="mt-2 text-gray-600">Create your account</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Suspense fallback={<div className="h-48" />}>
              <RegisterForm />
            </Suspense>

            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
