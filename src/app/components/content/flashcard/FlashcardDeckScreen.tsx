import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Topic, Flashcard } from '@/app/types/content';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, BookOpen, Play, GraduationCap } from 'lucide-react';
import { sectionColors } from '@/app/design-system';
import { getMasteryStats, filterCardsByMastery, type MasteryFilter } from '@/app/hooks/flashcard-types';

const SECTION_COLORS = sectionColors.multi;

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
  courseColor: string;
  onStart: (cards: Flashcard[]) => void;
  onBack: () => void;
  onStudyTopic: () => void;
}) {
  const colorSet = SECTION_COLORS[sectionIdx % SECTION_COLORS.length];
  const cards = topic.flashcards || [];
  const stats = getMasteryStats(cards);
  const [filterMastery, setFilterMastery] = useState<MasteryFilter>('all');

  const filteredCards = useMemo(
    () => filterCardsByMastery(cards, filterMastery),
    [cards, filterMastery],
  );

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
                <GraduationCap size={14} /> Ver Topico
              </button>
              {cards.length > 0 && (
                <button
                  onClick={() => onStart(filteredCards.length > 0 ? filteredCards : cards)}
                  className={clsx("flex items-center gap-3 px-8 py-4 rounded-2xl text-white text-lg font-bold shadow-sm hover:scale-105 active:scale-95 transition-all bg-teal-600 hover:bg-teal-700")}
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
                {cards.length === 0 ? 'Nenhum flashcard neste deck' : 'Nenhum card nesta categoria'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 auto-rows-fr h-full">
              {filteredCards.map((card, idx) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group bg-white rounded-2xl border border-gray-200/80 hover:border-gray-300 hover:shadow-lg transition-all flex flex-col relative overflow-hidden min-h-0 shadow-sm"
                >
                  {/* Top color accent */}
                  <div className="h-1 w-full shrink-0 bg-teal-500" />

                  <div className="flex-1 flex flex-col p-1.5 min-h-0 overflow-hidden gap-0.5">
                    {/* Header row: number + mastery */}
                    <div className="flex items-center justify-between shrink-0">
                      <div className="w-3.5 h-3.5 rounded flex items-center justify-center text-[6px] font-bold bg-teal-50 text-teal-600">
                        {idx + 1}
                      </div>
                      <div className="flex items-center gap-px">
                        {[1, 2, 3, 4, 5].map(level => (
                          <div
                            key={level}
                            className={clsx(
                              "w-0.5 h-1 rounded-full transition-colors",
                              level <= card.mastery ? "bg-teal-500" : "bg-gray-200"
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Question */}
                    <p className="text-[9px] font-semibold text-gray-800 line-clamp-2 leading-tight">{card.question}</p>

                    {/* Answer (subtle, revealed on hover) */}
                    <p className="text-[8px] text-gray-400 group-hover:text-gray-600 line-clamp-1 mt-auto leading-tight transition-colors">{card.answer}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}