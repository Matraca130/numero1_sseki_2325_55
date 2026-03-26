// ============================================================
// Axon — Gamification Dashboard View (Premium)
//
// Student-first experience: personalized greeting, daily goal ring,
// next-badge chase, day-grouped history, fun leaderboard.
// ============================================================

import { useState, useEffect, useMemo, useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Zap,
  Flame,
  Award,
  Brain,
  ArrowLeft,
  Target,
  TrendingUp,
  Sparkles,
  PartyPopper,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/app/components/shared/EmptyState';
import { SkeletonCard } from '@/app/components/shared/SkeletonCard';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import {
  useGamificationProfile,
  useStreakStatus,
  useDailyCheckIn,
  useStreakRepair,
  useBadges,
  useLeaderboard,
  useXPHistory,
  useStudyQueue,
} from '@/app/hooks/useGamification';
import { getLevelInfo, XP_DAILY_CAP } from '@/app/types/gamification';
import { StreakPanel } from '@/app/components/student/gamification/StreakPanel';
import { LeaderboardCard } from '@/app/components/student/gamification/LeaderboardCard';
import { BadgeShowcase } from '@/app/components/student/gamification/BadgeShowcase';
import { XpHistoryFeed } from '@/app/components/student/gamification/XpHistoryFeed';
import { StudyQueueCard } from '@/app/components/student/gamification/StudyQueueCard';
import { useAuth } from '@/app/context/AuthContext';

const tk = {
  heroFrom: '#1B3B36',
  heroTo: '#0f2b26',
  pageBg: '#F0F2F5',
  card: '#ffffff',
  teal: '#2a8c7a',
  ringStart: '#2dd4a8',
  ringEnd: '#0d9488',
};

// ── Animated Number Counter ─────────────────────────────────────────
function AnimatedNumber({ value, duration = 1.2, delay = 0 }: { value: number; duration?: number; delay?: number }) {
  const shouldReduce = useReducedMotion();
  const [display, setDisplay] = useState(shouldReduce ? value : 0);

  useEffect(() => {
    if (shouldReduce) { setDisplay(value); return; }
    let cancelled = false;
    const start = performance.now();
    function tick(now: number) {
      if (cancelled) return;
      const elapsed = Math.max(0, now - start - delay * 1000);
      const t = Math.min(1, elapsed / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return () => { cancelled = true; };
  }, [value, duration, delay, shouldReduce]);

  return <>{display.toLocaleString()}</>;
}

// ── SVG Progress Ring ────────────────────────────────────────────
function ProgressRing({ progress, size = 96, stroke = 5, color1 = tk.ringStart, color2 = tk.ringEnd }: {
  progress: number; size?: number; stroke?: number; color1?: string; color2?: string;
}) {
  const shouldReduce = useReducedMotion();
  const uid = useId();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - Math.min(1, progress));
  const gradId = `ring-grad-${uid}`;
  return (
    <svg width={size} height={size} className="absolute inset-0">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={`url(#${gradId})`} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ}
        initial={shouldReduce ? { strokeDashoffset: dashOffset } : { strokeDashoffset: circ }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: 1.5, ease: 'easeOut', delay: 0.4 }}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
    </svg>
  );
}

// ── Daily Goal Ring (uses personal goal, not hardcoded cap) ─
function DailyGoalRing({ used, goal, className = '' }: { used: number; goal: number; className?: string }) {
  const shouldReduce = useReducedMotion();
  const uid = useId();
  const effectiveGoal = goal > 0 ? goal : 100; // fallback to 100 if goal not set
  const pct = Math.min(1, used / effectiveGoal);
  const completed = pct >= 1;
  const size = 130;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct);

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4" style={{ color: completed ? '#f59e0b' : '#2a8c7a' }} />
        <h3 className="text-sm" style={{ color: '#111827', fontWeight: 700 }}>
          Meta Diaria
        </h3>
      </div>
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size}>
            <defs>
              <linearGradient id={`daily-ring-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={completed ? '#f59e0b' : tk.ringStart} />
                <stop offset="100%" stopColor={completed ? '#ef4444' : tk.ringEnd} />
              </linearGradient>
            </defs>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke="#f3f4f6" strokeWidth={stroke} />
            <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={`url(#daily-ring-${uid})`} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={circ}
              initial={shouldReduce ? { strokeDashoffset: dashOffset } : { strokeDashoffset: circ }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {completed ? (
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.5 }}
              >
                <PartyPopper className="w-7 h-7" style={{ color: '#f59e0b' }} />
              </motion.div>
            ) : (
              <span className="text-2xl" style={{ color: '#111827', fontWeight: 800 }}>
                {used}
              </span>
            )}
            <span className="text-[10px]" style={{ color: '#9ca3af' }}>
              {completed ? 'Meta cumplida!' : `/ ${effectiveGoal} XP`}
            </span>
          </div>
        </div>
        {!completed && (
          <p className="text-[11px] mt-2" style={{ color: '#6b7280' }}>
            {effectiveGoal - used} XP mas para completar tu meta
          </p>
        )}
      </div>
    </div>
  );
}

