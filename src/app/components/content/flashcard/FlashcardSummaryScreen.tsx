// ============================================================
// FlashcardSummaryScreen -- Post-session summary with AI gen
//
// PHASE 3: Fully decoupled from contexts and API services.
//   - Removed useStudentDataContext (studentId baked into callback)
//   - Removed getTopicKeywords / getCourseKeywords imports
//   - New prop: onLoadKeywords callback (optional)
// PHASE 8a: Dynamic boxShadow on CTA button matches mastery color.
//
// STANDALONE: depends on react, motion/react, lucide-react,
//   SmartFlashcardGenerator (UI component), KeywordCollection type.
// ============================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Sparkles, Activity, TrendingUp, TrendingDown, Star } from 'lucide-react';
import { SmartFlashcardGenerator } from '@/app/components/ai/SmartFlashcardGenerator';
import type { KeywordCollection } from '@/app/types/keywords';
import type { CardMasteryDelta } from '@/app/hooks/useFlashcardEngine';
import { getMasteryColorFromPct } from './mastery-colors';

// ── Types ─────────────────────────────────────────────────

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
  /**
   * Callback to load keywords for the AI generator.
   * The caller should bake in studentId via closure.
   * Returns `{ keywords: KeywordCollection }`.
   * If omitted, the AI button opens with empty keywords.
   */
  onLoadKeywords?: (
    courseId: string,
    topicId: string | null,
  ) => Promise<{ keywords: KeywordCollection }>;
}

// ── Component ─────────────────────────────────────────────

export function SummaryScreen({
  stats,
  onRestart,
  courseColor,
  courseId,
  courseName,
  topicId,
  topicTitle,
  onExit,
  realMasteryPercent,
  totalMastered,
  totalCards,
  masteryDeltas,
  onLoadKeywords,
}: SummaryScreenProps) {
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
      // "mastered" = p_know crossed 0.75 threshold
      if (d.before < 0.75 && d.after >= 0.75) newlyMastered++;
    }
    return { improved, declined, newlyMastered, total: masteryDeltas.length };
  })();

  // AI Flashcard Generator state
  const [showGenerator, setShowGenerator] = useState(false);
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [keywords, setKeywords] = useState<KeywordCollection | null>(null);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);

  const handleOpenGenerator = async () => {
    // If no callback provided, open with empty keywords
    if (!onLoadKeywords) {
      setKeywords({});
      setShowGenerator(true);
      return;
    }

    setLoadingKeywords(true);
    setKeywordsError(null);
    try {
      const data = await onLoadKeywords(courseId, topicId);
      const kw = (data?.keywords || {}) as KeywordCollection;
      setKeywords(kw);
      setShowGenerator(true);
    } catch (err: any) {
      console.error('[SummaryScreen] Error loading keywords:', err);
      // If no keywords exist yet, use empty collection so generator can still work
      if (err?.status === 404 || err?.message?.includes('404')) {
        setKeywords({});
        setShowGenerator(true);
      } else {
        setKeywordsError('N\u00E3o foi poss\u00EDvel carregar as keywords. Tente novamente.');
      }
    } finally {
      setLoadingKeywords(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full bg-surface-dashboard p-8 text-center relative overflow-hidden"
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

        <h2 className="text-3xl font-bold text-gray-900 mb-2">Sesi{'\u00F3n'} Completada!</h2>
        <p className="text-gray-500 mb-8 max-w-md">
          Completaste {stats.length} flashcards con un dominio estimado de:
        </p>

        <div className="relative w-48 h-48 flex items-center justify-center mb-10">
          <svg className="w-full h-full transform -rotate-90">
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
            <span className="text-4xl font-bold text-gray-900">{mastery.toFixed(0)}%</span>
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Dominio</span>
          </div>
        </div>

        {/* ── Session Delta Stats ── */}
        {deltaStats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-4 mb-8"
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
            className="text-sm text-gray-500 mb-8"
          >
            <span className="text-gray-700" style={{ fontWeight: 600 }}>{totalMastered}</span> de{' '}
            <span className="text-gray-700" style={{ fontWeight: 600 }}>{totalCards}</span> cards dominadas en total
          </motion.p>
        )}

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-4">
            <button onClick={onExit} className="px-6 py-3 rounded-full border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
              Volver al Deck
            </button>
            <button
              onClick={onRestart}
              className="px-6 py-3 rounded-full text-white font-semibold shadow-lg hover:scale-105 hover:brightness-90 transition-all"
              style={{
                backgroundColor: summaryColor.hex,
                boxShadow: `0 8px 24px ${summaryColor.hex}40`,
              }}
            >
              Practicar de Nuevo
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full max-w-xs my-1">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">o</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* AI Generate button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            onClick={handleOpenGenerator}
            disabled={loadingKeywords}
            className="group flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-gradient-to-r from-[#ec43ef] to-[#b830e8] text-white font-semibold shadow-lg shadow-[#ec43ef]/20 hover:shadow-xl hover:shadow-[#ec43ef]/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative flex items-center gap-2.5">
              {loadingKeywords ? (
                <>
                  <Activity size={16} className="animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Gerar Novos Flashcards com IA
                </>
              )}
            </span>
          </motion.button>

          {keywordsError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-rose-500 mt-1"
            >
              {keywordsError}
            </motion.p>
          )}

          <p className="text-[11px] text-gray-400 max-w-xs">
            La IA analiza tus gaps de conocimiento y genera flashcards enfocados en las keywords que m{'\u00E1s'} necesitan refuerzo
          </p>
        </div>
      </div>

      {/* Smart Flashcard Generator Modal */}
      <AnimatePresence>
        {showGenerator && keywords !== null && (
          <SmartFlashcardGenerator
            courseId={courseId}
            topicId={topicId || courseId}
            courseName={courseName}
            topicTitle={topicTitle || courseName}
            keywords={keywords}
            onFlashcardsGenerated={(flashcards, updatedKeywords) => {
              if (import.meta.env.DEV) {
                console.log(`[SummaryScreen] Generated ${flashcards.length} flashcards`);
              }
              setKeywords(updatedKeywords);
            }}
            onClose={() => setShowGenerator(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}