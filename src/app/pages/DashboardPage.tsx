// ============================================================
// Axon — DashboardPage
// Layout completo del dashboard del estudiante.
// Componentes: StatsCards, StudyStreakCard, ActivityHeatMap,
//              MasteryOverview.
// ============================================================
import React from 'react';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { StatsCards, useStudentDashboardStats } from '@/app/components/dashboard/StatsCards';
import { StudyStreakCard } from '@/app/components/dashboard/StudyStreakCard';
import { ActivityHeatMap } from '@/app/components/dashboard/ActivityHeatMap';
import { MasteryOverview } from '@/app/components/dashboard/MasteryOverview';

// ── Main page ────────────────────────────────────────────

export default function DashboardPage() {
  const { stats, todayActivity, yesterdayActivity, weekTimeSeconds, loading } =
    useStudentDashboardStats();

  const studiedToday = (todayActivity?.reviews_count ?? 0) > 0 ||
    (todayActivity?.time_spent_seconds ?? 0) > 0;

  return (
    <div className="h-full overflow-y-auto bg-surface-dashboard">
      {/* ── Header ── */}
      <AxonPageHeader
        title="Dashboard"
        subtitle="Visao geral do teu aprendizado"
        actionButton={
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200/60 shrink-0">
            <button className="px-4 py-2 text-sm rounded-md bg-[#1B3B36] text-white shadow-sm">
              Esta semana
            </button>
            <button className="px-4 py-2 text-sm rounded-md text-gray-500 hover:text-gray-700">
              Este mes
            </button>
          </div>
        }
      />

      {/* ── Content ── */}
      <div className="px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Row 1: Stats Cards (4 KPIs) */}
          <StatsCards
            stats={stats}
            todayActivity={todayActivity}
            yesterdayActivity={yesterdayActivity}
            weekTimeSeconds={weekTimeSeconds}
            loading={loading}
          />

          {/* Row 2: Streak + Heatmap side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Streak (1 col) */}
            <div className="lg:col-span-1">
              <StudyStreakCard
                stats={stats}
                studiedToday={studiedToday}
                loading={loading}
              />
            </div>

            {/* Heatmap placeholder (3 cols) */}
            <div className="lg:col-span-3">
              <ActivityHeatMap />
            </div>
          </div>

          {/* Row 3: Mastery Overview placeholder */}
          <MasteryOverview />

        </div>
      </div>
    </div>
  );
}