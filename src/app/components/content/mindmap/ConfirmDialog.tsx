// ============================================================
// Axon — ConfirmDialog (shared destructive-action confirm)
//
// Used by both student (DeleteConfirmDialog) and professor
// (DeleteConnectionDialog) for delete confirmations.
// ============================================================

import { useEffect } from 'react';
import { motion } from 'motion/react';
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
  /** Disable the confirm button (e.g. during async operations) */
  confirmDisabled?: boolean;
}

export function ConfirmDialog({
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  zClass = 'z-50',
  confirmDisabled = false,
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className={`fixed inset-0 bg-black/40 ${zClass}`}
        onClick={onCancel}
        aria-hidden="true"
      />
      <motion.div
        ref={focusTrapRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed ${zClass} left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-lg p-5 w-[90vw] max-w-sm`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
      >
        <h3
          id="confirm-dialog-title"
          className="font-medium text-gray-900 mb-2"
          style={{ ...headingStyle, fontSize: 'clamp(0.95rem, 1.5vw, 1.05rem)' }}
        >
          {title}
        </h3>
        <p id="confirm-dialog-desc" className="text-sm text-gray-500 mb-4 font-sans">
          {description}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-full transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </>
  );
}
