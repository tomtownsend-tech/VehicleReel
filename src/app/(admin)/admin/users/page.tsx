'use client';

import { useEffect, useState } from 'react';
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

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  VERIFIED: 'success',
  PENDING_VERIFICATION: 'warning',
  SUSPENDED: 'danger',
  BANNED: 'danger',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((res) => setUsers(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  if (loading) {
    return <div><h1 className="text-2xl font-bold text-white mb-6">User Management</h1><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />)}</div></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">User Management</h1>
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
                  {user.status === 'PENDING_VERIFICATION' && user.role === 'OWNER' && (
                    <Link
                      href="/admin/documents"
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
