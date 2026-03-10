// ============================================================
// Axon — DashboardPage (EV-7 Prompt A)
// Layout completo del dashboard del estudiante.
// v2.1: Time range toggle wired, StatsCards uses context data.
// ============================================================
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { StatsCards, useStudentDashboardStats, type DashboardTimeRange } from '@/app/components/dashboard/StatsCards';
import { StudyStreakCard } from '@/app/components/dashboard/StudyStreakCard';
import { ActivityHeatMap } from '@/app/components/dashboard/ActivityHeatMap';
import { MasteryOverview } from '@/app/components/dashboard/MasteryOverview';

// ── Main page ────────────────────────────────────────

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>('week');

  const { stats, todayActivity, yesterdayActivity, rangeTimeSeconds, loading } =
    useStudentDashboardStats(timeRange);

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
            <button
              onClick={() => setTimeRange('week')}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                timeRange === 'week'
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Esta semana
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                timeRange === 'month'
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
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
            rangeTimeSeconds={rangeTimeSeconds}
            timeRange={timeRange}
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

            {/* Heatmap (3 cols) */}
            <div className="lg:col-span-3">
              <ActivityHeatMap />
            </div>
          </div>

          {/* Row 3: Mastery Overview */}
          <MasteryOverview />

        </div>
      </div>
    </div>
  );
}
