// ============================================================
// GraphShortcutsDialog — keyboard shortcuts + mobile gesture guide
// Extracted from KnowledgeGraph.tsx (pure refactor)
// ============================================================

import { memo, useRef, useEffect } from 'react';
import type { GraphI18nStrings } from './graphI18n';

export interface GraphShortcutsDialogProps {
  show: boolean;
  onClose: () => void;
  t: GraphI18nStrings;
  /** Ref to restore focus on close */
  triggerRef: React.RefObject<HTMLElement | null>;
}

export const GraphShortcutsDialog = memo(function GraphShortcutsDialog({
  show,
  onClose,
  t,
  triggerRef,
}: GraphShortcutsDialogProps) {
  const shortcutDialogRef = useRef<HTMLDivElement>(null);

  // Capture the active element when dialog opens so we can restore focus
  useEffect(() => {
    if (show) {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }
  }, [show, triggerRef]);

  if (!show) return null;

  const handleClose = () => {
    onClose();
    triggerRef.current?.focus();
  };

  return (
    <>
      {/* Tap-outside to dismiss */}
      <div
        className="absolute inset-0 z-[9]"
        onClick={handleClose}
        aria-hidden="true"
      />
      {/* Desktop keyboard shortcuts */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={shortcutDialogRef}
        className="absolute top-3 right-3 hidden sm:block bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-10 text-xs max-h-[60vh] overflow-y-auto"
        role="dialog"
        aria-label={t.shortcutDialog}
        aria-modal="true"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            handleClose();
            return;
          }
          // Focus trap: cycle Tab within dialog
          if (e.key === 'Tab') {
            const dialog = shortcutDialogRef.current;
            if (!dialog) return;
            const focusable = dialog.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) { e.preventDefault(); return; }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
              if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
              if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
          }
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-700" style={{ fontFamily: 'Georgia, serif' }}>
            {t.shortcuts}
          </span>
          <button
            ref={(el) => {
              // Auto-focus close button when dialog opens
              if (el) el.focus();
            }}
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 p-3 -mr-1"
            aria-label={t.closeShortcuts}
          >
            &times;
          </button>
        </div>
        <div className="space-y-1 text-gray-500">
          {t.keys.map(([key, desc]) => (
            <div key={key} className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono text-gray-600 min-w-[48px] text-center">
                {key}
              </kbd>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Mobile: gesture guide */}
      <div
        className="absolute inset-x-3 bottom-3 sm:hidden bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-10 text-xs"
        role="dialog"
        aria-label={t.gestureGuideTitle}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-700" style={{ fontFamily: 'Georgia, serif' }}>
            {t.gestureGuideTitle}
          </span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 -mr-1"
            aria-label={t.closeShortcuts}
          >
            &times;
          </button>
        </div>
        <div className="space-y-1.5 text-gray-500">
          {t.gestures.map(([gesture, desc]) => (
            <div key={gesture} className="flex items-center gap-2.5">
              <span className="text-[11px] min-w-[80px]">{gesture}</span>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
});
