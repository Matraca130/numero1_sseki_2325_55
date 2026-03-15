// ============================================================
// RoundHistoryList — Per-round breakdown (shared sub-component)
//
// Extracted from AdaptivePartialSummary + AdaptiveCompletedScreen.
// Displays a compact list of completed rounds with per-round
// correct/total counts and AI/Professor source badges.
//
// STANDALONE: depends on react, lucide-react, session-stats.
// ============================================================

import React from 'react';
import { Zap } from 'lucide-react';
import type { RoundInfo } from '@/app/hooks/useAdaptiveSession';
import { countCorrect } from '@/app/lib/session-stats';

// ── Types ─────────────────────────────────────────────────────

export interface RoundHistoryListProps {
  rounds: RoundInfo[];
  title?: string;
  bare?: boolean;
}

// ── Component ─────────────────────────────────────────────────

export function RoundHistoryList({
  rounds,
  title = 'Resumen por ronda',
  bare = false,
}: RoundHistoryListProps) {
  if (rounds.length <= 1) return null;

  const content = (
    <>
      <h4 className="text-xs text-gray-400 mb-2" style={{ fontWeight: 600 }}>
        {title}
      </h4>
      <div className="space-y-1.5">
        {rounds.map((round) => {
          const roundCorrect = countCorrect(round.ratings);
          return (
            <div
              key={round.roundNumber}
              className="flex items-center justify-between text-xs text-gray-500 px-2 py-1"
            >
              <div className="flex items-center gap-1.5">
                <Zap
                  size={10}
                  className={round.source === 'ai' ? 'text-violet-400' : 'text-[#2dd4a8]'}
                />
                <span>
                  Ronda {round.roundNumber}
                  {round.source === 'ai' && (
                    <span className="text-violet-400"> (IA)</span>
                  )}
                </span>
              </div>
              <span className="tabular-nums">
                {roundCorrect}/{round.cardCount} correctas
              </span>
            </div>
          );
        })}
      </div>
    </>
  );

  if (bare) return content;

  return (
    <div className="w-full bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/60 p-3">
      {content}
    </div>
  );
}
