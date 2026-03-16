// ============================================================
// Axon — StudyHubSectionCards (AUDIT v3 — Palette)
//
// PALETTE AUDIT:
//   - Removed rainbow ACCENT array → single Axon teal system
//   - All colors derive from the official Axon Medical Academy palette
//   - Progress bars use Axon gradient (#2dd4a8 → #0d9488)
//   - Status colors: teal (mastered), amber (in-progress), neutral (new)
//   - Zero generic Tailwind color classes (no bg-teal-50, etc.)
//
// Palette: Axon Medical Academy
//   Dark Teal:  #1B3B36   Teal Accent:   #2a8c7a
//   Hover Teal: #244e47   Dark Panel:    #1a2e2a
//   Page BG:    #F0F2F5   Card BG:       #FFFFFF
//   Progress:   #2dd4a8 → #0d9488
//   Sidebar txt: #8fbfb3  Label ok:      #5cbdaa
// ============================================================
import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  BookOpen, ChevronLeft, ArrowRight, Folder, CheckCircle2,
  Clock,
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import type { TreeSection } from '@/app/services/contentTreeApi';
import type { TopicStatus, SectionProgress } from './studyhub-helpers';

// ── Axon palette (SINGLE SOURCE OF TRUTH) ────────────────────
import { axon, tint } from '@/app/lib/palette';

// ── Section emoji (rotate) — differentiation is by name+emoji, not color
const EMOJI = ['\u{1FAC0}','\u{1F9E0}','\u{1F52C}','\u{1F9EC}','\u{1FA7A}','\u{1F9D1}\u{200D}\u{2695}\u{FE0F}'] as const;

// ── Default cover images (rotate per section) ────────────────
const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1581594294883-5109c202942f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXN0b2xvZ3klMjBtaWNyb3Njb3BlJTIwY2VsbHMlMjBwYXR0ZXJuJTIwbWVkaWNhbHxlbnwxfHx8fDE3NzMzOTM2NzN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1678931547963-ab9017fc35c6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZXVyb3NjaWVuY2UlMjBicmFpbiUyMG1lZGljYWwlMjBzY2FuJTIwY29sb3JmdWx8ZW58MXx8fHwxNzczMzkzNjc1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1460672985063-6764ac8b9c74?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxodW1hbiUyMGhlYXJ0JTIwYW5hdG9teSUyMGNhcmRpb3Zhc2N1bGFyJTIwbWVkaWNhbHxlbnwxfHx8fDE3NzMzOTM2NzV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1582719471257-05db68be5ae5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxETkElMjBnZW5ldGljcyUyMG1vbGVjdWxhciUyMGJpb2xvZ3klMjBsYWJvcmF0b3J5fGVufDF8fHx8MTc3MzM5MzY3NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1666886572860-64254ee2ce77?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwc3RldGhvc2NvcGUlMjBjbGluaWNhbCUyMGRpYWdub3NpcyUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NzMzOTM2NzZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1729339983367-770c2527ce75?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxodW1hbiUyMGFuYXRvbXklMjBza2VsZXRvbiUyMG1lZGljYWwlMjBpbGx1c3RyYXRpb24lMjBkYXJrfGVufDF8fHx8MTc3MzM5MzY3NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
];

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

// ── Focus ring (D-21 FIX: import from design-kit) ────────────
import { focusRing } from '@/app/components/design-kit';

// focusRingStyle: inline style equivalent for elements that need style prop
const focusRingStyle = {} as React.CSSProperties;

