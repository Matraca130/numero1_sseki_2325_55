// ============================================================
// Axon — MomentumCard
//
// Displays student study momentum: circular score gauge (0-100),
// trend arrow (rising/stable/falling), streak counter.
// Inserted after DailyRecommendationCard in StudyPlanDashboard.
// ============================================================

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Flame } from 'lucide-react';
import { motion } from 'motion/react';
import { headingStyle, components } from '@/app/design-system';
import { useMomentum } from '@/app/hooks/queries/useMomentum';

const GAUGE_SIZE = 88;
const STROKE_WIDTH = 8;
const RADIUS = (GAUGE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getScoreColor(score: number): string {
  if (score >= 70) return '#2a8c7a';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

const TREND_CONFIG = {
  rising:  { Icon: TrendingUp,   label: 'En alza',   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  stable:  { Icon: Minus,        label: 'Estable',   color: 'text-amber-600',   bg: 'bg-amber-50' },
  falling: { Icon: TrendingDown, label: 'Bajando',   color: 'text-red-600',     bg: 'bg-red-50' },
} as const;

export function MomentumCard() {
  const { data, isLoading, error } = useMomentum();

  if (isLoading) {
    return (
      <div className={`${components.card.base} ${components.card.padding} animate-pulse`}>
        <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
        <div className="flex items-center gap-6">
          <div className="w-[88px] h-[88px] rounded-full bg-gray-100" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-20 bg-gray-100 rounded" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) return null;

  const { score, trend, streak } = data;
  const scoreColor = getScoreColor(score);
  const dashOffset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;
  const trendInfo = TREND_CONFIG[trend] ?? TREND_CONFIG.stable;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${components.card.base} ${components.card.padding}`}
    >
      <h3
        className="text-[15px] font-semibold text-[#1a2332] mb-4"
        style={headingStyle}
      >
        Momentum de estudio
      </h3>

      <div className="flex items-center gap-5">
        {/* Circular gauge */}
        <div className="relative shrink-0" style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}>
          <svg width={GAUGE_SIZE} height={GAUGE_SIZE} className="-rotate-90">
            <circle
              cx={GAUGE_SIZE / 2}
              cy={GAUGE_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth={STROKE_WIDTH}
            />
            <motion.circle
              cx={GAUGE_SIZE / 2}
              cy={GAUGE_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={scoreColor}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[22px] font-bold tabular-nums" style={{ color: scoreColor }}>
              {score}
            </span>
          </div>
        </div>

        {/* Trend + streak */}
        <div className="flex flex-col gap-2.5 min-w-0">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold ${trendInfo.bg} ${trendInfo.color} self-start`}>
            <trendInfo.Icon size={14} />
            {trendInfo.label}
          </div>

          {streak > 0 && (
            <div className="flex items-center gap-1.5 text-[13px] text-[#4a5565]">
              <Flame size={15} className="text-orange-500" />
              <span className="font-semibold">{streak}</span>
              <span className="text-[#9ba3b2]">{streak === 1 ? 'dia' : 'dias'} seguidos</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default MomentumCard;
