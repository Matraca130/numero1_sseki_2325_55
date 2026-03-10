// ============================================================
// Axon — AdminAiToolsPanel (v4.5, Fase E-5)
//
// Admin panel for AI infrastructure management:
//   - Batch embedding generation
//   - Summary re-chunking
//   - Job history log
//
// USAGE:
//   <AdminAiToolsPanel institutionId={institutionId} />
//
// BACKEND ROUTES:
//   POST /ai/ingest-embeddings — Batch embedding generation
//   POST /ai/re-chunk          — Manual re-chunking
//
// DEPENDENCIES:
//   - useAdminAiTools hook
//   - design-system tokens
//   - shadcn Card, Button, Select, Input
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  Database,
  Layers,
  Play,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  RefreshCw,
  Settings2,
  Trash2,
  History,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { useAdminAiTools, type ToolPhase, type JobRecord } from '@/app/hooks/useAdminAiTools';
import type { IngestTarget, IngestResult, ReChunkResult } from '@/app/services/aiService';
import { components, headingStyle } from '@/app/design-system';

// ── Component ───────────────────────────────────────────

interface AdminAiToolsPanelProps {
  institutionId: string;
}

export function AdminAiToolsPanel({ institutionId }: AdminAiToolsPanelProps) {
  const {
    ingestPhase, ingestResult, ingestError,
    reChunkPhase, reChunkResult, reChunkError,
    jobHistory, isAnyRunning,
    runIngest, runReChunk,
    resetIngest, resetReChunk,
  } = useAdminAiTools(institutionId);

  // ── Ingest form state ────────────────────────────
  const [ingestTarget, setIngestTarget] = useState<IngestTarget>('chunks');
  const [ingestSummaryId, setIngestSummaryId] = useState('');
  const [ingestBatchSize, setIngestBatchSize] = useState('50');

  // ── Re-chunk form state ──────────────────────────
  const [reChunkSummaryId, setReChunkSummaryId] = useState('');
  const [maxChunkSize, setMaxChunkSize] = useState('');
  const [minChunkSize, setMinChunkSize] = useState('');
  const [overlapSize, setOverlapSize] = useState('');

  // ── Handlers ─────────────────────────────────────

  const handleRunIngest = useCallback(async () => {
    await runIngest({
      target: ingestTarget,
      summaryId: ingestSummaryId.trim() || undefined,
      batchSize: parseInt(ingestBatchSize) || 50,
    });
  }, [runIngest, ingestTarget, ingestSummaryId, ingestBatchSize]);

  const handleRunReChunk = useCallback(async () => {
    if (!reChunkSummaryId.trim()) return;

    const options: Record<string, number> = {};
    if (maxChunkSize) options.maxChunkSize = parseInt(maxChunkSize);
    if (minChunkSize) options.minChunkSize = parseInt(minChunkSize);
    if (overlapSize) options.overlapSize = parseInt(overlapSize);

    await runReChunk(
      reChunkSummaryId.trim(),
      Object.keys(options).length > 0 ? options : undefined
    );
  }, [runReChunk, reChunkSummaryId, maxChunkSize, minChunkSize, overlapSize]);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* ── Header ────────────────────────────── */}
      <div>
        <h1
          className="text-2xl text-gray-900 tracking-tight"
          style={{ ...headingStyle, fontWeight: 700 }}
        >
          Herramientas Admin IA
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestion de embeddings, chunking y procesamiento de contenido
        </p>
      </div>

      {/* ── Tool Cards Grid ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ═══ Embedding Ingest Tool ═══ */}
        <div className={`${components.card.base} ${components.card.paddingLg} space-y-4`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-gray-900" style={{ ...headingStyle, fontWeight: 600 }}>
                Generar Embeddings
              </h2>
              <p className="text-xs text-gray-500">
                Procesa chunks o resumenes sin embedding
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ fontWeight: 500 }}>Target</Label>
              <Select value={ingestTarget} onValueChange={(v) => setIngestTarget(v as IngestTarget)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chunks">Chunks (granular)</SelectItem>
                  <SelectItem value="summaries">Summaries (coarse)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs" style={{ fontWeight: 500 }}>
                Summary ID (opcional — acotar a un resumen)
              </Label>
              <Input
                value={ingestSummaryId}
                onChange={(e) => setIngestSummaryId(e.target.value)}
                placeholder="UUID del resumen..."
                disabled={ingestPhase === 'running'}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs" style={{ fontWeight: 500 }}>
                Batch size (1-100)
              </Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={ingestBatchSize}
                onChange={(e) => setIngestBatchSize(e.target.value)}
                disabled={ingestPhase === 'running'}
                className="text-sm w-24"
              />
            </div>
          </div>

          {/* Result / Error */}
          {ingestPhase === 'done' && ingestResult && (
            <IngestResultCard result={ingestResult} onReset={resetIngest} />
          )}
          {ingestPhase === 'error' && ingestError && (
            <ErrorCard message={ingestError} onReset={resetIngest} />
          )}

          {/* Action */}
          <Button
            onClick={handleRunIngest}
            disabled={ingestPhase === 'running'}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white"
          >
            {ingestPhase === 'running' ? (
              <>
                <Loader2 size={16} className="animate-spin mr-1.5" />
                Generando embeddings...
              </>
            ) : (
              <>
                <Play size={16} className="mr-1.5" />
                Ejecutar ingestion
              </>
            )}
          </Button>

          {ingestPhase === 'running' && (
            <p className="text-xs text-gray-500 text-center">
              Esto puede tomar hasta 2 minutos para 50 chunks.
            </p>
          )}
        </div>

        {/* ═══ Re-Chunk Tool ═══ */}
        <div className={`${components.card.base} ${components.card.paddingLg} space-y-4`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-gray-900" style={{ ...headingStyle, fontWeight: 600 }}>
                Re-Chunking
              </h2>
              <p className="text-xs text-gray-500">
                Forzar re-division de un resumen + re-embedding
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ fontWeight: 500 }}>
                Summary ID *
              </Label>
              <Input
                value={reChunkSummaryId}
                onChange={(e) => setReChunkSummaryId(e.target.value)}
                placeholder="UUID del resumen a re-chunkear..."
                disabled={reChunkPhase === 'running'}
                className="text-sm"
              />
            </div>

            <details className="group">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-1.5">
                <Settings2 size={12} />
                Opciones avanzadas de chunking
              </summary>
              <div className="mt-3 space-y-3 pl-5">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Max size</Label>
                    <Input
                      type="number"
                      value={maxChunkSize}
                      onChange={(e) => setMaxChunkSize(e.target.value)}
                      placeholder="2000"
                      className="text-sm"
                      disabled={reChunkPhase === 'running'}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Min size</Label>
                    <Input
                      type="number"
                      value={minChunkSize}
                      onChange={(e) => setMinChunkSize(e.target.value)}
                      placeholder="200"
                      className="text-sm"
                      disabled={reChunkPhase === 'running'}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Overlap</Label>
                    <Input
                      type="number"
                      value={overlapSize}
                      onChange={(e) => setOverlapSize(e.target.value)}
                      placeholder="100"
                      className="text-sm"
                      disabled={reChunkPhase === 'running'}
                    />
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Result / Error */}
          {reChunkPhase === 'done' && reChunkResult && (
            <ReChunkResultCard result={reChunkResult} onReset={resetReChunk} />
          )}
          {reChunkPhase === 'error' && reChunkError && (
            <ErrorCard message={reChunkError} onReset={resetReChunk} />
          )}

          {/* Action */}
          <Button
            onClick={handleRunReChunk}
            disabled={reChunkPhase === 'running' || !reChunkSummaryId.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {reChunkPhase === 'running' ? (
              <>
                <Loader2 size={16} className="animate-spin mr-1.5" />
                Re-chunkeando...
              </>
            ) : (
              <>
                <RefreshCw size={16} className="mr-1.5" />
                Ejecutar re-chunk
              </>
            )}
          </Button>

          {reChunkPhase === 'running' && (
            <p className="text-xs text-gray-500 text-center">
              Eliminando chunks antiguos y generando nuevos con embeddings...
            </p>
          )}
        </div>
      </div>

      {/* ── Job History ───────────────────────────── */}
      {jobHistory.length > 0 && (
        <div className={`${components.card.base} ${components.card.padding} space-y-3`}>
          <div className="flex items-center gap-2">
            <History size={16} className="text-gray-400" />
            <h3 className="text-sm text-gray-700" style={{ ...headingStyle, fontWeight: 600 }}>
              Historial de operaciones
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            {jobHistory.map((job) => (
              <JobHistoryRow key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────

function IngestResultCard({ result, onReset }: { result: IngestResult; onReset: () => void }) {
  return (
    <div className="bg-green-50 rounded-xl p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-green-700 text-sm" style={{ fontWeight: 500 }}>
          <CheckCircle2 size={14} />
          Ingestion completada
        </div>
        <button onClick={onReset} className="text-xs text-gray-500 hover:text-gray-700">
          Cerrar
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-green-800">
        <span>Procesados: {result.processed}</span>
        <span>Fallidos: {result.failed}</span>
        <span>Total: {result.total_found}</span>
      </div>
      {result.message && (
        <p className="text-xs text-green-600">{result.message}</p>
      )}
    </div>
  );
}

function ReChunkResultCard({ result, onReset }: { result: ReChunkResult; onReset: () => void }) {
  return (
    <div className="bg-green-50 rounded-xl p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-green-700 text-sm" style={{ fontWeight: 500 }}>
          <CheckCircle2 size={14} />
          Re-chunking completado
        </div>
        <button onClick={onReset} className="text-xs text-gray-500 hover:text-gray-700">
          Cerrar
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-green-800">
        <span>Chunks creados: {result.chunks_created}</span>
        <span>Chunks eliminados: {result.chunks_deleted}</span>
        <span>Embeddings: {result.embeddings_generated}</span>
        <span>Tiempo: {(result.elapsed_ms / 1000).toFixed(1)}s</span>
      </div>
      <p className="text-xs text-green-600">Estrategia: {result.strategy_used}</p>
    </div>
  );
}

function ErrorCard({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="bg-red-50 rounded-xl p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-red-700 text-sm">
          <AlertTriangle size={14} />
          <span>{message}</span>
        </div>
        <button onClick={onReset} className="text-xs text-gray-500 hover:text-gray-700">
          Cerrar
        </button>
      </div>
    </div>
  );
}

function JobHistoryRow({ job }: { job: JobRecord }) {
  const isIngest = job.type === 'ingest';
  const isError = !!job.error;
  const time = job.completedAt
    ? new Date(job.completedAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className={`p-1.5 rounded-lg ${
        isError ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500'
      }`}>
        {isIngest ? <Database size={14} /> : <Layers size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-700" style={{ fontWeight: 500 }}>
          {isIngest ? 'Ingestion embeddings' : 'Re-chunking'}
          {isError ? ' — Error' : ' — OK'}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {isError ? job.error : (
            isIngest
              ? `Procesados: ${(job.result as IngestResult)?.processed ?? '?'}`
              : `Chunks: ${(job.result as ReChunkResult)?.chunks_created ?? '?'}`
          )}
        </p>
      </div>
      <span className="text-xs text-gray-400 flex items-center gap-1">
        <Clock size={10} />
        {time}
      </span>
    </div>
  );
}
