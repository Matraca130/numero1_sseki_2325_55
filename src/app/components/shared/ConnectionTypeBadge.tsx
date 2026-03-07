// ============================================================
// Axon — ConnectionTypeBadge (shared)
//
// Displays a compact badge for keyword connection types.
// Supports light (professor panel) and dark (student popup) variants.
//
// Usage:
//   <ConnectionTypeBadge type="causa-efecto" />              // default: light
//   <ConnectionTypeBadge type="prerequisito" variant="dark" />
// ============================================================
import React from 'react';
import {
  getConnectionType,
  type ConnectionTypeConfig,
} from '@/app/lib/connection-types';

// Dark-mode color map: value → { bg, color }
// Derived from the light-mode colors in connection-types.ts
const DARK_COLORS: Record<string, { bg: string; color: string }> = {
  prerequisito:    { bg: 'bg-blue-500/15',    color: 'text-blue-400' },
  'causa-efecto':  { bg: 'bg-red-500/15',     color: 'text-red-400' },
  mecanismo:       { bg: 'bg-orange-500/15',   color: 'text-orange-400' },
  'dx-diferencial':{ bg: 'bg-purple-500/15',   color: 'text-purple-400' },
  tratamiento:     { bg: 'bg-emerald-500/15',  color: 'text-emerald-400' },
  manifestacion:   { bg: 'bg-pink-500/15',     color: 'text-pink-400' },
  regulacion:      { bg: 'bg-cyan-500/15',     color: 'text-cyan-400' },
  contraste:       { bg: 'bg-amber-500/15',    color: 'text-amber-400' },
  componente:      { bg: 'bg-indigo-500/15',   color: 'text-indigo-400' },
  asociacion:      { bg: 'bg-teal-500/15',     color: 'text-teal-400' },
};

interface ConnectionTypeBadgeProps {
  type: string | null;
  /** "light" for professor (white bg), "dark" for student (zinc-900 bg) */
  variant?: 'light' | 'dark';
  className?: string;
}

export function ConnectionTypeBadge({
  type,
  variant = 'light',
  className = '',
}: ConnectionTypeBadgeProps) {
  const cfg = getConnectionType(type);
  if (!cfg) return null;

  const colors =
    variant === 'dark' && type
      ? DARK_COLORS[type] ?? { bg: 'bg-zinc-700', color: 'text-zinc-400' }
      : { bg: cfg.bg, color: cfg.color };

  return (
    <span
      className={`inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.color} shrink-0 ${className}`}
      style={{ fontWeight: 600 }}
      title={cfg.description}
    >
      {cfg.label}
    </span>
  );
}
