'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Upload, AlertTriangle, FileText, ExternalLink, CheckCircle, Clock, MapPin, Save } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface InsuranceDocument {
  id: string;
  status: string;
  fileUrl: string;
  fileName: string;
  extractedData: { flagReason?: string } | null;
  createdAt: string;
}

interface DailyDetail { id: string; date: string; callTime: string | null }
interface CheckIn { id: string; date: string; checkedInAt: string }

interface Booking {
  id: string;
  rateType: string;
  rateCents: number;
  startDate: string;
  endDate: string;
  logistics: string;
  status: string;
  coordinatorId: string | null;
  locationAddress: string | null;
  locationPin: string | null;
  specialInstructions: string | null;
  option: { vehicle: { make: string; model: string; year: number; location: string; owner: { name: string; email: string; phone: string | null } } };
  productionUser: { name: string };
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

export default function ProductionBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Booking details form
  const [locationAddress, setLocationAddress] = useState('');
  const [locationPin, setLocationPin] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [callTimes, setCallTimes] = useState<Record<string, string>>({});
  const [savingDetails, setSavingDetails] = useState(false);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const hasCoordinator = !!booking?.coordinatorId;
  const insuranceDoc = booking?.documents?.[0] || null;
  const insuranceDeadline = booking ? new Date(new Date(booking.startDate).getTime() - 24 * 60 * 60 * 1000) : null;
  const isPastDeadline = insuranceDeadline ? new Date() >= insuranceDeadline : false;

  useEffect(() => {
    fetch(`/api/bookings/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setBooking(data);
          setLocationAddress(data.locationAddress || '');
          setLocationPin(data.locationPin || '');
          setSpecialInstructions(data.specialInstructions || '');
          const times: Record<string, string> = {};
          data.dailyDetails?.forEach((d: DailyDetail) => {
            times[d.date.split('T')[0]] = d.callTime || '';
          });
          setCallTimes(times);
        }
      })
      .catch(() => {});
  }, [params.id]);

  // Fetch messages for coordinator thread
  useEffect(() => {
    if (!booking) return;
    if (hasCoordinator) {
      fetch(`/api/bookings/${booking.id}/messages?thread=PRODUCTION_COORDINATOR`)
        .then((r) => r.ok ? r.json() : [])
        .then((data) => setMessages(Array.isArray(data) ? data : []))
        .catch(() => {});
    } else {
      // Legacy messages
      fetch(`/api/bookings/${booking.id}/messages`)
        .then((r) => r.json())
        .then((data) => setMessages(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [booking?.id, hasCoordinator]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function uploadInsurance(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !booking) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'INSURANCE');
      formData.append('bookingId', booking.id);
      const res = await fetch('/api/documents', { method: 'POST', body: formData });
      if (res.ok) {
        const bookingRes = await fetch(`/api/bookings/${booking.id}`);
        const updated = await bookingRes.json();
        setBooking(updated);
      } else {
        const err = await res.json();
        alert(err.error || 'Upload failed');
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !booking) return;
    setSending(true);
    try {
      const body: Record<string, string> = { content: newMessage };
      if (hasCoordinator) body.thread = 'PRODUCTION_COORDINATOR';
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

  async function saveDetails() {
    if (!booking) return;
    setSavingDetails(true);
    try {
      const dailyCallTimes = Object.entries(callTimes)
        .filter(([, v]) => v.trim())
        .map(([date, callTime]) => ({ date, callTime }));
      const res = await fetch(`/api/bookings/${booking.id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationAddress: locationAddress || undefined, locationPin: locationPin || undefined, specialInstructions: specialInstructions || undefined, dailyCallTimes }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBooking((prev) => prev ? { ...prev, ...updated } : prev);
      }
    } finally {
      setSavingDetails(false);
    }
  }

