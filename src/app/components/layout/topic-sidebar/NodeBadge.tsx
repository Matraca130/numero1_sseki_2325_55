// ============================================================
// NodeBadge — "Siguiente" / "Nuevo" badge for topic nodes
// ============================================================

import type { NodeStatus } from './types';

interface NodeBadgeProps {
  status: NodeStatus;
  isNext?: boolean;
}

export function NodeBadge({ status, isNext }: NodeBadgeProps) {
  if (isNext) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-600 text-white font-medium shrink-0 animate-pulse">
        Siguiente
      </span>
    );
  }

  if (status === 'new' || status === 'empty') {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-600 font-medium shrink-0">
        Nuevo
      </span>
    );
  }

  return null;
}
