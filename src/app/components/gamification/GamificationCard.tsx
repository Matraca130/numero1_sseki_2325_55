// ============================================================
// Axon — GamificationCard (Dashboard Widget)
//
// Compact card for StudyHub/dashboard showing:
// - Current level + XP progress bar
// - Streak status with fire icon
// - Weekly XP + daily cap remaining
// - Mini leaderboard (top 3)
//
// Uses GET /gamification/profile (1 call for xp+streak+badges)
// + GET /gamification/leaderboard (1 call for top 3).
// ============================================================

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Star, Flame, Zap, Shield, Users, Loader2, Award, Snowflake, Wrench } from 'lucide-react';
import * as gamificationApi from '@/app/services/gamificationApi';
import type { GamificationProfile, LeaderboardResponse } from '@/app/services/gamificationApi';
import { LevelProgressBar } from './LevelProgressBar';
import { DAILY_CAP } from '@/app/lib/xp-constants';
import { useAuth } from '@/app/context/AuthContext';

export function GamificationCard() {
  const { selectedInstitution } = useAuth();
  const institutionId = selectedInstitution?.id || '';

  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!institutionId) { setLoading(false); return; }
    Promise.all([
      gamificationApi.getProfile(institutionId),
      gamificationApi.getLeaderboard(institutionId, { limit: 3, period: 'weekly' }),
      gamificationApi.dailyCheckIn(institutionId),
      gamificationApi.onboarding(institutionId),
    ])
      .then(([profileData, lbData]) => {
        setProfile(profileData);
        setLeaderboard(lbData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [institutionId]);

  if (loading) {
    return (
      <div className="bg-zinc-800/30 border border-zinc-700/40 rounded-xl p-5">
        <div className="flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-gradient-to-br from-amber-500/10 to-teal-500/10 border border-amber-500/20 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Star size={20} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-200" style={{ fontWeight: 600 }}>Gamificacion</p>
            <p className="text-[10px] text-zinc-500">Revisa flashcards para ganar XP</p>
          </div>
        </div>
        <p className="text-xs text-zinc-400">Completa tu primera sesion de revision para empezar a ganar experiencia, subir de nivel y competir en el leaderboard.</p>
      </div>
    );
  }

  const { xp, streak, badges_earned } = profile;
  const dailyRemaining = Math.max(0, DAILY_CAP - xp.today);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-800/30 border border-zinc-700/40 rounded-xl p-5 space-y-4">
      <LevelProgressBar totalXP={xp.total} currentLevel={xp.level} />

      <div className="grid grid-cols-4 gap-2.5">
        <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
          <Flame size={14} className={streak.current > 0 ? 'text-orange-400 mx-auto mb-1' : 'text-zinc-600 mx-auto mb-1'} />
          <p className="text-lg text-zinc-200 tabular-nums" style={{ fontWeight: 700 }}>{streak.current}</p>
          <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Racha</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
          <Zap size={14} className="text-amber-400 mx-auto mb-1" />
          <p className="text-lg text-zinc-200 tabular-nums" style={{ fontWeight: 700 }}>{xp.this_week}</p>
          <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Semanal</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
          <Shield size={14} className={dailyRemaining > 0 ? 'text-emerald-400 mx-auto mb-1' : 'text-zinc-600 mx-auto mb-1'} />
          <p className="text-lg text-zinc-200 tabular-nums" style={{ fontWeight: 700 }}>{dailyRemaining}</p>
          <p className="text-[9px] text-zinc-500 uppercase tracking-wider">XP hoy</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
          <Award size={14} className={badges_earned > 0 ? 'text-teal-400 mx-auto mb-1' : 'text-zinc-600 mx-auto mb-1'} />
          <p className="text-lg text-zinc-200 tabular-nums" style={{ fontWeight: 700 }}>{badges_earned}</p>
          <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Logros</p>
        </div>
      </div>

      {streak.current > 0 && !streak.last_study_date?.startsWith(new Date().toISOString().split('T')[0]) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <Flame size={14} className="text-orange-400 shrink-0" />
          <p className="text-[11px] text-orange-300">Tu racha esta en riesgo! Estudia hoy para mantenerla.</p>
        </div>
      )}

      {leaderboard && leaderboard.leaderboard.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Users size={12} className="text-zinc-500" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Leaderboard semanal</span>
            </div>
            {leaderboard.my_rank && <span className="text-[10px] text-amber-400" style={{ fontWeight: 600 }}>Tu posicion: #{leaderboard.my_rank}</span>}
          </div>
          <div className="space-y-1.5">
            {leaderboard.leaderboard.map((entry, idx) => {
              const medal = idx === 0 ? '\ud83e\udd47' : idx === 1 ? '\ud83e\udd48' : '\ud83e\udd49';
              const weeklyXp = entry.xp_this_week ?? 0;
              return (
                <div key={entry.student_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-800/30">
                  <span className="text-xs w-5 text-center">{medal}</span>
                  <span className="text-xs text-zinc-400 flex-1 truncate">Lv.{entry.current_level}</span>
                  <span className="text-[10px] text-amber-400 tabular-nums" style={{ fontWeight: 600 }}>{weeklyXp} XP</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {xp.streak_freezes_owned > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-teal-400">
          <Shield size={10} />
          <span>{xp.streak_freezes_owned} freeze{xp.streak_freezes_owned !== 1 ? 's' : ''} disponible{xp.streak_freezes_owned !== 1 ? 's' : ''}</span>
        </div>
      )}

      {(streak.current >= 2 || (streak.current === 0 && streak.longest > 0)) && (
        <div className="flex items-center gap-3 pt-1">
          {streak.current >= 2 && (
            <button disabled={actionPending} onClick={async () => {
              setActionPending(true); setActionMessage(null);
              const result = await gamificationApi.buyStreakFreeze(institutionId);
              if (result) {
                setActionMessage(`Freeze comprado! (-${result.xp_spent} XP)`);
                const p = await gamificationApi.getProfile(institutionId);
                if (p) setProfile(p);
              } else { setActionMessage('No se pudo comprar (XP insuficiente?)'); }
              setActionPending(false);
              actionTimeoutRef.current = setTimeout(() => setActionMessage(null), 4000);
            }} className="flex items-center gap-1 text-[10px] text-teal-400/70 hover:text-teal-400 transition-colors disabled:opacity-40">
              <Snowflake size={10} /><span>Comprar freeze</span>
            </button>
          )}
          {streak.current === 0 && streak.longest > 0 && (
            <button disabled={actionPending} onClick={async () => {
              setActionPending(true); setActionMessage(null);
              const result = await gamificationApi.repairStreak(institutionId);
              if (result && result.repaired) {
                setActionMessage(`Racha restaurada a ${result.restored_streak}! (-${result.xp_spent} XP)`);
                const p = await gamificationApi.getProfile(institutionId);
                if (p) setProfile(p);
              } else { setActionMessage('No elegible o XP insuficiente'); }
              setActionPending(false);
              actionTimeoutRef.current = setTimeout(() => setActionMessage(null), 4000);
            }} className="flex items-center gap-1 text-[10px] text-orange-400/70 hover:text-orange-400 transition-colors disabled:opacity-40">
              <Wrench size={10} /><span>Reparar racha</span>
            </button>
          )}
        </div>
      )}

      {actionMessage && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-zinc-400 px-1">{actionMessage}</motion.p>
      )}
    </motion.div>
  );
}