  async function handleCheckIn(dateStr: string) {
    if (!booking) return;
    setCheckingIn(dateStr);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr }),
      });
      if (res.ok) {
        // Refresh booking
        const bookingRes = await fetch(`/api/bookings/${booking.id}`);
        const updated = await bookingRes.json();
        if (updated && !updated.error) setBooking(updated);
      } else {
        const err = await res.json();
        alert(err.error || 'Check-in failed');
      }
    } finally {
      setCheckingIn(null);
    }
  }

  if (!booking) return <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded" /></div>;

  const checkedDates = new Set(booking.checkIns.map((c) => c.date.split('T')[0]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
            {booking.coordinator && <div><dt className="text-gray-500">Coordinator</dt><dd className="font-medium">{booking.coordinator.name}</dd></div>}
          </dl>
        </CardContent>
      </Card>

      {/* Booking Details Form */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Shoot Details</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location Address</label>
              <input
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="e.g. 123 Main St, Cape Town"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps Pin (URL)</label>
              <input
                value={locationPin}
                onChange={(e) => setLocationPin(e.target.value)}
                placeholder="https://maps.google.com/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={3}
                placeholder="Any special handling instructions, parking details, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button onClick={saveDetails} loading={savingDetails}>
              <Save className="h-4 w-4 mr-1" /> Save Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Daily Schedule with Call Times */}
      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Daily Schedule</h2></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {booking.dailyDetails.map((d) => {
              const dateStr = d.date.split('T')[0];
              return (
                <div key={d.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-medium w-32 flex-shrink-0">{formatDate(d.date)}</span>
                  <input
                    value={callTimes[dateStr] || ''}
                    onChange={(e) => setCallTimes((prev) => ({ ...prev, [dateStr]: e.target.value }))}
                    placeholder="Call time (e.g. 06:00)"
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              );
            })}
            {booking.dailyDetails.length > 0 && (
              <Button size="sm" variant="outline" onClick={saveDetails} loading={savingDetails}>
                <Save className="h-3 w-3 mr-1" /> Save Call Times
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily Check-In */}
      <Card className="mb-6">
        <CardHeader><h2 className="text-lg font-semibold">Daily Check-In</h2></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {booking.dailyDetails.map((d) => {
              const dateStr = d.date.split('T')[0];
              const isCheckedIn = checkedDates.has(dateStr);
              const dateObj = new Date(dateStr + 'T00:00:00');
              const canCheckIn = dateObj <= today && !isCheckedIn;
              return (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-medium">{formatDate(d.date)}</span>
                  {isCheckedIn ? (
                    <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1 inline" />Checked In</Badge>
                  ) : canCheckIn ? (
                    <Button size="sm" onClick={() => handleCheckIn(dateStr)} loading={checkingIn === dateStr}>
                      Check In
                    </Button>
                  ) : (
                    <Badge variant="default"><Clock className="h-3 w-3 mr-1 inline" />Upcoming</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Insurance */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">Vehicle Insurance</h2>
        </CardHeader>
        <CardContent>
          {!insuranceDoc ? (
            <div className="space-y-3">
              {isPastDeadline && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>The insurance upload deadline has passed. Please upload as soon as possible.</span>
                </div>
              )}
              {!isPastDeadline && insuranceDeadline && (
                <p className="text-sm text-gray-500">
                  Please upload by <strong>{insuranceDeadline.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</strong> (24 hours before shoot).
                </p>
              )}
              <label className="inline-flex cursor-pointer">
                <input type="file" accept=".pdf,image/*" onChange={uploadInsurance} className="hidden" disabled={uploading} />
                <span className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Upload className="h-4 w-4" />{uploading ? 'Uploading...' : 'Upload Insurance PDF'}
                </span>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">{insuranceDoc.fileName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {insuranceDoc.status === 'PENDING_REVIEW' && <Badge variant="warning">Pending Review</Badge>}
                  {insuranceDoc.status === 'APPROVED' && <Badge variant="success">Approved</Badge>}
                  {insuranceDoc.status === 'FLAGGED' && <Badge variant="danger">Flagged</Badge>}
                  <a href={insuranceDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
              {insuranceDoc.status === 'FLAGGED' && (
                <div className="space-y-2">
                  {insuranceDoc.extractedData?.flagReason && (
                    <p className="text-sm text-red-600">{insuranceDoc.extractedData.flagReason}</p>
                  )}
                  <label className="inline-flex cursor-pointer">
                    <input type="file" accept=".pdf,image/*" onChange={uploadInsurance} className="hidden" disabled={uploading} />
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                      <Upload className="h-4 w-4" />{uploading ? 'Uploading...' : 'Re-upload'}
                    </span>
                  </label>
                </div>
              )}
            </div>
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
            <p className="text-sm text-gray-500 text-center py-4">Messaging will be available once a coordinator is assigned to this booking.</p>
          ) : (
            <>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
