// ============================================================
// Axon — KeywordConnectionsPanel (Professor: CRUD connections)
//
// Orchestrator component that composes ConnectionList + ConnectionForm.
//
// Routes: GET /keyword-connections?keyword_id=xxx
//         POST /keyword-connections { keyword_a_id, keyword_b_id,
//              relationship, connection_type, source_keyword_id }
//         DELETE /keyword-connections/:id (hard delete)
//
// Canonical order: keyword_a_id < keyword_b_id (lexicographic).
// Backend GET queries BOTH sides (a OR b).
//
// V4 modularization:
//   - ConnectionList  → presentational list of existing connections
//   - ConnectionForm  → self-contained form with search, suggestions, submit
//   - This file       → data layer (queries + mutations) + composition
//
// Props are backward-compatible: summaryId is optional.
// When absent, cross-summary search is disabled and the panel
// works exactly as v1 (same-summary <select> only).
//
// Earlier modularization layers (V3) still apply:
//   - Types → types/keyword-connections.ts
//   - API calls → services/keywordConnectionsApi.ts
//   - React Query hooks → hooks/queries/useKeywordConnectionsQueries.ts
//   - useDebouncedValue → hooks/useDebouncedValue.ts
// ============================================================
import React, { useState, useMemo } from 'react';
import { Skeleton } from '@/app/components/ui/skeleton';
import { ConfirmDialog } from '@/app/components/shared/ConfirmDialog';
import {
  useConnectionsQuery,
  useDeleteConnectionMutation,
} from '@/app/hooks/queries/useKeywordConnectionsQueries';
import type { SummaryKeyword } from '@/app/services/summariesApi';
import { ConnectionList } from './ConnectionList';
import { ConnectionForm } from './ConnectionForm';

// ── Props (unchanged from V3 — no consumer changes needed) ──

interface KeywordConnectionsPanelProps {
  keywordId: string;
  keywordName: string;
  /** All keywords in this summary (for the quick-connect selector) */
  allKeywords: SummaryKeyword[];
  /** When provided, enables cross-summary keyword search */
  summaryId?: string;
}

// ── Main component ────────────────────────────────────────

export function KeywordConnectionsPanel({
  keywordId,
  keywordName,
  allKeywords,
  summaryId,
}: KeywordConnectionsPanelProps) {

  // ── Data layer (React Query) ────────────────────────────
  const connectionsQuery = useConnectionsQuery(keywordId);
  const connections = connectionsQuery.data ?? [];
  const loading = connectionsQuery.isLoading;

  const deleteMutation = useDeleteConnectionMutation(keywordId);

  // ── Derived: set of already-connected keyword IDs ───────
  // Passed to ConnectionForm so it can filter available keywords reactively.
  // When a connection is created, useConnectionsQuery invalidates →
  // connections updates → connectedIds recalculates → Form re-renders.
  const connectedIds = useMemo(() => new Set(
    connections.map(c => c.keyword_a_id === keywordId ? c.keyword_b_id : c.keyword_a_id),
  ), [connections, keywordId]);

  // ── Delete state ────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = () => {
    if (!deletingId) return;
    // Resolve the other keyword's ID from cached connections so the
    // mutation can invalidate BOTH sides of the cache (bilateral).
    const conn = connections.find(c => c.id === deletingId);
    const otherKeywordId = conn
      ? (conn.keyword_a_id === keywordId ? conn.keyword_b_id : conn.keyword_a_id)
      : '';
    deleteMutation.mutate(
      { connectionId: deletingId, otherKeywordId },
      { onSuccess: () => setDeletingId(null) },
    );
  };

  // ── Loading state ───────────────────────────────────────
  if (loading) {
    return (
      <div className="pl-4 py-2 space-y-2">
        {[1, 2].map(i => <Skeleton key={i} className="h-8 w-full rounded" />)}
      </div>
    );
  }

  return (
    <div className="pl-4 py-2">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
        Conexiones ({connections.length})
      </p>

      {/* ── Existing connections ────────────────────────────── */}
      <ConnectionList
        keywordId={keywordId}
        connections={connections}
        allKeywords={allKeywords}
        onRequestDelete={setDeletingId}
      />

      {/* ── Add connection form ────────────────────────────── */}
      <ConnectionForm
        keywordId={keywordId}
        keywordName={keywordName}
        allKeywords={allKeywords}
        connectedIds={connectedIds}
        summaryId={summaryId}
      />

      {/* ── Delete confirm dialog ──────────────────────────── */}
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={open => { if (!open) setDeletingId(null); }}
        title="Eliminar conexion"
        description="Esta conexion sera eliminada permanentemente."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}