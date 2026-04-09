'use client';

import { useState } from 'react';

interface DocRecord {
  id: string;
  type: string;
  status: string;
}

export function useDocumentUpload(onSuccess?: (doc: DocRecord) => void) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function upload(docType: string, file: File, vehicleId?: string): Promise<DocRecord | null> {
    setUploading(docType);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', docType);
      if (vehicleId) formData.append('vehicleId', vehicleId);
      const res = await fetch('/api/documents', { method: 'POST', body: formData });
      if (res.ok) {
        const doc = await res.json();
        const record = { id: doc.id, type: doc.type, status: doc.status };
        onSuccess?.(record);
        return record;
      }
      const data = await res.json().catch(() => null);
      const message = data?.error || 'Upload failed. Please try again.';
      setUploadError(message);
      return null;
    } catch {
      setUploadError('Network error. Please check your connection and try again.');
      return null;
    } finally {
      setUploading(null);
    }
  }

  function handleFileChange(docType: string, e: React.ChangeEvent<HTMLInputElement>, vehicleId?: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    upload(docType, file, vehicleId);
    e.target.value = '';
  }

  function clearError() {
    setUploadError(null);
  }

  return { uploading, uploadError, upload, handleFileChange, clearError };
}
