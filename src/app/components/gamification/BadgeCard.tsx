// ============================================================
// Axon v4.4 — Badge Card Component (Premium)
// Sprint G2→G3 AUDIT: Gradient backgrounds per rarity,
// earned/locked states, accessible, spring animations.
// ============================================================

import React from 'react';
import { Lock, Award } from 'lucide-react';
import { motion } from 'motion/react';
import type { BadgeRarity, BadgeWithEarnedStatus } from '@/app/types/gamification';
import { getBadgeIcon } from './badge-icons';

interface BadgeCardProps {
  badge: BadgeWithEarnedStatus;
  compact?: boolean;
}

interface RarityStyle {
  border: string; bgGradient: string; iconBg: string;
  glow: string; glowHover: string; text: string; label: string;
}

const RARITY_CONFIG: Record<BadgeRarity, RarityStyle> = {
  common: { border: '#d1d5db', bgGradient: 'linear-gradient(145deg, #f9fafb 0%, #f3f4f6 100%)', iconBg: 'rgba(156,163,175,0.1)', glow: 'none', glowHover: '0 4px 12px rgba(107,114,128,0.12)', text: '#6b7280', label: 'Comun' },
  uncommon: { border: '#86efac', bgGradient: 'linear-gradient(145deg, #f0fdf4 0%, #dcfce7 100%)', iconBg: 'rgba(34,197,94,0.08)', glow: '0 0 8px rgba(34,197,94,0.1)', glowHover: '0 4px 16px rgba(34,197,94,0.2)', text: '#16a34a', label: 'Poco comun' },
  rare: { border: '#93c5fd', bgGradient: 'linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%)', iconBg: 'rgba(59,130,246,0.08)', glow: '0 0 10px rgba(59,130,246,0.12)', glowHover: '0 4px 16px rgba(59,130,246,0.22)', text: '#2563eb', label: 'Raro' },
  epic: { border: '#c4b5fd', bgGradient: 'linear-gradient(145deg, #f5f3ff 0%, #ede9fe 100%)', iconBg: 'rgba(139,92,246,0.08)', glow: '0 0 12px rgba(139,92,246,0.15)', glowHover: '0 4px 20px rgba(139,92,246,0.28)', text: '#7c3aed', label: 'Epico' },
  legendary: { border: '#fcd34d', bgGradient: 'linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%)', iconBg: 'rgba(245,158,11,0.08)', glow: '0 0 16px rgba(245,158,11,0.2)', glowHover: '0 6px 24px rgba(245,158,11,0.35)', text: '#d97706', label: 'Legendario' },
};

export const BadgeCard = React.memo(function BadgeCard({ badge, compact = false }: BadgeCardProps) {
  const rarity = RARITY_CONFIG[badge.rarity] ?? RARITY_CONFIG.common;
  const Icon = getBadgeIcon(badge.icon);

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 p-2 rounded-lg transition-all"
        style={{ background: badge.earned ? rarity.bgGradient : '#f9fafb', border: `1px solid ${badge.earned ? rarity.border : '#e5e7eb'}`, opacity: badge.earned ? 1 : 0.5 }}
        title={badge.description}
        aria-label={`${badge.name}: ${badge.description}${badge.earned ? ' (desbloqueada)' : ' (bloqueada)'}`}
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-md shrink-0" style={{ backgroundColor: badge.earned ? rarity.iconBg : '#f3f4f6', color: badge.earned ? rarity.text : '#9ca3af' }}>
          <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] text-gray-700 block truncate" style={{ fontWeight: 600 }}>{badge.name}</span>
          <span className="text-[9px] text-gray-400">+{badge.xp_reward} XP</span>
        </div>
        {!badge.earned && <Lock size={10} className="text-gray-300 shrink-0" />}
      </div>
    );
  }

  return (
    <motion.div
      className="relative flex flex-col items-center p-4 rounded-xl cursor-default"
      style={{ background: badge.earned ? rarity.bgGradient : '#fafafa', border: `1.5px solid ${badge.earned ? rarity.border : '#e5e7eb'}`, boxShadow: badge.earned ? rarity.glow : 'none', opacity: badge.earned ? 1 : 0.55 }}
      whileHover={{ y: badge.earned ? -3 : 0, boxShadow: badge.earned ? rarity.glowHover : 'none' }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      aria-label={`${badge.name}: ${badge.description}${badge.earned ? ' (desbloqueada)' : ' (bloqueada)'}`}
    >
      <span className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: badge.earned ? `${rarity.border}40` : '#e5e7eb40', color: badge.earned ? rarity.text : '#9ca3af', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
        {rarity.label}
      </span>
      <div className="flex items-center justify-center w-12 h-12 rounded-xl mb-2" style={{ background: badge.earned ? rarity.iconBg : '#f3f4f6', color: badge.earned ? rarity.text : '#9ca3af' }}>
        {badge.earned ? (
          <motion.div initial={{ scale: 0.4, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 350, damping: 18 }}>
            <Icon size={24} />
          </motion.div>
        ) : (
          <div className="relative">
            <Icon size={24} className="opacity-25" />
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
              <Lock size={8} className="text-gray-400" />
            </div>
          </div>
        )}
      </div>
      <span className="text-xs text-center text-gray-800 mb-0.5" style={{ fontWeight: 700 }}>{badge.name}</span>
      <span className="text-[10px] text-gray-500 text-center mb-2.5 px-1" style={{ lineHeight: '1.4' }}>{badge.description}</span>
      <div className="flex items-center gap-1">
        <Award size={10} style={{ color: rarity.text }} />
        <span className="text-[10px] tabular-nums" style={{ color: rarity.text, fontWeight: 700 }}>+{badge.xp_reward} XP</span>
      </div>
      {badge.earned && badge.earned_at && (
        <span className="text-[9px] text-gray-400 mt-1.5">
          {new Date(badge.earned_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )}
    </motion.div>
  );
});
