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
// Phase 2: Migrated to Delta Mastery color system. Badge colors
// now use getDeltaColorClasses via keywordDeltaColorMap.
// ============================================================
import React, { useState } from 'react';
import { Tag, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { SmartPopup } from './SmartPopup';
import { KeywordPopup } from './KeywordPopup';
import { MasteryIndicator } from '@/app/components/shared/MasteryIndicator';
import { getDeltaColorClasses, type DeltaColorLevel } from '@/app/lib/mastery-helpers';
import { useKeywordMasteryQuery } from '@/app/hooks/queries/useKeywordMasteryQuery';

interface KeywordBadgesProps {
  summaryId: string;
  /** Navigate to another keyword's summary (from connection click) */
  onNavigateKeyword?: (keywordId: string, summaryId: string) => void;
}

export function KeywordBadges({ summaryId, onNavigateKeyword }: KeywordBadgesProps) {
  const [openKeywordId, setOpenKeywordId] = useState<string | null>(null);

  // ── React Query: keywords + BKT + subtopics -> mastery ──
  const {
    keywords,
    keywordsLoading,
    bktMap,
    keywordMasteryMap,
    keywordDeltaColorMap,
    dataReady,
  } = useKeywordMasteryQuery(summaryId);

  // ── Badge style helper (unified Delta colors) ──────────
  function getBadgeStyles(kwId: string): { base: string; hover: string; ring: string } {
    if (!dataReady) {
      return {
        base: 'bg-zinc-500/20 text-zinc-400',
        hover: 'hover:bg-zinc-500/30 hover:text-zinc-300',
        ring: 'focus:ring-zinc-500/30',
      };
    }
    const level: DeltaColorLevel = keywordDeltaColorMap.get(kwId) ?? 'gray';
    const dc = getDeltaColorClasses(level);
    return {
      base: `${dc.bgLight} ${dc.text}`,
      hover: dc.hoverBg,
      ring: `focus:${dc.ring}`,
    };
  }

  if (keywordsLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag size={14} className="text-teal-500" />
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
          <Tag size={14} className="text-teal-500" />
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
        <Tag size={14} className="text-teal-500" />
        <span className="text-sm text-gray-700">Palabras clave</span>
        <span className="text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
          {keywords.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {keywords.map(kw => {
          const mastery = keywordMasteryMap.get(kw.id) ?? -1;
          const deltaLevel: DeltaColorLevel = keywordDeltaColorMap.get(kw.id) ?? 'gray';
          const styles = getBadgeStyles(kw.id);
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
                    styles.base,
                    styles.hover,
                    styles.ring,
                  )}
                >
                  <MasteryIndicator deltaLevel={deltaLevel} pMastery={mastery} size="sm" variant="dot" showTooltip={false} />
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
