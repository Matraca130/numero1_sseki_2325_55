// ============================================================
// AdaptiveGenerationScreen — AI generation loading view
//
// Full-screen view shown during the 'generating' phase while
// generateAdaptiveBatch() is creating AI flashcards.
//
// STANDALONE: depends on react, motion/react, lucide-react.
// ============================================================

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, AlertCircle, Loader2, XCircle } from 'lucide-react';
import type { GenerationProgressInfo } from '@/app/hooks/useAdaptiveSession';

// ── Constants ──────────────────────────────────────────────────

/** Time (ms) before showing "this may take a moment" message */
const SLOW_THRESHOLD_MS = 12000;

// ── Types ─────────────────────────────────────────────────────

export interface AdaptiveGenerationScreenProps {
  progress: GenerationProgressInfo;
  /** Optional: callback to cancel the generation. If provided, a Cancel button is shown. */
  onCancel?: () => void;
}

// ── Component ─────────────────────────────────────────────────

export function AdaptiveGenerationScreen({
  progress,
  onCancel,
}: AdaptiveGenerationScreenProps) {
  const [isSlow, setIsSlow] = useState(false);

  // Timer for "slow generation" reassurance message
  useEffect(() => {
    setIsSlow(false);
    const timer = setTimeout(() => setIsSlow(true), SLOW_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  const { completed, total, generated, failed } = progress;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Ring SVG parameters
  const ringSize = 160;
  const ringStroke = 8;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCirc = 2 * Math.PI * ringRadius;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full bg-surface-dashboard p-8 text-center relative overflow-hidden"
    >
      {/* Ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, rgba(20,184,166,0.05) 50%, transparent 100%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-md">
        {/* Sparkle icon */}
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2dd4a8] to-[#2a8c7a] flex items-center justify-center mb-6 shadow-xl shadow-[#2a8c7a]/25"
        >
          <Sparkles size={32} className="text-white" />
        </motion.div>

        {/* Title */}
        <h2 className="text-2xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
          Generando Flashcards
        </h2>
        <p className="text-gray-500 mb-8 text-sm">
          La IA est{'\u00E1'} creando flashcards adaptadas a tus {'\u00E1'}reas d{'\u00E9'}biles
        </p>

        {/* Progress ring */}
        <div className="relative mb-8" style={{ width: ringSize, height: ringSize }}>
          <svg width={ringSize} height={ringSize} className="-rotate-90">
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringRadius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={ringStroke}
            />
            <motion.circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringRadius}
              fill="none"
              stroke="#2dd4a8"
              strokeWidth={ringStroke}
              strokeLinecap="round"
              strokeDasharray={ringCirc}
              animate={{ strokeDashoffset: ringCirc * (1 - pct / 100) }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl text-gray-900 tabular-nums" style={{ fontWeight: 700 }}>
              {generated}
            </span>
            <span className="text-xs text-gray-500" style={{ fontWeight: 500 }}>
              de {total}
            </span>
          </div>
        </div>

        {/* Status text */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Loader2 size={14} className="animate-spin text-[#2a8c7a]" />
          <span>
            {total === 0
              ? 'Preparando generaci\u00F3n...'
              : completed < total
                ? `Creando flashcard ${completed + 1} de ${total}...`
                : `\u00A1${generated} flashcards creadas!`}
          </span>
        </div>

        {/* Failed count (inline, non-alarming) */}
        {failed > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 mb-4"
          >
            <AlertCircle size={12} />
            <span style={{ fontWeight: 500 }}>
              {failed} {failed === 1 ? 'card no se pudo generar' : 'cards no se pudieron generar'}
            </span>
          </motion.div>
        )}

        {/* Slow generation reassurance */}
        {isSlow && completed < total && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-gray-400 mt-2"
          >
            Esto puede tardar un momento \u2014 la IA est{'\u00E1'} analizando tu perfil de estudio
          </motion.p>
        )}

        {/* Cancel button */}
        {onCancel && completed < total && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3 }}
            onClick={onCancel}
            className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:text-gray-700 hover:bg-white/60 transition-colors"
            style={{ fontWeight: 500 }}
          >
            <XCircle size={14} />
            Cancelar generaci{'\u00F3'}n
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
