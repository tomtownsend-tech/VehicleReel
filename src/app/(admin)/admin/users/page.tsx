'use client';

import { useEffect, useState } from 'react';
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

  async function handleAction(userId: string, action: 'BAN' | 'UNBAN') {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: updated.status } : u)));
    }
  }

  if (loading) {
    return <div><h1 className="text-2xl font-bold text-gray-900 mb-6">User Management</h1><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">User Management</h1>
      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{user.name}</span>
                    <Badge variant={statusVariant[user.status] || 'default'}>{user.status}</Badge>
                    <Badge variant="default">{user.role}</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {user.role === 'OWNER' ? `${user._count.vehicles} vehicles` : `${user._count.optionsAsProduction} options`}
                    {' · '}Joined {new Date(user.createdAt).toLocaleDateString('en-ZA')}
                  </p>
                </div>
                <div>
                  {user.status === 'BANNED' ? (
                    <Button size="sm" variant="outline" onClick={() => handleAction(user.id, 'UNBAN')}>Unban</Button>
                  ) : (
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
