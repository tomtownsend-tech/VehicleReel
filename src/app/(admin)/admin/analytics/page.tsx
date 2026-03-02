'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, Car, Calendar, TrendingUp } from 'lucide-react';

interface Analytics {
  summary: { totalUsers: number; totalVehicles: number; totalBookings: number; totalDaysBooked: number };
  preferences: { make: [string, number][]; color: [string, number][]; model: [string, number][]; year: [string, number][] };
  monthlyTrends: { month: string; days: number; topMake: string; topColor: string }[];
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div><h1 className="text-2xl font-bold text-white mb-6">Analytics</h1><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />)}</div></div>;
  }

  if (!data) return <p className="text-white/50">Failed to load analytics.</p>;

  const statCards = [
    { label: 'Total Users', value: data.summary.totalUsers, icon: Users, color: 'text-blue-400 bg-blue-400/10' },
    { label: 'Total Vehicles', value: data.summary.totalVehicles, icon: Car, color: 'text-emerald-400 bg-emerald-400/10' },
    { label: 'Bookings', value: data.summary.totalBookings, icon: Calendar, color: 'text-purple-400 bg-purple-400/10' },
    { label: 'Days Booked', value: data.summary.totalDaysBooked, icon: TrendingUp, color: 'text-amber-400 bg-amber-400/10' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-white/50">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Trends Chart */}
      {data.monthlyTrends.length > 0 && (
        <Card className="mb-8">
          <CardHeader><h2 className="text-lg font-semibold">Monthly Booking Days</h2></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                <Bar dataKey="days" fill="#ffffff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Preferences */}
      <div className="grid md:grid-cols-2 gap-6">
        {(['make', 'color', 'model', 'year'] as const).map((key) => (
          <Card key={key}>
            <CardHeader><h2 className="text-lg font-semibold capitalize">{key} Preference</h2></CardHeader>
            <CardContent>
              {data.preferences[key].length === 0 ? (
                <p className="text-sm text-white/50">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {data.preferences[key].map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-sm text-white/70">{name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full"
                            style={{ width: `${(count / (data.preferences[key][0]?.[1] || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/50 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
