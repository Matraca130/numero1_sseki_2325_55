// ============================================================
// FlashcardSummaryScreen -- Post-session summary
//
// PHASE 3: Fully decoupled from contexts and API services.
// PHASE 8a: Dynamic boxShadow on CTA button matches mastery color.
//
// v4.4.6: Removed old SmartFlashcardGenerator (Portuguese modal with
//   client-side gap analysis that never worked — stubs returned []).
//   AI flashcard generation is now handled by:
//     - aiService.generateSmart() → POST /ai/generate-smart (server-side)
//     - aiService.generateFlashcard() → POST /ai/generate (manual)
//   A new UI for this can be built when needed.
//
// STANDALONE: depends on react, motion/react, lucide-react.
// ============================================================

import React from 'react';
import { motion } from 'motion/react';
import { Trophy, TrendingUp, TrendingDown, Star, Sparkles } from 'lucide-react';
import type { CardMasteryDelta } from '@/app/hooks/useFlashcardEngine';
import { getMasteryColorFromPct } from './mastery-colors';

// ── Types ─────────────────────────────────────────────────────

export interface SummaryScreenProps {
  stats: number[];
  onRestart: () => void;
  /** @deprecated Colors now derived from mastery via getMasteryColorFromPct. Kept for caller compat. */
  courseColor: string;
  courseId: string;
  courseName: string;
  topicId: string | null;
  topicTitle: string | null;
  onExit: () => void;
  /**
   * Real mastery percentage (0-100) computed from p_know values.
   * If provided, used instead of the average-of-ratings fallback.
   */
  realMasteryPercent?: number;
  /** Total cards considered mastered across the course (BKT >= 0.75) */
  totalMastered?: number;
  /** Total cards in the course */
  totalCards?: number;
  /** Per-card mastery deltas from the session (before/after p_know) */
  masteryDeltas?: CardMasteryDelta[];
  /** Optional: navigate to adaptive AI session. CTA hidden if undefined or mastery >= 90%. */
  onStartAdaptive?: () => void;
}

// ── Component ─────────────────────────────────────────────────

