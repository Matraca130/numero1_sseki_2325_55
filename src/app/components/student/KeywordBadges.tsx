// ============================================================
// Axon — KeywordBadges (Student: clickable keyword chips)
//
// Renders keywords for a summary as mastery-colored badges.
// Click opens KeywordPopup (hub central) via SmartPopup.
//
// S1 migration: keyword + BKT + subtopics data now comes from
// useKeywordMasteryQuery (React Query). This eliminates 5
// useState + 2 useEffect + 1 useCallback of manual fetching
// and shares cache with KeywordHighlighterInline.
//
// Mastery color = AVG(subtopics BKT p_know):
//   >= 0.80 | >= 0.50 | < 0.50 | sin datos
// ============================================================
import React, { useState } from 'react';
import { Tag, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { SmartPopup } from './SmartPopup';
import { KeywordPopup } from './KeywordPopup';
import { MasteryIndicator } from '@/app/components/shared/MasteryIndicator';
import {
  getMasteryColor,
  getMasteryTailwind,
} from '@/app/lib/mastery-helpers';
import { useKeywordMasteryQuery } from '@/app/hooks/queries/useKeywordMasteryQuery';

interface KeywordBadgesProps {
  summaryId: string;
  /** Navigate to another keyword's summary (from connection click) */
  onNavigateKeyword?: (keywordId: string, summaryId: string) => void;
}

export function KeywordBadges({ summaryId, onNavigateKeyword }: KeywordBadgesProps) {
  const [openKeywordId, setOpenKeywordId] = useState<string | null>(null);

  // ── React Query: keywords + BKT + subtopics → mastery ──
  const {
    keywords,
    keywordsLoading,
    bktMap,
    keywordMasteryMap,
    dataReady,
  } = useKeywordMasteryQuery(summaryId);

  // ── Badge color helper ──────────────────────────────────
  function getBadgeClasses(kwId: string): string {
    if (!dataReady) {
      return 'bg-zinc-500/20 text-zinc-400';
    }
    const mastery = keywordMasteryMap.get(kwId) ?? -1;
    if (mastery < 0) {
      return 'bg-zinc-500/20 text-zinc-400';
    }
    const color = getMasteryColor(mastery);
    const tw = getMasteryTailwind(color);
    return `${tw.bgLight} ${tw.textDark}`;
  }

  function getBadgeHoverClasses(kwId: string): string {
    if (!dataReady) return 'hover:bg-zinc-500/30 hover:text-zinc-300';
    const mastery = keywordMasteryMap.get(kwId) ?? -1;
    if (mastery < 0) return 'hover:bg-zinc-500/30 hover:text-zinc-300';
    const color = getMasteryColor(mastery);
    switch (color) {
      case 'green':  return 'hover:bg-emerald-500/30 hover:text-emerald-300';
      case 'yellow': return 'hover:bg-amber-500/30 hover:text-amber-300';
      case 'red':    return 'hover:bg-red-500/30 hover:text-red-300';
      default:       return 'hover:bg-zinc-500/30 hover:text-zinc-300';
    }
  }

  function getBadgeRingClass(kwId: string): string {
    if (!dataReady) return 'focus:ring-zinc-500/30';
    const mastery = keywordMasteryMap.get(kwId) ?? -1;
    if (mastery < 0) return 'focus:ring-zinc-500/30';
    const color = getMasteryColor(mastery);
    switch (color) {
      case 'green':  return 'focus:ring-emerald-500/30';
      case 'yellow': return 'focus:ring-amber-500/30';
      case 'red':    return 'focus:ring-red-500/30';
      default:       return 'focus:ring-zinc-500/30';
    }
  }

  if (keywordsLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag size={14} className="text-violet-500" />
          <span className="text-sm text-gray-700">Palabras clave</span>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-gray-400" />
          <span className="text-xs text-gray-400">Cargando keywords...</span>
        </div>
      </div>
    );
  }

  if (keywords.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag size={14} className="text-violet-500" />
          <span className="text-sm text-gray-700">Palabras clave</span>
        </div>
        <div className="text-center py-4">
          <Tag size={20} className="text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400">No hay keywords en este resumen</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Tag size={14} className="text-violet-500" />
        <span className="text-sm text-gray-700">Palabras clave</span>
        <span className="text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
          {keywords.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {keywords.map(kw => {
          const mastery = keywordMasteryMap.get(kw.id) ?? -1;
          return (
            <SmartPopup
              key={kw.id}
              open={openKeywordId === kw.id}
              onOpenChange={(open) => setOpenKeywordId(open ? kw.id : null)}
              trigger={
                <button
                  data-mastery={mastery < 0 ? 'none' : mastery.toFixed(2)}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-transparent',
                    'active:scale-95',
                    getBadgeClasses(kw.id),
                    getBadgeHoverClasses(kw.id),
                    getBadgeRingClass(kw.id),
                  )}
                >
                  <MasteryIndicator pMastery={mastery} size="sm" variant="dot" showTooltip={false} />
                  {kw.name}
                </button>
              }
            >
              <KeywordPopup
                keyword={kw}
                allKeywords={keywords}
                bktMap={bktMap}
                onClose={() => setOpenKeywordId(null)}
                onNavigateKeyword={onNavigateKeyword}
              />
            </SmartPopup>
          );
        })}
      </div>
    </div>
  );
}