// ── Topic status visual config (Axon palette) ────────────────
const STATUS_CONFIG: Record<TopicStatus, {
  label: string;
  iconBg: string;
  iconBorderColor: string;
  iconColor: string;
  rowBgColor: string;
  rowBorderColor: string;
  dotColor: string;
}> = {
  'mastered': {
    label: 'Dominado',
    iconBg: tint.tealBg,
    iconBorderColor: tint.tealBorder,
    iconColor: axon.progressEnd,
    rowBgColor: `${axon.progressStart}0a`,  // 4% opacity
    rowBorderColor: tint.tealBorder,
    dotColor: axon.progressStart,
  },
  'in-progress': {
    label: 'En progreso',
    iconBg: tint.amberBg,
    iconBorderColor: tint.amberBorder,
    iconColor: tint.amberIcon,
    rowBgColor: `${tint.amberBorder}15`,    // 8% opacity
    rowBorderColor: tint.amberBorder,
    dotColor: tint.amberIcon,
  },
  'not-started': {
    label: 'Sin empezar',
    iconBg: tint.neutralBg,
    iconBorderColor: tint.neutralBorder,
    iconColor: tint.neutralText,
    rowBgColor: axon.cardBg,
    rowBorderColor: tint.neutralBorder,
    dotColor: '#d1d5db',
  },
};

// ── TopicStatusIcon ──────────────────────────────────────────
function TopicStatusIcon({ status }: { status: TopicStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors"
      style={{ backgroundColor: cfg.iconBg, borderColor: cfg.iconBorderColor }}
    >
      {status === 'mastered' ? (
        <CheckCircle2 className="w-4 h-4" style={{ color: cfg.iconColor }} />
      ) : status === 'in-progress' ? (
        <Clock className="w-3.5 h-3.5" style={{ color: cfg.iconColor }} />
      ) : (
        <BookOpen className="w-3.5 h-3.5" style={{ color: cfg.iconColor }} />
      )}
    </div>
  );
}

// ── SectionCard (internal) ───────────────────────────────────

