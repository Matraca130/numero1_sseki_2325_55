// ============================================================
// Axon — Welcome View (Modularized)
//
// Sub-components extracted to:
//   /src/app/components/welcome/welcomeData.ts
//   /src/app/components/welcome/WelcomePerformanceSidebar.tsx
//   /src/app/components/welcome/QuickShortcuts.tsx
//   /src/app/components/shared/CircularProgress.tsx
// ============================================================
import React, { useState, useMemo, useCallback } from 'react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { useTreeCourses } from '@/app/hooks/useTreeCourses';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { components, headingStyle, layout } from '@/app/design-system';
import { ArrowRight } from 'lucide-react';
import { CourseCard } from '@/app/components/shared/CourseCard';

// ── Extracted modules ──
import { WELCOME_COURSE_BASES, COURSE_PROGRESS_MAP } from '@/app/components/welcome/welcomeData';
import { WelcomePerformanceSidebar } from '@/app/components/welcome/WelcomePerformanceSidebar';
import { QuickShortcuts } from '@/app/components/welcome/QuickShortcuts';

export function WelcomeView() {
  const { navigateTo } = useStudentNav();
  const { profile, stats, isConnected, loading: studentLoading } = useStudentDataContext();
  const { courses: treeCourses } = useTreeCourses();
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('today');

  // Real student data
  const studentName = profile?.name?.split(' ')[0] || 'Dr. Reed';
  const streakDays = stats?.currentStreak ?? 0;
  const studyHours = stats ? Math.round(stats.totalStudyMinutes / 60) : 0;
  const cardsReviewed = stats?.totalCardsReviewed ?? 0;

  // Calculate course progress from tree
  const getCourseProgress = useCallback((courseId: string) => {
    const course = treeCourses.find(c => c.id === courseId);
    if (!course) return { progress: 0, completed: 0, total: 0 };
    let totalTopics = 0;
    course.semesters.forEach(sem => {
      sem.sections.forEach(sec => { totalTopics += sec.topics.length; });
    });
    return { progress: 0, completed: 0, total: totalTopics };
  }, [treeCourses]);

  // Merge base course visuals with dynamic progress
  const courseData = useMemo(() =>
    WELCOME_COURSE_BASES.map(base => ({
      ...base,
      ...getCourseProgress(COURSE_PROGRESS_MAP[base.id] || base.id),
    })),
    [getCourseProgress]
  );

  // Daily performance
  const dailyPerformance = stats
    ? Math.min(Math.round((studyHours / 10) * 100), 100)
    : 0;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* AxonPageHeader */}
      <AxonPageHeader
        title={`Bienvenido, ${studentName}`}
        subtitle={
          isConnected && stats
            ? `${streakDays} dias seguidos \u00B7 ${studyHours}h estudiadas \u00B7 ${cardsReviewed} cards revisados`
            : '"La excelencia no es un acto, sino un habito." \u2014 Aristoteles'
        }
        statsLeft={
          <div className="flex items-center gap-2">
            {(['today', 'week', 'month'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  timeFilter === f
                    ? components.filterButton.activeDark
                    : components.filterButton.inactiveDark
                }`}
              >
                {f === 'today' ? 'Hoy' : f === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        }
      />

      {/* Main scrollable content */}
      <div className={`flex-1 ${layout.content.paddingX} ${layout.content.paddingY} space-y-6 overflow-y-auto custom-scrollbar-light`}>

        {/* Two-column layout: courses + sidebar */}
        <div className="flex gap-6">
          {/* Left Content - Courses */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-axon-accent" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide" style={headingStyle}>
                  Disciplinas en Curso
                </h3>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <button
                onClick={() => navigateTo('study-hub')}
                className="text-axon-accent hover:text-axon-hover font-semibold text-xs flex items-center gap-1 ml-4 flex-shrink-0"
              >
                Ver Todas
                <ArrowRight size={12} />
              </button>
            </div>

            <div className={layout.grid.courses}>
              {courseData.map((course) => (
                <CourseCard
                  key={course.id}
                  title={course.title}
                  module={course.module}
                  progress={course.progress}
                  progressText={`${course.completed}/${course.total} Clases`}
                  icon={course.icon}
                  iconBg={course.iconBg}
                  progressColor={course.progressColor}
                  percentColor={course.percentColor}
                  onContinue={() => navigateTo('study')}
                />
              ))}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className={`${layout.rightPanel.width} space-y-5 flex-shrink-0`}>
            <WelcomePerformanceSidebar
              timeFilter={timeFilter}
              dailyPerformance={dailyPerformance}
              studyHours={studyHours}
              isConnected={isConnected}
              cardsReviewed={cardsReviewed}
              streakDays={streakDays}
            />
          </div>
        </div>

        {/* Quick Shortcut Cards */}
        <QuickShortcuts onNavigate={navigateTo} />
      </div>
    </div>
  );
}