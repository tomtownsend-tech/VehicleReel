'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, FileText, ExternalLink, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface InsuranceDocument {
  id: string;
  status: string;
  fileUrl: string;
  fileName: string;
  createdAt: string;
}

interface DailyDetail { id: string; date: string; callTime: string | null; locationAddress: string | null; locationPin: string | null; notes: string | null }
interface CheckIn { id: string; date: string; checkedInAt: string }

interface Booking {
  id: string;
  rateType: string;
  rateCents: number;
  ownerPayoutCents: number;
  startDate: string;
  endDate: string;
  logistics: string;
  status: string;
  coordinatorId: string | null;
  locationAddress: string | null;
  locationPin: string | null;
  specialInstructions: string | null;
  option: { vehicle: { make: string; model: string; year: number; location: string } };
  productionUser: { name: string; email: string; phone: string | null; companyName: string | null };
  coordinator: { id: string; name: string; email: string } | null;
  dailyDetails: DailyDetail[];
  checkIns: CheckIn[];
  documents: InsuranceDocument[];
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string };
}

export default function OwnerBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasCoordinator = !!booking?.coordinatorId;

  useEffect(() => {
    fetch(`/api/bookings/${params.id}`)
      .then((r) => r.json())
      .then((b) => {
        if (b && !b.error) setBooking(b);
      });
  }, [params.id]);

  useEffect(() => {
    if (!booking) return;
    if (hasCoordinator) {
      fetch(`/api/bookings/${booking.id}/messages?thread=OWNER_COORDINATOR`)
        .then((r) => r.ok ? r.json() : [])
        .then((data) => setMessages(Array.isArray(data) ? data : []))
        .catch(() => {});
    } else {
      fetch(`/api/bookings/${booking.id}/messages`)
        .then((r) => r.json())
        .then((data) => setMessages(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [booking?.id, hasCoordinator]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!newMessage.trim() || !booking) return;
    setSending(true);
    try {
      const body: Record<string, string> = { content: newMessage };
      if (hasCoordinator) body.thread = 'OWNER_COORDINATOR';
      const res = await fetch(`/api/bookings/${booking.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  if (!booking) return <div className="animate-pulse"><div className="h-64 bg-gray-800 rounded" /></div>;

  const checkedDates = new Set(booking.checkIns.map((c) => c.date.split('T')[0]));

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.push('/owner/options')} className="flex items-center gap-2 text-sm text-white/60 hover:text-white mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Booking Details</h1>
        <Badge variant="success">{booking.status}</Badge>
      </div>

      <Card className="mb-6">
        <CardContent className="py-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-white/50">Vehicle</dt><dd className="font-medium">{booking.option.vehicle.year} {booking.option.vehicle.make} {booking.option.vehicle.model}</dd></div>
            <div><dt className="text-white/50">Production User</dt><dd className="font-medium">{booking.productionUser.name}{booking.productionUser.companyName && ` (${booking.productionUser.companyName})`}</dd></div>
            <div><dt className="text-white/50">Dates</dt><dd className="font-medium">{formatDate(booking.startDate)} — {formatDate(booking.endDate)}</dd></div>
            <div><dt className="text-white/50">Rate</dt><dd className="font-medium">{formatCurrency(booking.ownerPayoutCents)}{booking.rateType === 'PER_DAY' ? '/day' : ' package'}</dd></div>
            <div><dt className="text-white/50">Logistics</dt><dd className="font-medium">{booking.logistics === 'OWNER_DELIVERY' ? 'Owner delivers to set' : 'Vehicle collection'}</dd></div>
            <div><dt className="text-white/50">Contact</dt><dd className="font-medium">{booking.productionUser.email}{booking.productionUser.phone && ` | ${booking.productionUser.phone}`}</dd></div>
            {booking.coordinator && <div><dt className="text-white/50">Coordinator</dt><dd className="font-medium">{booking.coordinator.name}</dd></div>}
          </dl>
        </CardContent>
      </Card>

      {/* Per-Day Shoot Details & Schedule */}
      {booking.dailyDetails.length > 0 && (
        <Card className="mb-6">
          <CardHeader><h2 className="text-lg font-semibold">Shoot Schedule</h2></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {booking.dailyDetails.map((d) => {
                const dateStr = d.date.split('T')[0];
                const isCheckedIn = checkedDates.has(dateStr);
                const hasDetails = d.callTime || d.locationAddress || d.locationPin || d.notes;
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
                        {d.callTime && <div className="flex gap-2"><dt className="text-white/50 w-24 flex-shrink-0">Call Time</dt><dd className="font-medium">{d.callTime}</dd></div>}
                        {d.locationAddress && <div className="flex gap-2"><dt className="text-white/50 w-24 flex-shrink-0">Location</dt><dd className="font-medium">{d.locationAddress}</dd></div>}
                        {d.locationPin && <div className="flex gap-2"><dt className="text-white/50 w-24 flex-shrink-0">Map Pin</dt><dd><a href={d.locationPin} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white hover:underline text-sm">Open in Maps</a></dd></div>}
                        {d.notes && <div className="flex gap-2"><dt className="text-white/50 w-24 flex-shrink-0">Notes</dt><dd className="font-medium">{d.notes}</dd></div>}
                      </dl>
                    ) : (
                      <p className="text-xs text-white/40 mt-1">No details provided yet</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicle Insurance */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">Vehicle Insurance</h2>
        </CardHeader>
        <CardContent>
          {booking.documents?.[0] ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-white/50" />
                <span className="text-sm font-medium">{booking.documents[0].fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                {booking.documents[0].status === 'PENDING_REVIEW' && <Badge variant="warning">Pending Review</Badge>}
                {booking.documents[0].status === 'APPROVED' && <Badge variant="success">Approved</Badge>}
                {booking.documents[0].status === 'FLAGGED' && <Badge variant="danger">Flagged</Badge>}
                <a href={booking.documents[0].fileUrl} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/50">No insurance document uploaded yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {hasCoordinator ? 'Messages with Coordinator' : 'Conversation'}
            </h2>
            {!hasCoordinator && <Badge variant="warning">No coordinator assigned yet</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {!hasCoordinator ? (
            <p className="text-sm text-white/50 text-center py-4">Messaging will be available once a coordinator is assigned to this booking.</p>
          ) : (
            <>
              <div className="h-64 overflow-y-auto mb-4 space-y-3">
                {messages.length === 0 && <p className="text-sm text-white/50 text-center py-8">No messages yet.</p>}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender.id === session?.user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-lg px-3 py-2 ${msg.sender.id === session?.user?.id ? 'bg-white text-gray-900' : 'bg-white/10 text-white'}`}>
                      <p className="text-xs font-medium mb-0.5 opacity-70">{msg.sender.name}</p>
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-50 mt-1">{new Date(msg.createdAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border border-white/15 rounded-lg text-sm bg-gray-900 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40"
                />
                <Button onClick={sendMessage} loading={sending} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
