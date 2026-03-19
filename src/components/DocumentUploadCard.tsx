'use client';

import { Badge } from '@/components/ui/badge';
import { FileUp, Check, Loader2 } from 'lucide-react';

interface DocRecord {
  id: string;
  type: string;
  status: string;
}

interface DocumentUploadCardProps {
  type: string;
  label: string;
  docs: DocRecord[];
  uploading: string | null;
  onFileChange: (docType: string, e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function DocumentUploadCard({ type, label, docs, uploading, onFileChange }: DocumentUploadCardProps) {
  const existing = docs.filter((d) => d.type === type);
  const approved = existing.find((d) => d.status === 'APPROVED');
  const pending = existing.find((d) => d.status === 'PENDING_REVIEW');
  const flagged = existing.find((d) => d.status === 'FLAGGED');
  const canUpload = !approved && !pending;

  return (
    <div className="border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{label}</span>
        {approved ? (
          <Badge variant="success"><Check className="h-3 w-3 mr-1" /> Approved</Badge>
        ) : pending ? (
          <Badge variant="warning">Pending Review</Badge>
        ) : flagged ? (
          <Badge variant="danger">Flagged</Badge>
        ) : (
          <Badge variant="default">Not Uploaded</Badge>
        )}
      </div>
      {flagged && <p className="text-xs text-red-400 mt-1">This document was flagged. Please re-upload.</p>}
      {canUpload && (
        <label className={`mt-3 flex items-center justify-center gap-2 w-full h-12 border-2 border-dashed border-white/15 rounded-lg cursor-pointer hover:border-white/40 hover:bg-white/5 transition-colors ${uploading === type ? 'opacity-50 pointer-events-none' : ''}`}>
          {uploading === type ? (
            <><Loader2 className="h-4 w-4 text-white/50 animate-spin" /><span className="text-sm text-white/50">Uploading...</span></>
          ) : (
            <><FileUp className="h-4 w-4 text-white/50" /><span className="text-sm text-white/50">Upload {label}</span></>
          )}
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onFileChange(type, e)} disabled={uploading === type} />
        </label>
      )}
    </div>
  );
}
