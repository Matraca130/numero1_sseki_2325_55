// ============================================================
// Axon — Badge Showcase Component
// ============================================================

import { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import { Award, Lock, Flame, BookOpen, Brain, Target, Star, Zap, Clock, Trophy, Footprints, CalendarCheck, Crown, Cog, Repeat, Timer, Compass, GraduationCap, MessageCircle, Search, BookMarked, Users, Medal } from 'lucide-react';
import type { Badge } from '@/app/types/gamification';

interface BadgeShowcaseProps {
  badges: Badge[] | undefined;
  isLoading?: boolean;
  maxVisible?: number;
  className?: string;
}

const ICON_MAP: Record<string, typeof Award> = {
  Footprints, CalendarCheck, Flame, Zap, Crown, BookOpen, Repeat, Cog,
  Trophy, Timer, Compass, Star, Award, GraduationCap, Brain, MessageCircle,
  Search, BookMarked, Users, Medal, Target, Clock,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  consistency: { bg: '#fef3c7', text: '#92400e', glow: '#fbbf24' },
  study: { bg: '#dbeafe', text: '#1e40af', glow: '#60a5fa' },
  mastery: { bg: '#d1fae5', text: '#065f46', glow: '#34d399' },
  exploration: { bg: '#ede9fe', text: '#5b21b6', glow: '#a78bfa' },
  social: { bg: '#fce7f3', text: '#9d174d', glow: '#f472b6' },
};

const RARITY_RING: Record<string, { border: string; shadow: string }> = {
  common: { border: '#9ca3af', shadow: 'none' },
  rare: { border: '#60a5fa', shadow: '0 0 6px #60a5fa40' },
  epic: { border: '#a78bfa', shadow: '0 0 8px #a78bfa50' },
  legendary: { border: '#f59e0b', shadow: '0 0 10px #f59e0b50' },
};

function BadgeItem({ badge, index }: { badge: Badge; index: number }) {
  const shouldReduce = useReducedMotion();
  const [showTooltip, setShowTooltip] = useState(false);
  const earned = !!badge.earned_at;
  const Icon = ICON_MAP[badge.icon] ?? Award;
  const cat = CATEGORY_COLORS[badge.category] ?? CATEGORY_COLORS.study;
  const rarity = earned ? (RARITY_RING[badge.rarity ?? 'common'] ?? RARITY_RING.common) : null;

  return (
    <motion.div
      className="flex flex-col items-center gap-1.5 p-2 rounded-xl relative group cursor-pointer"
      style={{
        backgroundColor: earned ? cat.bg : '#f9fafb',
        opacity: earned ? 1 : 0.5,
        border: rarity ? `1.5px solid ${rarity.border}` : '1.5px solid transparent',
        boxShadow: rarity?.shadow ?? 'none',
      }}
      initial={shouldReduce ? {} : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: earned ? 1 : 0.5, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={earned ? { scale: 1.08, y: -2 } : {}}
      onClick={() => setShowTooltip(prev => !prev)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {earned && !shouldReduce && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{ boxShadow: `0 0 12px ${cat.glow}40` }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <div className="relative">
        {earned ? (
          <Icon className="w-6 h-6" style={{ color: cat.text }} />
        ) : (
          <Lock className="w-5 h-5" style={{ color: '#d1d5db' }} />
        )}
      </div>

      <span
        className="text-[9px] text-center leading-tight max-w-[64px]"
        style={{ color: earned ? cat.text : '#9ca3af', fontWeight: earned ? 600 : 400 }}
      >
        {badge.name}
      </span>

      {earned && badge.rarity && badge.rarity !== 'common' && (
        <span
          className="text-[7px] px-1 py-px rounded-full"
          style={{ backgroundColor: `${rarity?.border}20`, color: rarity?.border, fontWeight: 700 }}
        >
          {badge.rarity === 'legendary' ? 'LEGEND' : badge.rarity === 'epic' ? 'EPIC' : 'RARE'}
        </span>
      )}

      {!earned && badge.progress !== undefined && badge.requirement && (
        <div className="w-full h-1 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gray-400"
            style={{ width: `${Math.min(100, (badge.progress / badge.requirement) * 100)}%` }}
          />
        </div>
      )}

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
          >
            <div
              className="px-2 py-1 rounded-lg text-[9px] whitespace-nowrap"
              style={{ backgroundColor: 'rgba(0,0,0,0.85)', color: '#fff' }}
            >
              {badge.description}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showTooltip && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 pointer-events-none">
          <div
            className="px-2 py-1 rounded-lg text-[9px] whitespace-nowrap"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)', color: '#fff' }}
          >
            {badge.description}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function BadgeShowcase({ badges, isLoading, maxVisible = 12, className = '' }: BadgeShowcaseProps) {
  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-gray-200 bg-white p-4 animate-pulse ${className}`}>
        <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const items = badges ?? [];
  const earned = items.filter(b => b.earned_at);
  const unearned = items.filter(b => !b.earned_at);
  const nextBadge = unearned
    .filter(b => b.progress !== undefined && b.requirement && b.requirement > 0)
    .sort((a, b) => (b.progress! / b.requirement!) - (a.progress! / a.requirement!))[0] ?? null;
  const sorted = [...earned, ...unearned].slice(0, maxVisible);

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4" style={{ color: '#a78bfa' }} />
          <h3 className="text-sm" style={{ color: '#111827', fontWeight: 700 }}>
            Insignias
          </h3>
        </div>
        <span className="text-[10px]" style={{ color: '#9ca3af' }}>
          {earned.length}/{items.length} desbloqueadas
        </span>
      </div>

      {nextBadge && (
        <div
          className="flex items-center gap-3 mb-4 px-3 py-2.5 rounded-xl"
          style={{ backgroundColor: '#faf5ff', border: '1px solid #e9d5ff' }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#ede9fe' }}
          >
            {(() => {
              const NextIcon = ICON_MAP[nextBadge.icon] ?? Award;
              return <NextIcon className="w-5 h-5" style={{ color: '#7c3aed' }} />;
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px]" style={{ color: '#5b21b6', fontWeight: 600 }}>
              Proximo logro: {nextBadge.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 rounded-full bg-purple-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: '#8b5cf6',
                    width: `${Math.min(100, ((nextBadge.progress ?? 0) / (nextBadge.requirement ?? 1)) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[9px] shrink-0" style={{ color: '#7c3aed', fontWeight: 600 }}>
                {nextBadge.progress ?? 0}/{nextBadge.requirement}
              </span>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-6">
          <Award className="w-8 h-8 mx-auto mb-2" style={{ color: '#d1d5db' }} />
          <p className="text-xs" style={{ color: '#9ca3af' }}>
            Las insignias se desbloquean al estudiar
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {sorted.map((badge, i) => (
            <BadgeItem key={badge.id || badge.slug} badge={badge} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
