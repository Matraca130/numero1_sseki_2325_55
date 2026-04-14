import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Activity,
  BookOpen,
  Brain,
  MoreHorizontal,
  Play,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { headingStyle } from '@/app/design-system';
import { EmptyState } from '@/app/components/shared/EmptyState';
import { SkeletonList } from '@/app/components/shared/SkeletonList';
import type { XPTransaction } from '@/app/types/gamification';
import type { StudySessionRecord } from '@/app/services/studySessionApi';
import { getActionMeta, timeAgo, type TimeFilter } from './welcomeTokens';

const SESSION_TYPE_META: Record<
  string,
  { label: string; icon: typeof Zap; color: string; bg: string }
> = {
  flashcard: { label: 'Sesion de Flashcards', icon: Brain, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  quiz: { label: 'Sesion de Quiz', icon: Zap, color: 'text-violet-600', bg: 'bg-violet-50' },
  reading: { label: 'Sesion de Lectura', icon: BookOpen, color: 'text-teal-600', bg: 'bg-teal-50' },
  mixed: { label: 'Sesion de Estudio', icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' },
};

type FeedItem = {
  id: string;
  ts: number;
  type: 'xp' | 'session';
  data: XPTransaction | StudySessionRecord;
};

export function PerformanceSidebar({
  timeFilter,
  studyMinutes,
  dailyGoalMinutes,
  xpHistory,
  recentSessions,
  isConnected: _isConnected,
  isLoadingActivity,
  onStartStudy,
}: {
  timeFilter: TimeFilter;
  studyMinutes: number;
  dailyGoalMinutes: number;
  xpHistory: XPTransaction[];
  recentSessions: StudySessionRecord[];
  isConnected: boolean;
  isLoadingActivity?: boolean;
  onStartStudy?: () => void;
}) {
  const shouldReduce = useReducedMotion();

  const periodLabel = timeFilter === 'today' ? 'Diario' : timeFilter === 'week' ? 'Semanal' : 'Mensual';
  const goalForPeriod =
    timeFilter === 'today' ? dailyGoalMinutes : timeFilter === 'week' ? dailyGoalMinutes * 7 : dailyGoalMinutes * 30;
  const studyHours = Math.round(studyMinutes / 60);
  const goalHours = Math.max(1, Math.round(goalForPeriod / 60));
  const perfPercent = goalForPeriod > 0 ? Math.min(Math.round((studyMinutes / goalForPeriod) * 100), 100) : 0;

  // Merge XP history + study sessions into unified feed, sorted by time
  const unifiedFeed = useMemo(() => {
    const feed: FeedItem[] = [];
    for (const tx of xpHistory) {
      feed.push({ id: `xp-${tx.id}`, ts: new Date(tx.created_at).getTime(), type: 'xp', data: tx });
    }
    for (const sess of recentSessions) {
      if (sess.completed_at) {
        feed.push({
          id: `sess-${sess.id}`,
          ts: new Date(sess.completed_at || sess.created_at || '').getTime(),
          type: 'session',
          data: sess,
        });
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
      <motion.div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #1B3B36, #0f2b26)' }}
        initial={shouldReduce ? {} : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm text-white/80" style={{ ...headingStyle, fontWeight: 600 }}>
              Rendimiento {periodLabel}
            </h3>
          </div>
          <div className="relative mx-auto" style={{ width: size, height: size }}>
            <svg width={size} height={size}>
              <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2dd4a8" />
                  <stop offset="100%" stopColor="#0d9488" />
                </linearGradient>
              </defs>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={stroke}
              />
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                initial={shouldReduce ? { strokeDashoffset: offset } : { strokeDashoffset: circ }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl text-white" style={{ fontWeight: 800 }}>
                {perfPercent}
                <span className="text-2xl opacity-60">%</span>
              </span>
              <span
                className="text-[9px] text-white/50 uppercase tracking-[0.2em] mt-1"
                style={{ fontWeight: 600 }}
              >
                completado
              </span>
            </div>
          </div>
          <div className="text-center mt-5">
            <p className="text-sm text-white" style={{ fontWeight: 600 }}>
              {studyHours} de {goalHours} Horas
            </p>
            <p className="text-xs text-white/40 mt-1">
              {perfPercent >= 100 ? 'Meta cumplida!' : perfPercent >= 50 ? 'Buen progreso' : 'Segui dedicandote'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Recent Activity — FROM REAL XP HISTORY */}
      <motion.div
        className="rounded-2xl border border-gray-100 bg-white p-5"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        initial={shouldReduce ? {} : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider" style={{ ...headingStyle, fontWeight: 600 }}>
            Actividad Reciente
          </h3>
          <button onClick={() => {}} className="text-gray-300 hover:text-gray-500 transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>
        {isLoadingActivity ? (
          <SkeletonList rows={3} />
        ) : unifiedFeed.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Sin actividad reciente"
            description="Estudia para ver tu progreso aqui"
            action={onStartStudy ? { label: 'Empezar a estudiar', onClick: onStartStudy } : undefined}
            className="py-6"
          />
        ) : (
          <div className="space-y-3.5">
            {unifiedFeed.map((item) => {
              if (item.type === 'xp') {
                const tx = item.data as XPTransaction;
                const meta = getActionMeta(tx.action);
                const Icon = meta.icon;
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0 ${meta.color}`}
                    >
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>
                        {meta.label}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        +{tx.xp_final} XP{tx.bonus_type ? ` (${tx.bonus_type})` : ''} · {timeAgo(tx.created_at)}
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
                    <div
                      className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0 ${meta.color}`}
                    >
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>
                        {meta.label}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {reviewInfo && <span>{reviewInfo} · </span>}
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

export default PerformanceSidebar;
