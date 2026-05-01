// ============================================================
// Axon — Atlas: RunProgress
//
// Realtime view of a single Atlas run.
// Subscribes to `atlas.runs` UPDATEs filtered by run_id, refetches the view
// row on each event so we project through `public.atlas_runs_v1` (single
// source of truth for the FE schema).
//
// First Realtime feature in the FE — establishes the cleanup pattern:
//   useEffect cleanup MUST call supabase.removeChannel(channel) to avoid
//   lingering websocket subscriptions on unmount/route change.
//
// Spec: SPEC_UI_AXON_M2_M5_PLAN.md §2 M4 (lines 704-713).
//
// R10 deep-link decision: option (c) — display run + summary_id, do NOT
// link to /student/summary/:id (RequireRole on /student/* rejects role=professor;
// see src/app/routes.tsx:104 + RequireRole.tsx:21-23).
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Loader2, Clock, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/app/lib/supabase';
import { useAtlasRun } from '@/app/hooks/useAtlasRun';
import { isTerminalStatus, type AtlasRun } from '@/app/types/atlasRuns';
import { RunStatusBadge } from './RunStatusBadge';

interface Props {
  runId: string;
}

function formatElapsed(startIso: string, endIso: string | null): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function RunProgress({ runId }: Props) {
  const { data: initial, isLoading, error, refetch } = useAtlasRun(runId);
  const [run, setRun] = useState<AtlasRun | null>(null);

  // Tick every second while non-terminal so elapsed time stays live.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!run || isTerminalStatus(run.status)) return;
    const id = window.setInterval(() => setTick(t => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [run?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seed local state from the initial fetch.
  useEffect(() => {
    if (initial) setRun(initial);
  }, [initial]);

  // Realtime subscription — first Realtime feature in the FE; the cleanup
  // function MUST removeChannel so navigating away does not leak sockets.
  useEffect(() => {
    if (!runId) return;

    let cancelled = false;

    const refetchRow = async () => {
      // Refetch via the view: keeps the FE on a stable contract
      // (`public.atlas_runs_v1`) regardless of `atlas.runs` column drift.
      const { data, error: fetchErr } = await supabase
        .from('atlas_runs_v1')
        .select('*')
        .eq('run_id', runId)
        .maybeSingle();
      if (cancelled) return null;
      if (fetchErr) {
        // Surface but don't blow up: subscription stays alive.
        // eslint-disable-next-line no-console
        console.error('[RunProgress] view refetch failed', fetchErr);
        return null;
      }
      return data as AtlasRun | null;
    };

    const channel = supabase
      .channel(`run-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'atlas',
          table: 'runs',
          filter: `run_id=eq.${runId}`,
        },
        async () => {
          const next = await refetchRow();
          if (next) {
            setRun(next);
            if (next.status === 'ok') {
              toast.success('Resumen generado correctamente');
            } else if (next.status === 'error') {
              toast.error(next.error_message ?? 'La generacion fallo');
            } else if (next.status === 'cancelled') {
              toast.message('Generacion cancelada');
            }
            if (isTerminalStatus(next.status)) {
              // Terminal: drop the channel — saves ws traffic.
              supabase.removeChannel(channel);
            }
          }
        },
      )
      .subscribe(async (status) => {
        // Once we are SUBSCRIBED, refetch once more — closes the race where an
        // UPDATE lands in the window between the initial useAtlasRun query and
        // the channel becoming live. Without this, a fast-finishing run would
        // stay visually "running" until a no-op event arrived.
        //
        // NOTE: Supabase fires `SUBSCRIBED` again on reconnect after a network
        // blip, so this refetch can run multiple times per channel lifetime.
        // It is idempotent (just resets `run` to the latest view row), so this
        // is not a bug — but it is NOT exactly-once. Don't add side-effects
        // (toasts, analytics) to this branch without a "fired this lifecycle
        // already" guard.
        if (status === 'SUBSCRIBED') {
          const next = await refetchRow();
          if (next) setRun(next);
        }
      });

    return () => {
      // Idempotent: safe whether or not the terminal-handler already removed it.
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [runId]);

  const elapsed = useMemo(
    () => (run ? formatElapsed(run.started_at, run.finished_at) : null),
    [run, run?.finished_at, run?.status], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Cargando generacion...
        </CardContent>
      </Card>
    );
  }

  if (error || !run) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-destructive">
          <AlertCircle className="size-4" />
          No se pudo cargar la generacion {runId}.
          <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-auto">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isRunning = !isTerminalStatus(run.status);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">
            {run.topic}
          </CardTitle>
          {run.subject && (
            <p className="text-xs text-muted-foreground">{run.subject}</p>
          )}
        </div>
        <RunStatusBadge status={run.status} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {isRunning ? 'Tiempo transcurrido' : 'Duracion'}: {elapsed}
          </span>
          <span className="inline-flex items-center gap-1">
            Modo: <span className="font-medium text-foreground">{run.mode}</span>
          </span>
          {run.pdf_name && (
            <span className="inline-flex items-center gap-1">
              <FileText className="size-3.5" />
              {run.pdf_name}
            </span>
          )}
        </div>

        {isRunning && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Esperando actualizaciones en tiempo real...
          </div>
        )}

        {run.status === 'error' && run.error_message && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {run.error_message}
          </div>
        )}

        {run.status === 'ok' && run.summary_id && (
          // R10 = (c): no deep-link (RequireRole on /student/* blocks professors).
          // Show the summary_id with a copy action; manual navigation for now.
          <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-xs">
            <div className="font-medium text-green-700 dark:text-green-300">
              Resumen listo
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
              <span>summary_id:</span>
              <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">
                {run.summary_id}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[11px]"
                onClick={() => {
                  navigator.clipboard?.writeText(run.summary_id ?? '');
                  toast.success('summary_id copiado');
                }}
              >
                Copiar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
