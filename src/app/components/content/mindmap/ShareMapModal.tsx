// ============================================================
// Axon — ShareMapModal
//
// Modal for sharing a read-only link to the student's knowledge
// map. Uses the current URL with topicId to generate the link.
// Supports:
//   - Copy to clipboard (all browsers)
//   - Web Share API (mobile)
//
// LANG: Spanish
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Copy, Check, Share2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { colors, headingStyle } from '@/app/design-system';
import { useFocusTrap } from './useFocusTrap';

// ── Props ───────────────────────────────────────────────────

interface ShareMapModalProps {
  open: boolean;
  onClose: () => void;
  topicId: string;
  topicName?: string;
}

// ── Component ───────────────────────────────────────────────

export function ShareMapModal({ open, onClose, topicId, topicName }: ShareMapModalProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const focusTrapRef = useFocusTrap(open);
  const inputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Build the share URL from the current origin (SSR-safe)
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/student/knowledge-map?topicId=${encodeURIComponent(topicId)}&shared=1`
    : '';

  // Auto-select input on open
  useEffect(() => {
    if (open) {
      setCopied(false);
      requestAnimationFrame(() => inputRef.current?.select());
    }
    return () => clearTimeout(copiedTimerRef.current);
  }, [open]);

  // Escape to close + lock body scroll
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); onCloseRef.current(); }
    };
    document.addEventListener('keydown', handleKey);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Enlace copiado');
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select text for manual copy
      inputRef.current?.select();
      toast.info('Selecciona y copia el enlace manualmente');
    }
  }, [shareUrl]);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: topicName ? `Mapa: ${topicName}` : 'Mapa de Conocimiento',
        text: 'Mira mi mapa de conocimiento en Axon',
        url: shareUrl,
      });
    } catch (err: unknown) {
      // User cancelled the share — not an error
      if (err instanceof Error && err.name === 'AbortError') return;
      if (import.meta.env.DEV) console.warn('Share failed:', err);
    }
  }, [shareUrl, topicName]);

  const supportsShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden="true"
          />

          {/* Modal wrapper — click outside closes */}
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            onClick={onClose}
          >
            <motion.div
              ref={focusTrapRef}
              className="bg-white shadow-lg w-full max-w-md rounded-t-2xl sm:rounded-2xl"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="share-modal-title"
            >
              {/* Mobile drag handle */}
              <div className="flex sm:hidden justify-center pt-2 pb-0">
                <div className="w-8 h-1 rounded-full bg-gray-300" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 sm:pt-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-ax-primary-50 flex items-center justify-center">
                    <Share2 className="w-4 h-4 text-ax-primary-500" aria-hidden="true" />
                  </div>
                  <h2
                    id="share-modal-title"
                    className="font-semibold text-gray-900"
                    style={{ ...headingStyle, fontSize: 'clamp(1rem, 2vw, 1.125rem)' }}
                  >
                    Compartir mapa
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-3 -mr-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 pb-5 space-y-4">
                <p
                  className="text-gray-500 leading-relaxed"
                  style={{ fontSize: 'clamp(0.8125rem, 1.3vw, 0.875rem)' }}
                >
                  Comparte este enlace para que otros puedan ver tu mapa de conocimiento en modo de solo lectura.
                </p>

                {/* URL field */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm text-gray-600 outline-none focus:border-ax-primary-500/50 focus:ring-1 focus:ring-ax-primary-500/20 transition-colors"
                      onClick={() => inputRef.current?.select()}
                      aria-label="Enlace para compartir"
                    />
                    <ExternalLink className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" aria-hidden="true" />
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors flex-shrink-0 ${
                      copied
                        ? 'bg-ax-primary-50 text-ax-primary-500'
                        : 'bg-gray-100 text-gray-500 hover:bg-ax-primary-50 hover:text-ax-primary-500'
                    }`}
                    aria-label={copied ? 'Copiado' : 'Copiar enlace'}
                    title={copied ? 'Copiado' : 'Copiar enlace'}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Topic name info */}
                {topicName && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-ax-primary-50 rounded-xl">
                    <span
                      className="text-ax-primary-500 font-medium truncate"
                      style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                    >
                      {topicName}
                    </span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleCopy}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium text-white rounded-full transition-colors hover:bg-ax-primary-600"
                    style={{ backgroundColor: colors.primary[500], fontSize: 'clamp(0.8125rem, 1.3vw, 0.875rem)' }}
                  >
                    {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                    {copied ? 'Copiado' : 'Copiar enlace'}
                  </button>
                  {supportsShare && (
                    <button
                      onClick={handleNativeShare}
                      className="flex items-center justify-center gap-2 px-4 py-3 font-medium text-ax-primary-500 bg-ax-primary-50 rounded-full transition-colors hover:bg-ax-primary-100"
                      style={{ fontSize: 'clamp(0.8125rem, 1.3vw, 0.875rem)' }}
                    >
                      <Share2 className="w-4 h-4" />
                      Compartir
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
