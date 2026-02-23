// ============================================================
// MasteryBadges — Shared mastery stats display
// Used by Hub, Section, and Deck screens
// ============================================================

import React from 'react';
import type { MasteryStats } from '@/app/hooks/flashcard-types';

interface MasteryBadgesProps {
  stats: MasteryStats;
  /** Compact mode for tight spaces */
  compact?: boolean;
  className?: string;
}

const BADGES = [
  { key: 'mastered', field: 'mastered' as const, dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'dominados' },
  { key: 'learning', field: 'learning' as const, dot: 'bg-amber-500', text: 'text-amber-600', label: 'aprendendo' },
  { key: 'new', field: 'newCards' as const, dot: 'bg-rose-500', text: 'text-rose-600', label: 'a revisar' },
] as const;

export function MasteryBadges({ stats, compact, className = '' }: MasteryBadgesProps) {
  const gap = compact ? 'gap-3' : 'gap-5';
  return (
    <div className={`flex items-center ${gap} ${className}`}>
      {BADGES.map(b => (
        <div key={b.key} className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${b.dot}`} />
          <span className="text-xs text-gray-500">
            <span className={`${b.text} font-semibold`}>{stats[b.field]}</span> {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}
