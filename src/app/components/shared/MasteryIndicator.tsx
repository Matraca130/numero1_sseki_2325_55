// ============================================================
// Axon — MasteryIndicator (shared visual component)
//
// Variants:
//   dot:   small colored circle (for subtopic lists)
//   badge: chip with label "Dominado"/"Aprendiendo"/"Debil"
//   ring:  circular progress ring (for keyword popup header)
//
// Colors:
//   emerald-500 (>=0.80), amber-500 (>=0.50),
//   red-500 (<0.50), zinc-400 (no data / -1)
// ============================================================
import React from 'react';
import clsx from 'clsx';
import {
  getMasteryColor,
  getMasteryLabel,
  getMasteryTailwind,
  type MasteryColor,
} from '@/app/lib/mastery-helpers';

interface MasteryIndicatorProps {
  /** 0-1 mastery value, or -1 for "no data" */
  pMastery: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dot' | 'badge' | 'ring';
  /** Show tooltip on hover */
  showTooltip?: boolean;
}

// ── Size configs ──────────────────────────────────────────
const dotSizes = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-3 h-3' };
const ringSizes = { sm: 24, md: 32, lg: 40 };
const ringStroke = { sm: 2.5, md: 3, lg: 3.5 };

export function MasteryIndicator({
  pMastery,
  size = 'md',
  variant = 'dot',
  showTooltip = true,
}: MasteryIndicatorProps) {
  const color: MasteryColor = pMastery < 0 ? 'gray' : getMasteryColor(pMastery);
  const label = getMasteryLabel(color);
  const tw = getMasteryTailwind(color);
  const pct = pMastery < 0 ? 0 : Math.round(pMastery * 100);

  const tooltipText = pMastery < 0
    ? 'Sin datos de estudio'
    : `${label} (${pct}%)`;

  // ── DOT variant ─────────────────────────────────────────
  if (variant === 'dot') {
    return (
      <span
        className={clsx('inline-block rounded-full shrink-0', dotSizes[size], tw.bg)}
        title={showTooltip ? tooltipText : undefined}
      />
    );
  }

  // ── BADGE variant ───────────────────────────────────────
  if (variant === 'badge') {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1 rounded-full',
          tw.bgLight, tw.textDark,
          size === 'sm' ? 'text-[9px] px-1.5 py-0.5' :
          size === 'md' ? 'text-[10px] px-2 py-0.5' :
          'text-xs px-2.5 py-1',
        )}
        title={showTooltip ? tooltipText : undefined}
      >
        <span className={clsx('inline-block rounded-full', dotSizes.sm, tw.bg)} />
        {label}
        {pMastery >= 0 && (
          <span className="opacity-60">{pct}%</span>
        )}
      </span>
    );
  }

  // ── RING variant ────────────────────────────────────────
  const ringSize = ringSizes[size];
  const stroke = ringStroke[size];
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (pMastery < 0 ? 0 : pMastery));

  // SVG color classes mapped to actual hex
  const colorHex: Record<MasteryColor, string> = {
    green: '#10b981',
    yellow: '#f59e0b',
    red: '#ef4444',
    gray: '#a1a1aa',
  };

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: ringSize, height: ringSize }}
      title={showTooltip ? tooltipText : undefined}
    >
      <svg width={ringSize} height={ringSize} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          fill="none"
          stroke="rgba(113,113,122,0.3)"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          fill="none"
          stroke={colorHex[color]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      {/* Center text */}
      <span className={clsx(
        'absolute inset-0 flex items-center justify-center',
        tw.textDark,
        size === 'sm' ? 'text-[7px]' : size === 'md' ? 'text-[8px]' : 'text-[10px]',
      )}>
        {pMastery < 0 ? '—' : `${pct}`}
      </span>
    </div>
  );
}
