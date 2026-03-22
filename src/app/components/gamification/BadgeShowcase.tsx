// ============================================================
// Axon — BadgeShowcase (Elegant badge grid)
// ============================================================

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Award, Lock, Loader2 } from 'lucide-react';
import * as gamificationApi from '@/app/services/gamificationApi';
import type { BadgeWithStatus } from '@/app/services/gamificationApi';

interface BadgeShowcaseProps {
  institutionId: string;
  maxDisplay?: number;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'from-zinc-400/20 to-zinc-500/10 border-zinc-600/30',
  rare: 'from-teal-400/20 to-teal-500/10 border-teal-500/30',
  epic: 'from-teal-400/20 to-teal-500/10 border-teal-500/30',
  legendary: 'from-amber-400/20 to-amber-500/10 border-amber-500/30',
};

const RARITY_GLOW: Record<string, string> = {
  common: '',
  rare: 'shadow-teal-500/10',
  epic: 'shadow-teal-500/15',
  legendary: 'shadow-amber-500/20',
};

export function BadgeShowcase({ institutionId, maxDisplay = 12 }: BadgeShowcaseProps) {
  const [badges, setBadges] = useState<BadgeWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [earnedCount, setEarnedCount] = useState(0);
  const [selectedBadge, setSelectedBadge] = useState<BadgeWithStatus | null>(null);

  useEffect(() => {
    if (!institutionId) { setLoading(false); return; }
    gamificationApi.getBadges(institutionId)
      .then((res) => { setBadges(res.badges.slice(0, maxDisplay)); setEarnedCount(res.earned_count); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [institutionId, maxDisplay]);

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin text-zinc-600" /></div>;
  }

  if (badges.length === 0) {
    return <div className="text-center py-6"><Award size={24} className="text-zinc-700 mx-auto mb-2" /><p className="text-xs text-zinc-600">Los logros se desbloquean al estudiar</p></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Award size={14} className="text-teal-400" />
          <span className="text-xs text-zinc-400 uppercase tracking-wider" style={{ fontWeight: 600 }}>Logros</span>
        </div>
        <span className="text-[10px] text-zinc-500 tabular-nums">{earnedCount}/{badges.length}</span>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {badges.map((badge, idx) => {
          const rarity = badge.rarity || 'common';
          const isEarned = badge.earned;
          return (
            <motion.button key={badge.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.03, duration: 0.3 }} onClick={() => setSelectedBadge(selectedBadge?.id === badge.id ? null : badge)} className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${isEarned ? `bg-gradient-to-br ${RARITY_COLORS[rarity]} shadow-lg ${RARITY_GLOW[rarity]} hover:scale-105` : 'bg-zinc-800/20 border-zinc-800/40 opacity-40 hover:opacity-60'}`}>
              <div className="text-lg mb-0.5">
                {isEarned ? (badge.icon_url ? <img src={badge.icon_url} alt="" className="w-6 h-6" /> : <Award size={20} className={rarity === 'legendary' ? 'text-amber-400' : rarity === 'epic' ? 'text-teal-400' : rarity === 'rare' ? 'text-teal-400' : 'text-zinc-400'} />) : <Lock size={14} className="text-zinc-600" />}
              </div>
              <p className="text-[9px] text-zinc-400 text-center leading-tight truncate w-full">{badge.name}</p>
            </motion.button>
          );
        })}
      </div>
      {selectedBadge && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 p-3 bg-zinc-800/30 border border-zinc-700/30 rounded-xl">
          <div className="flex items-start gap-2.5">
            <Award size={16} className={selectedBadge.earned ? 'text-amber-400 mt-0.5' : 'text-zinc-600 mt-0.5'} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-200" style={{ fontWeight: 600 }}>{selectedBadge.name}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{selectedBadge.description}</p>
              {selectedBadge.earned && selectedBadge.earned_at && <p className="text-[10px] text-zinc-600 mt-1">Desbloqueado {new Date(selectedBadge.earned_at).toLocaleDateString('es')}</p>}
              {selectedBadge.xp_reward > 0 && <p className="text-[10px] text-amber-500/70 mt-0.5">+{selectedBadge.xp_reward} XP</p>}
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full capitalize ${selectedBadge.rarity === 'legendary' ? 'bg-amber-500/15 text-amber-400' : selectedBadge.rarity === 'epic' ? 'bg-teal-500/15 text-teal-400' : selectedBadge.rarity === 'rare' ? 'bg-teal-500/15 text-teal-400' : 'bg-zinc-700/50 text-zinc-400'}`} style={{ fontWeight: 600 }}>{selectedBadge.rarity}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