export function SummaryScreen({
  stats,
  onRestart,
  courseColor: _courseColor,
  courseId: _courseId,
  courseName: _courseName,
  topicId,
  topicTitle,
  onExit,
  realMasteryPercent,
  totalMastered,
  totalCards,
  masteryDeltas,
  onStartAdaptive,
}: SummaryScreenProps) {
  // [F1 FIX] Guard against empty stats (prevents NaN from division by zero)
  if (stats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-dashboard p-8 text-center">
        <p className="text-gray-500">No hay datos de la sesi\u00F3n.</p>
        <button
          onClick={onExit}
          className="mt-4 px-6 py-3 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          style={{ fontWeight: 600 }}
        >
          Volver al Deck
        </button>
      </div>
    );
  }

  // Use real p_know mastery if available, fallback to rating average
  const average = stats.reduce((a, b) => a + b, 0) / stats.length;
  const mastery = realMasteryPercent ?? (average / 5) * 100;
  const summaryColor = getMasteryColorFromPct(mastery / 100);

  // Compute delta stats from masteryDeltas
  const deltaStats = (() => {
    if (!masteryDeltas || masteryDeltas.length === 0) return null;
    let improved = 0;
    let declined = 0;
    let newlyMastered = 0;
    for (const d of masteryDeltas) {
      if (d.after > d.before) improved++;
      else if (d.after < d.before) declined++;
      if (d.before < 0.75 && d.after >= 0.75) newlyMastered++;
    }
    return { improved, declined, newlyMastered, total: masteryDeltas.length };
  })();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full bg-surface-dashboard p-4 sm:p-8 text-center relative overflow-hidden"
    >
      {/* Ambient celebration glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${summaryColor.hex}33 0%, ${summaryColor.hex}1A 50%, transparent 100%)` }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6 shadow-xl shadow-amber-500/25">
          <Trophy size={40} className="text-white" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Sesi\u00F3n Completada!</h2>
        <p className="text-gray-500 mb-6 sm:mb-8 max-w-md text-sm sm:text-base">
          Completaste {stats.length} flashcards con un dominio estimado de:
        </p>

        <div className="relative w-36 h-36 sm:w-48 sm:h-48 flex items-center justify-center mb-8 sm:mb-10">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
            <circle cx="96" cy="96" r="88" stroke="#e2e8f0" strokeWidth="12" fill="none" />
            <motion.circle
              cx="96" cy="96" r="88"
              stroke={summaryColor.hex}
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 88}
              initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - mastery / 100) }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl sm:text-4xl font-bold text-gray-900">{mastery.toFixed(0)}%</span>
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Dominio</span>
          </div>
        </div>

        {/* ── Session Delta Stats ── */}
        {deltaStats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8"
          >
            {deltaStats.improved > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <TrendingUp size={14} className="text-emerald-500" />
                <span className="text-xs text-emerald-700" style={{ fontWeight: 600 }}>
                  {deltaStats.improved} mejoraron
                </span>
              </div>
            )}
            {deltaStats.newlyMastered > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                <Star size={14} className="text-amber-500" />
                <span className="text-xs text-amber-700" style={{ fontWeight: 600 }}>
                  {deltaStats.newlyMastered} {deltaStats.newlyMastered === 1 ? 'nueva dominada' : 'nuevas dominadas'}
                </span>
              </div>
            )}
            {deltaStats.declined > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200">
                <TrendingDown size={14} className="text-rose-500" />
                <span className="text-xs text-rose-700" style={{ fontWeight: 600 }}>
                  {deltaStats.declined} bajaron
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Total mastered context */}
        {totalMastered != null && totalCards != null && totalCards > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-sm text-gray-500 mb-6 sm:mb-8"
          >
            <span className="text-gray-700" style={{ fontWeight: 600 }}>{totalMastered}</span> de{' '}
            <span className="text-gray-700" style={{ fontWeight: 600 }}>{totalCards}</span> cards dominadas en total
          </motion.p>
        )}

        {/* ── Adaptive CTA banner ── */}
        {onStartAdaptive && mastery < 90 && stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mb-6 sm:mb-8 w-full max-w-[90vw] sm:max-w-sm bg-gradient-to-br from-teal-50/80 to-[#e6f5f1]/80 backdrop-blur-sm border border-teal-200/40 rounded-2xl p-4 sm:p-5 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles size={16} className="text-teal-500" />
              <span className="text-sm text-gray-800" style={{ fontWeight: 600 }}>
                Refuerza tus puntos d\u00E9biles
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Genera flashcards personalizadas con IA enfocadas en lo que m\u00E1s necesitas practicar
            </p>
            <button
              onClick={onStartAdaptive}
              className="px-5 py-2.5 rounded-xl bg-[#2a8c7a] text-white text-sm shadow-lg shadow-[#2a8c7a]/20 hover:shadow-[#2a8c7a]/30 hover:-translate-y-0.5 transition-all flex items-center gap-2 mx-auto"
              style={{ fontWeight: 600 }}
            >
              <Sparkles size={14} />
              Sesi\u00F3n Adaptativa
            </button>
          </motion.div>
        )}

        {/* Action buttons — stack on mobile */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
          <button onClick={onExit} className="px-6 py-3 rounded-full border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition-colors order-2 sm:order-1">
            Volver al Deck
          </button>
          <button
            onClick={onRestart}
            className="px-6 py-3 rounded-full text-white font-semibold shadow-lg hover:scale-105 hover:brightness-90 transition-all order-1 sm:order-2"
            style={{
              backgroundColor: summaryColor.hex,
              boxShadow: `0 8px 24px ${summaryColor.hex}40`,
            }}
          >
            Practicar de Nuevo
          </button>
        </div>
      </div>
    </motion.div>
  );
}