// ============================================================
// SidebarFooter — Card stats + mastery breakdown
//
// Shows total cards, due count, and color-coded mastery breakdown.
// Receives data from useTopicProgress via parent.
// ============================================================

import { Zap } from 'lucide-react';
import type { TopicProgress } from '@/app/hooks/useTopicProgress';

interface SidebarFooterProps {
  progressMap: Map<string, TopicProgress>;
}

export function SidebarFooter({ progressMap }: SidebarFooterProps) {
  // Aggregate stats from all topics
  let totalCards = 0;
  let dueCards = 0;
  let masteredCards = 0;
  let learningCards = 0;
  let newCards = 0;

  for (const p of progressMap.values()) {
    totalCards += p.totalCards;
    dueCards += p.dueCards;
    // Rough breakdown: use status to bucket
    if (p.status === 'mastered') masteredCards += p.totalCards;
    else if (p.status === 'learning') learningCards += p.totalCards;
    else newCards += p.totalCards;
  }

  return (
    <div className="px-4 py-2.5 border-t border-zinc-200 bg-zinc-50/60">
      <div className="flex items-center justify-between text-[10px] text-zinc-400">
        <span>
          {totalCards} flashcards
          {dueCards > 0 && (
            <span className="text-amber-600 ml-1">({dueCards} pendientes)</span>
          )}
        </span>
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {masteredCards}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {learningCards}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
            {newCards}
          </span>
        </div>
      </div>
    </div>
  );
}
