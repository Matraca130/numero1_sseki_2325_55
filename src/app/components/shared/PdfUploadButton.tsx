// ============================================================
// Axon — PdfUploadButton (v4.5, Fase F-3)
//
// Self-contained button + dialog trigger for PDF upload.
// Designed to be placed in professor toolbars or page headers.
//
// USAGE:
//   <PdfUploadButton
//     institutionId={institutionId}
//     topicId={currentTopic.id}
//     onSuccess={(result) => refetchSummaries()}
//   />
//
// Renders a teal button with upload icon. Clicking opens
// the PdfUploadDialog. On success, fires the callback.
//
// DEPENDENCIES:
//   - PdfUploadDialog
//   - lucide-react
// ============================================================

import React, { useState } from 'react';
import { FileUp } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { PdfUploadDialog } from './PdfUploadDialog';
import type { PdfIngestResponse } from '@/app/services/aiService';

interface PdfUploadButtonProps {
  institutionId: string;
  topicId: string;
  onSuccess?: (result: PdfIngestResponse) => void;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost';
  /** Button size */
  size?: 'sm' | 'default' | 'lg';
  /** Extra className */
  className?: string;
}

export function PdfUploadButton({
  institutionId,
  topicId,
  onSuccess,
  variant = 'default',
  size = 'sm',
  className = '',
}: PdfUploadButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={`gap-1.5 ${
          variant === 'default' ? 'bg-teal-500 hover:bg-teal-600 text-white' : ''
        } ${className}`}
      >
        <FileUp size={14} />
        Subir PDF
      </Button>

      <PdfUploadDialog
        open={open}
        onOpenChange={setOpen}
        institutionId={institutionId}
        topicId={topicId}
        onSuccess={onSuccess}
      />
    </>
  );
}
