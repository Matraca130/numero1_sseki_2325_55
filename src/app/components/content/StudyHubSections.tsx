// ============================================================
// Axon — StudyHubSections (extracted from StudyHubView.tsx)
// "Tus Materias" grid with section progress cards.
// Zero functional changes — pure extraction.
// ============================================================
import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  GraduationCap, Trophy, ArrowRight,
} from 'lucide-react';
import { ProgressBar, focusRing } from '@/app/components/design-kit';
import { useMotionPresets } from '@/app/components/shared/FadeIn';
import type { TreeSection } from '@/app/services/contentTreeApi';
import { SECTION_ACCENTS, SECTION_COLORS } from './studyhub-helpers';
import type { SectionProgress } from './studyhub-helpers';

// ── Types ────────────────────────────────────────────────────

export interface StudyHubSectionsProps {
  allSections: { section: TreeSection; accentIdx: number }[];
  sectionProgressMap: Map<string, SectionProgress>;
  totalSections: number;
  totalTopics: number;
  onSectionClick: (sectionId: string) => void;
}

// ── Component ────────────────────────────────────────────────

export function StudyHubSections({
  allSections,
  sectionProgressMap,
  totalSections,
  totalTopics,
  onSectionClick,
}: StudyHubSectionsProps) {
  const { fadeUp } = useMotionPresets();
  const shouldReduce = useReducedMotion();

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm text-zinc-900" style={{ fontWeight: 700 }}>Tus Materias</h3>
            <p className="text-xs text-zinc-500" style={{ fontWeight: 400 }}>
              {totalSections} secciones · {totalTopics} temas en total
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {allSections.map(({ section, accentIdx }) => {
          const sp = sectionProgressMap.get(section.id);
          const progress = sp ? sp.progress / 100 : 0;
          const color = SECTION_COLORS[accentIdx % SECTION_COLORS.length];
          const accent = SECTION_ACCENTS[accentIdx % SECTION_ACCENTS.length];

          return (
            <motion.button
              key={section.id}
              onClick={() => onSectionClick(section.id)}
              className={`bg-white border border-zinc-200 rounded-2xl p-5 text-left hover:shadow-xl hover:shadow-zinc-900/5 hover:border-zinc-300 transition-all cursor-pointer relative overflow-hidden group ${focusRing}`}
              {...fadeUp(0.1 * accentIdx)}
              whileHover={shouldReduce ? undefined : { y: -4 }}
            >
              {/* Colored top accent */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: color }}
              />

              <div className="flex items-start gap-3.5 mb-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 border"
                  style={{ backgroundColor: `${color}12`, borderColor: `${color}25` }}
                >
                  {accent.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm text-zinc-900 truncate" style={{ fontWeight: 600 }}>{section.name}</h4>
                  <p className="text-xs text-zinc-500 mt-0.5" style={{ fontWeight: 400 }}>
                    {sp?.completedTopics ?? 0} de {section.topics.length} temas completados
                  </p>
                </div>

                {progress >= 0.8 && (
                  <motion.div
                    className="shrink-0"
                    initial={shouldReduce ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, delay: 0.5 + accentIdx * 0.1 }}
                  >
                    <div className="w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center shadow-md shadow-amber-400/25">
                      <Trophy className="w-3.5 h-3.5 text-amber-900" />
                    </div>
                  </motion.div>
                )}
              </div>

              <ProgressBar
                value={progress}
                color={
                  progress >= 0.8
                    ? 'bg-amber-500'
                    : progress > 0
                      ? 'bg-teal-500'
                      : 'bg-zinc-300'
                }
                className="h-2"
                animated
              />

              <div className="flex items-center justify-between mt-3.5">
                <span className="text-xs text-zinc-500" style={{ fontWeight: 500 }}>
                  {progress === 0
                    ? '¡Dale, empezá!'
                    : progress >= 0.8
                      ? '¡Ya casi terminás!'
                      : `${Math.round(progress * 100)}% completado`}
                </span>
                {sp?.lastActivity && (
                  <span className="text-[11px] text-zinc-400" style={{ fontWeight: 400 }}>
                    {sp.lastActivity}
                  </span>
                )}
              </div>

              {/* Next action micro-CTA */}
              {sp?.nextTopicName && (
                <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-teal-700" style={{ fontWeight: 500 }}>
                  <ArrowRight className="w-3 h-3" />
                  Siguiente: {sp.nextTopicName}
                </div>
              )}

              {/* Hover arrow */}
              <motion.div className="absolute bottom-4 right-4 w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-4 h-4 text-zinc-600" />
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
