'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileUp, Check, Loader2 } from 'lucide-react';

const PERSONAL_DOC_TYPES = [
  { type: 'SA_ID', label: 'SA ID / Passport' },
  { type: 'DRIVERS_LICENSE', label: "Driver's License" },
] as const;

export default function OwnerSettingsPage() {
  const { data: session, update } = useSession();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [personalDocs, setPersonalDocs] = useState<{ id: string; type: string; status: string }[]>([]);
  const [docUploading, setDocUploading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/documents?limit=50')
      .then((r) => r.json())
      .then((res) => {
        const personal = (res.data || []).filter((d: { type: string }) => d.type === 'SA_ID' || d.type === 'DRIVERS_LICENSE');
        setPersonalDocs(personal);
      })
      .catch(() => {});
  }, []);

  async function handleDocUpload(docType: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocUploading(docType);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', docType);
      const res = await fetch('/api/documents', { method: 'POST', body: formData });
      if (res.ok) {
        const doc = await res.json();
        setPersonalDocs((prev) => [...prev, { id: doc.id, type: doc.type, status: doc.status }]);
      }
    } finally {
      setDocUploading(null);
      e.target.value = '';
    }
  }

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
              <dd className="font-medium text-white">Vehicle Owner</dd>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-white/60">Status</dt>
              <dd><Badge variant={statusVariant[session?.user?.status || ''] || 'default'}>{session?.user?.status}</Badge></dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="mb-6">
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

      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Personal Documents</h2></CardHeader>
        <CardContent>
          <p className="text-xs text-white/50 mb-4">Upload your SA ID / Passport and Driver&apos;s License to get verified. These are required before your vehicles can go live.</p>
          <div className="space-y-3">
            {PERSONAL_DOC_TYPES.map(({ type, label }) => {
              const existing = personalDocs.filter((d) => d.type === type);
              const approved = existing.find((d) => d.status === 'APPROVED');
              const pending = existing.find((d) => d.status === 'PENDING_REVIEW');
              const flagged = existing.find((d) => d.status === 'FLAGGED');
              const canUpload = !approved && !pending;

              return (
                <div key={type} className="border border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{label}</span>
                    {approved ? (
                      <Badge variant="success"><Check className="h-3 w-3 mr-1" /> Approved</Badge>
                    ) : pending ? (
                      <Badge variant="warning">Pending Review</Badge>
                    ) : flagged ? (
                      <Badge variant="danger">Flagged</Badge>
                    ) : (
                      <Badge variant="default">Not Uploaded</Badge>
                    )}
                  </div>
                  {flagged && <p className="text-xs text-red-400 mt-1">This document was flagged. Please re-upload.</p>}
                  {canUpload && (
                    <label className={`mt-3 flex items-center justify-center gap-2 w-full h-12 border-2 border-dashed border-white/15 rounded-lg cursor-pointer hover:border-white/40 hover:bg-white/5 transition-colors ${docUploading === type ? 'opacity-50 pointer-events-none' : ''}`}>
                      {docUploading === type ? (
                        <><Loader2 className="h-4 w-4 text-white/50 animate-spin" /><span className="text-sm text-white/50">Uploading...</span></>
                      ) : (
                        <><FileUp className="h-4 w-4 text-white/50" /><span className="text-sm text-white/50">Upload {label}</span></>
                      )}
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleDocUpload(type, e)} disabled={docUploading === type} />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-400/20">
        <CardHeader><h2 className="text-lg font-semibold text-red-400">Danger Zone</h2></CardHeader>
        <CardContent>
          <p className="text-sm text-white/60 mb-3">Permanently delete your account, vehicles, and all associated data. This action cannot be undone.</p>
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
            <Input
              id="deleteConfirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE to confirm"
            />
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}>Cancel</Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                disabled={deleteConfirm !== 'DELETE'}
                loading={deleting}
                onClick={handleDeleteAccount}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
