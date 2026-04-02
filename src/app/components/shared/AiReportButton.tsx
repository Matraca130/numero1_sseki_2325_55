// ============================================================
// Axon — AiReportButton (Fase D: Feedback Loop)
//
// Shared inline component for reporting AI-generated content.
// Used in both professor (QuestionCard) and student (QuizResults)
// views. Renders a small flag icon button that opens a modal
// with reason selection + optional description.
//
// BACKEND CONTRACT:
//   POST /ai/report
//   Body: { content_type, content_id, reason, description? }
//   Success: 201 → AiContentReport
//   Errors:  404 (not AI / not found), 409 (already reported)
// ============================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createAiReport, REPORT_REASON_LABELS } from '@/app/services/aiApi';
import type {
  AiReportContentType,
  AiReportReason,
} from '@/app/services/aiApi';
import { motion, AnimatePresence } from 'motion/react';
import { Flag, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { logger } from '@/app/lib/logger';

// ── Constants ─────────────────────────────────────────────

const REASONS: AiReportReason[] = [
  'incorrect',
  'low_quality',
  'irrelevant',
  'inappropriate',
  'other',
];

const MAX_DESCRIPTION_LENGTH = 2000;
const SUCCESS_CLOSE_DELAY_MS = 800;
const DUPLICATE_CLOSE_DELAY_MS = 1500;

// ── Props ─────────────────────────────────────────────────

interface AiReportButtonProps {
  contentId: string;
  contentType: AiReportContentType;
  source: 'ai' | 'manual' | (string & {});
  compact?: boolean;
}

// ── Report Modal ──────────────────────────────────────────

type SubmitState = 'idle' | 'submitting' | 'success' | 'already_reported' | 'error';

interface ReportModalProps {
  contentId: string;
  contentType: AiReportContentType;
  onClose: () => void;
  onReported: () => void;
}

function ReportModal({ contentId, contentType, onClose, onReported }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<AiReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) return;

    setSubmitState('submitting');
    setErrorMsg('');

    try {
      await createAiReport({
        content_type: contentType,
        content_id: contentId,
        reason: selectedReason,
        ...(description.trim() ? { description: description.trim() } : {}),
      });

      setSubmitState('success');
      closeTimerRef.current = setTimeout(() => {
        onReported();
        onClose();
      }, SUCCESS_CLOSE_DELAY_MS);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      if (message.toLowerCase().includes('already reported')) {
        setSubmitState('already_reported');
        closeTimerRef.current = setTimeout(() => {
          onReported();
          onClose();
        }, DUPLICATE_CLOSE_DELAY_MS);
        return;
      }

      logger.error('[AiReport] Submit failed:', err);
      setSubmitState('error');
      setErrorMsg(
        message.includes('404')
          ? 'Este contenido no es generado por IA o no existe.'
          : 'Error al enviar el reporte. Intenta nuevamente.'
      );
    }
  }, [selectedReason, description, contentType, contentId, onReported, onClose]);

  const isSubmitting = submitState === 'submitting';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
              <Flag size={16} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-[13px] text-zinc-900" style={{ fontWeight: 700 }}>
                Reportar contenido IA
              </h3>
              <p className="text-[10px] text-zinc-400">
                Selecciona el motivo del reporte
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            disabled={isSubmitting}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {submitState === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px]"
              style={{ fontWeight: 600 }}
            >
              <CheckCircle2 size={16} /> Reporte enviado correctamente
            </motion.div>
          )}

          {submitState === 'already_reported' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-[12px]"
              style={{ fontWeight: 600 }}
            >
              <CheckCircle2 size={16} /> Ya habias reportado este contenido
            </motion.div>
          )}

          {submitState !== 'success' && submitState !== 'already_reported' && (
            <>
              <div className="space-y-1.5">
                {REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setSelectedReason(reason)}
                    disabled={isSubmitting}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all text-[12px]',
                      selectedReason === reason
                        ? 'border-amber-300 bg-amber-50 text-amber-800 shadow-sm'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50',
                      isSubmitting && 'opacity-50 cursor-not-allowed'
                    )}
                    style={{ fontWeight: selectedReason === reason ? 600 : 400 }}
                  >
                    <div className={clsx(
                      'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                      selectedReason === reason
                        ? 'border-amber-500 bg-amber-500'
                        : 'border-zinc-300'
                    )}>
                      {selectedReason === reason && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    {REPORT_REASON_LABELS[reason]}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1" style={{ fontWeight: 700 }}>
                  Descripcion (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                  placeholder="Describe el problema con mas detalle..."
                  disabled={isSubmitting}
                  rows={2}
                  className="w-full px-3 py-2 text-[12px] text-zinc-700 border border-zinc-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300 disabled:opacity-50"
                />
                {description.length > 0 && (
                  <p className="text-[9px] text-zinc-400 text-right mt-0.5">
                    {description.length}/{MAX_DESCRIPTION_LENGTH}
                  </p>
                )}
              </div>

              {submitState === 'error' && errorMsg && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[11px]">
                  <AlertTriangle size={14} className="shrink-0" />
                  {errorMsg}
                </div>
              )}
            </>
          )}
        </div>

        {submitState !== 'success' && submitState !== 'already_reported' && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-100 bg-zinc-50/50">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-[12px] text-zinc-500 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-50"
              style={{ fontWeight: 600 }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedReason || isSubmitting}
              className={clsx(
                'px-5 py-2 text-[12px] rounded-xl transition-all inline-flex items-center gap-2',
                selectedReason && !isSubmitting
                  ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                  : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
              )}
              style={{ fontWeight: 700 }}
            >
              {isSubmitting ? (
                <><Loader2 size={14} className="animate-spin" /> Enviando...</>
              ) : (
                <><Flag size={14} /> Enviar reporte</>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Main Button Component ─────────────────────────────────

export const AiReportButton = React.memo(function AiReportButton({
  contentId,
  contentType,
  source,
  compact = false,
}: AiReportButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [reported, setReported] = useState(false);

  if (source !== 'ai') return null;

  if (reported) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 text-[9px]"
        style={{ fontWeight: 700 }}
      >
        <CheckCircle2 size={10} /> Reportado
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={clsx(
          'inline-flex items-center gap-1 rounded-lg transition-colors',
          compact
            ? 'p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50'
            : 'px-2 py-1 text-[10px] text-zinc-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200'
        )}
        title="Reportar contenido IA"
        style={{ fontWeight: 600 }}
      >
        <Flag size={compact ? 12 : 10} />
        {!compact && 'Reportar'}
      </button>

      <AnimatePresence>
        {showModal && (
          <ReportModal
            contentId={contentId}
            contentType={contentType}
            onClose={() => setShowModal(false)}
            onReported={() => setReported(true)}
          />
        )}
      </AnimatePresence>
    </>
  );
});