// ── Today's XP Breakdown (replaces static "Cómo ganar XP") ─
function TodayXpBreakdown({ transactions }: { transactions: { action: string; xp_final: number }[] }) {
  const breakdown = useMemo(() => {
    const map: Record<string, { label: string; total: number; count: number }> = {};
    const labels: Record<string, string> = {
      review_flashcard: 'Flashcards',
      review_correct: 'Flashcards',
      quiz_answer: 'Quizzes',
      quiz_correct: 'Quizzes',
      complete_session: 'Sesiones',
      complete_reading: 'Lecturas',
      complete_video: 'Videos',
      streak_daily: 'Racha',
      complete_plan_task: 'Plan',
      complete_plan: 'Plan',
      rag_question: 'AI',
    };
    for (const tx of transactions) {
      const key = labels[tx.action] ?? 'Otro';
      if (!map[key]) map[key] = { label: key, total: 0, count: 0 };
      map[key].total += tx.xp_final;
      map[key].count += 1;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [transactions]);

  const totalToday = breakdown.reduce((s, b) => s + b.total, 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4" style={{ color: '#2a8c7a' }} />
        <h3 className="text-sm" style={{ color: '#111827', fontWeight: 700 }}>
          Tu dia en XP
        </h3>
        {totalToday > 0 && (
          <span className="text-[10px] ml-auto px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: 700 }}>
            +{totalToday} XP
          </span>
        )}
      </div>

      {breakdown.length === 0 ? (
        <div className="text-center py-4">
          <Sparkles className="w-6 h-6 mx-auto mb-1.5" style={{ color: '#d1d5db' }} />
          <p className="text-[11px]" style={{ color: '#9ca3af' }}>
            Estudia hoy para ver tu progreso aqui
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {breakdown.map(item => {
            const pct = totalToday > 0 ? (item.total / totalToday) * 100 : 0;
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span style={{ color: '#374151', fontWeight: 500 }}>
                    {item.label} <span style={{ color: '#d1d5db' }}>({item.count})</span>
                  </span>
                  <span style={{ color: '#2a8c7a', fontWeight: 700 }}>+{item.total}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: '#2a8c7a' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Daily XP cap notice */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[10px]"
        style={{ color: '#9ca3af' }}>
        <span>Cap diario: {XP_DAILY_CAP} XP</span>
        <span>{Math.max(0, XP_DAILY_CAP - totalToday)} restantes</span>
      </div>
    </div>
  );
}

// ── Streak milestone message ───────────────────────────────────────
function getStreakMilestone(streak: number): string | null {
  if (streak >= 100) return 'LEGENDARIO \u2014 100 dias de racha!';
  if (streak >= 60) return 'Increible \u2014 60 dias sin parar!';
  if (streak >= 30) return 'Imparable \u2014 1 mes de racha!';
  if (streak >= 14) return 'Constante \u2014 2 semanas seguidas!';
  if (streak >= 7) return 'En racha \u2014 1 semana completa!';
  return null;
}

// ── Greeting based on context ──────────────────────────────────────
function getGreeting(
  name: string | undefined,
  xpToday: number,
  streakDays: number,
  atRisk: boolean,
  studiedToday: boolean,
): string {
  const first = name?.split(' ')[0] ?? '';
  const hi = first ? `Hola, ${first}` : 'Hola';

  if (atRisk && !studiedToday) return `${hi} \u2014 tu racha de ${streakDays}d esta en riesgo!`;
  if (xpToday >= 200) return `${hi} \u2014 dia increible, llevas +${xpToday} XP`;
  if (xpToday > 0 && studiedToday) return `${hi} \u2014 buen ritmo, +${xpToday} XP hoy`;
  if (streakDays >= 7) return `${hi} \u2014 ${streakDays} dias de racha, sigue asi!`;
  return `${hi} \u2014 listo para estudiar?`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay,
}: {
  icon: typeof Zap;
  label: string;
  value: number;
  sub?: string;
  color: string;
  delay: number;
}) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      className="rounded-2xl border border-gray-200 bg-white p-4 flex items-center gap-3"
      initial={shouldReduce ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-lg" style={{ color: '#111827', fontWeight: 800 }}>
          <AnimatedNumber value={value} delay={delay} />
        </p>
        <p className="text-[11px]" style={{ color: '#6b7280' }}>
          {label}
        </p>
        {sub && (
          <p className="text-[10px]" style={{ color: '#9ca3af' }}>
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function GamificationView() {
  const shouldReduce = useReducedMotion();
  const { navigateTo } = useStudentNav();
  const { selectedInstitution, user } = useAuth();
  const institutionId = selectedInstitution?.id;

  // ── Queries ─────────────────────────────────────────────
  const { data: profileData } = useGamificationProfile(institutionId);
  const { data: streak, isLoading: streakLoading } = useStreakStatus(institutionId);
  const { data: badgesResp, isLoading: badgesLoading } = useBadges();
  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard(institutionId, 'weekly');
  const { data: xpHistoryResp, isLoading: historyLoading } = useXPHistory(institutionId);
  const { data: queue, isLoading: queueLoading } = useStudyQueue();

  // ── Mutations ───────────────────────────────────────────
  const checkIn = useDailyCheckIn(institutionId);
  const repair = useStreakRepair(institutionId);

  // ── Auto check-in on mount ────────────────────────────────
  const [checkedIn, setCheckedIn] = useState(false);
  useEffect(() => {
    if (!checkedIn && !checkIn.isPending && !streakLoading && institutionId) {
      checkIn.mutate(undefined, {
        onSuccess: (result) => {
          setCheckedIn(true);
          const evt = result.events?.[0];
          if (evt && evt.type !== 'already_checked_in') {
            toast.success(evt.message, { duration: 3500 });
          }
        },
        onError: () => setCheckedIn(true),
      });
    }
  }, [streakLoading, institutionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Consolidated loading state ──────────────────────────
  const isInitialLoading = streakLoading || badgesLoading || lbLoading || historyLoading || queueLoading;

  // ── Derived ─────────────────────────────────────────────
  const totalXP = profileData?.xp?.total ?? 0;
  const levelInfo = getLevelInfo(totalXP);
  const dailyUsed = profileData?.xp?.today ?? 0;
  const dailyGoal = profileData?.xp?.daily_goal_minutes ?? 100; // B-001 FIX: was daily_goal
  const badges = badgesResp?.badges ?? [];
  const earnedBadges = badgesResp?.earned_count ?? 0;
  const xpHistory = xpHistoryResp?.items ?? [];
  const streakDays = streak?.current_streak ?? 0;
  const streakMilestone = getStreakMilestone(streakDays);

  // Filter today's transactions for breakdown
  const todayTx = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return xpHistory.filter(tx => tx.created_at.startsWith(todayStr));
  }, [xpHistory]);

  const greeting = getGreeting(
    user?.user_metadata?.full_name ?? user?.email,
    dailyUsed,
    streakDays,
    streak?.streak_at_risk ?? false,
    streak?.studied_today ?? false,
  );

  return (
    <div className="min-h-full" style={{ backgroundColor: tk.pageBg }}>
      {/* ── Hero Banner ────────────────────────────────────────── */}
      <div
        className="px-4 sm:px-6 pt-6 pb-10"
        style={{
          background: `linear-gradient(135deg, ${tk.heroFrom}, ${tk.heroTo})`,
        }}
      >
        <div className="max-w-5xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigateTo('home')}
            className="flex items-center gap-1.5 text-[11px] mb-4 cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al inicio
          </button>

          {/* Greeting */}
          <motion.p
            className="text-sm mb-4"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {greeting}
          </motion.p>

          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Level circle with SVG ring */}
            <div className="relative w-24 h-24 shrink-0">
              <ProgressRing progress={levelInfo.progress} size={96} stroke={5} />
              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-center"
                animate={!shouldReduce ? { scale: [1, 1.03, 1] } : {}}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="text-3xl text-white" style={{ fontWeight: 900 }}>
                  {levelInfo.level}
                </span>
                <span className="text-[9px] text-white/80">NIVEL</span>
              </motion.div>
            </div>

            <div className="flex-1">
              <h1 className="text-xl md:text-2xl text-white mb-1" style={{ fontWeight: 800 }}>
                {levelInfo.title}
              </h1>
              <p className="text-sm text-white/60 mb-3">
                {totalXP.toLocaleString()} XP total
                {levelInfo.next && (
                  <> \u2014 {levelInfo.xpForNext - levelInfo.xpInLevel} XP para Nivel {levelInfo.next.level}</>
                )}
              </p>

              {/* XP progress bar with shimmer */}
              <div className="w-full max-w-md h-3 rounded-full overflow-hidden"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <motion.div
                  className="h-full rounded-full relative"
                  style={{
                    background: `linear-gradient(90deg, ${tk.ringStart}, ${tk.ringEnd})`,
                  }}
                  initial={shouldReduce ? { width: `${levelInfo.progress * 100}%` } : { width: 0 }}
                  animate={{ width: `${levelInfo.progress * 100}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                >
                  {!shouldReduce && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
                    />
                  )}
                </motion.div>
              </div>

              {/* Streak milestone badge in hero */}
              {streakMilestone && (
                <motion.div
                  className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-[10px]"
                  style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#fb923c', fontWeight: 600 }}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <Flame className="w-3 h-3" />
                  {streakMilestone}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-6">
        {isInitialLoading ? (
          <SkeletonCard variant="content" count={3} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard
                icon={Zap}
                label="XP Hoy"
                value={dailyUsed}
                sub={`Meta: ${dailyGoal} XP`}
                color="#2a8c7a"
                delay={0.1}
              />
              <StatCard
                icon={Flame}
                label="Racha"
                value={streakDays}
                sub={`Record: ${streak?.longest_streak ?? 0}d`}
                color="#f97316"
                delay={0.15}
              />
              <StatCard
                icon={Award}
                label="Insignias"
                value={earnedBadges}
                sub={`de ${badges.length} disponibles`}
                color="#a78bfa"
                delay={0.2}
              />
              <StatCard
                icon={Brain}
                label="Cards Pendientes"
                value={queue?.meta?.total_due ?? 0}
                sub={`${queue?.meta?.total_new ?? 0} nuevas`}
                color="#0d9488"
                delay={0.25}
              />
            </div>

            {/* ── Main Grid ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8">
              {/* Left Column (2/3) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StreakPanel
                    streak={streak}
                    onRepair={() => repair.mutate()}
                    repairing={repair.isPending}
                  />
                  <StudyQueueCard
                    data={queue}
                    isLoading={queueLoading}
                    onStartReview={() => navigateTo('review-session')}
                  />
                </div>

                {/* Badge Showcase — with empty state */}
                {!badgesLoading && badges.length === 0 ? (
                  <EmptyState
                    icon={Award}
                    title="Sin insignias aun"
                    description="Completa actividades para ganar insignias"
                  />
                ) : (
                  <BadgeShowcase badges={badges} isLoading={badgesLoading} maxVisible={18} />
                )}

                <XpHistoryFeed
                  transactions={xpHistory}
                  isLoading={historyLoading}
                  maxItems={30}
                />
              </div>

              {/* Right Column (1/3) */}
              <div className="space-y-4">
                {/* Leaderboard — with empty state */}
                {!lbLoading && (!leaderboard || (leaderboard as any)?.entries?.length === 0 || (Array.isArray(leaderboard) && leaderboard.length === 0)) ? (
                  <EmptyState
                    icon={Trophy}
                    title="Tabla de posiciones vacia"
                    description="Estudia para aparecer en el ranking"
                  />
                ) : (
                  <LeaderboardCard data={leaderboard} currentUserId={user?.id} isLoading={lbLoading} />
                )}

                {/* Daily Goal Ring (personal goal, not cap) */}
                <DailyGoalRing used={dailyUsed} goal={dailyGoal} />

                {/* Dynamic "Tu dia en XP" (replaces static XP table) */}
                <TodayXpBreakdown transactions={todayTx} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Named export for backward compatibility
export { GamificationView };
