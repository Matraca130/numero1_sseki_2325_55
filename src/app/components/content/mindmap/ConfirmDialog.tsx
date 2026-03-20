// ============================================================
// Axon — ConfirmDialog (shared destructive-action confirm)
//
// Used by both student (DeleteConfirmDialog) and professor
// (DeleteConnectionDialog) for delete confirmations.
// ============================================================

import { useEffect, useId, useRef } from 'react';
import { motion } from 'motion/react';
import { useFocusTrap } from './useFocusTrap';
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
  const uid = useId();
  const titleId = `confirm-title-${uid}`;
  const descId = `confirm-desc-${uid}`;

  // Ref-stabilize onCancel to avoid effect churn
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  // Lock body scroll while dialog is open (both body + html for iOS Safari)
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation(); // prevent parent panels from also handling Escape
        onCancelRef.current();
      }
    };
    document.addEventListener('keydown', handler, { capture: true });
    return () => document.removeEventListener('keydown', handler, { capture: true });
  }, []);

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
        aria-labelledby={titleId}
        aria-describedby={descId}
        aria-busy={confirmDisabled || undefined}
      >
        <h3
          id={titleId}
          className="font-medium text-gray-900 mb-2"
          style={{ ...headingStyle, fontSize: 'clamp(0.95rem, 1.5vw, 1.05rem)' }}
        >
          {title}
        </h3>
        <p id={descId} className="text-sm text-gray-500 mb-4 font-sans">
          {description}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:outline-none"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:outline-none"
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </>
  );
}
