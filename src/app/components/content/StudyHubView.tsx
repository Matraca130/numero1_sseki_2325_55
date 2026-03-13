// ============================================================
// Axon — StudyHubView (Student: browse content tree)
//
// MODULARIZED: Hero, Sections, WeeklyChart extracted.
// This file is now the orchestrator (~210 lines vs ~460 original).
// All data derivation stays here; sub-components are pure renderers.
// Zero functional changes.
// ============================================================
import React, { useMemo } from 'react';
import { useApp } from '@/app/context/AppContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { useNavigate } from 'react-router';
import { BookOpen, Loader2, AlertCircle } from 'lucide-react';
import type { TreeSection } from '@/app/services/contentTreeApi';
import { HeroSection } from '@/app/components/design-kit';
import { useLastStudiedTopic } from '@/app/hooks/useLastStudiedTopic';

// ── Extracted sub-components ─────────────────────────────────
import { StudyHubHero } from './StudyHubHero';
import { StudyHubSections } from './StudyHubSections';
import { WeeklyActivityChart } from './WeeklyActivityChart';
import { formatRelativeTime, computeSectionProgress } from './studyhub-helpers';

// ── Main export ──────────────────────────────────────────────

export function StudyHubView() {
  const { currentTopic, setCurrentTopic } = useApp();
  const { navigateTo } = useStudentNav();
  const { tree, loading, error, selectTopic } = useContentTree();
  const { stats, isConnected, profile, sessions, courseProgress } = useStudentDataContext();
  const navigate = useNavigate();

  const course = tree?.courses?.[0] ?? null;
  const semesters = course?.semesters ?? [];

  // ── Derive the "effective topic" for the hero ──────────────
  const lastStudied = useLastStudiedTopic(semesters, sessions);

  const effectiveTopic = useMemo(() => {
    if (currentTopic) return currentTopic;
    if (!lastStudied) return null;
    return { id: lastStudied.id, title: lastStudied.name } as typeof currentTopic;
  }, [currentTopic, lastStudied]);

  const isAutoSelected = !currentTopic && !!effectiveTopic;

  // ── Real progress: topic IDs that have courseProgress data ──
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

  // ── Section progress map ───────────────────────────────────
  const sectionProgressMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeSectionProgress>>();
    for (const sem of semesters) {
      for (const sec of sem.sections ?? []) {
        map.set(sec.id, computeSectionProgress(sec, sessions, courseProgressTopicIds));
      }
    }
    return map;
  }, [semesters, sessions, courseProgressTopicIds]);

  // ── Flat list of all sections with accent index ────────────
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

  // ── Totals ─────────────────────────────────────────────────
  const totalSections = semesters.reduce((acc, s) => acc + (s.sections?.length ?? 0), 0);
  const totalTopics = semesters.reduce(
    (acc, s) => acc + (s.sections ?? []).reduce((a, sec) => a + (sec.topics?.length ?? 0), 0),
    0,
  );

  const streakDays = stats?.currentStreak ?? 0;
  const studyMinutesToday = stats?.totalStudyMinutes ? Math.round(stats.totalStudyMinutes / 60) : 0;

  // ── Hero-specific derivations ──────────────────────────────

  const lastTopicSession = useMemo(() => {
    if (!effectiveTopic?.id) return null;
    return sessions
      .filter(s => s.topicId === effectiveTopic.id)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
  }, [sessions, effectiveTopic?.id]);

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

  const topicMastery = useMemo(() => {
    if (!effectiveTopic?.id) return null;
    for (const cp of courseProgress) {
      for (const tp of cp.topicProgress ?? []) {
        if (tp.topicId === effectiveTopic.id) return tp;
      }
    }
    return null;
  }, [courseProgress, effectiveTopic?.id]);

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

  const heroProgress = topicMastery ? topicMastery.masteryPercent / 100 : 0;
  const heroProgressPct = Math.round(heroProgress * 100);
  const heroLastActivity = formatRelativeTime(lastTopicSession?.startedAt);
  const heroReadingSessions = sessions.filter(
    s => s.topicId === effectiveTopic?.id && s.type === 'reading',
  ).length;

  const avgSessionMin = useMemo(() => {
    const readingSessions = sessions.filter(s => s.type === 'reading' && s.durationMinutes > 0);
    if (readingSessions.length === 0) return 5;
    return Math.round(readingSessions.reduce((a, s) => a + s.durationMinutes, 0) / readingSessions.length);
  }, [sessions]);

  const estimatedRemaining = heroProgress > 0 && heroProgress < 1
    ? Math.max(1, Math.round(avgSessionMin * (1 - heroProgress)))
    : null;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  const userName = profile?.name?.split(' ')[0] || '';

  // ── Weekly activity (last 7 days) ──────────────────────────
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
  const todayMinutes = todayStats.minutes > 0 ? todayStats.minutes : studyMinutesToday > 0 ? studyMinutesToday : 0;

  // ── Hero CTA callback ─────────────────────────────────────
  const handleContinue = () => {
    if (isAutoSelected && effectiveTopic) {
      selectTopic(effectiveTopic.id);
      setCurrentTopic({ id: effectiveTopic.id, title: (effectiveTopic as any).title } as any);
    }
    navigateTo('study');
  };

  // ── Loading ────────────────────────────────────────────────
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

  // ── Error ──────────────────────────────────────────────────
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

  // ── Empty ──────────────────────────────────────────────────
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

  // ── Main render ────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto bg-zinc-50">
      <StudyHubHero
        greeting={greeting}
        userName={userName}
        effectiveTopic={effectiveTopic ? { id: effectiveTopic.id, title: (effectiveTopic as any).title || '' } : null}
        isAutoSelected={isAutoSelected}
        heroReadingSessions={heroReadingSessions}
        heroProgressPct={heroProgressPct}
        heroProgress={heroProgress}
        heroLastActivity={heroLastActivity}
        estimatedRemaining={estimatedRemaining}
        streakDays={streakDays}
        courseName={course.name}
        sectionName={topicBreadcrumb.sectionName}
        todayStats={todayStats}
        studyMinutesToday={studyMinutesToday}
        totalCardsReviewed={stats?.totalCardsReviewed ?? 0}
        dailyGoalMinutes={profile?.preferences?.dailyGoalMinutes ?? 120}
        onContinue={handleContinue}
      />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <StudyHubSections
          allSections={allSections}
          sectionProgressMap={sectionProgressMap}
          totalSections={totalSections}
          totalTopics={totalTopics}
          onSectionClick={(sectionId) => navigate(`/student/study-plan?sectionId=${sectionId}`)}
        />

        <WeeklyActivityChart
          weeklyActivity={weeklyActivity}
          weeklyTotalMin={weeklyTotalMin}
          maxBarValue={maxBarValue}
          goalMinutes={goalMinutes}
          todayMinutes={todayMinutes}
        />
      </main>
    </div>
  );
}
