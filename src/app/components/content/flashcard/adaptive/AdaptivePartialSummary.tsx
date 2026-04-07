// ============================================================
// AdaptivePartialSummary — Between-rounds summary screen
// ============================================================

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';
import {
  Sparkles,
  LogOut,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { getMasteryColorFromPct } from '../mastery-colors';
import { MasteryRing } from '../MasteryRing';
import { AdaptiveKeywordPanel } from './AdaptiveKeywordPanel';
import { AdaptiveCountSelector } from './AdaptiveCountSelector';
import { DeltaBadges } from './DeltaBadges';
import { RoundHistoryList } from './RoundHistoryList';
import { computeMasteryPct, computeDeltaStats, countCorrect } from '@/app/lib/session-stats';
import type { KeywordMasteryMap, TopicMasterySummary } from '@/app/services/keywordMasteryApi';
import type { AdaptiveGenerationResult } from '@/app/services/adaptiveGenerationApi';
import type { RoundInfo } from '@/app/hooks/useAdaptiveSession';
import type { CardMasteryDelta } from '@/app/hooks/useFlashcardEngine';

export interface AdaptivePartialSummaryProps {
  allStats: number[];
  completedRounds: RoundInfo[];
  keywordMastery: KeywordMasteryMap;
  topicSummary: TopicMasterySummary | null;
  masteryLoading: boolean;
  masteryDeltas: CardMasteryDelta[];
  lastGenerationResult: AdaptiveGenerationResult | null;
  generationError?: string | null;
  onGenerateMore: (count: number) => void;
  onFinish: () => void;
}

export function AdaptivePartialSummary({
  allStats,
  completedRounds,
  keywordMastery,
  topicSummary,
  masteryLoading,
  masteryDeltas,
  lastGenerationResult,
  generationError,
  onGenerateMore,
  onFinish,
}: AdaptivePartialSummaryProps) {
  const [selectedCount, setSelectedCount] = useState(10);
  const [isFinishing, setIsFinishing] = useState(false);

  const totalReviews = allStats.length;
  const correctReviews = countCorrect(allStats);

  const masteryPct = useMemo(
    () => computeMasteryPct(topicSummary, allStats),
    [topicSummary, allStats],
  );

  const masteryColor = getMasteryColorFromPct(masteryPct / 100);

  const deltaStats = useMemo(
    () => computeDeltaStats(masteryDeltas),
    [masteryDeltas],
  );

  const latestRound = completedRounds[completedRounds.length - 1] ?? null;
  const totalRounds = completedRounds.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full bg-surface-dashboard relative overflow-hidden"
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${masteryColor.hex}20 0%, ${masteryColor.hex}08 50%, transparent 100%)`,
        }}
      />

      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-lg mx-auto px-6 py-8">

          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-gray-200/60 text-xs text-gray-600 mb-4"
              style={{ fontWeight: 500 }}
            >
              <Zap size={12} className={latestRound?.source === 'ai' ? 'text-violet-500' : 'text-[#2a8c7a]'} />
              Ronda {totalRounds} completada
              {latestRound?.source === 'ai' && (
                <span className="text-violet-500" style={{ fontWeight: 600 }}> (IA)</span>
              )}
            </motion.div>

            <h2 className="text-2xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
              {'\u00A1'}Buen trabajo!
            </h2>
            <p className="text-sm text-gray-500">
              Revisaste {totalReviews} flashcards en {totalRounds} {totalRounds === 1 ? 'ronda' : 'rondas'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-8 mb-8">
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
            {deltaStats && (
              <DeltaBadges
                deltaStats={deltaStats}
                correctReviews={correctReviews}
                totalReviews={totalReviews}
              />
            )}
          </div>

          <div className="mb-8">
            <AdaptiveKeywordPanel
              keywordMastery={keywordMastery}
              topicSummary={topicSummary}
              loading={masteryLoading}
            />
          </div>

          {generationError && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 px-4 py-3 bg-rose-50/60 border border-rose-200/60 rounded-xl"
            >
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                <span className="text-xs text-rose-700" style={{ fontWeight: 500 }}>
                  {generationError}
                </span>
              </div>
            </motion.div>
          )}

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
                    {'\u00DA'}ltima generaci{'\u00F3'}n:
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

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-[#2a8c7a]" />
              <h3 className="text-sm text-gray-800" style={{ fontWeight: 600 }}>
                Generar m{'\u00E1'}s con IA
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              La IA crear{'\u00E1'} flashcards enfocadas en tus {'\u00E1'}reas m{'\u00E1'}s d{'\u00E9'}biles
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
                  "px-5 py-2.5 rounded-xl bg-[#2a8c7a] text-white text-sm shadow-md shadow-[#2a8c7a]/25 hover:bg-[#244e47] hover:-translate-y-0.5 transition-all flex items-center gap-2",
                  isFinishing && "opacity-50 cursor-not-allowed"
                )}
                style={{ fontWeight: 600 }}
              >
                <Sparkles size={14} />
                Generar
              </button>
            </div>
          </div>

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
            {isFinishing ? 'Finalizando...' : `Finalizar sesi${'\u00F3'}n`}
          </button>

          {completedRounds.length > 1 && (
            <div className="mt-6 pt-4 border-t border-gray-200/60">
              <RoundHistoryList rounds={completedRounds} title="Historial de rondas" bare />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
