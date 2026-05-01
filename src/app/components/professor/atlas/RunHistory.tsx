// ============================================================
// Axon — Atlas: RunHistory
//
// Paginated history of the current professor's Atlas runs (10/page).
// Reads `public.atlas_runs_v1` (RLS-scoped to the JWT user).
//
// Spec: SPEC_UI_AXON_M2_M5_PLAN.md §2 M4 (line 709).
// ============================================================
import React, { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useAtlasRuns } from '@/app/hooks/useAtlasRuns';
import type { AtlasRun } from '@/app/types/atlasRuns';
import { isTerminalStatus } from '@/app/types/atlasRuns';
import { RunStatusBadge } from './RunStatusBadge';

const PAGE_SIZE = 10;

function formatStartedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

function formatElapsed(run: AtlasRun): string {
  if (!isTerminalStatus(run.status)) return 'En curso...';
  const start = new Date(run.started_at).getTime();
  const end = run.finished_at ? new Date(run.finished_at).getTime() : start;
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function RunHistory() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const { data, isLoading, error, refetch, isFetching } = useAtlasRuns({
    userId: user?.id,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows = data?.rows ?? [];
  const hasMore = data?.hasMore ?? false;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Historial de generaciones</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? <Loader2 className="size-3.5 animate-spin" /> : 'Actualizar'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Cargando historial...
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            No se pudo cargar el historial.
          </div>
        )}

        {!isLoading && !error && rows.length === 0 && (
          <p className="py-6 text-sm text-muted-foreground">
            Aun no hay generaciones. Crea una desde "Generar resumen".
          </p>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Estado</th>
                  <th className="px-2 py-2 font-medium">Tema</th>
                  <th className="px-2 py-2 font-medium">Curso</th>
                  <th className="px-2 py-2 font-medium">Modo</th>
                  <th className="px-2 py-2 font-medium">Inicio</th>
                  <th className="px-2 py-2 font-medium">Duracion</th>
                  <th className="px-2 py-2 font-medium text-right">Accion</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(run => (
                  <tr
                    key={run.run_id}
                    className="border-b last:border-b-0 hover:bg-muted/40"
                  >
                    <td className="px-2 py-2">
                      <RunStatusBadge status={run.status} />
                    </td>
                    <td className="px-2 py-2 max-w-[200px] truncate" title={run.topic}>
                      {run.topic}
                    </td>
                    <td className="px-2 py-2 max-w-[160px] truncate" title={run.subject ?? ''}>
                      {run.subject || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-2 py-2 text-xs">{run.mode}</td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">
                      {formatStartedAt(run.started_at)}
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">
                      {formatElapsed(run)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                        <Link to={`/professor/mis-generaciones/${run.run_id}`}>
                          Ver
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(rows.length > 0 || page > 0) && (
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || isFetching}
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">Pagina {page + 1}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore || isFetching}
            >
              Siguiente
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
