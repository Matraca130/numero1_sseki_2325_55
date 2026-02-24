// ============================================================
// Axon — KeywordBadges (Student: clickable keyword chips)
//
// Fetches keywords for a summary and renders them as badges.
// Click opens KeywordPopup (hub central).
// Uses Radix Popover for click-outside + Escape close behavior.
//
// Routes (all FLAT):
//   GET /keywords?summary_id=xxx
//   GET /bkt-states (scopeToUser, batch — ONE call)
//   GET /subtopics?keyword_id=xxx (per keyword, for mastery calc)
//
// Mastery color = AVG(subtopics BKT p_know):
//   🟢>=0.80 | 🟡>=0.50 | 🔴<0.50 | ⚪ sin datos
// ============================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { Tag, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/app/components/ui/popover';
import { KeywordPopup } from './KeywordPopup';
import { MasteryIndicator } from '@/app/components/shared/MasteryIndicator';
import { apiCall } from '@/app/lib/api';
import * as summariesApi from '@/app/services/summariesApi';
import type { SummaryKeyword, Subtopic } from '@/app/services/summariesApi';
import {
  type BktState,
  getKeywordMastery,
  getMasteryColor,
  getMasteryTailwind,
} from '@/app/lib/mastery-helpers';

// ── Helper ────────────────────────────────────────────────
function extractItems<T>(result: any): T[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

interface KeywordBadgesProps {
  summaryId: string;
  /** Navigate to another keyword's summary (from connection click) */
  onNavigateKeyword?: (keywordId: string, summaryId: string) => void;
}

export function KeywordBadges({ summaryId, onNavigateKeyword }: KeywordBadgesProps) {
  const [keywords, setKeywords] = useState<SummaryKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [openKeywordId, setOpenKeywordId] = useState<string | null>(null);

  // BKT batch state: Map<subtopic_id, BktState>
  const [bktMap, setBktMap] = useState<Map<string, BktState>>(new Map());
  // Subtopics per keyword: Map<keyword_id, Subtopic[]>
  const [subtopicsMap, setSubtopicsMap] = useState<Map<string, Subtopic[]>>(new Map());
  const [masteryReady, setMasteryReady] = useState(false);

  // ── Fetch keywords ──────────────────────────────────────
  const fetchKeywords = useCallback(async () => {
    setLoading(true);
    try {
      const result = await summariesApi.getKeywords(summaryId);
      setKeywords(
        extractItems<SummaryKeyword>(result).filter(k => k.is_active !== false)
      );
    } catch (err: any) {
      console.error('[KeywordBadges] fetch error:', err);
      setKeywords([]);
    } finally {
      setLoading(false);
    }
  }, [summaryId]);

  useEffect(() => { fetchKeywords(); }, [fetchKeywords]);

  // ── Batch fetch BKT states (ONE call, scopeToUser) ──────
  useEffect(() => {
    if (keywords.length === 0) return;
    let cancelled = false;

    (async () => {
      try {
        // 1. Batch GET all bkt_states for this student
        const bktResult = await apiCall<any>('/bkt-states');
        const bktItems = extractItems<BktState>(bktResult);
        const map = new Map<string, BktState>();
        for (const b of bktItems) {
          map.set(b.subtopic_id, b);
        }
        if (!cancelled) setBktMap(map);

        // 2. Fetch subtopics per keyword (parallel, not N+1 on bkt)
        const subtopicPromises = keywords.map(async kw => {
          try {
            const result = await summariesApi.getSubtopics(kw.id);
            return {
              keywordId: kw.id,
              subtopics: extractItems<Subtopic>(result).filter(s => s.is_active !== false),
            };
          } catch {
            return { keywordId: kw.id, subtopics: [] };
          }
        });

        const subtopicResults = await Promise.all(subtopicPromises);
        if (!cancelled) {
          const sMap = new Map<string, Subtopic[]>();
          for (const r of subtopicResults) {
            sMap.set(r.keywordId, r.subtopics);
          }
          setSubtopicsMap(sMap);
          setMasteryReady(true);
        }
      } catch {
        // BKT fetch failed — show gray (no crash)
        if (!cancelled) {
          setBktMap(new Map());
          setMasteryReady(true);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [keywords]);

  // ── Compute mastery per keyword ─────────────────────────
  const keywordMasteryMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const kw of keywords) {
      const subs = subtopicsMap.get(kw.id) || [];
      const bkts = subs
        .map(s => bktMap.get(s.id))
        .filter((b): b is BktState => b != null);
      map.set(kw.id, getKeywordMastery(bkts));
    }
    return map;
  }, [keywords, subtopicsMap, bktMap]);

  // ── Badge color helper ──────────────────────────────────
  function getBadgeClasses(kwId: string): string {
    if (!masteryReady) {
      // Still loading mastery — show neutral
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
    if (!masteryReady) return 'hover:bg-zinc-500/30 hover:text-zinc-300';
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
    if (!masteryReady) return 'focus:ring-zinc-500/30';
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

  if (loading) {
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
            <Popover
              key={kw.id}
              open={openKeywordId === kw.id}
              onOpenChange={(open) => setOpenKeywordId(open ? kw.id : null)}
            >
              <PopoverTrigger asChild>
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
              </PopoverTrigger>

              <PopoverContent
                side="bottom"
                align="start"
                sideOffset={8}
                className="p-0 border-0 bg-transparent shadow-none w-auto max-w-md"
              >
                <AnimatePresence>
                  {openKeywordId === kw.id && (
                    <KeywordPopup
                      keyword={kw}
                      allKeywords={keywords}
                      bktMap={bktMap}
                      subtopicsCache={subtopicsMap}
                      onClose={() => setOpenKeywordId(null)}
                      onNavigateKeyword={onNavigateKeyword}
                    />
                  )}
                </AnimatePresence>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
}
