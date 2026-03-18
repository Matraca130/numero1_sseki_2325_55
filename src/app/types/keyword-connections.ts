// ============================================================
// Axon — Keyword Connections: shared types
//
// Single source of truth for all connection-related interfaces.
// Consumed by:
//   - professor: KeywordConnectionsPanel (CRUD UI)
//   - student:   useKeywordPopupQueries  (read-only connections)
//   - shared:    useKeywordConnectionsQueries (React Query hooks)
//   - shared:    keywordConnectionsApi (service layer)
//
// The KeywordConnection interface is the SUPERSET of both the
// professor and student variants. Extra fields (created_by,
// summary_id/definition in embedded objects) are optional so
// both consumers work without changes.
// ============================================================

// ── KeywordConnection ─────────────────────────────────────
// Matches DB table `keyword_connections` + PostgREST embedded joins.

export interface KeywordConnection {
  id: string;
  keyword_a_id: string;
  keyword_b_id: string;
  relationship: string | null;
  connection_type: string | null;
  source_keyword_id: string | null;
  /** Will be populated once backend migration adds created_by column */
  created_by?: string | null;
  created_at: string;
  /** PostgREST embedded keyword object from LIST join (keyword_a) */
  keyword_a?: {
    id: string;
    name: string;
    summary_id?: string;
    definition?: string | null;
  } | null;
  /** PostgREST embedded keyword object from LIST join (keyword_b) */
  keyword_b?: {
    id: string;
    name: string;
    summary_id?: string;
    definition?: string | null;
  } | null;
}

// ── ExternalKeyword ───────────────────────────────────────
// Resolved keyword from another summary (cross-summary connections).
// Used by useKeywordPopupQueries for external kw resolution.

export interface ExternalKeyword {
  id: string;
  name: string;
  summary_id: string;
  definition: string | null;
}

// ── SearchResultKeyword ───────────────────────────────────
// Minimal shape returned by GET /keyword-search (cross-summary).

export interface SearchResultKeyword {
  id: string;
  name: string;
  summary_id: string;
  definition: string | null;
  /** Populated client-side from the search response if available */
  summary_title?: string;
}

// ── CreateConnectionInput ─────────────────────────────────
// Body for POST /keyword-connections.
// Canonical order (keyword_a_id < keyword_b_id) is enforced
// by the caller before constructing this object.

export interface CreateConnectionInput {
  keyword_a_id: string;
  keyword_b_id: string;
  relationship: string | null;
  connection_type: string;
  source_keyword_id: string | null;
}
