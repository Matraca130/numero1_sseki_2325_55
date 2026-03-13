// ============================================================
// Axon — DailyGoalWidget
//
// Compact widget to view and adjust daily XP goal (10-1000).
// Uses PUT /gamification/daily-goal via updateDailyGoal().
// Reads current goal from GET /gamification/profile.
//
// Design: subtle, premium — matches "Frosted Glass on Teal".
//
// B-001 FIX: reads daily_goal_minutes (not daily_goal) from profile
// ============================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Target, Check, Loader2 } from 'lucide-react';
import * as gamificationApi from '@/app/services/gamificationApi';
import { useAuth } from '@/app/contexts/AuthContext';
import { DAILY_CAP } from '@/app/lib/xp-constants';

const GOAL_PRESETS = [50, 100, 150, 200, 300, 500];

export function DailyGoalWidget() {
  const { selectedInstitution } = useAuth();
  const institutionId = selectedInstitution?.id || '';

  const [currentGoal, setCurrentGoal] = useState<number>(100);
  const [sliderValue, setSliderValue] = useState<number>(100);
  const [xpToday, setXpToday] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!institutionId) { setLoading(false); return; }
    gamificationApi.getProfile(institutionId)
      .then((profile) => {
        if (profile) {
          // B-001 FIX: backend returns daily_goal_minutes (not daily_goal)
          const goal = profile.xp.daily_goal_minutes || 100;
          setCurrentGoal(goal);
          setSliderValue(goal);
          setXpToday(profile.xp.today);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [institutionId]);

  const handleSave = useCallback(async () => {
    if (!institutionId || sliderValue === currentGoal) return;
    setSaving(true);
    setSaved(false);
    const result = await gamificationApi.updateDailyGoal(institutionId, sliderValue);
    if (result) {
      setCurrentGoal(sliderValue);
      setSaved(true);
      savedTimeoutRef.current = setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  }, [institutionId, sliderValue, currentGoal]);

  const progress = currentGoal > 0 ? Math.min(1, xpToday / currentGoal) : 0;
  const progressPct = Math.round(progress * 100);
  const hasChanged = sliderValue !== currentGoal;

  if (loading) {
    return (
      <div className="bg-zinc-800/30 border border-zinc-700/40 rounded-xl p-5">
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-zinc-600" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-800/30 border border-zinc-700/40 rounded-xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
            <Target size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-200" style={{ fontWeight: 600 }}>Meta diaria</p>
            <p className="text-[10px] text-zinc-500">{progressPct}% completado hoy</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-300 tabular-nums" style={{ fontWeight: 600 }}>{xpToday}/{currentGoal} XP</p>
        </div>
      </div>

      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${progress >= 1 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-teal-500 to-teal-400'}`}
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {progress >= 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 text-[11px] text-emerald-400">
          <Check size={12} />
          <span>Meta alcanzada hoy!</span>
        </motion.div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Ajustar meta</span>
          <span className="text-xs text-zinc-400 tabular-nums" style={{ fontWeight: 600 }}>{sliderValue} XP</span>
        </div>
        <input type="range" min={10} max={DAILY_CAP} step={10} value={sliderValue} onChange={(e) => setSliderValue(Number(e.target.value))} className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-zinc-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-teal-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-zinc-900 [&::-moz-range-thumb]:cursor-pointer" />
        <div className="flex items-center gap-1.5 flex-wrap">
          {GOAL_PRESETS.map((preset) => (
            <button key={preset} onClick={() => setSliderValue(preset)} className={`px-2 py-0.5 rounded-full text-[10px] border transition-all ${sliderValue === preset ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500 hover:text-zinc-400 hover:border-zinc-600/60'}`} style={{ fontWeight: 500 }}>{preset}</button>
          ))}
        </div>
      </div>

      {hasChanged && (
        <motion.button initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} disabled={saving} onClick={handleSave} className="w-full py-2 rounded-lg text-xs text-white bg-teal-600 hover:bg-teal-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5" style={{ fontWeight: 600 }}>
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          <span>{saving ? 'Guardando...' : `Guardar meta: ${sliderValue} XP/dia`}</span>
        </motion.button>
      )}

      {saved && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-emerald-400 text-center">Meta actualizada correctamente</motion.p>
      )}
    </motion.div>
  );
}
