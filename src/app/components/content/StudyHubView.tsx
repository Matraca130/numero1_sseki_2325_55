// ============================================================
// Axon — StudyHubView (Student: browse content tree)
//
// Design: matches Figma prototypes with hero "Retoma donde dejaste",
// stats cards, section headers with progress rings, topic cards
// with completion status + counts, "Siguiente recomendado" badge.
// All E2E connections preserved.
// ============================================================
import React, { useMemo } from 'react';
import { useApp } from '@/app/context/AppContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { motion, useReducedMotion } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  BookOpen, Loader2, AlertCircle,
  Play, Clock, Sparkles,
  ArrowRight, GraduationCap, Trophy, BarChart3, TrendingUp, Target,
} from 'lucide-react';
import type { TreeTopic, TreeSemester, TreeSection } from '@/app/services/contentTreeApi';
import {
  HeroSection,
  ProgressBar,
  Breadcrumb,
  focusRing,
} from '@/app/components/design-kit';
import { useMotionPresets } from '@/app/components/shared/FadeIn';
import type { StudySession } from '@/app/types/student';
import { useLastStudiedTopic } from '@/app/hooks/useLastStudiedTopic';

// ── Helpers: relative time + section progress from real data ─────

/** Formats an ISO date string as a relative time string (e.g. "hace 2 días") */
function formatRelativeTime(isoDate: string | undefined | null): string | undefined {
  if (!isoDate) return undefined;
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  if (isNaN(then)) return undefined;

  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'justo ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'hace 1 día';
  if (diffD < 30) return `hace ${diffD} días`;
  const diffM = Math.floor(diffD / 30);
  return diffM === 1 ? 'hace 1 mes' : `hace ${diffM} meses`;
}

/** Compute per-section stats from real sessions + courseProgress */
interface SectionProgress {
  completedTopics: number;
  progress: number; // 0-100
  lastActivity: string | undefined;
  nextTopicName: string | undefined;
}

function computeSectionProgress(
  section: TreeSection,
  sessions: StudySession[],
  courseProgressTopicIds: Set<string>,
): SectionProgress {
  const topicIds = new Set(section.topics.map(t => t.id));

  // A topic counts as "touched" if it has at least 1 session OR appears in courseProgress
  const touchedTopicIds = new Set<string>();
  let latestSessionDate: string | undefined;

  for (const s of sessions) {
    if (s.topicId && topicIds.has(s.topicId)) {
      touchedTopicIds.add(s.topicId);
      if (!latestSessionDate || s.startedAt > latestSessionDate) {
        latestSessionDate = s.startedAt;
      }
    }
  }
  // Also count topics from courseProgress (bkt-states — when available)
  for (const tid of courseProgressTopicIds) {
    if (topicIds.has(tid)) touchedTopicIds.add(tid);
  }

  const completedTopics = touchedTopicIds.size;
  const progress = section.topics.length > 0
    ? Math.round((completedTopics / section.topics.length) * 100)
    : 0;

  // Next topic = first topic in order that hasn't been touched
  const nextTopic = section.topics.find(t => !touchedTopicIds.has(t.id));

  return {
    completedTopics,
    progress,
    lastActivity: formatRelativeTime(latestSessionDate),
    nextTopicName: nextTopic?.name,
  };
}

// Accent palette: cycles through colors per section index
const SECTION_ACCENTS = [
  { border: 'border-t-teal-500',   bar: 'bg-teal-500',   iconBg: 'bg-teal-50',  iconText: 'text-teal-600',  icon: '🫀' },
  { border: 'border-t-blue-500',   bar: 'bg-blue-500',   iconBg: 'bg-blue-50',   iconText: 'text-blue-600',  icon: '🦠' },
  { border: 'border-t-amber-500',  bar: 'bg-amber-500',  iconBg: 'bg-amber-50',  iconText: 'text-amber-600', icon: '🔬' },
  { border: 'border-t-pink-500',   bar: 'bg-pink-500',   iconBg: 'bg-pink-50',   iconText: 'text-pink-600',  icon: '🧬' },
] as const;

// ── Main export ────────────────────────────────────────────

