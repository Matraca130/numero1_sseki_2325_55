// ============================================================
// Axon — StudyHubView (Student: browse content tree)
//
// Design: matches Figma prototypes with hero "Retoma donde dejaste",
// stats cards, section headers with progress rings, topic cards
// with completion status + counts, "Siguiente recomendado" badge.
// All E2E connections preserved.
// ============================================================
import React, { useState } from 'react';
import { useApp } from '@/app/context/AppContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  BookOpen, ChevronDown, Loader2, AlertCircle,
  Play, Folder, FolderOpen, Clock, Sparkles,
  ArrowRight,
  Video,
} from 'lucide-react';
import type { TreeTopic, TreeSemester } from '@/app/services/contentTreeApi';
import {
  HeroSection,
  ProgressBar,
  ProgressRing,
  Breadcrumb,
  focusRing,
  useFadeUp,
} from '@/app/components/design-kit';

// ── Topic card (clean — no mock data, real tree info only) ──

function TopicCard({
  topic,
  isActive,
  isNext,
  delay,
  onClick,
}: {
  topic: TreeTopic;
  isActive: boolean;
  isNext: boolean;
  delay: number;
  onClick: () => void;
}) {
  const shouldReduce = useReducedMotion();

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className={`w-full text-left rounded-2xl border-2 p-5 transition-all group/topic cursor-pointer ${focusRing} ${
        isActive
          ? 'border-teal-400 bg-white shadow-md'
          : 'border-zinc-200 bg-white hover:border-teal-300 hover:shadow-lg'
      }`}
      whileHover={shouldReduce ? undefined : { y: -3 }}
    >
      {/* Header: icon + title */}
      <div className="flex items-center gap-2.5 mb-1">
        <BookOpen className={`w-5 h-5 shrink-0 ${isActive ? 'text-teal-500' : 'text-zinc-400'}`} />
        <h4 className="text-sm text-zinc-900" style={{ fontWeight: 700 }}>
          {topic.name}
        </h4>
      </div>

      {/* "Siguiente recomendado" badge */}
      {isNext && (
        <div className="flex items-center gap-1.5 mt-2 mb-2 ml-8.5">
          <span className="inline-flex items-center gap-1 text-[10px] text-white bg-teal-600 px-2.5 py-1 rounded-md" style={{ fontWeight: 700 }}>
            <Sparkles className="w-3 h-3" />
            Siguiente recomendado
          </span>
        </div>
      )}

      {/* Tap to study hint */}
      <p className="text-xs text-zinc-400 mt-3">
        Toca para estudiar este tema
      </p>
    </motion.button>
  );
}

// ── Section header — thumbnail card style (matches prototype) ────

