// ============================================================
// FlashcardDeckScreen -- Topic-level deck view
//
// v4.5.1 RESPONSIVE:
//   - Header stacks on mobile: breadcrumb truncates, buttons wrap
//   - "Estudiar" CTA: sticky bottom on mobile, inline on desktop
//   - Stats bar: vertical on mobile, horizontal on desktop
//   - Filter pills: horizontal scroll on mobile
//   - Card grid: already responsive (grid-cols-2 min)
//   - Keyword progress: flex-wrap safe
//   - All padding: px-4 sm:px-6 md:px-8
// ============================================================

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Topic, Flashcard } from '@/app/types/content';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, BookOpen, Play, GraduationCap, ChevronDown, Layers, Sparkles, Brain } from 'lucide-react';
import { getMasteryStats, filterCardsByMastery, type MasteryFilter } from '@/app/hooks/flashcard-types';
import type { KeywordProgress } from '@/app/hooks/useFlashcardNavigation';
import { headingStyle } from '@/app/design-system';
import { FlashcardMiniCard } from './FlashcardMiniCard';
import { CARD_GRID_CLASSES, GROUP_COLORS } from './constants';
import { getMasteryColorFromPct } from './mastery-colors';

const FILTER_PILLS = [
  { key: 'all' as const, label: 'Todos', color: 'text-gray-700 bg-gray-100' },
  { key: 'new' as const, label: 'A revisar', color: 'text-rose-600 bg-rose-50' },
  { key: 'learning' as const, label: 'Aprendiendo', color: 'text-amber-600 bg-amber-50' },
  { key: 'mastered' as const, label: 'Dominados', color: 'text-emerald-600 bg-emerald-50' },
] as const;

