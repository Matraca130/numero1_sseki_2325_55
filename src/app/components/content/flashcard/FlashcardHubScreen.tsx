import React from 'react';
import { motion } from 'motion/react';
import { Section, Flashcard } from '@/app/types/content';
import clsx from 'clsx';
import { ChevronLeft, BookOpen, Zap } from 'lucide-react';
import { AxonWatermark, AxonBrand } from '@/app/components/shared/AxonLogo';
import { headingStyle } from '@/app/design-system';
import { getMasteryStats } from '@/app/hooks/flashcard-types';
import { MasteryBadges } from './MasteryBadges';

export function HubScreen({ sections, allCards, courseColor, courseName, onOpenSection, onStartAll, onBack }: {
  sections: Section[];
  allCards: Flashcard[];
  courseColor: string;
  courseName: string;
  onOpenSection: (s: Section, i: number) => void;
  onStartAll: () => void;
  onBack: () => void;
}) {
  const stats = getMasteryStats(allCards);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -30 }}
      className="h-full overflow-y-auto bg-surface-dashboard"
    >
      {/* ── Light Premium Header ── */}
      <div className="relative px-8 pt-4 pb-6 bg-white overflow-hidden border-b border-gray-200/80">
        {/* Decorative gradient orbs — subtle light */}
        <div className="absolute top-[-120px] left-1/4 w-[500px] h-[350px] bg-gradient-to-br from-teal-200/20 via-teal-100/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[-80px] right-[-100px] w-[400px] h-[300px] bg-gradient-to-bl from-teal-200/15 via-teal-100/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-60px] left-[-80px] w-[350px] h-[250px] bg-gradient-to-tr from-teal-200/10 via-teal-100/5 to-transparent rounded-full blur-3xl" />

        {/* Diagonal AXON watermark */}
        <AxonWatermark />

        <div className="relative z-10">
          {/* Top bar: back */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors">
              <ChevronLeft size={16} /> Voltar
            </button>
          </div>

          {/* Main title area */}
          <div className="flex items-end justify-between gap-8 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-[clamp(2rem,4vw,3rem)] font-bold text-gray-900 tracking-tight leading-[0.95] mb-2 flex items-center gap-3" style={headingStyle}>
                Flashcards
                <AxonBrand theme="gradient" />
              </h1>
              <p className="text-sm text-gray-500 font-medium">{courseName}</p>
            </div>

            {/* Right side — study button */}
            {allCards.length > 0 && (
              <button
                onClick={onStartAll}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 rounded-lg text-white font-medium text-sm transition-colors shrink-0"
              >
                <Zap size={15} /> Estudar Todos
              </button>
            )}
          </div>

          {/* Bottom stats row */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{allCards.length} flashcards em {sections.length} secoes</p>
            {allCards.length > 0 && (
              <MasteryBadges stats={stats} className="hidden md:flex" />
            )}
          </div>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="px-6 py-6 bg-surface-dashboard">
        {/* Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min max-w-5xl mx-auto">
          {sections.map((section, idx) => {
            const sectionCards = section.topics.flatMap(t => t.flashcards || []);
            const sStats = getMasteryStats(sectionCards);

            return (
              <motion.button
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onOpenSection(section, idx)}
                className={clsx(
                  "bg-white rounded-xl p-5 text-left border border-gray-200 group relative overflow-hidden transition-all duration-200",
                  "hover:border-gray-300 hover:shadow-md"
                )}
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-teal-50 shrink-0">
                      <BookOpen size={18} className="text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate" style={headingStyle}>
                          {section.title}
                        </h3>
                        <span className="text-sm font-semibold text-teal-600 shrink-0 ml-2">{Math.round(sStats.pct)}%</span>
                      </div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">
                        {section.topics.length} topicos
                      </p>
                    </div>
                  </div>

                  {/* Progress info */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mt-4 mb-4">
                    <span>Progresso</span>
                    <span>{sStats.mastered}/{sectionCards.length} Cards</span>
                  </div>

                  {/* Action button */}
                  <div className="w-full py-2.5 rounded-full bg-teal-600 text-white text-sm font-semibold text-center group-hover:bg-teal-700 transition-colors">
                    Continuar Estudo
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}