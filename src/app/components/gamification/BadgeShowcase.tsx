// ============================================================
// Axon v4.4 — Badge Showcase (Premium)
// Sprint G2→G3: Grid with category filters, progress bar,
// staggered animations, earned-first sorting.
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/app/context/AuthContext';
import { getBadges } from '@/app/services/gamificationApi';
import { BadgeCard } from './BadgeCard';
import type { BadgeWithEarnedStatus, BadgeCategory } from '@/app/types/gamification';

interface BadgeShowcaseProps {
  badges?: BadgeWithEarnedStatus[];
  earnedCount?: number;
}

type CategoryFilter = 'all' | BadgeCategory;

const CATEGORY_TABS: { key: CategoryFilter; label: string; emoji: string }[] = [
  { key: 'all', label: 'Todas', emoji: '\ud83c\udfc6' },
  { key: 'consistency', label: 'Consistencia', emoji: '\ud83d\udd25' },
  { key: 'study', label: 'Estudio', emoji: '\ud83d\udcda' },
  { key: 'mastery', label: 'Dominio', emoji: '\u2b50' },
  { key: 'exploration', label: 'Exploracion', emoji: '\ud83e\udded' },
  { key: 'social', label: 'Social', emoji: '\ud83d\udc65' },
];

const RARITY_ORDER: Record<string, number> = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };

export const BadgeShowcase = React.memo(function BadgeShowcase({ badges: propBadges, earnedCount: propEarnedCount }: BadgeShowcaseProps) {
  const { selectedInstitution } = useAuth();
  const [badges, setBadges] = useState<BadgeWithEarnedStatus[]>(propBadges ?? []);
  const [earnedCount, setEarnedCount] = useState(propEarnedCount ?? 0);
  const [loading, setLoading] = useState(!propBadges);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

  useEffect(() => {
    if (propBadges) return;
    setLoading(true);
    getBadges()
      .then((res) => { setBadges(res.badges); setEarnedCount(res.earned_count); })
      .catch(() => setBadges([]))
      .finally(() => setLoading(false));
  }, [propBadges, selectedInstitution?.id]);

  const filteredBadges = useMemo(() => {
    let filtered = badges;
    if (activeCategory !== 'all') filtered = badges.filter((b) => b.category === activeCategory);
    return [...filtered].sort((a, b) => {
      if (a.earned !== b.earned) return a.earned ? -1 : 1;
      return (RARITY_ORDER[a.rarity] ?? 5) - (RARITY_ORDER[b.rarity] ?? 5);
    });
  }, [badges, activeCategory]);

  const categoryEarnedCount = useMemo(() => activeCategory === 'all' ? earnedCount : badges.filter((b) => b.category === activeCategory && b.earned).length, [badges, activeCategory, earnedCount]);
  const categoryTotalCount = useMemo(() => activeCategory === 'all' ? badges.length : badges.filter((b) => b.category === activeCategory).length, [badges, activeCategory]);
  const progressPercent = categoryTotalCount > 0 ? (categoryEarnedCount / categoryTotalCount) * 100 : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #fde68a' }}>
              <Trophy size={14} className="text-amber-600" />
            </div>
            <span className="text-sm text-gray-800" style={{ fontWeight: 700 }}>Insignias</span>
          </div>
          <span className="text-xs text-gray-500 tabular-nums" style={{ fontWeight: 600 }}>{categoryEarnedCount}/{categoryTotalCount}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)' }} initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORY_TABS.map((tab) => {
          const count = tab.key === 'all' ? badges.length : badges.filter((b) => b.category === tab.key).length;
          return (
            <button key={tab.key} onClick={() => setActiveCategory(tab.key)}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all shrink-0"
              style={{ fontWeight: activeCategory === tab.key ? 600 : 400, background: activeCategory === tab.key ? 'linear-gradient(135deg, #1f2937 0%, #374151 100%)' : '#f9fafb', color: activeCategory === tab.key ? '#ffffff' : '#6b7280', border: activeCategory === tab.key ? '1px solid #374151' : '1px solid #e5e7eb', boxShadow: activeCategory === tab.key ? '0 2px 8px rgba(31,41,55,0.15)' : 'none' }}>
              <span className="text-[10px]">{tab.emoji}</span><span>{tab.label}</span>
              <span className="text-[9px] px-1 rounded-full tabular-nums" style={{ background: activeCategory === tab.key ? 'rgba(255,255,255,0.15)' : '#e5e7eb', color: activeCategory === tab.key ? 'rgba(255,255,255,0.8)' : '#9ca3af', fontWeight: 600 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-44 rounded-xl animate-pulse" style={{ background: '#f9fafb' }} />)}
        </div>
      ) : filteredBadges.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #fde68a' }}>
            <Trophy size={24} className="text-amber-300" />
          </div>
          <p className="text-xs text-gray-400" style={{ fontWeight: 500 }}>No hay insignias en esta categoria</p>
        </div>
      ) : (
        <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" layout role="grid" aria-label="Insignias">
          <AnimatePresence mode="popLayout">
            {filteredBadges.map((badge, index) => (
              <motion.div key={badge.id} layout initial={{ opacity: 0, scale: 0.92, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ delay: index * 0.03, type: 'spring', stiffness: 300, damping: 25 }} role="gridcell">
                <BadgeCard badge={badge} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
});
