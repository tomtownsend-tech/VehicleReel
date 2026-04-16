'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  _count: { vehicles: number; optionsAsProduction: number };
}

interface ReminderPreview {
  count: number;
  users: { id: string; name: string; email: string; role: string; missingItems: string[] }[];
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  VERIFIED: 'success',
  PENDING_VERIFICATION: 'warning',
  SUSPENDED: 'danger',
  BANNED: 'danger',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderPreview, setReminderPreview] = useState<ReminderPreview | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [reminderResult, setReminderResult] = useState<{ sent: number } | null>(null);

  const loadReminderPreview = useCallback(() => {
    fetch('/api/admin/send-reminders')
      .then((r) => r.json())
      .then((data) => setReminderPreview(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((res) => setUsers(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));

    loadReminderPreview();
  }, [loadReminderPreview]);

  async function handleAction(userId: string, action: 'BAN' | 'UNBAN' | 'SET_COORDINATOR' | 'UNSET_COORDINATOR') {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: updated.status, role: updated.role } : u)));
    }
  }

  async function handleSendReminders() {
    if (!reminderPreview || reminderPreview.count === 0) return;
    const confirmed = window.confirm(
      `Send setup reminder emails to ${reminderPreview.count} user${reminderPreview.count === 1 ? '' : 's'} with incomplete profiles?`
    );
    if (!confirmed) return;

    setSendingReminders(true);
    setReminderResult(null);
    try {
      const res = await fetch('/api/admin/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const result = await res.json();
        setReminderResult(result);
        loadReminderPreview();
      }
    } catch {
      // ignore
    } finally {
      setSendingReminders(false);
    }
  }

  async function handleNudgeUser(userId: string) {
    setSendingTo(userId);
    try {
      const res = await fetch('/api/admin/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const result = await res.json();
        setReminderResult(result);
      }
    } catch {
      // ignore
    } finally {
      setSendingTo(null);
    }
  }

  // Check if a specific user appears in the incomplete list
  function isIncomplete(userId: string): boolean {
    return reminderPreview?.users.some((u) => u.id === userId) ?? false;
  }

  if (loading) {
    return <div><h1 className="text-2xl font-bold text-white mb-6">User Management</h1><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />)}</div></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <div className="flex items-center gap-3">
          {reminderResult && (
            <span className="text-sm text-green-400">
              Sent {reminderResult.sent} reminder{reminderResult.sent === 1 ? '' : 's'}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSendReminders}
            disabled={sendingReminders || !reminderPreview || reminderPreview.count === 0}
          >
            {sendingReminders
              ? 'Sending...'
              : `Send Reminders${reminderPreview ? ` (${reminderPreview.count})` : ''}`}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="py-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-white">{user.name}</span>
                    <Badge variant={statusVariant[user.status] || 'default'}>{user.status}</Badge>
                    <Badge variant="default">{user.role}</Badge>
                  </div>
                  <p className="text-sm text-white/50 mt-0.5">{user.email}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {user.role === 'OWNER' ? `${user._count.vehicles} vehicles` : user.role === 'COORDINATOR' ? 'Coordinator' : `${user._count.optionsAsProduction} options`}
                    {' · '}Joined {new Date(user.createdAt).toLocaleDateString('en-ZA')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isIncomplete(user.id) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleNudgeUser(user.id)}
                      disabled={sendingTo === user.id}
                    >
                      {sendingTo === user.id ? 'Sending...' : 'Nudge'}
                    </Button>
                  )}
                  {user.status === 'PENDING_VERIFICATION' && (
                    <Link
                      href={`/admin/documents?userId=${user.id}`}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white/70 bg-white/10 rounded-lg hover:bg-white/15"
                    >
                      Review Documents
                    </Link>
                  )}
                  {/* Coordinator toggle - only for non-admin, non-owner users */}
                  {user.role === 'PRODUCTION' && (
                    <Button size="sm" variant="outline" onClick={() => handleAction(user.id, 'SET_COORDINATOR')}>
                      Make Coordinator
                    </Button>
                  )}
                  {user.role === 'COORDINATOR' && (
                    <Button size="sm" variant="outline" onClick={() => handleAction(user.id, 'UNSET_COORDINATOR')}>
                      Remove Coordinator
                    </Button>
                  )}
                  {user.status === 'BANNED' ? (
                    <Button size="sm" variant="outline" onClick={() => handleAction(user.id, 'UNBAN')}>Unban</Button>
                  ) : user.role !== 'ADMIN' && (
                    <Button size="sm" variant="danger" onClick={() => handleAction(user.id, 'BAN')}>Ban</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