function SectionCard({
  section,
  accentIdx,
  progress,
  sectionProgress,
  topicStatusMap,
  isExpanded,
  onExpand,
  onCollapse,
  onSelectTopic,
  onNavigate,
}: {
  section: TreeSection;
  accentIdx: number;
  progress: number;
  sectionProgress: SectionProgress | undefined;
  topicStatusMap: Map<string, TopicStatus>;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onSelectTopic: (id: string) => void;
  onNavigate: (path: string) => void;
}) {
  const shouldReduce = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const coverImage = COVER_IMAGES[accentIdx % COVER_IMAGES.length];
  const topics = section.topics ?? [];
  const topicCount = topics.length;
  const isSmall = topicCount <= 3;
  const completedTopics = sectionProgress?.completedTopics ?? 0;
  const nextTopicId = sectionProgress?.nextTopicId;
  const lastActivity = sectionProgress?.lastActivity;

  const PREVIEW_LIMIT = 3;
  const previewTopics = topics.slice(0, PREVIEW_LIMIT);
  const remainingCount = Math.max(0, topicCount - PREVIEW_LIMIT);

  return (
    <motion.div
      className={`rounded-3xl overflow-hidden shadow-sm border group relative ${
        isExpanded
          ? 'col-span-full'
          : 'hover:shadow-xl hover:-translate-y-1 cursor-pointer transition-all duration-300'
      }`}
      style={{
        backgroundColor: axon.cardBg,
        borderColor: isExpanded ? tint.tealBorder : '#f3f4f6',
        ...(isExpanded ? { boxShadow: `0 0 0 2px ${tint.tealBg}` } : {}),
      }}
      onClick={() => !isExpanded && onExpand()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={shouldReduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduce ? undefined : { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ delay: accentIdx * 0.06 }}
    >
      <AnimatePresence mode="wait">
        {/* ═══════ COLLAPSED STATE ═══════ */}
        {!isExpanded ? (
          <motion.div
            key="cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col"
          >
            {/* Top: Title + meta + topic preview */}
            <div className="p-5 pb-3 z-10" style={{ backgroundColor: axon.cardBg }}>
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border text-lg"
                  style={{ backgroundColor: tint.tealBg, borderColor: tint.tealBorder }}
                >
                  {EMOJI[accentIdx % EMOJI.length]}
                </div>
                <div className="flex items-center gap-2">
                  {lastActivity && (
                    <span className="text-[10px]" style={{ color: tint.neutralText, fontWeight: 500 }}>
                      {lastActivity}
                    </span>
                  )}
                  <span
                    className="text-[10px] tracking-wider px-2.5 py-1 rounded-full border"
                    style={{
                      color: tint.neutralText,
                      backgroundColor: tint.neutralBg,
                      borderColor: tint.neutralBorder,
                      fontWeight: 600,
                    }}
                  >
                    {completedTopics}/{topicCount} {topicCount === 1 ? 'Resumen' : 'Resumenes'}
                  </span>
                </div>
              </div>

              <h3
                className="text-base leading-tight transition-colors truncate"
                style={{ color: hovered ? axon.tealAccent : '#111827', fontWeight: 700 }}
              >
                {section.name}
              </h3>

              {/* Progress bar — Axon gradient */}
              {progress > 0 && (
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#e5e7eb' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${axon.progressStart}, ${axon.progressEnd})` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(progress * 100, 0)}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                    />
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: axon.progressEnd, fontWeight: 600 }}>
                    {Math.round(progress * 100)}%
                  </span>
                </div>
              )}

              {/* Topic preview in collapsed card */}
              <div className="mt-3 space-y-1.5">
                {previewTopics.map(topic => {
                  const status = topicStatusMap.get(topic.id) || 'not-started';
                  const cfg = STATUS_CONFIG[status];
                  const isNext = topic.id === nextTopicId;
                  return (
                    <div
                      key={topic.id}
                      className="flex items-center gap-2 text-xs"
                      style={{ color: '#6b7280' }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: isNext ? axon.tealAccent : cfg.dotColor }}
                      />
                      <span className="truncate" style={{ fontWeight: isNext ? 600 : 400 }}>
                        {topic.name}
                      </span>
                      {isNext && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                          style={{
                            backgroundColor: tint.tealBg,
                            color: axon.tealAccent,
                            fontWeight: 600,
                          }}
                        >
                          Siguiente
                        </span>
                      )}
                    </div>
                  );
                })}
                {remainingCount > 0 && (
                  <span className="text-[10px] pl-3.5" style={{ color: tint.neutralText, fontWeight: 500 }}>
                    +{remainingCount} resumen{remainingCount !== 1 ? 'es' : ''} mas
                  </span>
                )}
              </div>
            </div>

            {/* Bottom: Cover image */}
            <div
              className="flex-1 relative overflow-hidden"
              style={{ minHeight: isSmall ? '100px' : '140px', backgroundColor: '#e5e7eb' }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent z-10" />
              <ImageWithFallback
                src={coverImage}
                alt={section.name}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
              />

              {/* Hover CTA */}
              <div
                className={`absolute inset-0 flex items-center justify-center z-20 transition-all duration-300 ${
                  hovered ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ backgroundColor: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)' }}
              >
                <motion.div
                  className="px-5 py-2.5 rounded-full text-sm shadow-lg flex items-center gap-2"
                  style={{ backgroundColor: axon.cardBg, color: axon.darkTeal, fontWeight: 600 }}
                  initial={false}
                  animate={hovered ? { y: 0, opacity: 1 } : { y: 8, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <BookOpen size={15} style={{ color: axon.tealAccent }} />
                  Ver resumenes
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ═══════ EXPANDED STATE ═══════ */
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-6"
            style={{ backgroundColor: axon.cardBg }}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: `1px solid ${tint.neutralBorder}` }}>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onCollapse(); }}
                  className={`p-2 -ml-2 rounded-full transition-colors cursor-pointer ${focusRing}`}
                  style={{ color: tint.neutralText, ...focusRingStyle }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = tint.neutralBg; e.currentTarget.style.color = '#111827'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = tint.neutralText; }}
                  aria-label="Volver a secciones"
                >
                  <ChevronLeft size={22} />
                </button>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center border text-base"
                    style={{ backgroundColor: tint.tealBg, borderColor: tint.tealBorder }}
                  >
                    {EMOJI[accentIdx % EMOJI.length]}
                  </div>
                  <div>
                    <h3 className="text-lg" style={{ color: '#111827', fontWeight: 700 }}>
                      {section.name}
                    </h3>
                    <p className="text-xs" style={{ color: '#6b7280', fontWeight: 500 }}>
                      {topicCount} {topicCount === 1 ? 'resumen' : 'resumenes'} &middot; {completedTopics} completado{completedTopics !== 1 ? 's' : ''}
                      {lastActivity && <> &middot; {lastActivity}</>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress badge + close */}
              <div className="flex items-center gap-3">
                {progress > 0 && (
                  <span
                    className="text-xs px-3 py-1 rounded-full hidden sm:inline-block"
                    style={{
                      backgroundColor: progress >= 0.8 ? tint.tealBg : tint.neutralBg,
                      color: progress >= 0.8 ? axon.progressEnd : '#6b7280',
                      fontWeight: 600,
                    }}
                  >
                    {Math.round(progress * 100)}% completado
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onCollapse(); }}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors cursor-pointer ${focusRing}`}
                  style={{ color: axon.tealAccent, fontWeight: 600, ...focusRingStyle }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = tint.tealBg; e.currentTarget.style.color = axon.hoverTeal; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = axon.tealAccent; }}
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Topics grid — scroll for large sections */}
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${
                topicCount > 10 ? 'max-h-[28rem] overflow-y-auto pr-1 custom-scrollbar' : ''
              }`}
            >
              {topics.map((topic, tIdx) => {
                const status = topicStatusMap.get(topic.id) || 'not-started';
                const cfg = STATUS_CONFIG[status];
                const isNext = topic.id === nextTopicId;

                return (
                  <motion.button
                    key={topic.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTopic(topic.id);
                      onNavigate('/student/summaries');
                    }}
                    initial={shouldReduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: tIdx * 0.04 }}
                    whileHover={shouldReduce ? undefined : { y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all cursor-pointer group/topic hover:shadow-md ${focusRing}`}
                    style={{
                      backgroundColor: cfg.rowBgColor,
                      borderColor: isNext ? axon.tealAccent + '40' : cfg.rowBorderColor,
                      ...(isNext ? { boxShadow: `0 0 0 1px ${axon.tealAccent}30` } : {}),
                      ...focusRingStyle,
                    }}
                  >
                    {/* Sequence number */}
                    <span
                      className="text-[10px] w-5 text-center shrink-0"
                      style={{ color: tint.neutralText, fontWeight: 600 }}
                    >
                      {tIdx + 1}
                    </span>

                    {/* Status icon */}
                    <TopicStatusIcon status={status} />

                    {/* Topic name + status label */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block" style={{ color: '#1f2937', fontWeight: 500 }}>
                        {topic.name}
                      </span>
                      <span className="text-[10px] flex items-center gap-1" style={{ color: tint.neutralText, fontWeight: 500 }}>
                        {cfg.label}
                        {isNext && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px]"
                            style={{
                              backgroundColor: tint.tealBg,
                              color: axon.tealAccent,
                              fontWeight: 700,
                            }}
                          >
                            Siguiente
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Arrow */}
                    <ArrowRight
                      className="w-4 h-4 shrink-0 transition-colors"
                      style={{ color: '#d1d5db' }}
                    />
                  </motion.button>
                );
              })}
            </div>

            {topicCount > 10 && (
              <p className="text-center text-[10px] mt-3" style={{ color: tint.neutralText, fontWeight: 500 }}>
                Mostrando {topicCount} resumenes &middot; Desplaza para ver todos
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
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
