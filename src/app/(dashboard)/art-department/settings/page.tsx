'use client';

import { Suspense, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConsentBanner } from '@/components/ConsentBanner';

export default function ArtDepartmentSettingsPage() {
  const { data: session, update } = useSession();
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch('/api/users/delete', { method: 'DELETE' });
      if (res.ok) {
        await signOut({ callbackUrl: '/login' });
      }
    } finally {
      setDeleting(false);
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

      <Suspense fallback={null}>
        <ConsentBanner />
      </Suspense>

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
                <Input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@example.com" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEmailSave} loading={emailSaving}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingEmail(false); setEmailError(''); }}>Cancel</Button>
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-white/60">Account Type</dt>
              <dd className="font-medium text-white">Art Department</dd>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-white/60">Status</dt>
              <dd><Badge variant={statusVariant[session?.user?.status || ''] || 'default'}>{session?.user?.status}</Badge></dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="border-red-400/20">
        <CardHeader><h2 className="text-lg font-semibold text-red-400">Danger Zone</h2></CardHeader>
        <CardContent>
          <p className="text-sm text-white/60 mb-3">Permanently delete your account and all associated data. This action cannot be undone.</p>
          <Button variant="outline" className="border-red-400/40 text-red-400 hover:bg-red-400/10" onClick={() => setShowDeleteModal(true)}>
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Account</h3>
            <p className="text-sm text-white/60 mb-4">This will permanently delete your account and all data. Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm.</p>
            <Input id="deleteConfirm" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="Type DELETE to confirm" />
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}>Cancel</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" disabled={deleteConfirm !== 'DELETE'} loading={deleting} onClick={handleDeleteAccount}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
