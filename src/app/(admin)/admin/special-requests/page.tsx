'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Mail, Calendar, FileText, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface SpecialRequest {
  id: string;
  productionUserName: string;
  productionUserEmail: string;
  vehicleDescription: string;
  shootDates: string;
  additionalNotes: string;
  createdAt: string;
}

export default function AdminSpecialRequestsPage() {
  const [requests, setRequests] = useState<SpecialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/special-requests')
      .then((r) => r.json())
      .then((res) => setRequests(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Special Requests</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Special Requests</h1>
        <Badge variant="default">{requests.length}</Badge>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Vehicle requests from production users looking for vehicles not currently listed on the platform.
      </p>

      {requests.length === 0 ? (
        <Card className="p-12 text-center">
          <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No special requests yet</h3>
          <p className="text-gray-500">When production users submit special vehicle requests, they will appear here.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card
              key={req.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardContent className="py-4">
                <div onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold text-gray-900">{req.vehicleDescription}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {req.productionUserName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {req.shootDates}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                      {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {expandedId === req.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase mb-1">Vehicle Requested</p>
                        <p className="text-sm text-gray-900">{req.vehicleDescription}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase mb-1">Shoot Dates</p>
                        <p className="text-sm text-gray-900">{req.shootDates}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase mb-1">Requester</p>
                        <p className="text-sm text-gray-900">{req.productionUserName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase mb-1">Email</p>
                        <a href={`mailto:${req.productionUserEmail}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {req.productionUserEmail}
                        </a>
                      </div>
                    </div>
                    {req.additionalNotes && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase mb-1">Additional Notes</p>
                        <div className="flex items-start gap-2">
                          <FileText className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                          <p className="text-sm text-gray-700">{req.additionalNotes}</p>
                        </div>
                      </div>
                    )}
                    <div className="pt-2">
                      <a
                        href={`mailto:${req.productionUserEmail}?subject=Re: Special Vehicle Request&body=Hi ${req.productionUserName},%0A%0ARegarding your request for: ${encodeURIComponent(req.vehicleDescription)}%0A%0A`}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Mail className="h-4 w-4" />
                        Reply via Email
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