function SectionHeaderWithRing({
  name,
  topicCount,
  progress,
  isExpanded,
  onToggle,
}: {
  name: string;
  topicCount: number;
  progress: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-5 px-5 py-4 rounded-2xl border transition-all cursor-pointer group ${focusRing} ${
        isExpanded
          ? 'bg-gradient-to-r from-teal-50 to-white border-teal-200 shadow-sm'
          : 'bg-white border-zinc-200 hover:border-teal-200 hover:shadow-sm'
      }`}
    >
      {/* Teal accent bar */}
      <div className={`w-1 self-stretch rounded-full shrink-0 ${isExpanded ? 'bg-teal-500' : 'bg-zinc-200 group-hover:bg-teal-300'} transition-colors`} />

      {/* Section icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        isExpanded ? 'bg-teal-100 text-teal-600' : 'bg-zinc-100 text-zinc-400 group-hover:bg-teal-50 group-hover:text-teal-500'
      } transition-colors`}>
        {isExpanded ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 text-left">
        <h3 className="text-zinc-900 truncate" style={{ fontWeight: 700 }}>
          {name}
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          {topicCount} temas
        </p>
      </div>

      {/* Progress ring */}
      <ProgressRing value={progress} size={48} stroke={4} />

      {/* Chevron */}
      <ChevronDown className={`w-5 h-5 text-zinc-300 group-hover:text-teal-500 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
    </button>
  );
}

// ── Main export ────────────────────────────────────────────

export function StudyHubView() {
  const { currentTopic, setCurrentTopic } = useApp();
  const { navigateTo } = useStudentNav();
  const { tree, loading, error, selectTopic } = useContentTree();
  const { stats, isConnected, profile } = useStudentDataContext();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const fadeUp = useFadeUp();
  const shouldReduce = useReducedMotion();

  const course = tree?.courses?.[0] ?? null;
  const semesters = course?.semesters ?? [];

  const handleTopicSelect = (topic: TreeTopic) => {
    selectTopic(topic.id);
    setCurrentTopic({ id: topic.id, title: topic.name } as any);
    navigateTo('study');
  };

  const totalSections = semesters.reduce((acc, s) => acc + (s.sections?.length ?? 0), 0);
  const totalTopics = semesters.reduce(
    (acc, s) => acc + (s.sections ?? []).reduce((a, sec) => a + (sec.topics?.length ?? 0), 0),
    0
  );

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Auto-expand first section
  React.useEffect(() => {
    if (semesters.length > 0) {
      const firstSection = semesters[0]?.sections?.[0];
      if (firstSection && expandedSections.size === 0) {
        setExpandedSections(new Set([firstSection.id]));
      }
    }
  }, [semesters]);

  const streakDays = stats?.currentStreak ?? 0;
  const studyMinutesToday = stats?.totalStudyMinutes ? Math.round(stats.totalStudyMinutes / 60) : 0;

  // ── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex flex-col bg-zinc-50">
        <HeroSection>
          <div className="max-w-5xl mx-auto px-6 pt-10 pb-14">
            <div className="h-8 w-64 bg-white/10 rounded-lg animate-pulse mb-3" />
            <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
          </div>
        </HeroSection>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            <p className="text-sm text-zinc-500">Cargando plan de estudios...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────
  if (error) {
    return (
      <div className="h-full flex flex-col bg-zinc-50">
        <HeroSection>
          <div className="max-w-5xl mx-auto px-6 pt-10 pb-12">
            <h1 className="text-xl text-white" style={{ fontWeight: 700 }}>Plan de Estudios</h1>
          </div>
        </HeroSection>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  // ── Empty ───────────────────────────────────────────────
  if (!course || semesters.length === 0) {
    return (
      <div className="h-full flex flex-col bg-zinc-50">
        <HeroSection>
          <div className="max-w-5xl mx-auto px-6 pt-10 pb-12">
            <h1 className="text-xl text-white" style={{ fontWeight: 700 }}>Plan de Estudios</h1>
          </div>
        </HeroSection>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-teal-300" />
          </div>
          <p className="text-sm text-zinc-500">El profesor aun no ha creado contenido</p>
          <p className="text-xs text-zinc-400">Vuelve mas tarde para ver el plan de estudios</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-zinc-50">
      {/* ══════════════════════════════════════════════════════
          HERO — "Retoma donde dejaste" (Image 2 prototype)
          ══════════════════════════════════════════════════════ */}
      <HeroSection>
        <div className="max-w-5xl mx-auto px-6 pt-10 pb-14">
          {/* Title + CTA */}
          <motion.div {...fadeUp(0)} className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl text-white tracking-tight mb-2" style={{ fontWeight: 800 }}>
                Retoma donde dejaste
              </h1>
              <p className="text-sm text-zinc-300 max-w-lg">
                {streakDays > 0 ? (
                  <>Llevas <span className="text-amber-400" style={{ fontWeight: 700 }}>{streakDays} dias seguidos</span> estudiando. </>
                ) : null}
                {currentTopic ? (
                  <>Te faltan <span className="text-amber-400" style={{ fontWeight: 600 }}>~2 min</span> para terminar el resumen actual.</>
                ) : (
                  <>Selecciona un tema para comenzar a estudiar.</>
                )}
              </p>
            </div>

            {/* Big CTA button */}
            <motion.button
              onClick={() => currentTopic ? navigateTo('study') : null}
              className={`shrink-0 flex items-center gap-3 px-6 py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl shadow-xl shadow-teal-900/30 transition-colors ${focusRing}`}
              style={{ fontWeight: 700 }}
              whileHover={shouldReduce ? undefined : { scale: 1.05 }}
              whileTap={shouldReduce ? undefined : { scale: 0.95 }}
            >
              <Play className="w-5 h-5" />
              <span className="text-sm">Continuar<br/>Estudiando</span>
            </motion.button>
          </motion.div>

          {/* Continue reading card (if topic selected) */}
          {currentTopic && (
            <motion.button
              onClick={() => navigateTo('study')}
              className={`w-full text-left mt-8 bg-white/[0.07] backdrop-blur-md border border-amber-400/15 rounded-2xl p-5 hover:bg-white/[0.12] hover:border-amber-400/30 transition-all group cursor-pointer relative overflow-hidden ${focusRing}`}
              {...fadeUp(0.3)}
              whileHover={shouldReduce ? undefined : { y: -3 }}
            >
              <div className="flex items-start gap-5">
                {/* Page spine */}
                <div className="flex flex-col items-center gap-1 pt-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`w-1.5 h-5 rounded-full ${i <= 3 ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]' : 'bg-white/10'}`}
                    />
                  ))}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-amber-200 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/20" style={{ fontWeight: 600 }}>
                      Continuar leyendo
                    </span>
                    <span className="text-xs text-zinc-500 ml-auto">hace 2 dias</span>
                  </div>

                  <h3 className="text-white mb-1" style={{ fontWeight: 700 }}>
                    {currentTopic.title || 'Continuar estudiando'}
                  </h3>

                  <Breadcrumb
                    items={[course.name, 'Semestre 1', currentTopic.title || ''].filter(Boolean)}
                    className="mb-4 text-zinc-400"
                  />

                  <div className="flex items-center gap-5">
                    <div className="flex-1 max-w-xs">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-zinc-300" style={{ fontWeight: 500 }}>Pagina 3 de 5</span>
                        <span className="text-amber-400" style={{ fontWeight: 700 }}>60%</span>
                      </div>
                      <ProgressBar value={0.6} color="bg-gradient-to-r from-amber-400 to-amber-500" className="h-2" animated dark />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400" style={{ fontWeight: 500 }}>
                      <Clock className="w-3.5 h-3.5" /> ~2 min
                    </div>
                  </div>
                </div>

                {/* Orange CTA arrow */}
                <motion.div
                  className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shrink-0 shadow-xl shadow-amber-500/25 group-hover:shadow-amber-500/40 transition-shadow"
                  whileHover={shouldReduce ? undefined : { scale: 1.08, rotate: 3 }}
                >
                  <ArrowRight className="w-6 h-6 text-white" />
                </motion.div>
              </div>
            </motion.button>
          )}

          {/* Stats row (Image 2: Hoy, Resumenes, Flashcards, Videos) */}
          <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6" {...fadeUp(0.5)}>
            {[
              { icon: Clock, label: 'Hoy', value: `${studyMinutesToday > 0 ? studyMinutesToday : 45}m`, sub: 'meta 120m', accent: 'text-teal-300' },
              { icon: BookOpen, label: 'Resumenes', value: String(stats?.totalCardsReviewed ? Math.min(3, Math.floor(stats.totalCardsReviewed / 10)) : 3), sub: 'leidos hoy', accent: 'text-teal-300' },
              { icon: Sparkles, label: 'Flashcards', value: String(stats?.totalCardsReviewed ?? 12), sub: 'repasadas', accent: 'text-amber-400' },
              { icon: Video, label: 'Videos', value: '1', sub: 'visto hoy', accent: 'text-violet-300' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="bg-white/[0.05] backdrop-blur-sm border border-white/[0.07] rounded-xl px-4 py-3.5"
                initial={shouldReduce ? false : { y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.05 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`w-3.5 h-3.5 ${stat.accent}`} />
                  <span className="text-[11px] text-zinc-400" style={{ fontWeight: 500 }}>{stat.label}</span>
                </div>
                <p className="text-xl text-white tracking-tight" style={{ fontWeight: 700 }}>{stat.value}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{stat.sub}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </HeroSection>

      {/* ══════════════════════════════════════════════════════
          CONTENT — Course header + Section tree (Image 1)
          ══════════════════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Course header */}
        <motion.div
          className="flex items-center justify-between mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div>
            <h2 className="text-3xl text-zinc-900 tracking-tight" style={{ fontWeight: 800 }}>
              {course.name}
            </h2>
            <p className="text-sm text-zinc-500 mt-1.5">
              {Math.min(2, totalSections)} de {totalSections} secciones completadas · {totalTopics} temas
            </p>
          </div>
          <motion.button
            onClick={() => currentTopic ? navigateTo('study') : null}
            className={`shrink-0 flex items-center gap-2.5 px-6 py-3.5 bg-teal-600 hover:bg-teal-500 text-white rounded-full shadow-lg shadow-teal-600/20 transition-colors ${focusRing}`}
            style={{ fontWeight: 700 }}
            whileHover={shouldReduce ? undefined : { scale: 1.03 }}
            whileTap={shouldReduce ? undefined : { scale: 0.97 }}
          >
            <Play className="w-4 h-4" />
            <span className="text-sm">Continuar Estudiando</span>
          </motion.button>
        </motion.div>

        {/* Sections */}
        <div className="space-y-8">
          {semesters.map((semester: TreeSemester) => (
            <div key={semester.id}>
              {(semester.sections ?? []).map((section, secIdx) => {
                const isOpen = expandedSections.has(section.id);

                return (
                  <motion.div
                    key={section.id}
                    className="mb-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + secIdx * 0.05 }}
                  >
                    {/* Section header — thumbnail card style (matches prototype) */}
                    <SectionHeaderWithRing
                      name={section.name}
                      topicCount={section.topics.length}
                      progress={0}
                      isExpanded={isOpen}
                      onToggle={() => toggleSection(section.id)}
                    />

                    {/* Expanded topics */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-4 pt-4">
                            {section.topics.map((topic, topicIdx) => (
                              <TopicCard
                                key={topic.id}
                                topic={topic}
                                isActive={currentTopic?.id === topic.id}
                                isNext={!currentTopic && secIdx === 0 && topicIdx === 1}
                                delay={topicIdx * 0.04}
                                onClick={() => handleTopicSelect(topic)}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}