export function StudyHubView() {
  const { currentTopic, setCurrentTopic } = useApp();
  const { navigateTo } = useStudentNav();
  const { tree, loading, error, selectTopic } = useContentTree();
  const { stats, isConnected, profile, sessions, courseProgress } = useStudentDataContext();
  const { fadeUp } = useMotionPresets();
  const shouldReduce = useReducedMotion();
  const navigate = useNavigate();

  const course = tree?.courses?.[0] ?? null;
  const semesters = course?.semesters ?? [];

  // ── Derive the "effective topic" for the hero ──────────────
  // If the user already selected a topic (currentTopic), use it.
  // Otherwise, auto-derive from the most recent session or first tree topic.
  const lastStudied = useLastStudiedTopic(semesters, sessions);

  const effectiveTopic = useMemo(() => {
    if (currentTopic) return currentTopic;
    if (!lastStudied) return null;
    // Shape it like the legacy Topic type that AppContext expects
    return { id: lastStudied.id, title: lastStudied.name } as typeof currentTopic;
  }, [currentTopic, lastStudied]);

  const isAutoSelected = !currentTopic && !!effectiveTopic;

  // ── Real progress: build a Set of topic IDs that have courseProgress data ──
  const courseProgressTopicIds = useMemo(() => {
    const ids = new Set<string>();
    for (const cp of courseProgress) {
      for (const tp of cp.topicProgress ?? []) {
        if (tp.masteryPercent > 0 || tp.reviewCount > 0) {
          ids.add(tp.topicId);
        }
      }
    }
    return ids;
  }, [courseProgress]);

  // ── Pre-compute section progress map (memoized to avoid re-calc on every render) ──
  const sectionProgressMap = useMemo(() => {
    const map = new Map<string, SectionProgress>();
    for (const sem of semesters) {
      for (const sec of sem.sections ?? []) {
        map.set(sec.id, computeSectionProgress(sec, sessions, courseProgressTopicIds));
      }
    }
    return map;
  }, [semesters, sessions, courseProgressTopicIds]);

  // ── Derived: how many sections have at least 1 completed topic ──
  const completedSectionsCount = useMemo(() => {
    let count = 0;
    for (const sp of sectionProgressMap.values()) {
      if (sp.progress === 100) count++;
    }
    return count;
  }, [sectionProgressMap]);

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

  const streakDays = stats?.currentStreak ?? 0;
  const studyMinutesToday = stats?.totalStudyMinutes ? Math.round(stats.totalStudyMinutes / 60) : 0;

  // ── Flat list of all sections with their accent index ──
  const allSections = useMemo(() => {
    const result: { section: TreeSection; accentIdx: number }[] = [];
    let idx = 0;
    for (const sem of semesters) {
      for (const sec of sem.sections ?? []) {
        result.push({ section: sec, accentIdx: idx++ });
      }
    }
    return result;
  }, [semesters]);

  // ── Weekly activity from real sessions (last 7 days) ──
  const weeklyActivity = useMemo(() => {
    const dayLabels = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const today = new Date();
    const days: { day: string; value: number; active: boolean }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayMin = sessions
        .filter(s => s.startedAt?.slice(0, 10) === dateStr)
        .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
      days.push({
        day: i === 0 ? 'Hoy' : dayLabels[d.getDay()],
        value: dayMin,
        active: i === 0,
      });
    }
    return days;
  }, [sessions]);

  const weeklyTotalMin = weeklyActivity.reduce((a, d) => a + d.value, 0);
  const maxBarValue = Math.max(...weeklyActivity.map(d => d.value), 1);
  const goalMinutes = profile?.preferences?.dailyGoalMinutes ?? 120;

  // ── Section card colors (hex for inline styles) ──
  const SECTION_COLORS = ['#14b8a6', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'] as const;

  // ── Real hero data: last session, breadcrumb, topic progress, today stats ──

  /** Most recent session for the current topic */
  const lastTopicSession = useMemo(() => {
    if (!effectiveTopic?.id) return null;
    return sessions
      .filter(s => s.topicId === effectiveTopic.id)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
  }, [sessions, effectiveTopic?.id]);

  /** Breadcrumb path from the real content tree */
  const topicBreadcrumb = useMemo(() => {
    if (!effectiveTopic?.id || !course) return { semesterName: '', sectionName: '' };
    for (const sem of course.semesters) {
      for (const sec of sem.sections ?? []) {
        for (const t of sec.topics) {
          if (t.id === effectiveTopic.id) {
            return { semesterName: sem.name, sectionName: sec.name };
          }
        }
      }
    }
    return { semesterName: '', sectionName: '' };
  }, [effectiveTopic?.id, course]);

  /** Topic-level mastery from courseProgress */
  const topicMastery = useMemo(() => {
    if (!effectiveTopic?.id) return null;
    for (const cp of courseProgress) {
      for (const tp of cp.topicProgress ?? []) {
        if (tp.topicId === effectiveTopic.id) return tp;
      }
    }
    return null;
  }, [courseProgress, effectiveTopic?.id]);

  /** Today's aggregated stats from real sessions */
  const todayStats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySessions = sessions.filter(s => s.startedAt?.slice(0, 10) === todayStr);
    return {
      minutes: todaySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0),
      summaries: todaySessions.filter(s => s.type === 'reading').length,
      flashcards: todaySessions.reduce((acc, s) => acc + (s.cardsReviewed || 0), 0),
      videos: todaySessions.filter(s => s.type === 'video').length,
    };
  }, [sessions]);

  // Derived hero values
  const heroProgress = topicMastery ? topicMastery.masteryPercent / 100 : 0;
  const heroProgressPct = Math.round(heroProgress * 100);
  const heroLastActivity = formatRelativeTime(lastTopicSession?.startedAt);
  const heroReadingSessions = sessions.filter(
    s => s.topicId === effectiveTopic?.id && s.type === 'reading'
  ).length;
  // Estimate remaining time: if avg session is ~5min and mastery < 100, rough calc
  const avgSessionMin = useMemo(() => {
    const readingSessions = sessions.filter(s => s.type === 'reading' && s.durationMinutes > 0);
    if (readingSessions.length === 0) return 5;
    return Math.round(readingSessions.reduce((a, s) => a + s.durationMinutes, 0) / readingSessions.length);
  }, [sessions]);
  const estimatedRemaining = heroProgress > 0 && heroProgress < 1
    ? Math.max(1, Math.round(avgSessionMin * (1 - heroProgress)))
    : null;

  // ── Greeting based on time of day ──
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);
  const userName = profile?.name?.split(' ')[0] || '';

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
          {/* Greeting */}
          <motion.p {...fadeUp(0)} className="text-sm text-zinc-300 mb-1.5">
            👋 {greeting}{userName ? `, ${userName}` : ''}
          </motion.p>

          {/* Title + subtitle */}
          <motion.div {...fadeUp(0.1)}>
            <h1 className="text-2xl sm:text-3xl text-white tracking-tight mb-2" style={{ fontWeight: 800 }}>
              {heroReadingSessions > 0 ? 'Retoma donde dejaste' : 'Empezar a estudiar'}
            </h1>
            <p className="text-sm text-zinc-300 max-w-lg">
              {streakDays > 0 ? (
                <>Llevas <span className="text-amber-400" style={{ fontWeight: 700 }}>{streakDays} dias seguidos</span> estudiando. </>
              ) : null}
              {effectiveTopic ? (
                estimatedRemaining != null ? (
                  <>Te faltan <span className="text-amber-400" style={{ fontWeight: 600 }}>~{estimatedRemaining} min</span> para terminar el resumen actual.</>
                ) : heroProgressPct > 0 ? (
                  <>Llevas un <span className="text-amber-400" style={{ fontWeight: 600 }}>{heroProgressPct}%</span> de avance en este tema.</>
                ) : (
                  <>Te sugerimos un tema para empezar.</>
                )
              ) : (
                <>Explora las secciones y elige un tema.</>
              )}
            </p>
          </motion.div>

          {/* Study card — ALWAYS visible: shows continue or suggestion */}
          {effectiveTopic ? (
            <motion.button
              onClick={() => {
                // Materialize the auto-derived topic into AppContext before navigating
                if (isAutoSelected) {
                  selectTopic(effectiveTopic.id);
                  setCurrentTopic({ id: effectiveTopic.id, title: effectiveTopic.title } as any);
                }
                navigateTo('study');
              }}
              className={`w-full text-left mt-8 bg-white/[0.07] backdrop-blur-md border border-amber-400/15 rounded-2xl p-6 hover:bg-white/[0.12] hover:border-amber-400/30 transition-all group cursor-pointer relative overflow-hidden ${focusRing}`}
              {...fadeUp(0.4)}
              whileHover={shouldReduce ? undefined : { y: -3 }}
            >
              {/* Page spine — absolute positioned left edge */}
              <div className="absolute left-2.5 top-5 bottom-5 flex flex-col items-center gap-1.5">
                {Array.from({ length: 5 }, (_, i) => {
                  // Derive spine from real progress: how many of 5 segments are "read"
                  const filledSegments = Math.max(0, Math.min(5, Math.round(heroProgress * 5)));
                  const isRead = i < filledSegments;
                  const isCurrent = i === filledSegments - 1 && filledSegments > 0 && filledSegments < 5;
                  return (
                    <motion.div
                      key={i}
                      className={`w-1.5 flex-1 rounded-full ${
                        isRead ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]' : 'bg-white/10'
                      }`}
                      initial={shouldReduce ? false : { scaleY: 0 }}
                      animate={{
                        scaleY: 1,
                        opacity: isCurrent && !shouldReduce ? [0.6, 1, 0.6] : 1,
                      }}
                      transition={{
                        scaleY: { delay: 0.5 + i * 0.08, duration: 0.3 },
                        opacity: isCurrent ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : undefined,
                      }}
                      style={{ originY: 0 }}
                    />
                  );
                })}
              </div>

              <div className="flex items-start gap-6 pl-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border ${
                      heroReadingSessions > 0
                        ? 'text-amber-200 bg-amber-500/15 border-amber-500/20'
                        : 'text-teal-200 bg-teal-500/15 border-teal-500/20'
                    }`} style={{ fontWeight: 600 }}>
                      {heroReadingSessions > 0 ? 'Continuar leyendo' : 'Sugerencia de estudio'}
                    </span>
                    {heroLastActivity && (
                      <span className="text-xs text-zinc-400 ml-auto">{heroLastActivity}</span>
                    )}
                  </div>

                  <h3 className="text-lg text-white tracking-tight mb-1.5" style={{ fontWeight: 700 }}>
                    {effectiveTopic.title || 'Continuar estudiando'}
                  </h3>

                  <Breadcrumb
                    items={[course.name, topicBreadcrumb.sectionName, effectiveTopic.title || ''].filter(Boolean)}
                    className="mb-5 text-zinc-400"
                    dark
                  />

                  <div className="flex items-center gap-5">
                    <div className="flex-1 max-w-xs">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-zinc-300" style={{ fontWeight: 500 }}>
                          {heroReadingSessions > 0
                            ? `${heroReadingSessions} sesion${heroReadingSessions !== 1 ? 'es' : ''} de lectura`
                            : 'Tema nuevo — empieza aqui'}
                        </span>
                        <span className="text-amber-400" style={{ fontWeight: 700 }}>{heroProgressPct}%</span>
                      </div>
                      <ProgressBar value={heroProgress} color="bg-gradient-to-r from-amber-400 to-amber-500" className="h-2" animated dark />
                    </div>
                    {estimatedRemaining != null && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400" style={{ fontWeight: 500 }}>
                        <Clock className="w-3.5 h-3.5" /> ~{estimatedRemaining} min
                      </div>
                    )}
                  </div>
                </div>

                {/* Orange CTA arrow */}
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shrink-0 shadow-xl shadow-amber-500/25 group-hover:shadow-amber-500/40 transition-shadow"
                  whileHover={shouldReduce ? undefined : { scale: 1.08, rotate: 3 }}
                  whileTap={shouldReduce ? undefined : { scale: 0.95 }}
                >
                  <ArrowRight className="w-7 h-7 text-white" />
                </motion.div>
              </div>
            </motion.button>
          ) : (
            /* Fallback: no topic derivable — prompt to explore sections below */
            <motion.div
              className="mt-8 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center"
              {...fadeUp(0.4)}
            >
              <BookOpen className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
              <p className="text-sm text-zinc-300" style={{ fontWeight: 600 }}>Explora las secciones abajo y elige tu primer tema</p>
              <p className="text-xs text-zinc-400 mt-1">Tu progreso aparecera aqui</p>
            </motion.div>
          )}

          {/* Stats row (Hoy, Resumenes, Flashcards, Videos) */}
          <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6" {...fadeUp(0.5)}>
            {[
              { icon: Clock, label: 'Hoy', value: `${todayStats.minutes > 0 ? todayStats.minutes : studyMinutesToday > 0 ? studyMinutesToday : 0}m`, sub: `meta ${profile?.preferences?.dailyGoalMinutes ?? 120}m`, accent: 'text-teal-300' },
              { icon: BookOpen, label: 'Resúmenes', value: String(todayStats.summaries), sub: 'leidos hoy', accent: 'text-teal-300' },
              { icon: Sparkles, label: 'Flashcards', value: String(todayStats.flashcards > 0 ? todayStats.flashcards : stats?.totalCardsReviewed ?? 0), sub: todayStats.flashcards > 0 ? 'hoy' : 'total', accent: 'text-amber-400' },
              { icon: Play, label: 'Videos', value: String(todayStats.videos), sub: 'visto hoy', accent: 'text-violet-300' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="bg-white/[0.05] backdrop-blur-sm border border-white/[0.10] rounded-xl px-4 py-3.5"
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

      {/* ═══════════════════════════════════════ */}
      {/* CONTENT BELOW HERO                      */}
      {/* ═══════════════════════════════════════ */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* ── Tus Materias (section cards) ── */}
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
                  onClick={() => {
                    // Navigate to the section study plan with query param
                    navigate(`/student/study-plan?sectionId=${section.id}`);
                  }}
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

        {/* ── Actividad Semanal ── */}
        <motion.div
          className="bg-white border border-zinc-200 rounded-2xl p-6 relative overflow-hidden"
          {...fadeUp(0.6)}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-teal-700" />
              </div>
              <div>
                <h3 className="text-sm text-zinc-900" style={{ fontWeight: 700 }}>Actividad Semanal</h3>
                <p className="text-xs text-zinc-500" style={{ fontWeight: 400 }}>Tu progreso de los últimos 7 días</p>
              </div>
            </div>

            {weeklyTotalMin > 0 && (
              <motion.span
                className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1.5"
                initial={shouldReduce ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 1 }}
                style={{ fontWeight: 600 }}
              >
                <TrendingUp className="w-3 h-3" />
                {weeklyTotalMin} min esta semana
              </motion.span>
            )}
          </div>

          {/* Chart area */}
          <div className="flex items-end gap-2 h-32 px-2">
            {weeklyActivity.map((bar, i) => (
              <div key={bar.day} className="flex-1 flex flex-col items-center gap-2">
                <motion.div
                  className="relative w-full max-w-10 group/bar cursor-pointer"
                  initial={shouldReduce ? { height: `${(bar.value / maxBarValue) * 100}px` } : { height: 0 }}
                  animate={{ height: `${Math.max((bar.value / maxBarValue) * 100, bar.value > 0 ? 8 : 4)}px` }}
                  transition={{ delay: 0.8 + i * 0.06, duration: 0.4, ease: 'easeOut' }}
                >
                  <div
                    className={`w-full h-full rounded-lg transition-colors ${
                      bar.active
                        ? 'bg-teal-600 shadow-md shadow-teal-600/20'
                        : bar.value > 0 ? 'bg-zinc-300 hover:bg-zinc-400' : 'bg-zinc-200'
                    }`}
                  />
                  {/* Tooltip on hover */}
                  {bar.value > 0 && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900 text-white text-[10px] rounded-md opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none" style={{ fontWeight: 600 }}>
                      {bar.value} min
                    </div>
                  )}
                </motion.div>
                <span
                  className={`text-[11px] ${bar.active ? 'text-teal-700' : 'text-zinc-400'}`}
                  style={{ fontWeight: bar.active ? 700 : 500 }}
                >
                  {bar.day}
                </span>
              </div>
            ))}
          </div>

          {/* Summary row */}
          <div className="flex items-center gap-6 mt-6 pt-5 border-t border-zinc-100 flex-wrap">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-zinc-400" />
              <span className="text-xs text-zinc-600" style={{ fontWeight: 500 }}>
                Meta diaria: <span className="text-zinc-900" style={{ fontWeight: 700 }}>{goalMinutes} min</span>
              </span>
            </div>
            <div className="h-4 w-px bg-zinc-200" />
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" />
              <span className="text-xs text-zinc-600" style={{ fontWeight: 500 }}>
                Hoy: <span className="text-teal-700" style={{ fontWeight: 700 }}>
                  {todayStats.minutes > 0 ? todayStats.minutes : studyMinutesToday > 0 ? studyMinutesToday : 0} min
                </span>
              </span>
            </div>
            <div className="h-4 w-px bg-zinc-200" />
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-zinc-400" />
              <span className="text-xs text-zinc-600" style={{ fontWeight: 500 }}>
                Total semanal: <span className="text-zinc-900" style={{ fontWeight: 700 }}>{weeklyTotalMin} min</span>
              </span>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}