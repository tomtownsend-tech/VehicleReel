'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, FileText, ExternalLink, CheckCircle, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface DailyDetail { id: string; date: string; callTime: string | null }
interface CheckIn { id: string; date: string; checkedInAt: string }
interface InsuranceDoc { id: string; status: string; fileUrl: string; fileName: string }

interface Booking {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
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
          {messages.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No messages yet</p>}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender.id === session.user.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-1.5 ${msg.sender.id === session.user.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
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
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button size="sm" onClick={sendMsg} loading={sending} disabled={!newMessage.trim()}>
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CoordinatorBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetch(`/api/bookings/${params.id}`)
      .then((r) => r.json())
      .then((data) => { if (data && !data.error) setBooking(data); })
      .catch(() => {});
  }, [params.id]);

  if (!booking || !session) return <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded" /></div>;

  const checkedDates = new Set(booking.checkIns.map((c) => c.date.split('T')[0]));
  const insuranceDoc = booking.documents?.[0] || null;

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => router.push('/coordinator/bookings')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {booking.option.vehicle.year} {booking.option.vehicle.make} {booking.option.vehicle.model}
        </h1>
        <Badge variant="success">{booking.status}</Badge>
      </div>

      {/* Booking Details */}
      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Booking Details</h2></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-gray-500">Production</dt><dd className="font-medium">{booking.productionUser.name}{booking.productionUser.companyName && ` (${booking.productionUser.companyName})`}</dd></div>
            <div><dt className="text-gray-500">Owner</dt><dd className="font-medium">{booking.option.vehicle.owner.name}</dd></div>
            <div><dt className="text-gray-500">Dates</dt><dd className="font-medium">{formatDate(booking.startDate)} — {formatDate(booking.endDate)}</dd></div>
            <div><dt className="text-gray-500">Vehicle Location</dt><dd className="font-medium">{booking.option.vehicle.location}</dd></div>
            {booking.locationAddress && <div><dt className="text-gray-500">Shoot Location</dt><dd className="font-medium">{booking.locationAddress}</dd></div>}
            {booking.locationPin && <div><dt className="text-gray-500">Location Pin</dt><dd><a href={booking.locationPin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Open in Maps</a></dd></div>}
            {booking.specialInstructions && <div className="col-span-2"><dt className="text-gray-500">Special Instructions</dt><dd className="font-medium">{booking.specialInstructions}</dd></div>}
          </dl>
        </CardContent>
      </Card>

      {/* Daily Schedule & Check-In Status */}
      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Daily Schedule</h2></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {booking.dailyDetails.map((d) => {
              const dateStr = d.date.split('T')[0];
              const isCheckedIn = checkedDates.has(dateStr);
              return (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium w-32">{formatDate(d.date)}</span>
                    {d.callTime && <span className="text-sm text-gray-500">Call: {d.callTime}</span>}
                  </div>
                  {isCheckedIn ? (
                    <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1 inline" />Checked In</Badge>
                  ) : (
                    <Badge variant="default"><Clock className="h-3 w-3 mr-1 inline" />Pending</Badge>
                  )}
                </div>
              );
            })}
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
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">{insuranceDoc.fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={insuranceDoc.status === 'APPROVED' ? 'success' : insuranceDoc.status === 'FLAGGED' ? 'danger' : 'warning'}>
                  {insuranceDoc.status}
                </Badge>
                <a href={insuranceDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No insurance document uploaded yet.</p>
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
