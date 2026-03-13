// ============================================================
// Axon v4.4 — Gamification Panel (Expanded Detail View)
// Sprint G1→G3: Uses GamificationContext, glass morphism,
// badge preview, recent XP activity.
// ============================================================

import React, { useState, useEffect } from 'react';
import { X, History, TrendingUp, Trophy, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGamification } from '@/app/context/GamificationContext';
import { useAuth } from '@/app/context/AuthContext';
import { getXpHistory, getBadges } from '@/app/services/gamificationApi';
import { XpLevelBar } from './XpLevelBar';
import { StreakCounter } from './StreakCounter';
import { DailyGoalRing } from './DailyGoalRing';
import { BadgeCard } from './BadgeCard';
import type { XpTransaction, BadgeWithEarnedStatus } from '@/app/types/gamification';

interface GamificationPanelProps {
  open: boolean;
  onClose: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  review_flashcard: 'Flashcard revisada',
  review_correct: 'Flashcard correcta',
  quiz_answer: 'Pregunta de quiz',
  quiz_correct: 'Quiz correcto',
  complete_session: 'Sesion completada',
  complete_reading: 'Lectura completada',
  complete_video: 'Video completado',
  streak_daily: 'Racha diaria',
  complete_plan_task: 'Tarea de plan',
  complete_plan: 'Plan completado',
  rag_question: 'Pregunta IA',
};

export const GamificationPanel = React.memo(function GamificationPanel({
  open,
  onClose,
}: GamificationPanelProps) {
  const { profile, streak } = useGamification();
  const { selectedInstitution } = useAuth();
  const [recentXp, setRecentXp] = useState<XpTransaction[]>([]);
  const [recentBadges, setRecentBadges] = useState<BadgeWithEarnedStatus[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!open || !selectedInstitution?.id) return;
    setLoadingHistory(true);
    Promise.allSettled([
      getXpHistory(selectedInstitution.id, { limit: 5 }),
      getBadges(),
    ]).then(([historyResult, badgesResult]) => {
      if (historyResult.status === 'fulfilled') setRecentXp(historyResult.value);
      if (badgesResult.status === 'fulfilled') {
        const earned = badgesResult.value.badges
          .filter((b) => b.earned)
          .sort((a, b) => {
            const dateA = a.earned_at ? new Date(a.earned_at).getTime() : 0;
            const dateB = b.earned_at ? new Date(b.earned_at).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 4);
        setRecentBadges(earned);
      }
      setLoadingHistory(false);
    });
  }, [open, selectedInstitution?.id]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-14 right-4 z-50 w-[340px] bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)' }}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          >
            <div
              className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100"
              style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fff7ed 100%)' }}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-amber-600" />
                <span className="text-sm text-gray-800" style={{ fontWeight: 700 }}>Tu Progreso</span>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/60 transition-colors" aria-label="Cerrar panel">
                <X size={14} className="text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {profile && <XpLevelBar totalXp={profile.total_xp} currentLevel={profile.current_level} />}
              <div className="flex gap-4">
                <div className="flex-1">{streak && <StreakCounter streak={streak} />}</div>
                <div className="flex-1">{profile && <DailyGoalRing xpToday={profile.xp_today} dailyGoalXp={profile.daily_goal_xp} />}</div>
              </div>

              {profile && profile.xp_this_week > 0 && (
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe' }}>
                  <span className="text-[11px] text-blue-700" style={{ fontWeight: 500 }}>XP esta semana</span>
                  <span className="text-xs text-blue-800 tabular-nums" style={{ fontWeight: 700 }}>{profile.xp_this_week.toLocaleString()} XP</span>
                </div>
              )}

              {recentBadges.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Trophy size={12} className="text-amber-500" />
                      <span className="text-[11px] text-gray-500" style={{ fontWeight: 600 }}>Insignias recientes</span>
                    </div>
                    <button className="flex items-center gap-0.5 text-[10px] text-blue-500 hover:text-blue-700 transition-colors">
                      Ver todas <ChevronRight size={10} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {recentBadges.map((badge) => <BadgeCard key={badge.id} badge={badge} compact />)}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <History size={12} className="text-gray-400" />
                  <span className="text-[11px] text-gray-500" style={{ fontWeight: 600 }}>Actividad reciente</span>
                </div>
                {loadingHistory ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <div key={i} className="h-7 bg-gray-50 rounded-lg animate-pulse" />)}
                  </div>
                ) : recentXp.length === 0 ? (
                  <p className="text-[11px] text-gray-400 text-center py-3">Sin actividad reciente</p>
                ) : (
                  <div className="space-y-0.5">
                    {recentXp.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-gray-700" style={{ fontWeight: 500 }}>
                            {ACTION_LABELS[tx.action] ?? tx.action.replace(/_/g, ' ')}
                          </span>
                          {tx.bonus_type && <span className="text-[9px] text-amber-600">Bonus: {tx.bonus_type.replace(/\+/g, ' + ')}</span>}
                        </div>
                        <span className="text-[11px] tabular-nums text-green-600" style={{ fontWeight: 700 }}>+{tx.xp_final}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {profile && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between" style={{ background: '#fafafa' }}>
                <span className="text-[11px] text-gray-500">XP Total</span>
                <span className="text-sm text-gray-800 tabular-nums" style={{ fontWeight: 700 }}>{profile.total_xp.toLocaleString()} XP</span>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
