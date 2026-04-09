// ============================================================
// DeltaBadges — Mastery change badges (shared sub-component)
//
// Extracted from AdaptivePartialSummary + AdaptiveCompletedScreen
// where this rendering logic was duplicated identically.
//
// Supports two visual variants:
//   - 'inline': compact text rows (used in PartialSummary)
//   - 'pill': rounded pill badges (used in CompletedScreen)
//
// STANDALONE: depends on react, clsx, lucide-react, session-stats.
// ============================================================

import React from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown, Star, CheckCircle } from 'lucide-react';
import type { DeltaStats } from '@/app/lib/session-stats';

export interface DeltaBadgesProps {
  deltaStats: DeltaStats;
  correctReviews: number;
  totalReviews: number;
  variant?: 'inline' | 'pill';
}

export function DeltaBadges({
  deltaStats,
  correctReviews,
  totalReviews,
  variant = 'inline',
}: DeltaBadgesProps) {
  const isPill = variant === 'pill';

  const wrapperCls = isPill
    ? 'flex flex-wrap items-center justify-center gap-3'
    : 'flex flex-col gap-2';

  const badgeCls = (color: string) =>
    isPill
      ? clsx(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border',
          color === 'emerald' && 'bg-emerald-50 border-emerald-200',
          color === 'amber' && 'bg-amber-50 border-amber-200',
          color === 'rose' && 'bg-rose-50 border-rose-200',
          color === 'gray' && 'bg-gray-50 border-gray-200',
        )
      : 'flex items-center gap-1.5 text-xs';

  const iconSize = isPill ? 14 : 13;

  return (
    <div className={wrapperCls}>
      {deltaStats.improved > 0 && (
        <div className={badgeCls('emerald')}>
          <TrendingUp size={iconSize} className="text-emerald-500" />
          <span
            className={clsx('text-emerald-700', isPill && 'text-xs')}
            style={{ fontWeight: 600, fontSize: isPill ? undefined : '0.75rem' }}
          >
            {deltaStats.improved} mejoraron
          </span>
        </div>
      )}
      {deltaStats.newlyMastered > 0 && (
        <div className={badgeCls('amber')}>
          <Star size={iconSize} className="text-amber-500" />
          <span
            className={clsx('text-amber-700', isPill && 'text-xs')}
            style={{ fontWeight: 600, fontSize: isPill ? undefined : '0.75rem' }}
          >
            {deltaStats.newlyMastered} {isPill ? 'dominadas' : 'nuevas dominadas'}
          </span>
        </div>
      )}
      {deltaStats.declined > 0 && (
        <div className={badgeCls('rose')}>
          <TrendingDown size={iconSize} className="text-rose-500" />
          <span
            className={clsx('text-rose-700', isPill && 'text-xs')}
            style={{ fontWeight: 600, fontSize: isPill ? undefined : '0.75rem' }}
          >
            {deltaStats.declined} bajaron
          </span>
        </div>
      )}
      <div className={badgeCls('gray')}>
        <CheckCircle size={iconSize} className="text-gray-400" />
        <span className={clsx(isPill ? 'text-xs text-gray-600' : 'text-gray-500')}
          style={{ fontSize: isPill ? undefined : '0.75rem' }}
        >
          {correctReviews}/{totalReviews} correctas
        </span>
      </div>
    </div>
  );
}
