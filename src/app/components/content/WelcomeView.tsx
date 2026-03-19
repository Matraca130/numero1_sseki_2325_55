// ============================================================
// Axon — Welcome View (Premium v4 — ALL REAL DATA)
//
// Every metric shown is sourced from real backend APIs:
//   - XP: useGamificationProfile → xp.total, xp.today, xp.this_week
//   - Streak: useStreakStatus → current_streak, studied_today, streak_at_risk
//   - Badges: profileData.badges_earned (from composite profile endpoint)
//   - Study time: StudentDataContext → stats.weeklyActivity, dailyActivity
//   - Level: getLevelInfo(totalXP) → level, title, progress, xpInLevel, xpForNext
//   - Recent activity: useXPHistory → real XP transaction feed
//   - Cards due: useStudyQueue → meta.total_due, meta.total_new
//   - Daily goal: profileData.xp.daily_goal_minutes (B-001 fix)
//   - Course progress: studentData.courseProgress (empty in v2; BKT fallback)
//
// Zero hardcoded/mock data. If backend returns null, shows 0 gracefully.
// ============================================================
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { useAuth } from '@/app/context/AuthContext';
import {
  useGamificationProfile,
  useStreakStatus,
  useDailyCheckIn,
  useXPHistory,
  useStudyQueue,
} from '@/app/hooks/useGamification';
import { getLevelInfo, LEVEL_THRESHOLDS } from '@/app/types/gamification';
import type { XPTransaction } from '@/app/types/gamification';
import { headingStyle } from '@/app/design-system';
import { CourseCard } from '@/app/components/shared/CourseCard';
import { QuickShortcuts } from '@/app/components/welcome/QuickShortcuts';
import { WELCOME_COURSE_BASES, COURSE_PROGRESS_MAP } from '@/app/components/welcome/welcomeData';
import type { CourseProgress } from '@/app/types/student';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { useCourseMastery } from '@/app/hooks/useCourseMastery';
import { useRecentSessions } from '@/app/hooks/useRecentSessions';
import type { StudySessionRecord } from '@/app/services/studySessionApi';
import {
  ArrowRight,
  Zap,
  Flame,
  Trophy,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronUp,
  Brain,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  FileText,
  Play,
  CheckCircle,
  MoreHorizontal,
} from 'lucide-react';

// ── Tokens ─────────────────────────────────────────────────
const tk = {
  heroFrom: '#1B3B36',
  heroTo: '#0f2b26',
  teal: '#2a8c7a',
  tealLight: '#2dd4a8',
  pageBg: '#f8f9fb',
};

