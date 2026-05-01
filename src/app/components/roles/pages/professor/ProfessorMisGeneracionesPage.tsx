// ============================================================
// Axon — Professor: "Mis generaciones" page
//
// Two modes:
//   /professor/mis-generaciones           → renders <RunHistory />
//   /professor/mis-generaciones/:runId    → renders <RunProgress runId={...} />
//                                           on top, with <RunHistory /> below.
//
// This file OVERWRITES the placeholder created by M3 (parallel agent).
// On merge of both PRs, accept this version (real UI) over M3's placeholder.
//
// Spec: SPEC_UI_AXON_M2_M5_PLAN.md §2 M4 (lines 704-713).
// R10 deep-link: option (c) — see RunProgress for rationale.
// ============================================================
import React from 'react';
import { useParams } from 'react-router';
import { RunProgress } from '@/app/components/professor/atlas/RunProgress';
import { RunHistory } from '@/app/components/professor/atlas/RunHistory';

export function ProfessorMisGeneracionesPage() {
  const { runId } = useParams<{ runId?: string }>();

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Mis generaciones</h1>
        <p className="text-sm text-muted-foreground">
          Seguimiento en tiempo real de tus generaciones Atlas e historial completo.
        </p>
      </header>

      {runId && <RunProgress runId={runId} />}
      <RunHistory />
    </div>
  );
}

export default ProfessorMisGeneracionesPage;
