'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, FileText, ExternalLink, CheckCircle, Clock, Save } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface DailyDetail { id: string; date: string; callTime: string | null; locationAddress: string | null; locationPin: string | null; notes: string | null; actualHours: string | null }
interface CheckIn { id: string; date: string; checkedInAt: string }
interface InsuranceDoc { id: string; status: string; fileUrl: string; fileName: string }

interface Booking {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  shootDayHours: number;
  locationAddress: string | null;
  locationPin: string | null;
  specialInstructions: string | null;
  option: { vehicle: { make: string; model: string; year: number; location: string; owner: { name: string; email: string; phone: string | null } } };
  productionUser: { name: string; email: string; phone: string | null; companyName: string | null };
  coordinator: { id: string; name: string } | null;
  dailyDetails: DailyDetail[];
  checkIns: CheckIn[];
  documents: InsuranceDoc[];
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string };
}

function ChatThread({ bookingId, thread, label, session }: { bookingId: string; thread: string; label: string; session: { user: { id: string; name: string } } }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/bookings/${bookingId}/messages?thread=${thread}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [bookingId, thread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMsg() {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage, thread }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setNewMessage('');
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader><h3 className="text-sm font-semibold">{label}</h3></CardHeader>
      <CardContent>
        <div className="h-52 overflow-y-auto mb-3 space-y-2">
          {messages.length === 0 && <p className="text-xs text-white/40 text-center py-6">No messages yet</p>}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender.id === session.user.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-1.5 ${msg.sender.id === session.user.id ? 'bg-white text-gray-900' : 'bg-white/10 text-white'}`}>
                <p className="text-[10px] font-medium opacity-70">{msg.sender.name}</p>
                <p className="text-sm">{msg.content}</p>
                <p className="text-[10px] opacity-50">{new Date(msg.createdAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex gap-2">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMsg()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-1.5 border border-white/15 rounded-lg text-sm bg-white/5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40"
          />
          <Button size="sm" onClick={sendMsg} loading={sending} disabled={!newMessage.trim()}>
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getOvertimeLabel(actual: number, scheduledHours: number): { text: string; color: string } | null {
  if (actual <= scheduledHours) return null;
  if (actual <= 14) return { text: `${(actual - scheduledHours).toFixed(1)}h overtime @ 1.5x`, color: 'text-amber-400' };
  return { text: `${(actual - scheduledHours).toFixed(1)}h overtime (${(14 - scheduledHours).toFixed(1)}h @ 1.5x + ${(actual - 14).toFixed(1)}h @ 2x)`, color: 'text-red-400' };
}

export default function CoordinatorBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [hoursForms, setHoursForms] = useState<Record<string, string>>({});
  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setBooking(data);
          const forms: Record<string, string> = {};
          data.dailyDetails?.forEach((d: DailyDetail) => {
            forms[d.date.split('T')[0]] = d.actualHours ?? '';
          });
          setHoursForms(forms);
        }
      })
      .catch(() => {});
  }, [params.id]);

  async function saveActualHours() {
    if (!booking) return;
    setSavingHours(true);
    try {
      const days = Object.entries(hoursForms).map(([date, hours]) => ({
        date,
        actualHours: hours ? parseFloat(hours) : null,
      }));
      const res = await fetch(`/api/bookings/${booking.id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (updated?.dailyDetails) {
          setBooking((prev) => prev ? { ...prev, dailyDetails: updated.dailyDetails } : prev);
        }
      }
    } finally {
      setSavingHours(false);
    }
  }

  if (!booking || !session) return <div className="animate-pulse"><div className="h-64 bg-gray-800 rounded" /></div>;

  const checkedDates = new Set(booking.checkIns.map((c) => c.date.split('T')[0]));
  const insuranceDoc = booking.documents?.[0] || null;

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => router.push('/coordinator/bookings')} className="flex items-center gap-2 text-sm text-white/60 hover:text-white mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          {booking.option.vehicle.year} {booking.option.vehicle.make} {booking.option.vehicle.model}
        </h1>
        <Badge variant="success">{booking.status}</Badge>
      </div>

      {/* Booking Details */}
      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Booking Details</h2></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><dt className="text-white/50">Production</dt><dd className="font-medium text-white">{booking.productionUser.name}{booking.productionUser.companyName && ` (${booking.productionUser.companyName})`}</dd></div>
            <div><dt className="text-white/50">Owner</dt><dd className="font-medium text-white">{booking.option.vehicle.owner.name}</dd></div>
            <div><dt className="text-white/50">Dates</dt><dd className="font-medium text-white">{formatDate(booking.startDate)} — {formatDate(booking.endDate)}</dd></div>
            <div><dt className="text-white/50">Vehicle Location</dt><dd className="font-medium text-white">{booking.option.vehicle.location}</dd></div>
            {booking.locationAddress && <div><dt className="text-white/50">Shoot Location</dt><dd className="font-medium text-white">{booking.locationAddress}</dd></div>}
            {booking.locationPin && <div><dt className="text-white/50">Location Pin</dt><dd><a href={booking.locationPin} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:underline text-sm">Open in Maps</a></dd></div>}
            {booking.specialInstructions && <div className="col-span-2"><dt className="text-white/50">Special Instructions</dt><dd className="font-medium text-white">{booking.specialInstructions}</dd></div>}
          </dl>
        </CardContent>
      </Card>

      {/* Daily Schedule & Check-In Status */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Daily Schedule</h2>
            <span className="text-xs text-white/50">{booking.shootDayHours}-hour shoot day</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {booking.dailyDetails.map((d) => {
              const dateStr = d.date.split('T')[0];
              const isCheckedIn = checkedDates.has(dateStr);
              const hasDetails = d.callTime || d.locationAddress || d.locationPin || d.notes;
              const actualVal = hoursForms[dateStr] ?? '';
              const actualNum = actualVal ? parseFloat(actualVal) : null;
              const overtime = actualNum ? getOvertimeLabel(actualNum, booking.shootDayHours) : null;
              return (
                <div key={d.id} className="border border-white/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white">{formatDate(d.date)}</span>
                    {isCheckedIn ? (
                      <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1 inline" />Checked In</Badge>
                    ) : (
                      <Badge variant="default"><Clock className="h-3 w-3 mr-1 inline" />Pending</Badge>
                    )}
                  </div>
                  {hasDetails ? (
                    <dl className="space-y-1 text-sm mt-2">
                      {d.callTime && <div className="flex gap-2"><dt className="text-white/50 w-24 flex-shrink-0">Call Time</dt><dd className="font-medium text-white">{d.callTime}</dd></div>}
                      {d.locationAddress && <div className="flex gap-2"><dt className="text-white/50 w-24 flex-shrink-0">Location</dt><dd className="font-medium text-white">{d.locationAddress}</dd></div>}
                      {d.locationPin && <div className="flex gap-2"><dt className="text-white/50 w-24 flex-shrink-0">Map Pin</dt><dd><a href={d.locationPin} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:underline text-sm">Open in Maps</a></dd></div>}
                      {d.notes && <div className="flex gap-2"><dt className="text-white/50 w-24 flex-shrink-0">Notes</dt><dd className="font-medium text-white">{d.notes}</dd></div>}
                    </dl>
                  ) : (
                    <p className="text-xs text-white/40 mt-1">No details provided yet</p>
                  )}
                  <div className="mt-2 flex items-center gap-3">
                    <label className="text-xs text-white/50 flex-shrink-0">Actual hours:</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={actualVal}
                      onChange={(e) => setHoursForms((prev) => ({ ...prev, [dateStr]: e.target.value }))}
                      placeholder="—"
                      className="w-20 px-2 py-1 border border-white/15 bg-white/5 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                    />
                    {overtime && <span className={`text-xs font-medium ${overtime.color}`}>{overtime.text}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <Button onClick={saveActualHours} loading={savingHours}>
              <Save className="h-4 w-4 mr-1" /> Save Hours
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Insurance */}
      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Insurance</h2></CardHeader>
        <CardContent>
          {insuranceDoc ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-white/50" />
                <span className="text-sm font-medium">{insuranceDoc.fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={insuranceDoc.status === 'APPROVED' ? 'success' : insuranceDoc.status === 'FLAGGED' ? 'danger' : 'warning'}>
                  {insuranceDoc.status}
                </Badge>
                <a href={insuranceDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/50">No insurance document uploaded yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Dual Chat Threads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChatThread
          bookingId={booking.id}
          thread="PRODUCTION_COORDINATOR"
          label="Production Thread"
          session={session}
        />
        <ChatThread
          bookingId={booking.id}
          thread="OWNER_COORDINATOR"
          label="Owner Thread"
          session={session}
        />
      </div>
    </div>
  );
}
