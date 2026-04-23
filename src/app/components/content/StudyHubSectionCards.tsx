// ============================================================
// Axon — StudyHubSectionCards (orchestrator)
//
// Wrapper around per-section <SectionCard/> instances. Handles
// expand/collapse state + semester grouping.
//
// SectionCard component (previously internal) lives in
// ./study-hub/SectionCard.tsx after the god-component split
// (finding #22). STATUS_CONFIG, TopicStatusIcon, EMOJI and
// COVER_IMAGES moved alongside it and are re-exported there.
// ============================================================
import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Folder } from 'lucide-react';
import type { TreeSection } from '@/app/services/contentTreeApi';
import type { TopicStatus, SectionProgress } from './studyhub-helpers';

// ── Axon palette (SINGLE SOURCE OF TRUTH) ────────────────────
import { axon, tint } from '@/app/lib/palette';

// ── Extracted card ───────────────────────────────────────────
import { SectionCard } from './study-hub/SectionCard';

// ── Types ────────────────────────────────────────────────────

export interface SemesterGroup {
  semesterId: string;
  semesterName: string;
  sections: { section: TreeSection; accentIdx: number }[];
}

export interface StudyHubSectionCardsProps {
  semesterGroups?: SemesterGroup[];
  allSections: { section: TreeSection; accentIdx: number }[];
  sectionProgressMap: Map<string, SectionProgress>;
  topicStatusMap?: Map<string, TopicStatus>;
  totalSections: number;
  totalTopics: number;
  selectTopic: (id: string) => void;
  navigate: (path: string) => void;
}

// ── Main export ──────────────────────────────────────────────

export function StudyHubSectionCards({
  semesterGroups,
  allSections,
  sectionProgressMap,
  topicStatusMap = new Map(),
  totalSections,
  totalTopics,
  selectTopic,
  navigate,
}: StudyHubSectionCardsProps) {
  const shouldReduce = useReducedMotion();
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  const hasSemesterGroups = semesterGroups && semesterGroups.length > 0;
  const showSemesterHeaders = hasSemesterGroups && semesterGroups!.length > 1;

  const renderSectionCard = (section: TreeSection, accentIdx: number) => {
    const sp = sectionProgressMap.get(section.id);
    const progress = sp ? sp.progress / 100 : 0;
    const isExpanded = expandedSectionId === section.id;
    const isHidden = expandedSectionId !== null && !isExpanded;

    if (isHidden) return null;

    return (
      <SectionCard
        key={section.id}
        section={section}
        accentIdx={accentIdx}
        progress={progress}
        sectionProgress={sp}
        topicStatusMap={topicStatusMap}
        isExpanded={isExpanded}
        onExpand={() => setExpandedSectionId(section.id)}
        onCollapse={() => setExpandedSectionId(null)}
        onSelectTopic={selectTopic}
        onNavigate={navigate}
      />
    );
  };

  return (
    <>
      {/* ── Section heading ── */}
      <motion.div
        className="flex items-center gap-3 mb-6"
        initial={shouldReduce ? false : { y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: axon.darkTeal }}
        >
          <Folder className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm" style={{ color: '#111827', fontWeight: 700 }}>
            Contenido del Curso
          </h3>
          <p className="text-xs" style={{ color: '#6b7280' }}>
            {totalSections} {totalSections === 1 ? 'seccion' : 'secciones'} &middot; {totalTopics} {totalTopics === 1 ? 'resumen disponible' : 'resumenes disponibles'}
          </p>
        </div>
      </motion.div>

      {/* ── Cards grid ── */}
      {hasSemesterGroups ? (
        semesterGroups!.map((group) => (
          <div key={group.semesterId} className="mb-8">
            {showSemesterHeaders && (
              <motion.div
                className="flex items-center gap-2.5 mb-4"
                initial={shouldReduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <div className="h-px flex-1" style={{ backgroundColor: tint.neutralBorder }} />
                <span
                  className="text-[11px] tracking-wider px-4 py-1.5 rounded-full border"
                  style={{
                    color: axon.sidebarText,
                    backgroundColor: tint.neutralBg,
                    borderColor: tint.neutralBorder,
                    fontWeight: 600,
                  }}
                >
                  {group.semesterName}
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: tint.neutralBorder }} />
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {group.sections.map(({ section, accentIdx }) =>
                  renderSectionCard(section, accentIdx)
                )}
              </AnimatePresence>
            </div>
          </div>
        ))
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <AnimatePresence mode="popLayout">
            {allSections.map(({ section, accentIdx }) =>
              renderSectionCard(section, accentIdx)
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
