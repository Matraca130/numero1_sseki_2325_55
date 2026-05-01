// ============================================================
// Axon — Atlas Runs shared types (M3/M4)
//
// `AtlasRun` mirrors the columns of `public.atlas_runs_v1`, the
// stable view published over `atlas.runs` (see SPEC §2 M4 — schema
// exposure decision). The frontend ALWAYS reads through the view,
// never directly from the `atlas` schema.
//
// `GenerateRunInput` / `GenerateRunResponse` describe the M3
// `POST /atlas/generate` contract (see SPEC §2 M3).
// ============================================================

/** Run lifecycle states (atlas.runs.status) */
export type AtlasRunStatus =
  | 'pending'
  | 'running'
  | 'ok'
  | 'error'
  | 'cancelled';

/** Mode of a generation run (matches DB CHECK constraint) */
export type AtlasRunMode = 'contenido' | 'estudio';

/**
 * Stable shape exposed by `public.atlas_runs_v1`.
 * If the underlying `atlas.runs` table changes, the view (and this
 * type) should be the only thing that needs to be updated.
 */
export interface AtlasRun {
  run_id: string;
  user_id: string;
  institution_id: string;
  topic: string;
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

/** Payload submitted by the M3 form (multipart/form-data). */
export interface GenerateRunInput {
  /** Mode of the generation run. */
  mode: AtlasRunMode;
  /** Free-text topic (becomes `atlas.runs.topic`). */
  topic: string;
  /** Course name (display + submitted value). Worker resolves `course_name → topic_id`. */
  subject: string;
  /** Whether the worker should also run image generation. */
  generate_images: boolean;
  /** PDF (≤ 25 MB, application/pdf). */
  file: File;
  /**
   * Institution ID — sent as `X-Institution-Id` header, NOT as a
   * form field. Kept here so the hook can pull it off the input
   * struct and place it in the right transport slot.
   */
  institutionId: string;
}

/** Server response to `POST /atlas/generate` (after `{data: ...}` unwrap). */
export interface GenerateRunResponse {
  run_id: string;
  status: AtlasRunStatus;
}

/**
 * Terminal lifecycle states. After reaching one of these, an `atlas.runs`
 * row no longer changes — the M4 Realtime channel can be torn down and
 * UI loops can exit. `pending` and `running` are non-terminal.
 */
const TERMINAL_STATUSES = new Set<AtlasRunStatus>(['ok', 'error', 'cancelled']);

/** Returns true when the run has reached a terminal state. */
export function isTerminalStatus(status: AtlasRunStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}
