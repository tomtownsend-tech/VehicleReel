'use client';

import { useState } from 'react';

interface DocRecord {
  id: string;
  type: string;
  status: string;
}

export function useDocumentUpload(onSuccess?: (doc: DocRecord) => void) {
  const [uploading, setUploading] = useState<string | null>(null);

  async function upload(docType: string, file: File, vehicleId?: string): Promise<DocRecord | null> {
    setUploading(docType);
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

  return { uploading, upload, handleFileChange };
}
