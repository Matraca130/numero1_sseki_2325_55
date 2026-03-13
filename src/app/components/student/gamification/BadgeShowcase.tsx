// ============================================================
// Axon — BadgeShowcase (Gamification Dashboard)
// Grid display of all badges with earned/locked states.
// ============================================================

import { useState } from 'react';
import { Award, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { BadgeWithStatus } from '@/app/services/gamificationApi';

interface BadgeShowcaseProps {
  badges: BadgeWithStatus[];
  isLoading: boolean;
  maxVisible?: number;
}

const rarityColors: Record<string, { bg: string; border: string; text: string }> = {
  common:    { bg: '#f3f4f6', border: '#e5e7eb', text: '#6b7280' },
  rare:      { bg: '#eff6ff', border: '#bfdbfe', text: '#3b82f6' },
  epic:      { bg: '#f5f3ff', border: '#c4b5fd', text: '#8b5cf6' },
  legendary: { bg: '#fefce8', border: '#fde047', text: '#eab308' },
};

const categoryLabels: Record<string, string> = {
  consistency: 'Consistencia',
  study: 'Estudio',
  mastery: 'Dominio',
  exploration: 'Exploracion',
  social: 'Social',
};

export function BadgeShowcase({ badges, isLoading, maxVisible = 12 }: BadgeShowcaseProps) {
  const shouldReduce = useReducedMotion();
  const [showAll, setShowAll] = useState(false);

  const earned = badges.filter(b => b.earned);
  const locked = badges.filter(b => !b.earned);
  const sorted = [...earned, ...locked];
  const visible = showAll ? sorted : sorted.slice(0, maxVisible);
  const hasMore = sorted.length > maxVisible;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-xl bg-gray-100 animate-pulse" />
              <div className="h-2.5 w-10 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="rounded-2xl border border-gray-200 bg-white p-5"
      initial={shouldReduce ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: '#f5f3ff' }}
        >
          <Award className="w-4 h-4" style={{ color: '#8b5cf6' }} />
        </div>
        <div>
          <h3 className="text-sm" style={{ color: '#111827', fontWeight: 700 }}>
            Insignias
          </h3>
          <span className="text-[10px]" style={{ color: '#9ca3af' }}>
            {earned.length} de {badges.length} obtenidas
          </span>
        </div>
      </div>

      {/* Badge grid */}
      {badges.length === 0 ? (
        <div className="text-center py-6">
          <Award className="w-6 h-6 mx-auto mb-1.5" style={{ color: '#d1d5db' }} />
          <p className="text-[11px]" style={{ color: '#9ca3af' }}>
            Las insignias apareceran aqui
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {visible.map((badge, idx) => {
              const rarity = rarityColors[badge.rarity] ?? rarityColors.common;
              const isEarned = badge.earned;

              return (
                <motion.div
                  key={badge.id}
                  className="flex flex-col items-center gap-1.5 group relative"
                  initial={shouldReduce ? {} : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.03 * idx }}
                  title={`${badge.name} — ${badge.description}`}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110"
                    style={{
                      backgroundColor: isEarned ? rarity.bg : '#f9fafb',
                      borderColor: isEarned ? rarity.border : '#e5e7eb',
                      opacity: isEarned ? 1 : 0.5,
                    }}
                  >
                    {isEarned ? (
                      <Award className="w-5 h-5" style={{ color: rarity.text }} />
                    ) : (
                      <Lock className="w-4 h-4" style={{ color: '#d1d5db' }} />
                    )}
                  </div>
                  <span
                    className="text-[9px] text-center leading-tight max-w-[56px] truncate"
                    style={{
                      color: isEarned ? '#374151' : '#9ca3af',
                      fontWeight: isEarned ? 600 : 400,
                    }}
                  >
                    {badge.name}
                  </span>
                  {badge.category && (
                    <span className="text-[8px]" style={{ color: '#d1d5db' }}>
                      {categoryLabels[badge.category] ?? badge.category}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Show more / less */}
          {hasMore && (
            <button
              onClick={() => setShowAll(prev => !prev)}
              className="flex items-center gap-1 mx-auto mt-4 text-[11px] cursor-pointer hover:opacity-80 transition-opacity"
              style={{ color: '#2a8c7a', fontWeight: 600 }}
            >
              {showAll ? (
                <><ChevronUp className="w-3.5 h-3.5" /> Ver menos</>
              ) : (
                <><ChevronDown className="w-3.5 h-3.5" /> Ver todas ({sorted.length})</>
              )}
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}

export default BadgeShowcase;
