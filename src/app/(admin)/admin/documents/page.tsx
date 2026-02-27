'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface DocumentItem {
  id: string;
  type: string;
  status: string;
  fileName: string;
  fileUrl: string;
  extractedData: Record<string, string> | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  reviews: { id: string; status: string; result: Record<string, unknown> | null; confidenceScore: number | null }[];
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    fetch('/api/admin/documents')
      .then((r) => r.json())
      .then(setDocuments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleManualReview(docId: string, action: 'APPROVED' | 'FLAGGED') {
    const res = await fetch(`/api/admin/documents/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: action }),
    });
    if (res.ok) {
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: action } : d))
      );
    }
  }

  const filteredDocs = filter === 'ALL' ? documents : documents.filter((d) => d.status === filter);
  const statusVariant: Record<string, 'warning' | 'success' | 'danger' | 'default'> = {
    PENDING_REVIEW: 'warning',
    APPROVED: 'success',
    FLAGGED: 'danger',
    EXPIRED: 'danger',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Document Review</h1>

      <div className="flex gap-2 mb-6">
        {['ALL', 'PENDING_REVIEW', 'FLAGGED', 'APPROVED', 'EXPIRED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === f ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <p className="text-gray-500">No documents to review.</p>
      ) : (
        <div className="space-y-4">
          {filteredDocs.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">{doc.type.replace(/_/g, ' ')}</span>
                      <Badge variant={statusVariant[doc.status] || 'default'}>
                        {doc.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {doc.user.name} ({doc.user.email}) &mdash; {doc.fileName}
                    </p>
                    {doc.reviews[0]?.confidenceScore != null && (
                      <p className="text-xs text-gray-400 mt-1">
                        Confidence: {(doc.reviews[0].confidenceScore * 100).toFixed(0)}%
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      View
                    </a>
                    {(doc.status === 'PENDING_REVIEW' || doc.status === 'FLAGGED') && (
                      <>
                        <Button size="sm" onClick={() => handleManualReview(doc.id, 'APPROVED')}>
                          Approve
                        </Button>
                        {doc.status !== 'FLAGGED' && (
                          <Button size="sm" variant="danger" onClick={() => handleManualReview(doc.id, 'FLAGGED')}>
                            Flag
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
