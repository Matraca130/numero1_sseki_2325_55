// ============================================================
// FlashcardCoverageBar — Keyword-level flashcard coverage
//
// Shows a horizontal bar chart of how many flashcards each
// keyword has. Highlights keywords with 0 cards ("gaps").
// Helps professors identify which concepts need more content.
//
// Props:
//   keywords: Keyword[] — the keywords for this summary
//   keywordStats: Map<string, number> — keyword_id → card count
//   totalCards: number — total flashcards in summary
//   onKeywordClick: (id) => void — filter by keyword
//   activeKeywordId: string | null — currently filtered keyword
// ============================================================
import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Tag, TrendingUp } from 'lucide-react';
import type { Keyword } from '@/app/types/platform';

interface FlashcardCoverageBarProps {
  keywords: Keyword[];
  keywordStats: Map<string, number>;
  totalCards: number;
  onKeywordClick?: (keywordId: string) => void;
  activeKeywordId?: string | null;
}

export function FlashcardCoverageBar({
  keywords,
  keywordStats,
  totalCards,
  onKeywordClick,
  activeKeywordId,
}: FlashcardCoverageBarProps) {
  // ── Computed data ────────────────────────────────
  const { covered, uncovered, maxCount, avgCount } = useMemo(() => {
    let coveredCount = 0;
    let max = 0;
    let total = 0;

    for (const kw of keywords) {
      const count = keywordStats.get(kw.id) || 0;
      if (count > 0) coveredCount++;
      if (count > max) max = count;
      total += count;
    }

    return {
      covered: coveredCount,
      uncovered: keywords.length - coveredCount,
      maxCount: max,
      avgCount: keywords.length > 0 ? Math.round(total / keywords.length) : 0,
    };
  }, [keywords, keywordStats]);

  if (keywords.length === 0) return null;

  const coveragePercent = Math.round((covered / keywords.length) * 100);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-purple-500" />
          <span className="text-xs text-gray-700" style={{ fontWeight: 600 }}>
            Cobertura de Keywords
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
            coveragePercent === 100
              ? 'bg-emerald-50 text-emerald-600'
              : coveragePercent >= 70
                ? 'bg-yellow-50 text-yellow-600'
                : 'bg-red-50 text-red-600'
          }`} style={{ fontWeight: 500 }}>
            {coveragePercent}% cobertura
          </span>
          <span className="text-[10px] text-gray-400">
            {covered}/{keywords.length} keywords &middot; {totalCards} cards &middot; ~{avgCount}/kw
          </span>
        </div>
      </div>

      {/* ── Keyword bars ── */}
      <div className="space-y-1.5">
        {keywords.map(kw => {
          const count = keywordStats.get(kw.id) || 0;
          const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const isGap = count === 0;
          const isActive = activeKeywordId === kw.id;

          return (
            <button
              key={kw.id}
              onClick={() => onKeywordClick?.(kw.id)}
              className={`w-full flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-left transition-all ${
                isActive
                  ? 'bg-purple-50 border border-purple-200'
                  : isGap
                    ? 'bg-red-50/50 hover:bg-red-50 border border-transparent hover:border-red-200'
                    : 'hover:bg-gray-50 border border-transparent hover:border-gray-200'
              }`}
            >
              {/* Icon */}
              {isGap ? (
                <AlertTriangle size={11} className="text-red-400 shrink-0" />
              ) : (
                <Tag size={11} className="text-purple-400 shrink-0" />
              )}

              {/* Keyword name */}
              <span className={`text-[11px] w-28 truncate shrink-0 ${
                isGap ? 'text-red-500' : 'text-gray-600'
              }`} style={{ fontWeight: isGap ? 600 : 400 }}>
                {kw.name || kw.term || 'Sin nombre'}
              </span>

              {/* Bar */}
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                {count > 0 && (
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isActive
                        ? 'bg-purple-500'
                        : count >= avgCount
                          ? 'bg-emerald-400'
                          : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.max(widthPercent, 4)}%` }}
                  />
                )}
              </div>

              {/* Count */}
              <span className={`text-[11px] w-8 text-right shrink-0 ${
                isGap
                  ? 'text-red-500'
                  : 'text-gray-500'
              }`} style={{ fontWeight: isGap ? 700 : 500 }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Gap warning ── */}
      {uncovered > 0 && (
        <div className="mt-3 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-red-50 border border-red-100">
          <AlertTriangle size={12} className="text-red-400 shrink-0" />
          <span className="text-[10px] text-red-600">
            {uncovered} keyword{uncovered !== 1 ? 's' : ''} sin flashcards — considera generar contenido para cubrir estos conceptos
          </span>
        </div>
      )}

      {/* ── All covered ── */}
      {uncovered === 0 && keywords.length > 0 && (
        <div className="mt-3 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
          <span className="text-[10px] text-emerald-600">
            Todas las keywords tienen al menos 1 flashcard
          </span>
        </div>
      )}
    </div>
  );
}