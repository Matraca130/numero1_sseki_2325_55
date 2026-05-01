// ============================================================
// Axon — Atlas: RunStatusBadge
//
// Small status pill shared by RunProgress and RunHistory.
// ============================================================
import React from 'react';
import { Badge } from '@/app/components/ui/badge';
import { cn } from '@/app/components/ui/utils';
import type { AtlasRunStatus } from '@/app/types/atlasRuns';

interface Props {
  status: AtlasRunStatus;
  className?: string;
}

const STATUS_LABEL: Record<AtlasRunStatus, string> = {
  pending: 'En cola',
  running: 'En proceso',
  ok: 'Completado',
  error: 'Error',
  cancelled: 'Cancelado',
};

// TODO(design): the design system currently exposes `bg-destructive`
// and `bg-muted` semantic tokens but not `bg-info-*` / `bg-success-*`.
// When those tokens land (theme.css `@theme` block / palette.ts), swap
// the literal `bg-blue-500/15` and `bg-green-500/15` here for the tokens.
const STATUS_CLASS: Record<AtlasRunStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  ok: 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30',
  error: 'bg-destructive/15 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground',
};

export function RunStatusBadge({ status, className }: Props) {
  return (
    <Badge variant="outline" className={cn(STATUS_CLASS[status], className)}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
