// ============================================================
// Axon v4.4 — Badges Page (G6: Dedicated Student Page)
// /student/badges — Full badge showcase with filters
// Imports from main's gamificationApi.ts signatures
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { Trophy, Award, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { getBadges } from '@/app/services/gamificationApi';
import type { BadgeWithStatus, BadgesResponse } from '@/app/services/gamificationApi';
import { useAuth } from '@/app/context/AuthContext';

type BadgeCategory = 'all' | 'consistency' | 'study' | 'mastery' | 'exploration' | 'social';
type BadgeRarity = 'all' | 'common' | 'rare' | 'epic' | 'legendary';

const CATEGORIES: { key: BadgeCategory; label: string }[] = [
  { key: 'all', label: 'Todas' }, { key: 'consistency', label: 'Consistencia' },
  { key: 'study', label: 'Estudio' }, { key: 'mastery', label: 'Maestria' },
  { key: 'exploration', label: 'Exploracion' }, { key: 'social', label: 'Social' },
];

const RARITIES: { key: BadgeRarity; label: string }[] = [
  { key: 'all', label: 'Todas' }, { key: 'common', label: 'Comun' },
  { key: 'rare', label: 'Rara' }, { key: 'epic', label: 'Epica' },
  { key: 'legendary', label: 'Legendaria' },
];

const RARITY_COLORS: Record<string, string> = {
  common: 'border-gray-200 bg-[#faf9f6]',
  rare: 'border-teal-200 bg-teal-50',
  epic: 'border-teal-200 bg-teal-50',
  legendary: 'border-amber-300 bg-amber-50',
};

export function BadgesPage() {
  const { selectedInstitution } = useAuth();
  const institutionId = selectedInstitution?.id;
  const [badges, setBadges] = useState<BadgeWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<BadgeCategory>('all');
  const [rarityFilter, setRarityFilter] = useState<BadgeRarity>('all');
  const [showEarnedOnly, setShowEarnedOnly] = useState(false);

  const fetchBadges = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res: BadgesResponse = await getBadges(institutionId ?? undefined);
      setBadges(res.badges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando insignias');
    } finally { setLoading(false); }
  }, [institutionId]);

  useEffect(() => { fetchBadges(); }, [fetchBadges]);

  const filtered = useMemo(() => {
    let r = badges;
    if (categoryFilter !== 'all') r = r.filter(b => b.category === categoryFilter);
    if (rarityFilter !== 'all') r = r.filter(b => b.rarity === rarityFilter);
    if (showEarnedOnly) r = r.filter(b => b.earned);
    return r;
  }, [badges, categoryFilter, rarityFilter, showEarnedOnly]);

  const earnedCount = badges.filter(b => b.earned).length;
  const totalCount = badges.length;
  const progress = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center"><Trophy size={22} className="text-amber-600" /></div>
            <div><h1 className="text-xl text-gray-900" style={{ fontWeight: 800 }}>Insignias</h1><p className="text-[12px] text-gray-500">Desbloquea logros mientras estudias</p></div>
          </div>
          <div className="text-right"><p className="text-[clamp(1.25rem,2.5vw,1.5rem)] text-amber-600 tabular-nums" style={{ fontWeight: 800 }}>{earnedCount}/{totalCount}</p><p className="text-[10px] text-gray-400" style={{ fontWeight: 500 }}>Desbloqueadas</p></div>
        </div>
        <div className="mb-6"><div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><motion.div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: 'easeOut' }} /></div><p className="text-[10px] text-gray-400 mt-1 text-right">{Math.round(progress)}% completado</p></div>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">{CATEGORIES.map(c => (<button key={c.key} onClick={() => setCategoryFilter(c.key)} className={`px-3 py-1.5 rounded-lg text-[11px] transition-all ${categoryFilter === c.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} style={{ fontWeight: categoryFilter === c.key ? 700 : 500 }}>{c.label}</button>))}</div>
          <select value={rarityFilter} onChange={e => setRarityFilter(e.target.value as BadgeRarity)} className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-[11px] text-gray-600" style={{ fontWeight: 500 }}>{RARITIES.map(r => (<option key={r.key} value={r.key}>{r.label}</option>))}</select>
          <button onClick={() => setShowEarnedOnly(!showEarnedOnly)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] border transition-all ${showEarnedOnly ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-gray-200 text-gray-500'}`} style={{ fontWeight: 600 }}><Award size={12} />Solo desbloqueadas</button>
        </div>
        {loading ? <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-amber-500" /></div>
        : error ? <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl border border-red-200 text-[12px] text-red-700"><AlertTriangle size={14} />{error}</div>
        : filtered.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><Sparkles size={32} className="opacity-30 mb-3" /><p className="text-sm">No hay insignias con estos filtros</p></div>
        : <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{filtered.map((badge, i) => (
          <motion.div key={badge.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
            <div className={`rounded-2xl border p-4 transition-all ${badge.earned ? RARITY_COLORS[badge.rarity ?? 'common'] ?? RARITY_COLORS.common : 'border-gray-200 bg-[#faf9f6] opacity-50'}`}>
              <div className="flex items-center justify-between mb-2"><span className="text-[clamp(1.25rem,2.5vw,1.5rem)]">{badge.icon_url ?? '🏆'}</span>{badge.earned && <span className="text-[9px] text-emerald-600 px-1.5 py-0.5 bg-emerald-50 rounded-full" style={{ fontWeight: 600 }}>✓</span>}</div>
              <p className="text-[12px] text-gray-800 mb-0.5" style={{ fontWeight: 700 }}>{badge.name}</p>
              <p className="text-[10px] text-gray-500 mb-2">{badge.description}</p>
              <div className="flex items-center justify-between"><span className="text-[9px] text-gray-400 capitalize">{badge.rarity ?? 'common'}</span><span className="text-[9px] text-amber-600" style={{ fontWeight: 600 }}>+{badge.xp_reward ?? 0} XP</span></div>
            </div>
          </motion.div>
        ))}</motion.div>}
      </div>
    </div>
  );
}
