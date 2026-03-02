'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface Document {
  id: string;
  type: string;
  status: string;
  fileName: string;
  fileUrl: string;
  extractedData?: { flagReason?: string } | null;
  createdAt: string;
}

const REQUIRED_DOCS = [
  { type: 'SA_ID', label: 'South African ID' },
  { type: 'COMPANY_REGISTRATION', label: 'Company Registration' },
] as const;

function statusBadge(status: string) {
  switch (status) {
    case 'APPROVED':
      return <Badge variant="success">Approved</Badge>;
    case 'PENDING_REVIEW':
      return <Badge variant="warning">Pending Review</Badge>;
    case 'FLAGGED':
      return <Badge variant="danger">Flagged</Badge>;
    default:
      return <Badge variant="default">Not Uploaded</Badge>;
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'APPROVED':
      return <CheckCircle className="h-5 w-5 text-green-400" />;
    case 'PENDING_REVIEW':
      return <Clock className="h-5 w-5 text-yellow-400" />;
    case 'FLAGGED':
      return <AlertTriangle className="h-5 w-5 text-red-400" />;
    default:
      return <Upload className="h-5 w-5 text-white/40" />;
  }
}

export default function ProductionDocumentsPage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const isVerified = session?.user?.status === 'VERIFIED';

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.data || []);
      }
    } finally {
      setLoading(false);
    }
  }

  function getDocForType(type: string): Document | undefined {
    return documents
      .filter((d) => d.type === type)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }

  async function handleUpload(type: string, file: File) {
    setError('');
    setUploading(type);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Upload failed');
        return;
      }

      await fetchDocuments();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setUploading(null);
    }
  }

  const allApproved = REQUIRED_DOCS.every(
    (req) => getDocForType(req.type)?.status === 'APPROVED'
  );
  const hasPending = REQUIRED_DOCS.some(
    (req) => getDocForType(req.type)?.status === 'PENDING_REVIEW'
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Documents</h1>

      {!isVerified && !allApproved && (
        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-300">
            Upload your documents to start using VehicleReel. Both documents must be approved before you can search and option vehicles.
          </p>
        </div>
      )}

      {allApproved && (
        <div className="bg-green-400/10 border border-green-400/20 rounded-lg p-4 mb-6 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
          <p className="text-sm text-green-300">Account verified — all documents approved.</p>
        </div>
      )}

      {hasPending && !allApproved && (
        <div className="bg-blue-400/10 border border-blue-400/20 rounded-lg p-4 mb-6 flex items-center gap-3">
          <Clock className="h-5 w-5 text-blue-400 shrink-0" />
          <p className="text-sm text-blue-300">Your documents are being reviewed. This usually takes a few minutes.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-400/10 text-red-400 text-sm rounded-lg p-3 mb-6">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {REQUIRED_DOCS.map((req) => {
          const doc = getDocForType(req.type);
          const status = doc?.status || 'NOT_UPLOADED';
          const canUpload = !doc || doc.status === 'FLAGGED';
          const flagReason = doc?.extractedData?.flagReason;

          return (
            <Card key={req.type}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcon(status)}
                    <h2 className="text-lg font-semibold">{req.label}</h2>
                  </div>
                  {statusBadge(status)}
                </div>
              </CardHeader>
              <CardContent>
                {doc && status !== 'NOT_UPLOADED' && (
                  <p className="text-sm text-white/60 mb-3">
                    Uploaded: {doc.fileName}
                  </p>
                )}

                {flagReason && (
                  <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-3 mb-3">
                    <p className="text-sm text-red-300">{flagReason}</p>
                  </div>
                )}

                {canUpload && (
                  <div>
                    <input
                      id={`file-${req.type}`}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(req.type, file);
                        e.target.value = '';
                      }}
                      disabled={uploading === req.type}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      loading={uploading === req.type}
                      onClick={() => document.getElementById(`file-${req.type}`)?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {doc?.status === 'FLAGGED' ? 'Re-upload' : 'Upload'} {req.label}
                    </Button>
                    <p className="text-xs text-white/40 mt-2">
                      PDF or image, max 4MB
                    </p>
                  </div>
                )}

                {status === 'PENDING_REVIEW' && (
                  <p className="text-sm text-white/50">Under review...</p>
                )}
                {status === 'APPROVED' && (
                  <p className="text-sm text-green-400/70">Document verified</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {loading && (
        <div className="text-center py-8 text-white/40">Loading documents...</div>
      )}
    </div>
  );
}
