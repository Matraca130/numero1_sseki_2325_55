import React, { useState } from 'react';
import { FileUp } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { PdfUploadDialog } from './PdfUploadDialog';
import type { PdfIngestResponse } from '@/app/services/aiService';

interface PdfUploadButtonProps {
  institutionId: string;
  topicId: string;
  onSuccess?: (result: PdfIngestResponse) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function PdfUploadButton({
  institutionId, topicId, onSuccess,
  variant = 'default', size = 'sm', className = '',
}: PdfUploadButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}
        className={`gap-1.5 ${variant === 'default' ? 'bg-teal-500 hover:bg-teal-600 text-white' : ''} ${className}`}>
        <FileUp size={14} /> Subir PDF
      </Button>
      <PdfUploadDialog open={open} onOpenChange={setOpen} institutionId={institutionId} topicId={topicId} onSuccess={onSuccess} />
    </>
  );
}
