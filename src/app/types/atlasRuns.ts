// ============================================================
// Axon — Atlas Runs shared types
//
// Mirrors `public.atlas_runs_v1` view (security_invoker over `atlas.runs`).
// Created by M2b: SPEC_UI_AXON_M2_M5_PLAN.md §2 M2b File 2 (lines 410-419).
//
// NOTE: this file is also defined by the parallel M3 PR. If M3 merges first,
// resolve any merge conflict by accepting M3's version.
// ============================================================

export type AtlasRunStatus = 'pending' | 'running' | 'ok' | 'error' | 'cancelled';
export type AtlasRunMode = 'contenido' | 'estudio';

export interface AtlasRun {
  run_id: string;
  user_id: string;
  institution_id: string;
  topic: string | null;
  subject: string | null;
  mode: AtlasRunMode;
  status: AtlasRunStatus;
  summary_id: string | null;
  pdf_name: string | null;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
  heartbeat_at: string | null;
}

export const ATLAS_RUN_TERMINAL_STATUSES: AtlasRunStatus[] = ['ok', 'error', 'cancelled'];

export function isTerminalStatus(status: AtlasRunStatus): boolean {
  return ATLAS_RUN_TERMINAL_STATUSES.includes(status);
}
