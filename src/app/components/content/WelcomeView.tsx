// ============================================================
// Axon — Welcome View (Premium v4 — ALL REAL DATA)
//
// This file is a thin shell. Sections and data-fetching have been
// extracted into `@/app/components/welcome/*`:
//   - useWelcomeData      — aggregates all real-data hooks
//   - WelcomeHero         — greeting, stat pills, XP bar, streak warning
//   - WelcomeCoursesSection — CTA + disciplinas en curso (left column)
//   - PerformanceSidebar  — perf ring + activity feed (right column)
//   - QuickShortcuts      — bottom shortcuts strip (pre-existing)
//
// Every metric shown is sourced from real backend APIs — see
// useWelcomeData.ts for the contract. Zero hardcoded/mock data.
// ============================================================
import { useState } from 'react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { QuickShortcuts } from '@/app/components/welcome/QuickShortcuts';
import { PerformanceSidebar } from '@/app/components/welcome/PerformanceSidebar';
import { WelcomeHero } from '@/app/components/welcome/WelcomeHero';
import { WelcomeCoursesSection } from '@/app/components/welcome/WelcomeCoursesSection';
import { useWelcomeData } from '@/app/components/welcome/useWelcomeData';
import { tk, type TimeFilter } from '@/app/components/welcome/welcomeTokens';

export function WelcomeView() {
  const { navigateTo } = useStudentNav();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');

  const {
    greeting,
    totalXP,
    xpToday,
    streakDays,
    badgesEarned,
    dailyGoalMinutes,
    cardsDue,
    cardsNew,
    studiedToday,
    atRisk,
    levelInfo,
    xpHistory,
    filtered,
    isConnected,
    isLoadingActivity,
    studentLoading,
    recentSessions,
    courseData,
  } = useWelcomeData(timeFilter);

  return (
    <div className="min-h-full" style={{ backgroundColor: tk.pageBg }}>
      {/* ── Hero Section ────────────────────────────────────────── */}
      <WelcomeHero
        greeting={greeting}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        filtered={filtered}
        streakDays={streakDays}
        badgesEarned={badgesEarned}
        cardsDue={cardsDue}
        cardsNew={cardsNew}
        totalXP={totalXP}
        xpToday={xpToday}
        atRisk={atRisk}
        studiedToday={studiedToday}
      />

      {/* ── Content Area ────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 pb-8">
        <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 mb-6">
          {/* Left: Courses + CTA */}
          <WelcomeCoursesSection
            courseData={courseData}
            xpToday={xpToday}
            streakDays={streakDays}
            level={levelInfo.level}
            studiedToday={studiedToday}
            atRisk={atRisk}
            cardsDue={cardsDue}
            cardsNew={cardsNew}
            studentLoading={studentLoading}
            onNavigateGamification={() => navigateTo('gamification')}
            onNavigateStudyHub={() => navigateTo('study-hub')}
            onContinueCourse={() => navigateTo('study')}
          />

          {/* Right: Performance sidebar — ALL REAL DATA */}
          <div className="w-full lg:w-[340px] lg:shrink-0">
            <PerformanceSidebar
              timeFilter={timeFilter}
              studyMinutes={filtered.studyMinutes}
              dailyGoalMinutes={dailyGoalMinutes}
              xpHistory={xpHistory}
              recentSessions={recentSessions}
              isConnected={isConnected}
              isLoadingActivity={isLoadingActivity}
              onStartStudy={() => navigateTo('study')}
            />
          </div>
        </div>

        <QuickShortcuts onNavigate={navigateTo} />
      </div>
    </div>
  );
}

export default WelcomeView;
