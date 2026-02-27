'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Booking {
  id: string;
  rateType: string;
  rateCents: number;
  startDate: string;
  endDate: string;
  logistics: string;
  status: string;
  option: { vehicle: { make: string; model: string; year: number; location: string; owner: { name: string; email: string; phone: string | null } } };
  productionUser: { name: string };
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string };
}

export default function ProductionBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isArchived = booking ? new Date() > new Date(booking.endDate) : false;

  useEffect(() => {
    // Fetch booking by its ID
    fetch(`/api/bookings/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setBooking(data);
        return fetch(`/api/bookings/${params.id}/messages`);
      })
      .then((r) => r.json())
      .then(setMessages)
      .catch(() => {});
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!newMessage.trim() || !booking) return;
    setSending(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
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

  if (!booking) return <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded" /></div>;

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.push('/production/options')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
        <Badge variant="success">{booking.status}</Badge>
      </div>

      <Card className="mb-6">
        <CardContent className="py-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-gray-500">Vehicle</dt><dd className="font-medium">{booking.option.vehicle.year} {booking.option.vehicle.make} {booking.option.vehicle.model}</dd></div>
            <div><dt className="text-gray-500">Owner</dt><dd className="font-medium">{booking.option.vehicle.owner.name}</dd></div>
            <div><dt className="text-gray-500">Location</dt><dd className="font-medium">{booking.option.vehicle.location}</dd></div>
            <div><dt className="text-gray-500">Dates</dt><dd className="font-medium">{formatDate(booking.startDate)} — {formatDate(booking.endDate)}</dd></div>
            <div><dt className="text-gray-500">Rate</dt><dd className="font-medium">{formatCurrency(booking.rateCents)}{booking.rateType === 'PER_DAY' ? '/day' : ' package'}</dd></div>
            <div><dt className="text-gray-500">Logistics</dt><dd className="font-medium">{booking.logistics === 'OWNER_DELIVERY' ? 'Owner delivers to set' : 'Vehicle collection'}</dd></div>
            <div><dt className="text-gray-500">Owner Contact</dt><dd className="font-medium">{booking.option.vehicle.owner.email}{booking.option.vehicle.owner.phone && ` | ${booking.option.vehicle.owner.phone}`}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Conversation</h2>
            {isArchived && <Badge variant="default">Archived</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 overflow-y-auto mb-4 space-y-3">
            {messages.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No messages yet. Start the conversation!</p>}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender.id === session?.user?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-lg px-3 py-2 ${msg.sender.id === session?.user?.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                  <p className="text-xs font-medium mb-0.5 opacity-70">{msg.sender.name}</p>
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs opacity-50 mt-1">{new Date(msg.createdAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {!isArchived && (
            <div className="flex gap-2">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={sendMessage} loading={sending} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
