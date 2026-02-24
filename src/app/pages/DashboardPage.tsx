// ============================================================
// Axon — DashboardPage (EV-7 Prompt A)
// Layout completo del dashboard del estudiante.
// Prompt B reemplaza PLACEHOLDER_HEATMAP.
// Prompt C reemplaza PLACEHOLDER_MASTERY.
// ============================================================
import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, Brain } from 'lucide-react';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { StatsCards, useStudentDashboardStats } from '@/app/components/dashboard/StatsCards';
import { StudyStreakCard } from '@/app/components/dashboard/StudyStreakCard';
import { ActivityHeatMap } from '@/app/components/dashboard/ActivityHeatMap';
import { MasteryOverview } from '@/app/components/dashboard/MasteryOverview';
import { components, headingStyle } from '@/app/design-system';

// ── Placeholder IDs (for Prompts B & C to replace) ──────
export const PLACEHOLDER_HEATMAP = 'dashboard-heatmap-placeholder';
export const PLACEHOLDER_MASTERY = 'dashboard-mastery-placeholder';

// ── Skeleton placeholder ─────────────────────────────────

function SectionSkeleton({ id, icon, label, height = 'h-64' }: {
  id: string;
  icon: React.ReactNode;
  label: string;
  height?: string;
}) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={`${components.chartCard.base} ${height} flex flex-col items-center justify-center gap-3`}
    >
      <div className="w-12 h-12 rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
        {icon}
      </div>
      <p className="text-sm text-gray-400 animate-pulse">{label}</p>
    </motion.div>
  );
}

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
            <button className="px-4 py-2 text-sm rounded-md bg-teal-500 text-white shadow-sm">
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