export function DeckScreen({ topic, sectionIdx, sectionName, courseColor, onStart, onBack, onStudyTopic, onStartAdaptive, keywordProgress }: {
  topic: Topic;
  sectionIdx: number;
  sectionName: string;
  /** @deprecated */
  courseColor: string;
  onStart: (cards: Flashcard[]) => void;
  onBack: () => void;
  onStudyTopic: () => void;
  onStartAdaptive?: () => void;
  keywordProgress?: KeywordProgress;
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

  const cardGroups = useMemo(() => {
    const groups = new Map<string, { id: string; label: string; cards: Flashcard[] }>();
    for (const card of filteredCards) {
      const groupKey = card.keyword_id || card.summary_id || 'ungrouped';
      if (!groups.has(groupKey)) groups.set(groupKey, { id: groupKey, label: '', cards: [] });
      groups.get(groupKey)!.cards.push(card);
    }
    let idx = 0;
    return Array.from(groups.values()).map(g => {
      idx++;
      const firstQ = g.cards[0]?.question || g.cards[0]?.front || '';
      const shortLabel = firstQ.length > 50 ? firstQ.slice(0, 47) + '\u2026' : firstQ;
      return { ...g, label: g.cards.length > 1 ? `Grupo ${idx}` : shortLabel || `Grupo ${idx}`, preview: shortLabel };
    });
  }, [filteredCards]);

  useEffect(() => { setExpandedGroups(new Set(cardGroups.map(g => g.id))); }, [cardGroups.length]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => { const next = new Set(prev); if (next.has(groupId)) next.delete(groupId); else next.add(groupId); return next; });
  };

  const countForFilter = (key: MasteryFilter) => {
    switch (key) { case 'new': return stats.newCards; case 'learning': return stats.learning; case 'mastered': return stats.mastered; default: return cards.length; }
  };

  const cardsToStart = filteredCards.length > 0 ? filteredCards : cards;

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200/80">
        <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 pb-4 sm:pb-5">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3 sm:mb-4 overflow-hidden">
            <button onClick={() => { onBack(); onBack(); }} className="hover:text-gray-700 transition-colors shrink-0">Flashcards</button>
            <ChevronRight size={12} className="shrink-0" />
            <button onClick={onBack} className="hover:text-gray-700 transition-colors truncate max-w-[100px] sm:max-w-none">{sectionName}</button>
            <ChevronRight size={12} className="shrink-0" />
            <span className="text-gray-700 font-medium truncate">{topic.title}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button onClick={onBack} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0"><ChevronLeft size={20} /></button>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-[clamp(1.25rem,2.5vw,1.5rem)] text-gray-900 truncate" style={{ ...headingStyle, fontWeight: 700 }}>{topic.title}</h2>
                <p className="text-xs sm:text-sm text-gray-500 line-clamp-1 hidden sm:block">{topic.summary}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={onStudyTopic} className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-[#faf9f6] hover:bg-gray-100 rounded-xl text-xs font-medium text-gray-600 transition-colors border border-gray-200">
                <GraduationCap size={14} /> Ver T\u00F3pico
              </button>
              {cards.length > 0 && (
                <button onClick={() => onStart(cardsToStart)} className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm shadow-sm hover:scale-105 hover:brightness-90 active:scale-95 transition-all" style={{ backgroundColor: deckColor.hex, fontWeight: 700 }}>
                  <Play size={16} fill="currentColor" /> Estudiar{filterMastery !== 'all' ? ` (${filteredCards.length})` : ''}
                </button>
              )}
              {onStartAdaptive && cards.length > 0 && (
                <button onClick={() => onStartAdaptive()} className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-white text-xs sm:text-sm shadow-sm hover:scale-105 hover:brightness-90 active:scale-95 transition-all bg-gradient-to-r from-violet-500 to-[#2a8c7a]" style={{ fontWeight: 600 }} title="Sesi\u00F3n adaptativa con IA">
                  <Sparkles size={14} /><span className="hidden sm:inline">Con IA</span><span className="sm:hidden">IA</span>
                </button>
              )}
            </div>
          </div>
        </div>
        {cards.length > 0 && (
          <div className="px-4 sm:px-6 md:px-8 pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
              <div className="flex-1 max-w-xs">
                <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
                  {stats.mastered > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${(stats.mastered / cards.length) * 100}%` }} />}
                  {stats.learning > 0 && <div className="bg-amber-400 transition-all" style={{ width: `${(stats.learning / cards.length) * 100}%` }} />}
                  {stats.newCards > 0 && <div className="bg-rose-400 transition-all" style={{ width: `${(stats.newCards / cards.length) * 100}%` }} />}
                </div>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
                {FILTER_PILLS.map(f => (
                  <button key={f.key} onClick={() => setFilterMastery(f.key)} className={clsx("px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap shrink-0", filterMastery === f.key ? `${f.color} ring-1 ring-current/20 shadow-sm` : "text-gray-400 hover:text-gray-600 hover:bg-gray-50")}>
                    {f.label} ({countForFilter(f.key)})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {keywordProgress && keywordProgress.keywordsTotal > 0 && (
          <div className="px-4 sm:px-6 md:px-8 pb-3 sm:pb-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 bg-[#faf9f6]/80 rounded-xl border border-gray-100">
              <Brain size={14} className="text-[#2a8c7a] shrink-0" />
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <span className="text-xs text-gray-600" style={{ fontWeight: 500 }}>Keywords: <span style={{ fontWeight: 700 }} className="text-gray-800">{keywordProgress.keywordsMastered}/{keywordProgress.keywordsTotal}</span></span>
                <div className="w-16 sm:w-24 h-1.5 rounded-full overflow-hidden bg-gray-200">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round(keywordProgress.overallMastery * 100)}%`, backgroundColor: keywordProgress.overallMastery >= 0.75 ? '#10b981' : keywordProgress.overallMastery >= 0.4 ? '#f59e0b' : '#f43f5e' }} />
                </div>
                <span className="text-[11px] text-gray-400" style={{ fontWeight: 500 }}>{Math.round(keywordProgress.overallMastery * 100)}%</span>
              </div>
              {keywordProgress.weakestKeywordName && keywordProgress.keywordsMastered < keywordProgress.keywordsTotal && (
                <span className="text-[10px] text-gray-400 truncate max-w-[140px] sm:max-w-[200px] hidden sm:inline" title={`Reforzar: ${keywordProgress.weakestKeywordName}`}>Reforzar: <span className="text-amber-600" style={{ fontWeight: 500 }}>{keywordProgress.weakestKeywordName}</span></span>
              )}
              {keywordProgress.fsrsCoverage && keywordProgress.fsrsCoverage.totalMapped > 0 && (
                <div className="hidden sm:flex items-center gap-2 ml-auto border-l border-gray-200 pl-3">
                  {keywordProgress.fsrsCoverage.dueCards > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600" style={{ fontWeight: 600 }}>{keywordProgress.fsrsCoverage.dueCards} pendientes</span>}
                  {keywordProgress.fsrsCoverage.newCards > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-500" style={{ fontWeight: 600 }}>{keywordProgress.fsrsCoverage.newCards} nuevas</span>}
                  <span className="text-[10px] text-gray-400" style={{ fontWeight: 500 }}>{Math.round(keywordProgress.fsrsCoverage.coverage * 100)}% cobertura</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-4 sm:py-5 bg-surface-dashboard">
        <div className="h-full">
          {filteredCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <BookOpen size={48} className="mb-3 text-gray-300" />
              <p className="text-sm font-medium">{cards.length === 0 ? 'No hay flashcards en este mazo' : 'No hay cards en esta categor\u00EDa'}</p>
            </div>
          ) : cardGroups.length <= 1 ? (
            <div className={CARD_GRID_CLASSES}>{filteredCards.map((card, idx) => <FlashcardMiniCard key={card.id} card={card} idx={idx} onClick={() => onStart([card])} />)}</div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4">
              {cardGroups.map((group, groupIdx) => {
                const isExpanded = expandedGroups.has(group.id);
                const groupStats = getMasteryStats(group.cards);
                const groupMastery = group.cards.length > 0 ? Math.round((groupStats.mastered / group.cards.length) * 100) : 0;
                return (
                  <motion.div key={group.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: groupIdx * 0.08 }}>
                    <div className="h-1" style={{ backgroundColor: GROUP_COLORS[groupIdx % GROUP_COLORS.length] }} />
                    <button onClick={() => toggleGroup(group.id)} aria-expanded={isExpanded} aria-controls={`group-panel-${group.id}`} className="w-full text-left px-3.5 sm:px-5 py-3 sm:py-3.5 flex items-center gap-2.5 sm:gap-3.5 hover:bg-zinc-50/50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a8c7a]/30 focus-visible:ring-inset">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border" style={{ backgroundColor: GROUP_COLORS[groupIdx % GROUP_COLORS.length] + '15', borderColor: GROUP_COLORS[groupIdx % GROUP_COLORS.length] + '30' }}>
                        <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: GROUP_COLORS[groupIdx % GROUP_COLORS.length] }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm text-zinc-800 truncate" style={{ fontWeight: 600 }}>{group.label}</h4>
                        <div className="flex items-center gap-2 sm:gap-3 mt-0.5 text-[10px] sm:text-[11px] text-zinc-400" style={{ fontWeight: 400 }}>
                          <span>{group.cards.length} {group.cards.length === 1 ? 'card' : 'cards'}</span>
                          {groupStats.newCards > 0 && <span className={clsx("flex items-center gap-0.5", deckColor.text)}><Sparkles className="w-2.5 h-2.5" />{groupStats.newCards} nuevas</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {groupStats.newCards > 0 && <span className="hidden sm:inline text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full" style={{ fontWeight: 600 }}>{groupStats.newCards} pendientes</span>}
                        <span className="text-[10px] sm:text-[11px] text-zinc-400" style={{ fontWeight: 500 }}>{groupMastery}%</span>
                        <div className="w-10 sm:w-16 h-1.5 rounded-full overflow-hidden bg-zinc-100"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${groupMastery}%`, backgroundColor: GROUP_COLORS[groupIdx % GROUP_COLORS.length] }} /></div>
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown className="w-4 h-4 text-zinc-400" /></motion.div>
                      </div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div id={`group-panel-${group.id}`} role="region" aria-label={`Cards de ${group.label}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden">
                          <div className="border-t border-zinc-100 px-3 sm:px-4 py-3 sm:py-4">
                            <div className={CARD_GRID_CLASSES}>{group.cards.map((card, idx) => <FlashcardMiniCard key={card.id} card={card} idx={idx} onClick={() => onStart([card])} />)}</div>
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
      {cards.length > 0 && (
        <div className="sm:hidden shrink-0 px-4 py-3 bg-white border-t border-gray-200 safe-area-bottom">
          <button onClick={() => onStart(cardsToStart)} className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-white text-sm shadow-lg active:scale-[0.98] transition-all" style={{ backgroundColor: deckColor.hex, fontWeight: 700 }}>
            <Play size={16} fill="currentColor" /> Estudiar{filterMastery !== 'all' ? ` (${filteredCards.length})` : ` (${cards.length})`}
          </button>
        </div>
      )}
    </motion.div>
  );
}