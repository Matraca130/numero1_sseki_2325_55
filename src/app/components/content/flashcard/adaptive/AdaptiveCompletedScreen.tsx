// AdaptiveCompletedScreen -- Final session summary
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Trophy, RotateCcw } from 'lucide-react';
import { getKeywordDeltaColorSafe, getDeltaColorClasses } from '@/app/lib/mastery-helpers';
import { MasteryRing } from '../MasteryRing';
import { computeMasteryPct, computeDeltaStats, countCorrect } from '@/app/lib/session-stats';
import { DeltaBadges } from './DeltaBadges';
import { RoundHistoryList } from './RoundHistoryList';
import type { RoundInfo } from '@/app/hooks/useAdaptiveSession';
import type { CardMasteryDelta } from '@/app/hooks/useFlashcardEngine';
import type { TopicMasterySummary } from '@/app/services/keywordMasteryApi';

export interface AdaptiveCompletedScreenProps {
  allStats: number[];
  completedRounds: RoundInfo[];
  masteryDeltas: CardMasteryDelta[];
  topicSummary: TopicMasterySummary | null;
  onRestart: () => void;
  onExit: () => void;
}

export function AdaptiveCompletedScreen({ allStats, completedRounds, masteryDeltas, topicSummary, onRestart, onExit }: AdaptiveCompletedScreenProps) {
  const totalReviews = allStats.length;
  const correctReviews = countCorrect(allStats);
  const totalRounds = completedRounds.length;
  const masteryPct = useMemo(() => computeMasteryPct(topicSummary, allStats), [topicSummary, allStats]);
  const deltaLevel = getKeywordDeltaColorSafe(masteryPct / 100, 2);
  const masteryColor = getDeltaColorClasses(deltaLevel);
  const deltaStats = useMemo(() => computeDeltaStats(masteryDeltas), [masteryDeltas]);
  const aiRounds = completedRounds.filter(r => r.source === 'ai').length;
  const profRounds = completedRounds.filter(r => r.source === 'professor').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full blur-3xl pointer-events-none" style={{ background: `radial-gradient(circle, ${masteryColor.hex}33 0%, ${masteryColor.hex}1A 50%, transparent 100%)` }} />
      <div className="relative z-10 flex flex-col items-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mb-6 shadow-xl shadow-teal-500/25">
          <Trophy size={40} className="text-teal-500" />
        </div>
        <h2 className="text-2xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>¡Sesión Completada!</h2>
        <p className="text-sm text-gray-500 mb-6">
          {totalReviews} flashcards en {totalRounds} {totalRounds === 1 ? 'ronda' : 'rondas'}
          {aiRounds > 0 && <span className="text-teal-500"> ({profRounds} profesor + {aiRounds} IA)</span>}
        </p>
        <div className="mb-8">
          <MasteryRing value={masteryPct / 100} size={120} stroke={8} color={masteryColor.hex} />
          <p className="text-xs text-gray-500 mt-2" style={{ fontWeight: 500 }}>Dominio general</p>
        </div>
        {deltaStats && <div className="mb-8"><DeltaBadges deltaStats={deltaStats} correctReviews={correctReviews} totalReviews={totalReviews} variant="pill" /></div>}
        {completedRounds.length > 1 && <div className="mb-8 w-full max-w-xs"><RoundHistoryList rounds={completedRounds} /></div>}
        <div className="flex items-center gap-4">
          <button onClick={onRestart} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-white/80 transition-colors" style={{ fontWeight: 500 }}><RotateCcw size={14} />Reiniciar</button>
          <button onClick={onExit} className="px-7 py-2.5 rounded-full bg-[#2a8c7a] text-white text-sm shadow-lg shadow-[#2a8c7a]/25 hover:bg-[#244e47] transition-colors" style={{ fontWeight: 600 }}>Finalizar</button>
        </div>
      </div>
    </motion.div>
  );
}
