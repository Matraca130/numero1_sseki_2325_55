// ============================================================
// FlashcardDeckScreen -- Topic-level deck view
//
// Shows all flashcards for a single topic, optionally grouped
// by keyword_id / summary_id with expandable sections.
//
// PHASE 2 CLEANUP:
//   - Removed dead `colorSet` variable
//   - Imports FlashcardMiniCard from extracted file
//   - Imports CARD_GRID_CLASSES + GROUP_COLORS from constants
//   - Removed SECTION_COLORS (unused after colorSet removal)
//   - A11Y: aria-expanded, aria-controls, role="region"
// ============================================================

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Topic, Flashcard } from '@/app/types/content';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, BookOpen, Play, GraduationCap, ChevronDown, Layers, Sparkles } from 'lucide-react';
import { getMasteryStats, filterCardsByMastery, type MasteryFilter } from '@/app/hooks/flashcard-types';
import { FlashcardMiniCard } from './FlashcardMiniCard';
import { CARD_GRID_CLASSES, GROUP_COLORS } from './constants';
import { getMasteryColorFromPct } from './mastery-colors';

const FILTER_PILLS = [
  { key: 'all' as const, label: 'Todos', color: 'text-gray-700 bg-gray-100' },
  { key: 'new' as const, label: 'A revisar', color: 'text-rose-600 bg-rose-50' },
  { key: 'learning' as const, label: 'Aprendendo', color: 'text-amber-600 bg-amber-50' },
  { key: 'mastered' as const, label: 'Dominados', color: 'text-emerald-600 bg-emerald-50' },
] as const;

