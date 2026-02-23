import React from 'react';
import { motion } from 'motion/react';
import { Section, Topic, Flashcard } from '@/app/types/content';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, BookOpen, Layers, Play } from 'lucide-react';
import { headingStyle, sectionColors } from '@/app/design-system';
import { getMasteryStats } from '@/app/hooks/flashcard-types';
import { MasteryBadges } from './MasteryBadges';
import { ProgressRing } from './ProgressRing';

const SECTION_COLORS = sectionColors.multi;

export function SectionScreen({ section, sectionIdx, courseColor, onOpenDeck, onStartSection, onBack }: {
  section: Section;
  sectionIdx: number;
  courseColor: string;
  onOpenDeck: (t: Topic) => void;
  onStartSection: (cards: Flashcard[]) => void;
  onBack: () => void;
}) {
  const colorSet = SECTION_COLORS[sectionIdx % SECTION_COLORS.length];
  const sectionCards = section.topics.flatMap(t => t.flashcards || []);
  const stats = getMasteryStats(sectionCards);

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="flex flex-col h-full"
    >
      {/* ── Header ── */}
      <div className="relative px-8 pt-6 pb-6 bg-white border-b border-gray-200">
        <div className="relative z-10">
          <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm mb-5 transition-colors font-medium">
            <ChevronLeft size={16} /> Todas as Secoes
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center shadow-sm">
                <BookOpen size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900" style={headingStyle}>{section.title}</h2>
                <p className="text-sm text-gray-500">{section.topics.length} decks &middot; {sectionCards.length} flashcards</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {sectionCards.length > 0 && (
                <>
                  <MasteryBadges stats={stats} compact className="hidden md:flex" />
                  <button
                    onClick={() => onStartSection(sectionCards)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full text-white text-sm font-semibold shadow-sm hover:scale-105 active:scale-95 transition-all bg-teal-600 hover:bg-teal-700"
                  >
                    <Play size={14} fill="currentColor" /> Estudar Secao
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Deck List ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6 bg-surface-dashboard">
        <div className="max-w-4xl mx-auto space-y-3">
          {section.topics.map((topic, idx) => {
            const cards = topic.flashcards || [];
            const tStats = getMasteryStats(cards);

            return (
              <motion.button
                key={topic.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileHover={{ x: 4 }}
                onClick={() => onOpenDeck(topic)}
                className="w-full bg-white rounded-2xl p-5 text-left border border-gray-200/80 hover:border-gray-300 shadow-sm hover:shadow-lg transition-all group flex items-center gap-5 relative overflow-hidden"
              >
                {/* Left accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500" />

                {/* Stacked cards visual */}
                <div className="relative w-14 h-14 shrink-0">
                  <div className="absolute inset-0 rounded-xl bg-teal-500 opacity-10 translate-x-1 translate-y-1" />
                  <div className="absolute inset-0 rounded-xl bg-teal-500 opacity-20 translate-x-0.5 translate-y-0.5" />
                  <div className="absolute inset-0 rounded-xl bg-teal-500 flex items-center justify-center shadow-sm">
                    <Layers size={22} className="text-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 mb-0.5 group-hover:text-gray-900 transition-colors">{topic.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-1">{topic.summary}</p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {cards.length > 0 ? (
                    <>
                      <div className="hidden sm:flex flex-col items-end gap-0.5">
                        <span className="text-sm font-bold text-gray-700">{cards.length}</span>
                        <span className="text-[10px] text-gray-400">cards</span>
                      </div>
                      <ProgressRing pct={tStats.pct} size={40} stroke={3} color="text-teal-500" />
                    </>
                  ) : (
                    <span className="text-[11px] text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg font-medium border border-gray-200">Vazio</span>
                  )}
                  <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}