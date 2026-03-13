// ============================================================
// Axon — Student Quiz: AdaptiveQuizModal
//
// Extracted from QuizResults.tsx (P1-S01) to keep QuizResults
// under the 500-line Architecture Practices limit.
//
// 4-phase modal for adaptive AI quiz generation:
//   config     → user picks question count
//   generating → progress bar + spinner while AI works
//   success    → shows generated questions, start button
//   error      → actionable error message + retry
//
// Design: violet/purple accent (AI features), motion animations
// ============================================================

import { motion } from 'motion/react';
import clsx from 'clsx';
import { MODAL_OVERLAY, MODAL_CARD, MODAL_HEADER } from '@/app/services/quizDesignTokens';
import type { SmartGenerateResponse } from '@/app/services/quizApi';
import type { AdaptivePhase } from '@/app/components/student/useAdaptiveQuiz';
import {
  CheckCircle2, RotateCw, AlertCircle,
  Sparkles, Brain, X, Loader2, Minus, Plus,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────

// AdaptivePhase is canonically defined in useAdaptiveQuiz.ts — re-export for consumers
export type { AdaptivePhase } from '@/app/components/student/useAdaptiveQuiz';

// ── Props ────────────────────────────────────────────────

export interface AdaptiveQuizModalProps {
  phase: AdaptivePhase;
  count: number;
  result: SmartGenerateResponse | null;
  error: string;
  onChangeCount: (n: number) => void;
  onGenerate: () => void;
  onStart: () => void;
  onClose: () => void;
  onRetry: () => void;
}

// ── Component ────────────────────────────────────────────

export function AdaptiveQuizModal({
  phase, count, result, error,
  onChangeCount, onGenerate, onStart, onClose, onRetry,
}: AdaptiveQuizModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`${MODAL_OVERLAY} p-4`}
      onClick={(e) => { if (e.target === e.currentTarget && phase !== 'generating') onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`${MODAL_CARD} w-full max-w-md overflow-hidden`}
      >
        {/* Header */}
        <div className={MODAL_HEADER}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Brain size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm text-zinc-900" style={{ fontWeight: 700 }}>Quiz Adaptativo</h3>
              <p className="text-[11px] text-zinc-400">Generado por IA segun tu dominio BKT</p>
            </div>
          </div>
          {phase !== 'generating' && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
              <X size={16} className="text-zinc-400" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* CONFIG phase */}
          {phase === 'config' && (
            <div className="space-y-5">
              <p className="text-[12px] text-zinc-500" style={{ lineHeight: '1.6' }}>
                La IA analizara tu perfil de dominio (BKT) y generara preguntas enfocadas
                en los subtemas donde mas necesitas practicar.
              </p>

              {/* Counter */}
              <div>
                <label className="text-[11px] text-zinc-500 mb-2 block" style={{ fontWeight: 600 }}>
                  Numero de preguntas
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onChangeCount(Math.max(1, count - 1))}
                    disabled={count <= 1}
                    className="w-9 h-9 rounded-xl border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 disabled:opacity-30 transition-all"
                  >
                    <Minus size={14} />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl text-zinc-900" style={{ fontWeight: 700 }}>{count}</span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      ~{Math.ceil(count * 8)} seg de generacion
                    </p>
                  </div>
                  <button
                    onClick={() => onChangeCount(Math.min(10, count + 1))}
                    disabled={count >= 10}
                    className="w-9 h-9 rounded-xl border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 disabled:opacity-30 transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Info pills */}
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200" style={{ fontWeight: 600 }}>
                  Prioriza temas debiles
                </span>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200" style={{ fontWeight: 600 }}>
                  Dificultad adaptativa
                </span>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200" style={{ fontWeight: 600 }}>
                  Unico por sesion
                </span>
              </div>

              <button
                onClick={onGenerate}
                className="w-full py-3 rounded-xl text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-600/25 transition-all inline-flex items-center justify-center gap-2"
                style={{ fontWeight: 700 }}
              >
                <Sparkles size={16} />
                Generar quiz adaptativo
              </button>
            </div>
          )}

          {/* GENERATING phase */}
          {phase === 'generating' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
                  <Loader2 size={28} className="animate-spin text-violet-500" />
                </div>
                <motion.div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles size={10} className="text-white" />
                </motion.div>
              </div>
              <div className="text-center">
                <p className="text-sm text-zinc-700" style={{ fontWeight: 600 }}>Generando preguntas...</p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Analizando BKT y creando {count} preguntas adaptativas
                </p>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                  initial={{ width: '5%' }}
                  animate={{ width: '85%' }}
                  transition={{ duration: count * 6, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* SUCCESS phase */}
          {phase === 'success' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm text-emerald-700" style={{ fontWeight: 600 }}>
                    Quiz listo! {result.items.length} preguntas generadas
                  </p>
                  {result.errors.length > 0 && (
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      {result.errors.length} pregunta(s) no se pudieron generar
                    </p>
                  )}
                </div>
              </div>

              {/* Generated items summary */}
              <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar-light">
                {result.items.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 text-[11px]">
                    <span className="text-zinc-400" style={{ fontWeight: 600 }}>#{i + 1}</span>
                    <span className="text-zinc-600 truncate flex-1">{item.keyword_name}</span>
                    {item._smart.target_subtopic && (
                      <span className="text-violet-500 shrink-0 truncate max-w-[120px]" style={{ fontWeight: 500 }}>
                        {item._smart.target_subtopic}
                      </span>
                    )}
                    <span className={clsx(
                      'text-[9px] px-1.5 py-0.5 rounded-full shrink-0',
                      item._smart.p_know < 0.5 ? 'bg-red-50 text-red-500' :
                      item._smart.p_know < 0.8 ? 'bg-amber-50 text-amber-500' :
                      'bg-emerald-50 text-emerald-500'
                    )} style={{ fontWeight: 700 }}>
                      {Math.round(item._smart.p_know * 100)}%
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={onStart}
                className="w-full py-3 rounded-xl text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-600/25 transition-all inline-flex items-center justify-center gap-2"
                style={{ fontWeight: 700 }}
              >
                Empezar quiz adaptativo
              </button>
            </div>
          )}

          {/* ERROR phase */}
          {phase === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 border border-rose-200">
                <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-rose-700" style={{ fontWeight: 600 }}>Error al generar</p>
                  <p className="text-[11px] text-rose-500 mt-0.5">{error}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-all text-sm"
                  style={{ fontWeight: 600 }}
                >
                  Cerrar
                </button>
                <button
                  onClick={onRetry}
                  className="flex-1 py-2.5 rounded-xl text-white bg-violet-600 hover:bg-violet-700 transition-all text-sm inline-flex items-center justify-center gap-2"
                  style={{ fontWeight: 600 }}
                >
                  <RotateCw size={14} /> Reintentar
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}