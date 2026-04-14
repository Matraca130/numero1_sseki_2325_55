// ============================================================
// Axon — Dashboard View (RESPONSIVE VERSION)
//
// Changes from original:
//   1. px-6 py-6 → layout.content tokens (px-4 lg:px-6)
//   2. Action button (time range toggle) stacks on mobile via AxonPageHeader responsive
//   3. Subject progress header wraps on mobile
//   4. EmptyState action button full-width on mobile
//   5. Skeleton loading for KPIs and charts
//   6. ErrorBoundary wrapping chart sections
//   7. EmptyState for zero study data
// ============================================================
import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { useNavigation } from '@/app/context/NavigationContext';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useStudyPlansContext } from '@/app/context/StudyPlansContext';
import {
  Flame,
  Trophy,
  Clock,
  Layers,
  Target,
} from 'lucide-react';
import clsx from 'clsx';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { KPICard, TrendBadge } from '@/app/components/shared/KPICard';
import { colors, components, headingStyle, layout } from '@/app/design-system';
import { EmptyState } from '@/app/components/shared/EmptyState';
import { SkeletonCard } from '@/app/components/shared/SkeletonCard';
import { SkeletonChart } from '@/app/components/shared/SkeletonChart';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';

// ── Extracted modules ──
import { ActivityChart, MasteryDonut, type ActivityDataPoint, type MasteryDataPoint } from '@/app/components/dashboard/DashboardCharts';
import { DashboardStudyPlans } from '@/app/components/dashboard/DashboardStudyPlans';

// ── Module-level constants (stable reference across renders) ──
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const SUBJECT_COLORS = ['#0d9488', '#14b8a6', '#0891b2', '#7c3aed', '#f59e0b', '#ef4444'];

