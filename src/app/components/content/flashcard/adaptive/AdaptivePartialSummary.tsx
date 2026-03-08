// ============================================================
// AdaptivePartialSummary — Between-rounds summary screen
//
// Shown during the 'partial-summary' phase of useAdaptiveSession.
// The student sees their progress and decides:
//   a) Generate more AI flashcards  → calls onGenerateMore(count)
//   b) Finish the session           → calls onFinish()
//
// DESIGN DECISIONS:
//   1. NOT a modal: It's a full view (consistent with SummaryScreen)
//      replacing the session screen in the AnimatePresence flow.
//   2. NOT reusing SummaryScreen: SummaryScreen shows "Sesi\u00F3n
//      Completada!" + Trophy which implies finality. This screen
//      has a different tone: "Round complete, want more?"
//   3. Keyword mastery panel included: Shows the student WHY the
//      AI will target specific areas (transparency builds trust).
//   4. Count selector inline (not modal): Reduces friction.
//      One click to select count, one click to generate.
//   5. Last generation stats shown: If the student already
//      generated once, show "10 cards generated, 3 unique keywords"
//      to set expectations for the next batch.
//
// EDGE CASES:
//   - First round (no AI yet): hides last-generation stats section
//   - All keywords mastered: shows celebration, still allows generate
//   - Generation failed completely last time: shows error context
//   - masteryLoading: skeleton for keyword panel, rest interactive
//   - 0 allStats (shouldn't happen): defensive guard
//
// STANDALONE: depends on react, motion/react, clsx, lucide-react,
//   MasteryRing + mastery-colors from parent folder, plus:
//   AdaptiveKeywordPanel, AdaptiveCountSelector from this folder.
// ============================================================

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';
import {
  Sparkles,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Star,
  LogOut,
  Zap,
} from 'lucide-react';
import { getMasteryColorFromPct } from '../mastery-colors';
import { MasteryRing } from '../MasteryRing';
import { AdaptiveKeywordPanel } from './AdaptiveKeywordPanel';
import { AdaptiveCountSelector } from './AdaptiveCountSelector';
import type { KeywordMasteryMap, TopicMasterySummary } from '@/app/services/keywordMasteryApi';
import type { AdaptiveGenerationResult } from '@/app/services/adaptiveGenerationApi';
import type { RoundInfo } from '@/app/hooks/useAdaptiveSession';
import type { CardMasteryDelta } from '@/app/hooks/useFlashcardEngine';

// ── Types ─────────────────────────────────────────────────

export interface AdaptivePartialSummaryProps {
  /** All ratings across all completed rounds */
  allStats: number[];
  /** Completed round history */
  completedRounds: RoundInfo[];

  /** Keyword mastery data (from Phase 1) */
  keywordMastery: KeywordMasteryMap;
  topicSummary: TopicMasterySummary | null;
  masteryLoading: boolean;

  /** Per-card mastery deltas for stats display */
  masteryDeltas: CardMasteryDelta[];

  /** Result from last AI generation (null if never generated) */
  lastGenerationResult: AdaptiveGenerationResult | null;

  /** Callback: generate more cards with count */
  onGenerateMore: (count: number) => void;
  /** Callback: finish the entire session */
  onFinish: () => void;
}

// ── Component ────────────────────────────────────────────

