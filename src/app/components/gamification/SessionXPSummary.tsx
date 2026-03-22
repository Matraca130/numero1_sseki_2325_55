// ============================================================
// Axon — SessionXPSummary (End-of-Session XP Card)
// ============================================================

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Zap, Flame, TrendingUp, Award, Shield } from 'lucide-react';
import { LevelProgressBar } from './LevelProgressBar';
import { XP_TABLE, calculateLevel } from '@/app/lib/xp-constants';
import type { SessionXPState } from '@/app/hooks/useSessionXP';

interface SessionXPSummaryProps {
  state: SessionXPState;
  actualXP?: number;
}

function XPBreakdownRow({ icon, label, xp, delay }: { icon: React.ReactNode; label: string; xp: number; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }} className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-zinc-400">{icon}<span className="text-xs">{label}</span></div>
      <span className="text-xs text-amber-400 tabular-nums" style={{ fontWeight: 600 }}>+{xp}</span>
    </motion.div>
  );
}

export function SessionXPSummary({ state, actualXP }: SessionXPSummaryProps) {
  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    if (state.leveledUp) {
      const timer = setTimeout(() => setShowLevelUp(true), 800);
      return () => clearTimeout(timer);
    }
  }, [state.leveledUp]);

  const displayXP = actualXP ?? state.totalSessionXP;
  const totalXP = state.baselineXP + displayXP;
  const reviewXP = state.reviewCount * XP_TABLE.review_flashcard;
  const correctBonusXP = state.correctCount * XP_TABLE.review_correct;
  const sessionBonusXP = XP_TABLE.complete_session;
  const serverBonusXP = actualXP ? Math.max(0, actualXP - (reviewXP + correctBonusXP + sessionBonusXP)) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }} className="w-full max-w-sm">
      <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.6 }}>
            <Zap size={24} className="text-amber-400" />
          </motion.div>
          <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} className="text-3xl text-amber-400 tabular-nums" style={{ fontWeight: 800 }}>+{displayXP}</motion.span>
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-lg text-amber-400/60" style={{ fontWeight: 600 }}>XP</motion.span>
        </div>
        <div className="space-y-1.5 mb-4">
          <XPBreakdownRow icon={<Zap size={12} />} label={`${state.reviewCount} revisiones`} xp={reviewXP} delay={0.8} />
          {state.correctCount > 0 && <XPBreakdownRow icon={<TrendingUp size={12} />} label={`${state.correctCount} correctas`} xp={correctBonusXP} delay={0.9} />}
          <XPBreakdownRow icon={<Award size={12} />} label="Sesion completada" xp={sessionBonusXP} delay={1.0} />
          {serverBonusXP > 0 && <XPBreakdownRow icon={<Flame size={12} />} label="Bonuses (on-time, streak...)" xp={serverBonusXP} delay={1.1} />}
        </div>
        {state.currentStreak > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="flex items-center justify-center gap-2 pt-3 border-t border-amber-500/10">
            <Flame size={14} className="text-orange-400" />
            <span className="text-xs text-orange-400" style={{ fontWeight: 600 }}>Racha de {state.currentStreak} dias</span>
            {state.currentStreak >= 7 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/20">+50% XP</span>}
          </motion.div>
        )}
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }} className="bg-zinc-800/30 border border-zinc-700/40 rounded-xl p-5">
        <LevelProgressBar totalXP={totalXP} currentLevel={state.currentLevel} />
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-zinc-700/30">
          <Shield size={12} className="text-zinc-500" />
          <span className="text-[10px] text-zinc-500">{state.dailyCapRemaining > 0 ? `${state.dailyCapRemaining} XP restantes hoy` : 'Limite diario alcanzado'}</span>
        </div>
      </motion.div>
      {showLevelUp && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="mt-4 bg-gradient-to-r from-teal-500/20 to-amber-500/20 border border-teal-500/30 rounded-xl p-4 text-center">
          <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5, delay: 0.2 }} className="text-2xl mb-1">\ud83c\udf89</motion.div>
          <p className="text-sm text-zinc-200" style={{ fontWeight: 700 }}>Subiste a Nivel {state.currentLevel}!</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Sigue asi para desbloquear nuevos logros</p>
        </motion.div>
      )}
    </motion.div>
  );
}