export function DashboardView() {
  const { currentCourse } = useNavigation();
  const { stats, dailyActivity, bktStates, isConnected } = useStudentDataContext();
  const { tree } = useContentTree();
  const { navigateTo } = useStudentNav();
  const { plans: studyPlans, loading: plansLoading, toggleTaskComplete } = useStudyPlansContext();

  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');

  // ── Loading detection ──
  const isInitialLoading = !isConnected || (!stats && dailyActivity.length === 0);
  const hasNoStudyData = isConnected && bktStates.length === 0 && dailyActivity.length === 0;

  // ── Chart retry callbacks ──
  const [chartRetryKey, setChartRetryKey] = useState(0);
  const retryCharts = useCallback(() => setChartRetryKey(k => k + 1), []);

  // ── Build chart data from real daily activity ──
  const activityData: ActivityDataPoint[] = useMemo(() => {
    const sliceDays = timeRange === 'week' ? 7 : 30;
    if (isConnected && dailyActivity.length > 0) {
      return dailyActivity.slice(-sliceDays).map(d => ({
        date: DAY_NAMES[new Date(d.date + 'T12:00:00').getDay()],
        videos: Math.round(d.studyMinutes * 0.3),
        cards: d.cardsReviewed,
        amt: d.studyMinutes,
      }));
    }
    return DAY_NAMES.slice(1).concat(DAY_NAMES[0]).map(d => ({ date: d, videos: 0, cards: 0, amt: 0 }));
  }, [isConnected, dailyActivity, timeRange]);

  // ── Build mastery data from BKT states ──
  const { masteryData, totalCards } = useMemo(() => {
    const totalBkt = bktStates.length || 1;
    const masteredBkt = bktStates.filter(b => b.p_know >= 0.9).length;
    const learningBkt = bktStates.filter(b => b.p_know >= 0.5 && b.p_know < 0.9).length;
    const reviewingBkt = bktStates.filter(b => b.p_know >= 0.3 && b.p_know < 0.5).length;
    const notStartedBkt = Math.max(0, totalBkt - masteredBkt - learningBkt - reviewingBkt);

    const data: MasteryDataPoint[] = [
      { name: 'No Iniciado', value: notStartedBkt || (isConnected ? 0 : 250), color: '#d1d5db' },
      { name: 'Aprendiendo', value: learningBkt || (isConnected ? 0 : 100), color: '#fbbf24' },
      { name: 'Revisando', value: reviewingBkt || (isConnected ? 0 : 80), color: '#14b8a6' },
      { name: 'Dominado', value: masteredBkt || (isConnected ? 0 : 70), color: '#0d9488' },
    ];

    return {
      masteryData: data,
      totalCards: isConnected && bktStates.length > 0 ? bktStates.length : 0,
    };
  }, [bktStates, isConnected]);

  // ── Subject progress from BKT + content tree ──
  const subjectProgress = useMemo(() => {
    if (!tree?.courses?.length) return [];
    return tree.courses.map((course, i) => {
      const topicIds: string[] = [];
      course.semesters?.forEach(s => s.sections?.forEach(sec => sec.topics?.forEach(t => topicIds.push(t.id))));
      const relevantBkt = bktStates.filter(b => topicIds.includes(b.subtopic_id));
      return {
        name: course.name,
        total: topicIds.length,
        completed: relevantBkt.filter(b => b.p_know >= 0.9).length,
        color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
      };
    });
  }, [tree, bktStates]);

  // ── KPI values from real stats ──
  const kpiCards = isConnected && stats ? stats.totalCardsReviewed.toLocaleString('es-MX') : '0';
  const kpiTime = isConnected && stats ? `${Math.floor(stats.totalStudyMinutes / 60)}h ${stats.totalStudyMinutes % 60}m` : '0h 0m';
  const kpiStreak = isConnected && stats ? `${stats.currentStreak} Dias` : '0 Dias';
  const kpiAccuracy = (() => {
    if (!isConnected || !dailyActivity.length) return '0%';
    const withRet = dailyActivity.filter(d => d.retentionPercent !== undefined);
    if (withRet.length === 0) return '\u2014';
    const avgRet = Math.round(withRet.reduce((s, d) => s + (d.retentionPercent || 0), 0) / withRet.length);
    return `${avgRet}%`;
  })();

  return (
    <div className="h-full overflow-y-auto bg-surface-dashboard">
      {/* AXON Page Header */}
      <AxonPageHeader
        title="Dashboard"
        subtitle={currentCourse.name}
        statsLeft={<p className="text-gray-500 text-sm">Visión general de tu aprendizaje</p>}
        actionButton={
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200/60 shrink-0">
            <button
              onClick={() => setTimeRange('week')}
              className={clsx("px-3 sm:px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap", timeRange === 'week' ? components.filterButton.active : components.filterButton.inactive)}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={clsx("px-3 sm:px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap", timeRange === 'month' ? components.filterButton.active : components.filterButton.inactive)}
            >
              Este Mes
            </button>
          </div>
        }
      />

      {/* Content — uses responsive layout tokens */}
      <div className={`${layout.content.paddingX} ${layout.content.paddingY} bg-surface-dashboard`}>
        <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">

          {/* Onboarding empty state */}
          {hasNoStudyData && (
            <EmptyState
              icon={Target}
              title="Tu dashboard esta listo"
              description="Completa tu primera sesion de estudio para ver metricas reales."
              action={{ label: 'Comenzar a Estudiar', onClick: () => navigateTo('study') }}
            />
          )}

          {/* KPI Cards — skeleton while loading, real data when ready */}
          {isInitialLoading ? (
            <SkeletonCard variant="kpi" count={4} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                icon={<Layers className="w-5 h-5 text-[#2a8c7a]" />}
                label="Cards Estudiados"
                value={kpiCards}
                trendSlot={<TrendBadge label="+12%" up />}
                iconColorClass="bg-[#e6f5f1]"
              />
              <KPICard
                icon={<Clock className="w-5 h-5 text-[#2a8c7a]" />}
                label="Tiempo de Estudio"
                value={kpiTime}
                trendSlot={<TrendBadge label="+5%" up />}
                iconColorClass="bg-[#e6f5f1]"
              />
              <KPICard
                icon={<Flame className="w-5 h-5 text-amber-600" />}
                label="Racha Actual"
                value={kpiStreak}
                trendSlot={<TrendBadge label={isConnected && stats && stats.currentStreak >= stats.longestStreak ? "Record!" : `Mejor: ${stats?.longestStreak ?? 0}`} up />}
                iconColorClass="bg-amber-50"
              />
              <KPICard
                icon={<Trophy className="w-5 h-5 text-yellow-600" />}
                label="Promedio de Aciertos"
                value={kpiAccuracy}
                trendSlot={<TrendBadge label={isConnected ? "BKT" : "\u2014"} up />}
                iconColorClass="bg-yellow-50"
              />
            </div>
          )}

          {/* Charts Section — skeleton while loading, ErrorBoundary for resilience */}
          {isInitialLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <SkeletonChart type="bar" height="h-64" className="lg:col-span-2" />
              <SkeletonChart type="donut" height="h-64" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6" key={chartRetryKey}>
              <ErrorBoundary variant="section" retry={retryCharts}>
                <ActivityChart data={activityData} />
              </ErrorBoundary>
              <ErrorBoundary variant="section" retry={retryCharts}>
                <MasteryDonut data={masteryData} totalCards={totalCards} />
              </ErrorBoundary>
            </div>
          )}

          {/* Subject Progress */}
          <div className={components.chartCard.base}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h3 className="text-lg font-semibold text-gray-900" style={headingStyle}>Progreso por Materia</h3>
              <button className="text-sm text-[#2a8c7a] font-medium hover:text-[#1B3B36] whitespace-nowrap">Ver Reporte Completo</button>
            </div>
            <div className="space-y-6">
              {subjectProgress.map((subject, idx) => {
                const percentage = subject.total > 0 ? Math.round((subject.completed / subject.total) * 100) : 0;
                return (
                  <div key={`${subject.name}-${idx}`} className="relative">
                    <div className="flex items-end justify-between mb-2 gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">{subject.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{subject.completed} de {subject.total} temas dominados</p>
                      </div>
                      <span className="text-lg font-bold text-gray-900 shrink-0">{percentage}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, delay: idx * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: subject.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Study Plans */}
          <DashboardStudyPlans
            studyPlans={studyPlans}
            plansLoading={plansLoading}
            toggleTaskComplete={toggleTaskComplete}
          />

        </div>
      </div>
    </div>
  );
}
