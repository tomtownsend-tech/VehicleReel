'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Upload, AlertTriangle, FileText, ExternalLink, CheckCircle, Clock, MapPin, Save, ChevronDown, ChevronUp, Copy, XCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface InsuranceDocument {
  id: string;
  status: string;
  fileUrl: string;
  fileName: string;
  extractedData: { flagReason?: string } | null;
  createdAt: string;
}

interface DailyDetail {
  id: string;
  date: string;
  callTime: string | null;
  locationAddress: string | null;
  locationPin: string | null;
  notes: string | null;
}
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

interface DayForm {
  callTime: string;
  locationAddress: string;
  locationPin: string;
  notes: string;
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

  // Per-day form state keyed by date string
  const [dayForms, setDayForms] = useState<Record<string, DayForm>>({});
  const [sameForAll, setSameForAll] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

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
          // Initialize per-day form state
          const forms: Record<string, DayForm> = {};
          data.dailyDetails?.forEach((d: DailyDetail) => {
            const dateStr = d.date.split('T')[0];
            forms[dateStr] = {
              callTime: d.callTime || '',
              locationAddress: d.locationAddress || '',
              locationPin: d.locationPin || '',
              notes: d.notes || '',
            };
          });
          setDayForms(forms);
          // Auto-expand first day
          if (data.dailyDetails?.length > 0) {
            setExpandedDay(data.dailyDetails[0].date.split('T')[0]);
          }
        }
      })
      .catch(() => {});
  }, [params.id]);

  // Fetch messages
  useEffect(() => {
    if (!booking) return;
    const url = hasCoordinator
      ? `/api/bookings/${booking.id}/messages?thread=PRODUCTION_COORDINATOR`
      : `/api/bookings/${booking.id}/messages`;
    fetch(url)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [booking?.id, hasCoordinator]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function updateDayForm(dateStr: string, field: keyof DayForm, value: string) {
    if (sameForAll) {
      // Apply to all days
      setDayForms((prev) => {
        const updated = { ...prev };
        for (const key in updated) {
          updated[key] = { ...updated[key], [field]: value };
        }
        return updated;
      });
    } else {
      setDayForms((prev) => ({
        ...prev,
        [dateStr]: { ...prev[dateStr], [field]: value },
      }));
    }
  }

  function applyToAllDays() {
    if (!expandedDay || !dayForms[expandedDay]) return;
    const source = dayForms[expandedDay];
    setDayForms((prev) => {
      const updated = { ...prev };
      for (const key in updated) {
        updated[key] = { ...source };
      }
      return updated;
    });
    setSameForAll(true);
  }

  async function saveDetails() {
    if (!booking) return;
    setSavingDetails(true);
    try {
      const days = Object.entries(dayForms).map(([date, form]) => ({
        date,
        callTime: form.callTime || undefined,
        locationAddress: form.locationAddress || undefined,
        locationPin: form.locationPin || undefined,
        notes: form.notes || undefined,
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

  async function handleCancel() {
    if (!booking || !cancelReason.trim()) return;
    setCancelling(true);
    setCancelError('');
    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBooking((prev) => prev ? { ...prev, status: updated.status } : prev);
        setShowCancelModal(false);
      } else {
        const err = await res.json();
        setCancelError(err.error || 'Cancellation failed');
      }
    } finally {
      setCancelling(false);
    }
  }

  function getCancellationFeeLabel(): string {
    if (!booking) return '';
    const shootStart = new Date(booking.startDate);
    const hoursUntil = (shootStart.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil >= 48) return 'No cancellation fee (48+ hours before shoot)';
    if (hoursUntil >= 24) return '50% cancellation fee (24–48 hours before shoot)';
    return '100% cancellation fee (less than 24 hours before shoot)';
  }

  if (!booking) return <div className="animate-pulse"><div className="h-64 bg-gray-800 rounded" /></div>;

  const checkedDates = new Set(booking.checkIns.map((c) => c.date.split('T')[0]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.push('/production/options')} className="flex items-center gap-2 text-sm text-white/60 hover:text-white mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Booking Details</h1>
        <div className="flex items-center gap-2">
          <Badge variant={booking.status === 'CANCELLED' ? 'danger' : 'success'}>{booking.status}</Badge>
          {booking.status === 'CONFIRMED' && (
            <Button size="sm" variant="outline" className="border-red-400/40 text-red-400 hover:bg-red-400/10" onClick={() => setShowCancelModal(true)}>
              <XCircle className="h-4 w-4 mr-1" /> Cancel Booking
            </Button>
          )}
        </div>
      </div>

      {/* Booking Summary */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><dt className="text-white/50">Vehicle</dt><dd className="font-medium">{booking.option.vehicle.year} {booking.option.vehicle.make} {booking.option.vehicle.model}</dd></div>
            <div><dt className="text-white/50">Owner</dt><dd className="font-medium">{booking.option.vehicle.owner.name}</dd></div>
            <div><dt className="text-white/50">Location</dt><dd className="font-medium">{booking.option.vehicle.location}</dd></div>
            <div><dt className="text-white/50">Dates</dt><dd className="font-medium">{formatDate(booking.startDate)} — {formatDate(booking.endDate)}</dd></div>
            <div><dt className="text-white/50">Rate</dt><dd className="font-medium">{formatCurrency(booking.rateCents)}{booking.rateType === 'PER_DAY' ? '/day' : ' package'}</dd></div>
            <div><dt className="text-white/50">Logistics</dt><dd className="font-medium">{booking.logistics === 'OWNER_DELIVERY' ? 'Owner delivers to set' : 'Vehicle collection'}</dd></div>
            <div><dt className="text-white/50">Owner Contact</dt><dd className="font-medium">{booking.option.vehicle.owner.email}{booking.option.vehicle.owner.phone && ` | ${booking.option.vehicle.owner.phone}`}</dd></div>
            {booking.coordinator && <div><dt className="text-white/50">Coordinator</dt><dd className="font-medium">{booking.coordinator.name}</dd></div>}
          </dl>
        </CardContent>
      </Card>

      {/* Shoot Details — Per Day */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-white/50" />
              <h2 className="text-lg font-semibold">Shoot Details</h2>
            </div>
            <div className="flex items-center gap-2">
              {booking.dailyDetails.length > 1 && (
                <button
                  onClick={applyToAllDays}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white/70 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  Apply current day to all
                </button>
              )}
            </div>
          </div>
          {booking.dailyDetails.length > 1 && (
            <div className="mt-2">
              <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sameForAll}
                  onChange={(e) => setSameForAll(e.target.checked)}
                  className="rounded border-white/15 text-white focus:ring-white/20 bg-white/5"
                />
                Same details for all days (edits sync across all days)
              </label>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {booking.dailyDetails.map((d) => {
              const dateStr = d.date.split('T')[0];
              const isExpanded = expandedDay === dateStr;
              const form = dayForms[dateStr] || { callTime: '', locationAddress: '', locationPin: '', notes: '' };
              const hasContent = form.callTime || form.locationAddress || form.locationPin || form.notes;
              const isCheckedIn = checkedDates.has(dateStr);

              return (
                <div key={d.id} className="border border-white/10 rounded-lg overflow-hidden">
                  {/* Day header — always visible */}
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : dateStr)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-white">{formatDate(d.date)}</span>
                      {hasContent && !isExpanded && (
                        <span className="text-xs text-white/40">
                          {form.callTime && `Call: ${form.callTime}`}
                          {form.callTime && form.locationAddress && ' · '}
                          {form.locationAddress && form.locationAddress.slice(0, 30)}
                          {(form.locationAddress?.length || 0) > 30 && '...'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isCheckedIn && <Badge variant="success"><CheckCircle className="h-3 w-3" /></Badge>}
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
                    </div>
                  </button>

                  {/* Expanded per-day form */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-white/5 bg-white/5">
                      <div className="pt-3">
                        <label className="block text-xs font-medium text-white/60 mb-1">Call Time</label>
                        <input
                          value={form.callTime}
                          onChange={(e) => updateDayForm(dateStr, 'callTime', e.target.value)}
                          placeholder="e.g. 06:00"
                          className="w-full px-3 py-2 border border-white/15 bg-white/5 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/60 mb-1">Location Address</label>
                        <input
                          value={form.locationAddress}
                          onChange={(e) => updateDayForm(dateStr, 'locationAddress', e.target.value)}
                          placeholder="e.g. 123 Main St, Cape Town"
                          className="w-full px-3 py-2 border border-white/15 bg-white/5 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/60 mb-1">Google Maps Pin (URL)</label>
                        <input
                          value={form.locationPin}
                          onChange={(e) => updateDayForm(dateStr, 'locationPin', e.target.value)}
                          placeholder="https://maps.google.com/..."
                          className="w-full px-3 py-2 border border-white/15 bg-white/5 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/60 mb-1">Notes / Special Instructions</label>
                        <textarea
                          value={form.notes}
                          onChange={(e) => updateDayForm(dateStr, 'notes', e.target.value)}
                          rows={2}
                          placeholder="Parking details, access codes, etc."
                          className="w-full px-3 py-2 border border-white/15 bg-white/5 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <Button onClick={saveDetails} loading={savingDetails}>
              <Save className="h-4 w-4 mr-1" /> Save All Details
            </Button>
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
                <div key={d.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-white/5 last:border-0 gap-1">
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
        <CardHeader><h2 className="text-lg font-semibold">Vehicle Insurance</h2></CardHeader>
        <CardContent>
          {!insuranceDoc ? (
            <div className="space-y-3">
              {isPastDeadline && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>The insurance upload deadline has passed. Please upload as soon as possible.</span>
                </div>
              )}
              {!isPastDeadline && insuranceDeadline && (
                <p className="text-sm text-white/50">
                  Please upload by <strong>{insuranceDeadline.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</strong> (24 hours before shoot).
                </p>
              )}
              <label className="inline-flex cursor-pointer">
                <input type="file" accept=".pdf,image/*" onChange={uploadInsurance} className="hidden" disabled={uploading} />
                <span className="inline-flex items-center gap-2 px-4 py-2 border border-white/15 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5">
                  <Upload className="h-4 w-4" />{uploading ? 'Uploading...' : 'Upload Insurance PDF'}
                </span>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-white/50" />
                  <span className="text-sm font-medium">{insuranceDoc.fileName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {insuranceDoc.status === 'PENDING_REVIEW' && <Badge variant="warning">Pending Review</Badge>}
                  {insuranceDoc.status === 'APPROVED' && <Badge variant="success">Approved</Badge>}
                  {insuranceDoc.status === 'FLAGGED' && <Badge variant="danger">Flagged</Badge>}
                  <a href={insuranceDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
              {insuranceDoc.status === 'FLAGGED' && (
                <div className="space-y-2">
                  {insuranceDoc.extractedData?.flagReason && (
                    <p className="text-sm text-red-400">{insuranceDoc.extractedData.flagReason}</p>
                  )}
                  <label className="inline-flex cursor-pointer">
                    <input type="file" accept=".pdf,image/*" onChange={uploadInsurance} className="hidden" disabled={uploading} />
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/15 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5">
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
            <p className="text-sm text-white/50 text-center py-4">Messaging will be available once a coordinator is assigned to this booking.</p>
          ) : (
            <>
              <div className="h-64 overflow-y-auto mb-4 space-y-3">
                {messages.length === 0 && <p className="text-sm text-white/50 text-center py-8">No messages yet. Start the conversation!</p>}
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
                  className="flex-1 px-3 py-2 border border-white/15 bg-white/5 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <Button onClick={sendMessage} loading={sending} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Cancel Booking</h3>
            <p className="text-sm text-white/60 mb-1">
              {booking.option.vehicle.year} {booking.option.vehicle.make} {booking.option.vehicle.model} — {formatDate(booking.startDate)} to {formatDate(booking.endDate)}
            </p>
            <p className="text-sm font-medium text-amber-400 mb-4">{getCancellationFeeLabel()}</p>
            {cancelError && <p className="text-xs text-red-400 mb-2">{cancelError}</p>}
            <div className="space-y-3">
              <div>
                <label htmlFor="cancelReason" className="text-xs text-white/50 block mb-1">Reason for cancellation</label>
                <textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please explain why you're cancelling..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-white/15 bg-white/5 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => { setShowCancelModal(false); setCancelReason(''); setCancelError(''); }}>Back</Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                disabled={!cancelReason.trim()}
                loading={cancelling}
                onClick={handleCancel}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