// ── XP Action labels (for activity feed) ───────────────────────
const XP_ACTION_LABELS: Record<string, { label: string; icon: typeof Zap; color: string; bg: string }> = {
  review_flashcard: { label: 'Flashcard revisado', icon: Brain, color: 'text-amber-600', bg: 'bg-amber-50' },
  review_correct: { label: 'Respuesta correcta', icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50' },
  quiz_answer: { label: 'Quiz respondido', icon: Zap, color: 'text-violet-600', bg: 'bg-violet-50' },
  quiz_correct: { label: 'Quiz correcto', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  complete_session: { label: 'Sesion completada', icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' },
  complete_reading: { label: 'Lectura completada', icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50' },
  complete_video: { label: 'Video completado', icon: Play, color: 'text-purple-500', bg: 'bg-purple-50' },
  streak_daily: { label: 'Bonus de racha', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
  complete_plan_task: { label: 'Tarea del plan', icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50' },
  complete_plan: { label: 'Plan completado', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
  rag_question: { label: 'Pregunta AI', icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-50' },
};

function getActionMeta(action: string) {
  return XP_ACTION_LABELS[action] ?? { label: action, icon: Zap, color: 'text-gray-500', bg: 'bg-[#F0F2F5]' };
}

// ── Greeting logic ─────────────────────────────────────────
function getGreeting(name?: string): { line1: string; line2: string } {
  const h = new Date().getHours();
  const first = name?.split(' ')[0] ?? '';
  const saludo = h < 12 ? 'Buenos dias' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
  return {
    line1: first ? `${saludo}, ${first}` : saludo,
    line2: 'Tu progreso de hoy',
  };
}

// ── Time helpers ───────────────────────────────────────────
function timeAgo(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'Ahora';
  if (m < 60) return `Hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Ayer';
  return `Hace ${d}d`;
}

// ── Stat Pill ──────────────────────────────────────────────
function StatPill({
  icon: Icon, label, value, color, delay,
}: {
  icon: typeof Zap; label: string; value: string | number; color: string; delay: number;
}) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}
      initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div>
        <p className="text-sm text-white" style={{ fontWeight: 700 }}>{value}</p>
        <p className="text-[10px] text-white/40">{label}</p>
      </div>
    </motion.div>
  );
}

// ── XP Progressive Level Bar ───────────────────────────────────
function XPLevelBar({ totalXP, xpToday }: { totalXP: number; xpToday: number }) {
  const shouldReduce = useReducedMotion();
  const info = getLevelInfo(totalXP);

  return (
    <motion.div className="w-full" initial={shouldReduce ? {} : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${tk.tealLight}, ${tk.teal})`, fontWeight: 800 }}>
            {info.level}
          </div>
          <p className="text-[11px] text-white/70 truncate" style={{ fontWeight: 600 }}>{info.title}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {xpToday > 0 && (
            <motion.span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md"
              style={{ backgroundColor: `${tk.tealLight}20`, color: tk.tealLight, fontWeight: 600 }}
              initial={shouldReduce ? {} : { scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.7, type: 'spring', stiffness: 500, damping: 25 }}>
              <ChevronUp className="w-2.5 h-2.5" />+{xpToday}
            </motion.span>
          )}
          <p className="text-[10px] text-white/40">
            <span className="text-white/70" style={{ fontWeight: 700 }}>{totalXP.toLocaleString()}</span>
            {info.next && <span> / {info.next.xp.toLocaleString()} XP</span>}
          </p>
        </div>
      </div>
      <div className="relative">
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <motion.div className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${tk.tealLight}, ${tk.teal})` }}
            initial={shouldReduce ? { width: `${info.progress * 100}%` } : { width: '0%' }}
            animate={{ width: `${info.progress * 100}%` }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
          />
        </div>
        {info.next && info.xpForNext > 0 && (
          <p className="text-[9px] text-white/25 mt-1.5 text-right">
            {(info.xpForNext - info.xpInLevel).toLocaleString()} XP para <span className="text-white/40">{info.next.title}</span>
          </p>
        )}
        {!info.next && (
          <p className="text-[9px] text-white/40 mt-1.5 text-right" style={{ fontWeight: 500 }}>Nivel maximo alcanzado</p>
        )}
      </div>
    </motion.div>
  );
}

// ── Gamification CTA Card ──────────────────────────────────────
function GamificationCTA({
  xpToday, streakDays, level, studiedToday, atRisk, cardsDue, onNavigate,
}: {
  xpToday: number; streakDays: number; level: number;
  studiedToday: boolean; atRisk: boolean; cardsDue: number;
  onNavigate: () => void;
}) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.button onClick={onNavigate}
      className="w-full rounded-2xl p-5 text-left cursor-pointer relative overflow-hidden group"
      style={{ background: `linear-gradient(135deg, ${tk.heroFrom}, ${tk.teal})` }}
      initial={shouldReduce ? {} : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }} whileHover={shouldReduce ? {} : { scale: 1.005 }} whileTap={{ scale: 0.995 }}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)' }} />
      <div className="relative z-10 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <Zap className="w-5 h-5 text-emerald-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm text-white" style={{ fontWeight: 600 }}>Tu Progreso XP</p>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px]"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
              Nivel {level}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-white/50 flex-wrap">
            {xpToday > 0 && <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" />+{xpToday} XP hoy</span>}
            {streakDays > 0 && <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{streakDays}d racha</span>}
            {cardsDue > 0 && <span className="flex items-center gap-1"><Brain className="w-3 h-3" />{cardsDue} cards pendientes</span>}
            {atRisk && !studiedToday && (
              <span className="flex items-center gap-1 text-amber-400"><AlertTriangle className="w-3 h-3" />Racha en riesgo</span>
            )}
            {xpToday === 0 && streakDays === 0 && cardsDue === 0 && <span>Comienza a estudiar</span>}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
      </div>
    </motion.button>
  );
}

// ── Time Filter Chips ──────────────────────────────────────────
function TimeFilters({ active, onChange }: { active: 'today' | 'week' | 'month'; onChange: (f: 'today' | 'week' | 'month') => void }) {
  const filters = [
    { key: 'today' as const, label: 'Hoy' },
    { key: 'week' as const, label: 'Semana' },
    { key: 'month' as const, label: 'Mes' },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {filters.map((f) => (
        <button key={f.key} onClick={() => onChange(f.key)}
          className="px-3 py-1.5 rounded-lg text-[11px] transition-all"
          style={{
            backgroundColor: active === f.key ? 'rgba(255,255,255,0.12)' : 'transparent',
            color: active === f.key ? '#ffffff' : 'rgba(255,255,255,0.35)',
            fontWeight: active === f.key ? 600 : 400,
          }}>
          {f.label}
        </button>
      ))}
    </div>
  );
}

// ── Performance Sidebar (all real data) ────────────────────────
function PerformanceSidebar({
  timeFilter, studyMinutes, dailyGoalMinutes, xpHistory, recentSessions, isConnected,
}: {
  timeFilter: 'today' | 'week' | 'month';
  studyMinutes: number;
  dailyGoalMinutes: number;
  xpHistory: XPTransaction[];
  recentSessions: StudySessionRecord[];
  isConnected: boolean;
}) {
  const shouldReduce = useReducedMotion();

  const periodLabel = timeFilter === 'today' ? 'Diario' : timeFilter === 'week' ? 'Semanal' : 'Mensual';
  const goalForPeriod = timeFilter === 'today' ? dailyGoalMinutes : timeFilter === 'week' ? dailyGoalMinutes * 7 : dailyGoalMinutes * 30;
  const studyHours = Math.round(studyMinutes / 60);
  const goalHours = Math.max(1, Math.round(goalForPeriod / 60));
  const perfPercent = goalForPeriod > 0 ? Math.min(Math.round((studyMinutes / goalForPeriod) * 100), 100) : 0;

  // Merge XP history + study sessions into unified feed, sorted by time
  const SESSION_TYPE_META: Record<string, { label: string; icon: typeof Zap; color: string; bg: string }> = {
    flashcard: { label: 'Sesion de Flashcards', icon: Brain, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    quiz: { label: 'Sesion de Quiz', icon: Zap, color: 'text-violet-600', bg: 'bg-violet-50' },
    reading: { label: 'Sesion de Lectura', icon: BookOpen, color: 'text-teal-600', bg: 'bg-teal-50' },
    mixed: { label: 'Sesion de Estudio', icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' },
  };

  type FeedItem = { id: string; ts: number; type: 'xp' | 'session'; data: XPTransaction | StudySessionRecord };

  const unifiedFeed = useMemo(() => {
    const feed: FeedItem[] = [];
    for (const tx of xpHistory) {
      feed.push({ id: `xp-${tx.id}`, ts: new Date(tx.created_at).getTime(), type: 'xp', data: tx });
    }
    for (const sess of recentSessions) {
      if (sess.completed_at) {
        feed.push({ id: `sess-${sess.id}`, ts: new Date(sess.completed_at || sess.created_at || '').getTime(), type: 'session', data: sess });
      }
    }
    feed.sort((a, b) => b.ts - a.ts);
    return feed.slice(0, 7);
  }, [xpHistory, recentSessions]);

  // Ring
  const uid = React.useId();
  const size = 160;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, perfPercent / 100));
  const gradId = `perf-ring-${uid}`;

  return (
    <div className="space-y-4">
      {/* Performance Ring Card */}
      <motion.div className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #1B3B36, #0f2b26)' }}
        initial={shouldReduce ? {} : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm text-white/80" style={{ ...headingStyle, fontWeight: 600 }}>Rendimiento {periodLabel}</h3>
          </div>
          <div className="relative mx-auto" style={{ width: size, height: size }}>
            <svg width={size} height={size}>
              <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2dd4a8" /><stop offset="100%" stopColor="#0d9488" />
                </linearGradient>
              </defs>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
              <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gradId})`}
                strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ}
                initial={shouldReduce ? { strokeDashoffset: offset } : { strokeDashoffset: circ }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl text-white" style={{ fontWeight: 800 }}>
                {perfPercent}<span className="text-2xl opacity-60">%</span>
              </span>
              <span className="text-[9px] text-white/50 uppercase tracking-[0.2em] mt-1" style={{ fontWeight: 600 }}>completado</span>
            </div>
          </div>
          <div className="text-center mt-5">
            <p className="text-sm text-white" style={{ fontWeight: 600 }}>{studyHours} de {goalHours} Horas</p>
            <p className="text-xs text-white/40 mt-1">
              {perfPercent >= 100 ? 'Meta cumplida!' : perfPercent >= 50 ? 'Buen progreso' : 'Segui dedicandote'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Recent Activity — FROM REAL XP HISTORY */}
      <motion.div className="rounded-2xl border border-gray-100 bg-white p-5"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        initial={shouldReduce ? {} : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider" style={{ ...headingStyle, fontWeight: 600 }}>Actividad Reciente</h3>
          <button onClick={() => {}} className="text-gray-300 hover:text-gray-500 transition-colors"><MoreHorizontal size={16} /></button>
        </div>
        {unifiedFeed.length === 0 ? (
          <div className="text-center py-6">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400" style={{ fontWeight: 500 }}>
              {isConnected ? 'Sin actividad reciente' : 'Conecta tu cuenta para ver datos reales'}
            </p>
            <p className="text-[11px] text-gray-300 mt-1">Estudia para ver tu progreso aqui</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {unifiedFeed.map((item) => {
              if (item.type === 'xp') {
                const tx = item.data as XPTransaction;
                const meta = getActionMeta(tx.action);
                const Icon = meta.icon;
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0 ${meta.color}`}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>{meta.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        +{tx.xp_final} XP{tx.bonus_type ? ` (${tx.bonus_type})` : ''} \u00b7 {timeAgo(tx.created_at)}
                      </p>
                    </div>
                  </div>
                );
              } else {
                const sess = item.data as StudySessionRecord;
                const meta = SESSION_TYPE_META[sess.session_type] ?? SESSION_TYPE_META.mixed;
                const Icon = meta.icon;
                const reviewInfo = sess.total_reviews
                  ? `${sess.correct_reviews ?? 0}/${sess.total_reviews} correctas`
                  : null;
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0 ${meta.color}`}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>{meta.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {reviewInfo && <span>{reviewInfo} \u00b7 </span>}
                        {timeAgo(sess.completed_at || sess.created_at || '')}
                      </p>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Filtered stats helper ──────────────────────────────────────
function useFilteredStats(
  timeFilter: 'today' | 'week' | 'month',
  stats: ReturnType<typeof useStudentDataContext>['stats'],
  profileData: { xp?: { today: number; this_week: number; total: number } } | null | undefined,
) {
  return useMemo(() => {
    const weekly = stats?.weeklyActivity ?? [];
    const todayIdx = (new Date().getDay() + 6) % 7;
    const todayMinutes = weekly[todayIdx] ?? 0;
    const weekMinutes = weekly.reduce((a, b) => a + b, 0);
    const xpToday = profileData?.xp?.today ?? 0;
    const xpWeek = profileData?.xp?.this_week ?? 0;
    const xpTotal = profileData?.xp?.total ?? 0;

    switch (timeFilter) {
      case 'today':
        return { xpLabel: 'XP Hoy', xpValue: xpToday > 0 ? `+${xpToday}` : '0', hoursLabel: 'Hoy', hoursValue: `${Math.round(todayMinutes / 60)}h`, studyMinutes: todayMinutes };
      case 'week':
        return { xpLabel: 'XP Semana', xpValue: xpWeek > 0 ? `+${xpWeek}` : '0', hoursLabel: 'Semana', hoursValue: `${Math.round(weekMinutes / 60)}h`, studyMinutes: weekMinutes };
      case 'month':
        return { xpLabel: 'XP Total', xpValue: xpTotal > 0 ? xpTotal.toLocaleString() : '0', hoursLabel: 'Total', hoursValue: `${Math.round((stats?.totalStudyMinutes ?? 0) / 60)}h`, studyMinutes: stats?.totalStudyMinutes ?? 0 };
    }
  }, [timeFilter, stats, profileData]);
}

// ── Main Component ─────────────────────────────────────────
export function WelcomeView() {
  const shouldReduce = useReducedMotion();
  const { navigateTo } = useStudentNav();
  const { profile, stats, courseProgress, dailyActivity, isConnected, loading: studentLoading } = useStudentDataContext();
  // BKT states for course mastery via content tree
  const { bktStates } = useStudentDataContext() as any;
  const { tree } = useContentTree();
  const courseMastery = useCourseMastery(tree, bktStates ?? []);
  const { data: recentSessions } = useRecentSessions(10);
  const { selectedInstitution, user } = useAuth();
  const institutionId = selectedInstitution?.id;

  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('today');

  // ── Real data hooks ─────────────────────────────────────────
  const { data: profileData } = useGamificationProfile(institutionId);
  const { data: streak } = useStreakStatus(institutionId);
  const { data: xpHistoryResp } = useXPHistory(institutionId);
  const { data: studyQueue } = useStudyQueue();
  const checkInMutation = useDailyCheckIn(institutionId);
  const [didCheckIn, setDidCheckIn] = useState(false);

  // Auto daily check-in
  useEffect(() => {
    if (!didCheckIn && !studentLoading && institutionId) {
      setDidCheckIn(true);
      checkInMutation.mutate(undefined, { onError: () => {} });
    }
  }, [studentLoading, institutionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived (all from real APIs) ────────────────────────────
  const studentName = user?.full_name ?? user?.name ?? profile?.name ?? 'Estudiante';
  const totalXP = profileData?.xp?.total ?? 0;
  const xpToday = profileData?.xp?.today ?? 0;
  const streakDays = streak?.current_streak ?? stats?.currentStreak ?? 0;
  const badgesEarned = profileData?.badges_earned ?? 0;
  const dailyGoalMinutes = profileData?.xp?.daily_goal_minutes ?? 60;
  const cardsDue = studyQueue?.meta?.total_due ?? 0;
  const cardsNew = studyQueue?.meta?.total_new ?? 0;
  const studiedToday = streak?.studied_today ?? false;
  const atRisk = streak?.streak_at_risk ?? false;
  const xpHistory = xpHistoryResp?.items ?? [];
  const levelInfo = getLevelInfo(totalXP);
  const greeting = getGreeting(studentName);
  const filtered = useFilteredStats(timeFilter, stats, profileData);

  // ── Course data: merge static bases with real data ────────
  const courseProgressMap = useMemo(() => {
    const map = new Map<string, CourseProgress>();
    for (const cp of courseProgress) {
      map.set(cp.courseId, cp);
      map.set(cp.courseName.toLowerCase(), cp);
    }
    return map;
  }, [courseProgress]);

  // getCourseProgress: uses content-tree mapped BKT mastery (proper per-course)
  const getCourseProgress = useCallback((baseId: string, baseTitle: string) => {
    const mappedId = COURSE_PROGRESS_MAP[baseId] || baseId;
    // 1. Try courseProgress from StudentDataContext (real if populated)
    const cp = courseProgressMap.get(mappedId) || courseProgressMap.get(baseTitle.toLowerCase());
    if (cp) return { progress: cp.masteryPercent, completed: cp.lessonsCompleted, total: cp.lessonsTotal };

    // 2. Try BKT mastery mapped via content tree (useCourseMastery)
    const bktInfo = courseMastery.get(mappedId);
    if (bktInfo) {
      return {
        progress: bktInfo.mastery,
        completed: bktInfo.topicsWithBkt,
        total: bktInfo.topicsTotal,
      };
    }
    // Fuzzy match: find a course whose name contains the base title
    const titleLower = baseTitle.toLowerCase();
    for (const [, info] of courseMastery) {
      if (info.courseName.toLowerCase().includes(titleLower) || titleLower.includes(info.courseName.toLowerCase())) {
        return {
          progress: info.mastery,
          completed: info.topicsWithBkt,
          total: info.topicsTotal,
        };
      }
    }

    // 3. No data at all
    return { progress: 0, completed: 0, total: 0 };
  }, [courseProgressMap, courseMastery]);

  const courseData = useMemo(() =>
    WELCOME_COURSE_BASES.map(base => ({
      ...base,
      ...getCourseProgress(base.id, base.title),
    })),
    [getCourseProgress],
  );

  return (
    <div className="min-h-full" style={{ backgroundColor: tk.pageBg }}>

      {/* ── Hero Section ────────────────────────────────────────── */}
      <div className="relative px-4 sm:px-6 lg:px-8 pt-6 pb-10 overflow-hidden"
        style={{ background: `linear-gradient(145deg, ${tk.heroFrom}, ${tk.heroTo})` }}>
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-2 right-[-20px] rotate-[-12deg] select-none pointer-events-none z-0 opacity-[0.015]">
          <span className="text-[80px] text-white tracking-[0.15em] uppercase" style={{ fontWeight: 900 }}>AXON</span>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <motion.div initial={shouldReduce ? {} : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <h1 className="text-xl sm:text-2xl text-white tracking-tight" style={{ ...headingStyle, fontWeight: 700 }}>{greeting.line1}</h1>
              <p className="text-xs text-white/40 mt-1">{greeting.line2}</p>
            </motion.div>
            <TimeFilters active={timeFilter} onChange={setTimeFilter} />
          </div>

          {/* Stats strip — ALL from real APIs */}
          <div className="flex flex-wrap items-center gap-3">
            <StatPill icon={Zap} label={filtered.xpLabel} value={filtered.xpValue} color="#2dd4a8" delay={0.1} />
            <StatPill icon={Flame} label="Racha" value={`${streakDays}d`} color="#fb923c" delay={0.15} />
            <StatPill icon={Trophy} label="Insignias" value={badgesEarned} color="#a78bfa" delay={0.2} />
            <StatPill icon={Clock} label={filtered.hoursLabel} value={filtered.hoursValue} color="#38bdf8" delay={0.25} />
            {cardsDue > 0 && (
              <StatPill icon={Brain} label="Cards Pendientes" value={`${cardsDue}${cardsNew > 0 ? ` (+${cardsNew})` : ''}`} color="#14b8a6" delay={0.3} />
            )}
          </div>

          {/* XP Progressive Level Bar */}
          <div className="mt-5">
            <XPLevelBar totalXP={totalXP} xpToday={xpToday} />
          </div>

          {/* Streak at risk warning */}
          {atRisk && !studiedToday && (
            <motion.div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
              style={{ backgroundColor: 'rgba(251,146,60,0.15)', color: '#fb923c', fontWeight: 500 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Tu racha de {streakDays} dias esta en riesgo. Estudia hoy para mantenerla.
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Content Area ────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 pb-8">
        <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 mb-6">
          {/* Left: Courses + CTA */}
          <div className="flex-1 min-w-0 space-y-5">
            <GamificationCTA
              xpToday={xpToday} streakDays={streakDays} level={levelInfo.level}
              studiedToday={studiedToday} atRisk={atRisk} cardsDue={cardsDue}
              onNavigate={() => navigateTo('gamification')} />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-1 h-4 rounded-full" style={{ backgroundColor: tk.teal }} />
                <h3 className="text-xs text-gray-400 uppercase tracking-wider" style={{ ...headingStyle, fontWeight: 600 }}>Disciplinas en Curso</h3>
                <div className="flex-1 h-px bg-gray-100 hidden sm:block" />
              </div>
              <button onClick={() => navigateTo('study-hub')}
                className="flex items-center gap-1 text-xs transition-colors ml-4 shrink-0"
                style={{ color: tk.teal, fontWeight: 500 }}>
                <span className="hidden sm:inline">Ver Todas</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {courseData.map((course) => (
                <CourseCard key={course.id} title={course.title} module={course.module}
                  progress={course.progress}
                  progressText={course.total > 0 ? `${course.completed}/${course.total} Clases` : `${course.progress}% dominio`}
                  icon={course.icon} iconBg={course.iconBg}
                  progressColor={course.progressColor} percentColor={course.percentColor}
                  onContinue={() => navigateTo('study')} />
              ))}
            </div>
          </div>

          {/* Right: Performance sidebar — ALL REAL DATA */}
          <div className="w-full lg:w-[340px] lg:shrink-0">
            <PerformanceSidebar
              timeFilter={timeFilter}
              studyMinutes={filtered.studyMinutes}
              dailyGoalMinutes={dailyGoalMinutes}
              xpHistory={xpHistory}
              recentSessions={recentSessions ?? []}
              isConnected={isConnected}
            />
          </div>
        </div>

        <QuickShortcuts onNavigate={navigateTo} />
      </div>
    </div>
  );
}

export default WelcomeView;
