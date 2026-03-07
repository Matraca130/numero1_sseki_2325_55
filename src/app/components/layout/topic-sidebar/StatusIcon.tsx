// ============================================================
// StatusIcon — Mastery status indicator
//
// Renders the appropriate icon + color for each NodeStatus.
//
// BKT thresholds: mastered >= 0.80 | learning >= 0.50 | new < 0.50
// ============================================================

import { CheckCircle2, Clock, Circle } from 'lucide-react';
import type { NodeStatus } from './types';

interface StatusIconProps {
  status: NodeStatus;
  size?: number;
}

export function StatusIcon({ status, size = 16 }: StatusIconProps) {
  switch (status) {
    case 'mastered':
      return <CheckCircle2 size={size} className="text-emerald-500 shrink-0" />;
    case 'learning':
      return <Clock size={size} className="text-amber-500 shrink-0 animate-pulse" />;
    case 'new':
    case 'empty':
    default:
      return <Circle size={size} className="text-zinc-300 shrink-0" />;
  }
}