export function AdaptivePartialSummary({
  allStats,
  completedRounds,
  keywordMastery,
  topicSummary,
  masteryLoading,
  masteryDeltas,
  lastGenerationResult,
  onGenerateMore,
  onFinish,
}: AdaptivePartialSummaryProps) {
  const [selectedCount, setSelectedCount] = useState(10);
  const [isFinishing, setIsFinishing] = useState(false);

  // ── Derived stats ──
  const totalReviews = allStats.length;
  const correctReviews = allStats.filter(s => s >= 3).length;

  // Overall mastery from keyword data or rating fallback
  const masteryPct = useMemo(() => {
    if (topicSummary && topicSummary.keywordsTotal > 0) {
      return Math.round(topicSummary.overallMastery * 100);
    }
    // Fallback: average rating → percentage
    if (totalReviews === 0) return 0;
    const avg = allStats.reduce((a, b) => a + b, 0) / totalReviews;
    return Math.round((avg / 5) * 100);
  }, [topicSummary, allStats, totalReviews]);

  const masteryColor = getMasteryColorFromPct(masteryPct / 100);

  // Delta stats from all rounds
  const deltaStats = useMemo(() => {
    if (masteryDeltas.length === 0) return null;
    let improved = 0;
    let declined = 0;
    let newlyMastered = 0;
    for (const d of masteryDeltas) {
      if (d.after > d.before) improved++;
      else if (d.after < d.before) declined++;
      if (d.before < 0.75 && d.after >= 0.75) newlyMastered++;
    }
    return { improved, declined, newlyMastered, total: masteryDeltas.length };
  }, [masteryDeltas]);

  // Latest round info
  const latestRound = completedRounds[completedRounds.length - 1] ?? null;
  const totalRounds = completedRounds.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full bg-surface-dashboard relative overflow-hidden"
    >
      {/* Ambient glow matching mastery color */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${masteryColor.hex}20 0%, ${masteryColor.hex}08 50%, transparent 100%)`,
        }}
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-lg mx-auto px-6 py-8">

          {/* ── Header ── */}
          <div className="text-center mb-8">
            {/* Round badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-gray-200/60 text-xs text-gray-600 mb-4"
              style={{ fontWeight: 500 }}
            >
              <Zap size={12} className={latestRound?.source === 'ai' ? 'text-violet-500' : 'text-teal-500'} />
              Ronda {totalRounds} completada
              {latestRound?.source === 'ai' && (
                <span className="text-violet-500" style={{ fontWeight: 600 }}> (IA)</span>
              )}
            </motion.div>

            <h2 className="text-2xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
              \u00A1Buen trabajo!
            </h2>
            <p className="text-sm text-gray-500">
              Revisaste {totalReviews} flashcards en {totalRounds} {totalRounds === 1 ? 'ronda' : 'rondas'}
            </p>
          </div>

          {/* ── Mastery ring + delta stats ── */}
          <div className="flex items-center justify-center gap-8 mb-8">
            {/* Ring */}
            <div className="flex flex-col items-center">
              <MasteryRing
                value={masteryPct / 100}
                size={80}
                stroke={6}
                color={masteryColor.hex}
              />
              <span className="text-xs text-gray-500 mt-2" style={{ fontWeight: 500 }}>
                Dominio general
              </span>
            </div>

            {/* Delta badges */}
            {deltaStats && (
              <div className="flex flex-col gap-2">
                {deltaStats.improved > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <TrendingUp size={13} className="text-emerald-500" />
                    <span className="text-emerald-700" style={{ fontWeight: 600 }}>
                      {deltaStats.improved} mejoraron
                    </span>
                  </div>
                )}
                {deltaStats.newlyMastered > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Star size={13} className="text-amber-500" />
                    <span className="text-amber-700" style={{ fontWeight: 600 }}>
                      {deltaStats.newlyMastered} nuevas dominadas
                    </span>
                  </div>
                )}
                {deltaStats.declined > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <TrendingDown size={13} className="text-rose-500" />
                    <span className="text-rose-700" style={{ fontWeight: 600 }}>
                      {deltaStats.declined} bajaron
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs">
                  <CheckCircle size={13} className="text-gray-400" />
                  <span className="text-gray-500">
                    {correctReviews}/{totalReviews} correctas
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Keyword mastery panel ── */}
          <div className="mb-8">
            <AdaptiveKeywordPanel
              keywordMastery={keywordMastery}
              topicSummary={topicSummary}
              loading={masteryLoading}
            />
          </div>

          {/* ── Last generation context ── */}
          {lastGenerationResult && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 px-4 py-3 bg-violet-50/60 border border-violet-200/60 rounded-xl"
            >
              <div className="flex items-start gap-2">
                <Sparkles size={14} className="text-violet-500 mt-0.5 shrink-0" />
                <div className="text-xs text-violet-700">
                  <span style={{ fontWeight: 600 }}>
                    \u00DAltima generaci\u00F3n:
                  </span>{' '}
                  {lastGenerationResult.stats.generated} cards creadas
                  {lastGenerationResult.stats.uniqueKeywords > 0 && (
                    <> sobre {lastGenerationResult.stats.uniqueKeywords} keywords</>
                  )}
                  {lastGenerationResult.stats.failed > 0 && (
                    <span className="text-amber-600">
                      {' '}({lastGenerationResult.stats.failed} fallaron)
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Generate More section ── */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-teal-500" />
              <h3 className="text-sm text-gray-800" style={{ fontWeight: 600 }}>
                Generar m\u00E1s con IA
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              La IA crear\u00E1 flashcards enfocadas en tus \u00E1reas m\u00E1s d\u00E9biles
              {topicSummary && topicSummary.weakestKeywords.length > 0 && (
                <>, especialmente{' '}
                <span className="text-gray-700" style={{ fontWeight: 500 }}>
                  {topicSummary.weakestKeywords.slice(0, 2).map(kw => kw.name).join(', ')}
                </span>
                </>
              )}
            </p>

            <div className="flex items-center justify-between gap-4">
              <AdaptiveCountSelector
                value={selectedCount}
                onChange={setSelectedCount}
              />
              <button
                onClick={() => onGenerateMore(selectedCount)}
                disabled={isFinishing}
                className={clsx(
                  "px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm shadow-md shadow-teal-600/25 hover:bg-teal-700 hover:-translate-y-0.5 transition-all flex items-center gap-2",
                  isFinishing && "opacity-50 cursor-not-allowed"
                )}
                style={{ fontWeight: 600 }}
              >
                <Sparkles size={14} />
                Generar
              </button>
            </div>
          </div>

          {/* ── Finish button ── */}
          <button
            onClick={() => {
              setIsFinishing(true);
              onFinish();
            }}
            disabled={isFinishing}
            className={clsx(
              "w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors",
              isFinishing && "opacity-50 cursor-not-allowed"
            )}
            style={{ fontWeight: 500 }}
          >
            <LogOut size={14} />
            {isFinishing ? 'Finalizando...' : 'Finalizar sesi\u00F3n'}
          </button>

          {/* ── Round history (compact) ── */}
          {completedRounds.length > 1 && (
            <div className="mt-6 pt-4 border-t border-gray-200/60">
              <h4 className="text-xs text-gray-400 mb-2" style={{ fontWeight: 600 }}>
                Historial de rondas
              </h4>
              <div className="space-y-1.5">
                {completedRounds.map((round) => {
                  const roundCorrect = round.ratings.filter(r => r >= 3).length;
                  return (
                    <div
                      key={round.roundNumber}
                      className="flex items-center justify-between text-xs text-gray-500 px-2 py-1"
                    >
                      <div className="flex items-center gap-1.5">
                        <Zap
                          size={10}
                          className={round.source === 'ai' ? 'text-violet-400' : 'text-teal-400'}
                        />
                        <span>
                          Ronda {round.roundNumber}
                          {round.source === 'ai' && <span className="text-violet-400"> (IA)</span>}
                        </span>
                      </div>
                      <span className="tabular-nums">
                        {roundCorrect}/{round.cardCount} correctas
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
