'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function OwnerSettingsPage() {
  const { data: session } = useSession();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

  async function toggleNotifications() {
    setSaving(true);
    try {
      const res = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailNotifications: !emailNotifications }),
      });
      if (res.ok) setEmailNotifications(!emailNotifications);
    } finally {
      setSaving(false);
    }
  }

  const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
    VERIFIED: 'success',
    PENDING_VERIFICATION: 'warning',
    SUSPENDED: 'danger',
    BANNED: 'danger',
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Profile</h2></CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Name</dt>
              <dd className="font-medium text-gray-900">{session?.user?.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{session?.user?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Account Type</dt>
              <dd className="font-medium text-gray-900">Vehicle Owner</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Status</dt>
              <dd><Badge variant={statusVariant[session?.user?.status || ''] || 'default'}>{session?.user?.status}</Badge></dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold">Notifications</h2></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Email Notifications</p>
              <p className="text-xs text-gray-500">Receive email notifications for options, bookings, and messages</p>
            </div>
            <Button
              size="sm"
              variant={emailNotifications ? 'primary' : 'outline'}
              onClick={toggleNotifications}
              loading={saving}
            >
              {emailNotifications ? 'On' : 'Off'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
