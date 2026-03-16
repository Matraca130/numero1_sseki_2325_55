// ============================================================
// Axon — StudyHubView (Student: browse content tree)
//
// MODULARIZED: Hero, Sections, WeeklyChart extracted.
// This file is the orchestrator. All data derivation stays here;
// sub-components are pure renderers.
//
// Layout: All containers use A4 page width (210mm = 794px)
// for a familiar document-like reading experience.
//
// Data sources:
//   ContentTreeContext → tree (courses > semesters > sections > topics)
//   StudentDataContext → stats, sessions
//   useStudyHubProgress → topicStatusMap, sectionProgressMap (real data)
//   AppContext         → currentTopic, setCurrentTopic (legacy bridge)
//   useLastStudiedTopic → fallback topic when no currentTopic
//
// Palette: Axon Medical Academy
// ============================================================
import React, { useMemo } from 'react';
import { useApp } from '@/app/context/AppContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { useNavigate } from 'react-router';
import { BookOpen, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import type { TreeSection } from '@/app/services/contentTreeApi';
import { useLastStudiedTopic } from '@/app/hooks/useLastStudiedTopic';
import { useStudyHubProgress } from '@/app/hooks/queries/useStudyHubProgress';

// ── Extracted sub-components ─────────────────────────────────
import { StudyHubHero } from './StudyHubHero';
import { StudyHubSectionCards } from './StudyHubSectionCards';
import { WeeklyActivityChart } from './WeeklyActivityChart';
import { formatRelativeTime } from './studyhub-helpers';
import { axon, tint } from '@/app/lib/palette';

// ── Main export ──────────────────────────────────────────────

export function StudyHubView() {
  const { currentTopic, setCurrentTopic } = useApp();
  const { tree, loading, error, selectTopic } = useContentTree();
  const { stats, profile, sessions } = useStudentDataContext();
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

  // ── Real progress from reading states + topics overview ────
  const {
    topicStatusMap,
    sectionProgressMap,
    getTopicMastery,
  } = useStudyHubProgress(tree);

  // ── Semester groups (AUDIT FIX: preserve semester context) ──
  const semesterGroups = useMemo(() => {
    let globalIdx = 0;
    return semesters.map(sem => ({
      semesterId: sem.id,
      semesterName: sem.name,
      sections: (sem.sections ?? []).map(sec => ({
        section: sec,
        accentIdx: globalIdx++,
      })),
    }));
  }, [semesters]);

  // ── Flat list (kept for backward-compat / totals) ──────────
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

  const studyMinutesToday = stats?.totalStudyMinutes ? Math.round(stats.totalStudyMinutes / 60) : 0;

  // ── Greeting + user name (for hero) ────────────────────────
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos dias';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  const userName = profile?.name?.split(' ')[0] || '';
  const streakDays = stats?.currentStreak ?? 0;

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
    return getTopicMastery(effectiveTopic.id);
  }, [getTopicMastery, effectiveTopic?.id]);

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
    if (effectiveTopic) {
      selectTopic(effectiveTopic.id);
      if (isAutoSelected) {
        setCurrentTopic(effectiveTopic);
      }
      navigate('/student/summaries');
    }
  };

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex flex-col" style={{ backgroundColor: axon.pageBg }}>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${axon.darkTeal}, ${axon.darkPanel})` }} />
          <div className="relative max-w-[210mm] mx-auto px-6 pt-10 pb-14">
            <div className="h-8 w-64 bg-white/10 rounded-lg animate-pulse mb-3" />
            <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
          </div>
        </section>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <motion.div
              className="w-8 h-8 rounded-full border-4 border-t-transparent"
              style={{ borderColor: `${axon.tealAccent} transparent ${axon.tealAccent} ${axon.tealAccent}` }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="text-sm" style={{ color: tint.subtitleText }}>Cargando plan de estudios...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────
  if (error) {
    return (
      <div className="h-full flex flex-col" style={{ backgroundColor: axon.pageBg }}>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${axon.darkTeal}, ${axon.darkPanel})` }} />
          <div className="relative max-w-[210mm] mx-auto px-6 pt-10 pb-12">
            <h1 className="text-xl text-white" style={{ fontWeight: 700 }}>Plan de Estudios</h1>
          </div>
        </section>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-10 h-10" style={{ color: '#f87171' }} />
          <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 text-white text-sm rounded-full cursor-pointer"
            style={{ backgroundColor: axon.tealAccent, fontWeight: 600 }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────
  if (!course || semesters.length === 0) {
    return (
      <div className="h-full flex flex-col" style={{ backgroundColor: axon.pageBg }}>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${axon.darkTeal}, ${axon.darkPanel})` }} />
          <div className="relative max-w-[210mm] mx-auto px-6 pt-10 pb-12">
            <h1 className="text-xl text-white" style={{ fontWeight: 700 }}>Plan de Estudios</h1>
          </div>
        </section>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: tint.tealBg }}
          >
            <BookOpen className="w-7 h-7" style={{ color: tint.tealBorder }} />
          </div>
          <p className="text-sm" style={{ color: tint.subtitleText, fontWeight: 500 }}>El profesor aun no ha creado resumenes</p>
          <p className="text-xs" style={{ color: tint.neutralText }}>Vuelve mas tarde para ver los resumenes del curso</p>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: axon.pageBg }}>
      <StudyHubHero
        effectiveTopic={effectiveTopic ? { id: effectiveTopic.id, title: effectiveTopic.title || '' } : null}
        heroReadingSessions={heroReadingSessions}
        heroProgressPct={heroProgressPct}
        heroProgress={heroProgress}
        heroLastActivity={heroLastActivity}
        estimatedRemaining={estimatedRemaining}
        courseName={course.name}
        sectionName={topicBreadcrumb.sectionName}
        onContinue={handleContinue}
        onGoToVideos={() => {
          // Videos live inside the summary reader (as a tab).
          // Navigate to the session grid; once there the student picks the video block.
          if (effectiveTopic) {
            selectTopic(effectiveTopic.id);
            navigate('/student/summaries');
          } else {
            navigate('/student/summaries');
          }
        }}
        onGoToSummaries={() => navigate('/student/summaries')}
        greeting={greeting}
        userName={userName}
        streakDays={streakDays}
        isAutoSelected={isAutoSelected}
        todayStats={todayStats}
        studyMinutesToday={studyMinutesToday}
        totalCardsReviewed={stats?.totalCardsReviewed ?? 0}
        dailyGoalMinutes={profile?.preferences?.dailyGoalMinutes ?? 120}
      />

      <main className="max-w-[210mm] mx-auto px-6 py-10">
        <StudyHubSectionCards
          semesterGroups={semesterGroups}
          allSections={allSections}
          sectionProgressMap={sectionProgressMap}
          topicStatusMap={topicStatusMap}
          totalSections={totalSections}
          totalTopics={totalTopics}
          selectTopic={selectTopic}
          navigate={navigate}
        />

        {/* Spacer — section cards are primary; chart is secondary context */}
        <div className="mt-10">
          <WeeklyActivityChart
            weeklyActivity={weeklyActivity}
            weeklyTotalMin={weeklyTotalMin}
            maxBarValue={maxBarValue}
            goalMinutes={goalMinutes}
            todayMinutes={todayMinutes}
          />
        </div>
      </main>
    </div>
  );
}
