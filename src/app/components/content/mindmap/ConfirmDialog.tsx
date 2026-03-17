// ============================================================
// Axon — ConfirmDialog (shared destructive-action confirm)
//
// Used by both student (DeleteConfirmDialog) and professor
// (DeleteConnectionDialog) for delete confirmations.
// ============================================================

import { useEffect } from 'react';
import { useFocusTrap } from '@/app/components/content/mindmap/useFocusTrap';
import { headingStyle } from '@/app/design-system';

interface ConfirmDialogProps {
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** CSS z-index class for the overlay/dialog. Default: 'z-50' */
  zClass?: string;
}

export function ConfirmDialog({
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  zClass = 'z-50',
}: ConfirmDialogProps) {
  const focusTrapRef = useFocusTrap(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/20 ${zClass}`}
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={focusTrapRef}
        className={`fixed ${zClass} left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl border border-gray-200 p-5 w-[90vw] max-w-sm`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
      >
        <h3 id="confirm-dialog-title" className="font-medium text-gray-900 mb-2" style={headingStyle}>
          {title}
        </h3>
        <p id="confirm-dialog-desc" className="text-sm text-gray-500 mb-4">
          {description}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