export function DeckScreen({ topic, sectionIdx, sectionName, courseColor, onStart, onBack, onStudyTopic }: {
  topic: Topic;
  sectionIdx: number;
  sectionName: string;
  /** @deprecated Colors now derived from mastery via getMasteryColorFromPct. Kept for caller compat. */
  courseColor: string;
  onStart: (cards: Flashcard[]) => void;
  onBack: () => void;
  onStudyTopic: () => void;
}) {
  const cards = topic.flashcards || [];
  const stats = getMasteryStats(cards);
  const deckColor = getMasteryColorFromPct(stats.pct / 100);
  const [filterMastery, setFilterMastery] = useState<MasteryFilter>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const filteredCards = useMemo(
    () => filterCardsByMastery(cards, filterMastery),
    [cards, filterMastery],
  );

  // ── Group cards by keyword_id or summary_id ──
  const cardGroups = useMemo(() => {
    const groups = new Map<string, { id: string; label: string; cards: Flashcard[] }>();

    for (const card of filteredCards) {
      const groupKey = card.keyword_id || card.summary_id || 'ungrouped';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { id: groupKey, label: '', cards: [] });
      }
      groups.get(groupKey)!.cards.push(card);
    }

    // Generate labels: use index-based naming
    let idx = 0;
    const result = Array.from(groups.values()).map(g => {
      idx++;
      // Try to derive a label from the first card's question (first ~40 chars)
      const firstQ = g.cards[0]?.question || g.cards[0]?.front || '';
      const shortLabel = firstQ.length > 50 ? firstQ.slice(0, 47) + '\u2026' : firstQ;
      return {
        ...g,
        label: g.cards.length > 1 ? `Grupo ${idx}` : shortLabel || `Grupo ${idx}`,
        preview: shortLabel,
      };
    });

    return result;
  }, [filteredCards]);

  // Auto-expand all groups on first render / filter change
  useEffect(() => {
    setExpandedGroups(new Set(cardGroups.map(g => g.id)));
  }, [cardGroups.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const countForFilter = (key: MasteryFilter) => {
    switch (key) {
      case 'new': return stats.newCards;
      case 'learning': return stats.learning;
      case 'mastered': return stats.mastered;
      default: return cards.length;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="flex flex-col h-full"
    >
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200/80">
        <div className="px-8 pt-6 pb-5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
            <button onClick={() => { onBack(); onBack(); }} className="hover:text-gray-700 transition-colors">Flashcards</button>
            <ChevronRight size={12} />
            <button onClick={onBack} className="hover:text-gray-700 transition-colors">{sectionName}</button>
            <ChevronRight size={12} />
            <span className="text-gray-700 font-medium">{topic.title}</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button onClick={onBack} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
                <ChevronLeft size={20} />
              </button>
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-gray-900 truncate">{topic.title}</h2>
                <p className="text-sm text-gray-500 line-clamp-1">{topic.summary}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={onStudyTopic}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-medium text-gray-600 transition-colors border border-gray-200"
              >
                <GraduationCap size={14} /> Ver T{'\u00F3'}pico
              </button>
              {cards.length > 0 && (
                <button
                  onClick={() => onStart(filteredCards.length > 0 ? filteredCards : cards)}
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl text-white text-lg shadow-sm hover:scale-105 hover:brightness-90 active:scale-95 transition-all"
                  style={{ backgroundColor: deckColor.hex, fontWeight: 700 }}
                >
                  <Play size={20} fill="currentColor" />
                  Estudar{filterMastery !== 'all' ? ` (${filteredCards.length})` : ''}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats Bar ── */}
        {cards.length > 0 && (
          <div className="px-8 pb-4 flex items-center gap-6">
            <div className="flex items-center gap-5 flex-1">
              {/* Mastery distribution bar */}
              <div className="flex-1 max-w-xs">
                <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
                  {stats.mastered > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${(stats.mastered / cards.length) * 100}%` }} />}
                  {stats.learning > 0 && <div className="bg-amber-400 transition-all" style={{ width: `${(stats.learning / cards.length) * 100}%` }} />}
                  {stats.newCards > 0 && <div className="bg-rose-400 transition-all" style={{ width: `${(stats.newCards / cards.length) * 100}%` }} />}
                </div>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1.5">
                {FILTER_PILLS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilterMastery(f.key)}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all",
                      filterMastery === f.key
                        ? `${f.color} ring-1 ring-current/20 shadow-sm`
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {f.label} ({countForFilter(f.key)})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Cards Grid ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 bg-surface-dashboard">
        <div className="h-full">
          {filteredCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <BookOpen size={48} className="mb-3 text-gray-300" />
              <p className="text-sm font-medium">
                {cards.length === 0 ? 'No hay flashcards en este mazo' : 'No hay cards en esta categor\u00EDa'}
              </p>
            </div>
          ) : cardGroups.length <= 1 ? (
            /* ── Single group or ungrouped: flat grid ── */
            <div className={CARD_GRID_CLASSES}>
              {filteredCards.map((card, idx) => (
                <FlashcardMiniCard key={card.id} card={card} idx={idx} />
              ))}
            </div>
          ) : (
            /* ── Multiple groups: expandable sections ── */
            <div className="max-w-5xl mx-auto space-y-4">
              {cardGroups.map((group, groupIdx) => {
                const isExpanded = expandedGroups.has(group.id);
                const groupStats = getMasteryStats(group.cards);
                const groupMastery = group.cards.length > 0
                  ? Math.round((groupStats.mastered / group.cards.length) * 100)
                  : 0;

                return (
                  <motion.div
                    key={group.id}
                    className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: groupIdx * 0.08 }}
                  >
                    {/* Group color bar */}
                    <div
                      className="h-1"
                      style={{ backgroundColor: GROUP_COLORS[groupIdx % GROUP_COLORS.length] }}
                    />

                    {/* Group header — click to expand/collapse */}
                    <button
                      onClick={() => toggleGroup(group.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`group-panel-${group.id}`}
                      className="w-full text-left px-5 py-3.5 flex items-center gap-3.5 hover:bg-zinc-50/50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-inset"
                    >
                      {/* Group icon */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: GROUP_COLORS[groupIdx % GROUP_COLORS.length] + '15',
                          borderColor: GROUP_COLORS[groupIdx % GROUP_COLORS.length] + '30',
                        }}
                      >
                        <Layers className="w-4 h-4" style={{ color: GROUP_COLORS[groupIdx % GROUP_COLORS.length] }} />
                      </div>

                      {/* Group info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm text-zinc-800 truncate" style={{ fontWeight: 600 }}>
                          {group.label}
                        </h4>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-zinc-400" style={{ fontWeight: 400 }}>
                          <span>{group.cards.length} {group.cards.length === 1 ? 'card' : 'cards'}</span>
                          {groupStats.newCards > 0 && (
                            <span className={clsx("flex items-center gap-0.5", deckColor.text)}>
                              <Sparkles className="w-2.5 h-2.5" />
                              {groupStats.newCards} nuevas
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Group-level stats */}
                      <div className="flex items-center gap-3 shrink-0">
                        {groupStats.newCards > 0 && (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full" style={{ fontWeight: 600 }}>
                            {groupStats.newCards} pendientes
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-400" style={{ fontWeight: 500 }}>
                          {groupMastery}% dominio
                        </span>

                        {/* Mastery mini bar */}
                        <div className="w-16 h-1.5 rounded-full overflow-hidden bg-zinc-100">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${groupMastery}%`,
                              backgroundColor: GROUP_COLORS[groupIdx % GROUP_COLORS.length],
                            }}
                          />
                        </div>

                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        </motion.div>
                      </div>
                    </button>

                    {/* Expanded: card grid */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          id={`group-panel-${group.id}`}
                          role="region"
                          aria-label={`Cards de ${group.label}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-zinc-100 px-4 py-4">
                            <div className={CARD_GRID_CLASSES}>
                              {group.cards.map((card, idx) => (
                                <FlashcardMiniCard key={card.id} card={card} idx={idx} />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}