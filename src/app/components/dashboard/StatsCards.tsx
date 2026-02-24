// ============================================================
// Axon — StatsCards (4 KPI cards en fila)
// Fuente: GET /student-stats + GET /daily-activities?from=HOY&to=HOY
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Flame, BookOpen, Target, Clock } from 'lucide-react';
import clsx from 'clsx';
import { components } from '@/app/design-system';
import {
  getStudentStatsReal,
  getDailyActivities,
  type StudentStatsRecord,
  type DailyActivityRecord,
} from '@/app/services/platformApi';

// ── Helpers ──────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function weekAgoISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ── Types ────────────────────────────────────────────────

interface StatsData {
  stats: StudentStatsRecord | null;
  todayActivity: DailyActivityRecord | null;
  yesterdayActivity: DailyActivityRecord | null;
  weekTimeSeconds: number;
}

// ── Hook ─────────────────────────────────────────────────

export function useStudentDashboardStats() {
  const [data, setData] = useState<StatsData>({
    stats: null,
    todayActivity: null,
    yesterdayActivity: null,
    weekTimeSeconds: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = todayISO();
      const yesterday = yesterdayISO();
      const weekAgo = weekAgoISO();

      const [statsRes, weekRes] = await Promise.all([
        getStudentStatsReal().catch(() => null),
        getDailyActivities(weekAgo, today).catch(() => []),
      ]);

      const todayRec = weekRes.find(d => d.activity_date === today) || null;
      const yesterdayRec = weekRes.find(d => d.activity_date === yesterday) || null;
      const weekTime = weekRes.reduce((sum, d) => sum + (d.time_spent_seconds || 0), 0);

      setData({
        stats: statsRes,
        todayActivity: todayRec,
        yesterdayActivity: yesterdayRec,
        weekTimeSeconds: weekTime,
      });
    } catch (err: any) {
      console.error('[StatsCards] Failed to load stats:', err);
      setError(err.message || 'Error loading stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...data, loading, error, refresh };
}

// ── Card subcomponent ────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  sub: string;
  delay?: number;
}

function StatCard({ icon, iconBg, label, value, sub, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={components.kpiCard.base}
    >
      <div className="flex items-start gap-3">
        <div className={clsx('p-2.5 rounded-xl shrink-0', iconBg)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 truncate">{label}</p>
          <p className="text-2xl text-gray-900 mt-0.5 tabular-nums">{value}</p>
          <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Skeleton ─────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div className={components.kpiCard.base}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="w-20 h-3 bg-gray-100 rounded animate-pulse" />
          <div className="w-14 h-6 bg-gray-100 rounded animate-pulse" />
          <div className="w-24 h-3 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────

interface StatsCardsProps {
  stats: StudentStatsRecord | null;
  todayActivity: DailyActivityRecord | null;
  yesterdayActivity: DailyActivityRecord | null;
  weekTimeSeconds: number;
  loading?: boolean;
}

export function StatsCards({ stats, todayActivity, yesterdayActivity, weekTimeSeconds, loading }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  // ── Derived values ──
  const streak = stats?.current_streak ?? 0;
  const longestStreak = stats?.longest_streak ?? 0;
  const totalReviews = stats?.total_reviews ?? 0;
  const todayReviews = todayActivity?.reviews_count ?? 0;

  // Accuracy
  const todayCorrect = todayActivity?.correct_count ?? 0;
  const todayTotal = todayActivity?.reviews_count ?? 0;
  const todayAccuracy = todayTotal > 0 ? ((todayCorrect / todayTotal) * 100).toFixed(1) : null;

  const yesterdayCorrect = yesterdayActivity?.correct_count ?? 0;
  const yesterdayTotal = yesterdayActivity?.reviews_count ?? 0;
  const yesterdayAccuracy = yesterdayTotal > 0 ? (yesterdayCorrect / yesterdayTotal) * 100 : null;

  const accuracyDiff = todayAccuracy !== null && yesterdayAccuracy !== null
    ? (parseFloat(todayAccuracy) - yesterdayAccuracy).toFixed(1)
    : null;

  // Time
  const weekTimeFormatted = formatTime(weekTimeSeconds);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<Flame className="w-5 h-5 text-amber-600" />}
        iconBg="bg-amber-50"
        label="Racha"
        value={`${streak} dias`}
        sub={streak >= longestStreak && streak > 0 ? 'Recorde!' : `max: ${longestStreak}`}
        delay={0}
      />
      <StatCard
        icon={<BookOpen className="w-5 h-5 text-teal-600" />}
        iconBg="bg-teal-50"
        label="Reviews"
        value={totalReviews > 0 ? totalReviews.toLocaleString() : '\u2014'}
        sub={todayReviews > 0 ? `+${todayReviews} hoje` : 'nenhum hoje'}
        delay={0.05}
      />
      <StatCard
        icon={<Target className="w-5 h-5 text-indigo-600" />}
        iconBg="bg-indigo-50"
        label="Acuracia"
        value={todayAccuracy !== null ? `${todayAccuracy}%` : '\u2014'}
        sub={accuracyDiff !== null ? `${parseFloat(accuracyDiff) >= 0 ? '+' : ''}${accuracyDiff}% vs ontem` : 'sem dados ontem'}
        delay={0.1}
      />
      <StatCard
        icon={<Clock className="w-5 h-5 text-cyan-600" />}
        iconBg="bg-cyan-50"
        label="Tempo"
        value={weekTimeSeconds > 0 ? weekTimeFormatted : '\u2014'}
        sub="esta semana"
        delay={0.15}
      />
    </div>
  );
}
