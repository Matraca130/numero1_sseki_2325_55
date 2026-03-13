// ============================================================
// Axon — Welcome View (RESPONSIVE VERSION)
//
// Changes from original:
//   1. 2-col layout → flex-col lg:flex-row (stacks on mobile)
//   2. Right sidebar: w-full lg:w-[360px] (full-width on mobile)
//   3. Content padding responsive via layout tokens
//   4. Time filter buttons scrollable on mobile
//   5. "Ver Todas" button adapted for mobile
// ============================================================
import React, { useState, useMemo, useCallback } from 'react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { useTreeCourses } from '@/app/hooks/useTreeCourses';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { components, headingStyle, layout } from '@/app/design-system';
import { ArrowRight, Zap } from 'lucide-react';
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
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
            {(['today', 'week', 'month'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
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

        {/* Two-column layout: courses + sidebar → stacks on mobile */}
        <div className="flex flex-col lg:flex-row gap-5 lg:gap-6">
          {/* Left Content - Courses */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-3 h-3 rounded-full bg-axon-accent shrink-0" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide truncate" style={headingStyle}>
                  Disciplinas en Curso
                </h3>
                <div className="flex-1 h-px bg-gray-200 hidden sm:block" />
              </div>
              <button
                onClick={() => navigateTo('study-hub')}
                className="text-axon-accent hover:text-axon-hover font-semibold text-xs flex items-center gap-1 ml-4 flex-shrink-0"
              >
                <span className="hidden sm:inline">Ver Todas</span>
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

          {/* Right Sidebar → full width on mobile, fixed on desktop */}
          <div className="w-full lg:w-[360px] space-y-5 lg:flex-shrink-0">
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

        {/* Gamification entry point */}
        <button
          onClick={() => navigateTo('gamification')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.99]"
          style={{
            background: 'linear-gradient(135deg, #1B3B36, #2a8c7a)',
          }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <Zap className="w-4 h-4 text-emerald-300" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs text-white" style={{ fontWeight: 600 }}>
              Tu Progreso XP
            </p>
            <p className="text-[10px] text-white/60">
              {streakDays > 0 ? `${streakDays}d racha \u00B7 ` : ''}
              {cardsReviewed > 0 ? `${cardsReviewed} cards revisadas` : 'Comienza a estudiar'}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-white/40" />
        </button>

        {/* Quick Shortcut Cards */}
        <QuickShortcuts onNavigate={navigateTo} />
      </div>
    </div>
  );
}
