'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function ProductionSettingsPage() {
  const { data: session, update } = useSession();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState('');

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

  async function handleEmailSave() {
    setEmailError('');
    setEmailSaving(true);
    try {
      const res = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditingEmail(false);
        setNewEmail('');
        await update();
      } else {
        setEmailError(data.error || 'Failed to update email');
      }
    } finally {
      setEmailSaving(false);
    }
  }

  const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
    VERIFIED: 'success',
    PENDING_VERIFICATION: 'warning',
    SUSPENDED: 'danger',
    BANNED: 'danger',
  };

  const isTestAccount = session?.user?.isTestAccount;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Profile</h2></CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-white/60">Name</dt>
              <dd className="font-medium text-white">{session?.user?.name}</dd>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-white/60">Email</dt>
              <dd className="font-medium text-white flex items-center gap-2">
                {session?.user?.email}
                {isTestAccount && !editingEmail && (
                  <button
                    onClick={() => { setNewEmail(session?.user?.email || ''); setEditingEmail(true); }}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Edit
                  </button>
                )}
              </dd>
            </div>
            {editingEmail && (
              <div className="space-y-2 pl-0 sm:pl-[60px]">
                {emailError && <p className="text-xs text-red-400">{emailError}</p>}
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@example.com"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEmailSave} loading={emailSaving}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingEmail(false); setEmailError(''); }}>Cancel</Button>
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-white/60">Account Type</dt>
              <dd className="font-medium text-white">Production</dd>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-white/60">Status</dt>
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
              <p className="text-sm font-medium text-white">Email Notifications</p>
              <p className="text-xs text-white/60">Receive email notifications for options, bookings, and messages</p>
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
