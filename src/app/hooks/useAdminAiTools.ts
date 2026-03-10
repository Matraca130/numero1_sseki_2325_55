// ============================================================
// Axon — useAdminAiTools Hook (v4.5)
//
// Manages admin/professor AI infrastructure tools:
//   - Embedding ingestion (batch generate embeddings)
//   - Re-chunking (force re-chunk + re-embed a summary)
//
// BACKEND ROUTES:
//   POST /ai/ingest-embeddings
//   POST /ai/re-chunk
// ============================================================

import { useState, useCallback, useRef } from 'react';
import {
  ingestEmbeddings,
  reChunk,
  type IngestResult,
  type ReChunkResult,
  type ReChunkOptions,
  type IngestTarget,
} from '@/app/services/aiService';

// ── Types ─────────────────────────────────────────────────

export type ToolPhase = 'idle' | 'running' | 'done' | 'error';

export interface JobRecord {
  id: string;
  type: 'ingest' | 'rechunk';
  startedAt: string;
  completedAt?: string;
  result?: IngestResult | ReChunkResult;
  error?: string;
  params: Record<string, unknown>;
}

// ── Hook ──────────────────────────────────────────────────

export function useAdminAiTools(institutionId: string) {
  // ── Ingest state ─────────────────────────────────────
  const [ingestPhase, setIngestPhase] = useState<ToolPhase>('idle');
  const [ingestResult, setIngestResult] = useState<IngestResult | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const ingestRunningRef = useRef(false);

  // ── Re-chunk state ───────────────────────────────────
  const [reChunkPhase, setReChunkPhase] = useState<ToolPhase>('idle');
  const [reChunkResult, setReChunkResult] = useState<ReChunkResult | null>(null);
  const [reChunkError, setReChunkError] = useState<string | null>(null);
  const reChunkRunningRef = useRef(false);

  // ── Job history (local) ──────────────────────────────
  const [jobHistory, setJobHistory] = useState<JobRecord[]>([]);
  const jobIdCounter = useRef(0);

  const addJob = useCallback((
    type: 'ingest' | 'rechunk',
    params: Record<string, unknown>,
    result?: IngestResult | ReChunkResult,
    error?: string
  ) => {
    const job: JobRecord = {
      id: `${type}-${++jobIdCounter.current}`,
      type,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      result,
      error,
      params,
    };
    setJobHistory(prev => [job, ...prev].slice(0, 20)); // Keep last 20
  }, []);

  // ── Run embedding ingestion ────────────────────────────

  const runIngest = useCallback(async (
    opts?: {
      target?: IngestTarget;
      summaryId?: string;
      batchSize?: number;
    }
  ): Promise<IngestResult | null> => {
    if (!institutionId) return null;
    if (ingestRunningRef.current) return null;
    ingestRunningRef.current = true;

    setIngestPhase('running');
    setIngestError(null);
    setIngestResult(null);

    const params = {
      institutionId,
      target: opts?.target || 'chunks' as IngestTarget,
      summaryId: opts?.summaryId,
      batchSize: opts?.batchSize,
    };

    try {
      const result = await ingestEmbeddings(params);
      setIngestResult(result);
      setIngestPhase('done');
      addJob('ingest', params as Record<string, unknown>, result);
      return result;
    } catch (err: any) {
      const message = err.message || 'Error en ingestion de embeddings';
      setIngestError(message);
      setIngestPhase('error');
      addJob('ingest', params as Record<string, unknown>, undefined, message);
      return null;
    } finally {
      ingestRunningRef.current = false;
    }
  }, [institutionId, addJob]);

  // ── Run re-chunking ──────────────────────────────────

  const runReChunk = useCallback(async (
    summaryId: string,
    options?: ReChunkOptions
  ): Promise<ReChunkResult | null> => {
    if (!institutionId) return null;
    if (!summaryId) return null;
    if (reChunkRunningRef.current) return null;
    reChunkRunningRef.current = true;

    setReChunkPhase('running');
    setReChunkError(null);
    setReChunkResult(null);

    const params = {
      summaryId,
      institutionId,
      options,
    };

    try {
      const result = await reChunk(params);
      setReChunkResult(result);
      setReChunkPhase('done');
      addJob('rechunk', params as Record<string, unknown>, result);
      return result;
    } catch (err: any) {
      const message = err.message || 'Error en re-chunking';
      setReChunkError(message);
      setReChunkPhase('error');
      addJob('rechunk', params as Record<string, unknown>, undefined, message);
      return null;
    } finally {
      reChunkRunningRef.current = false;
    }
  }, [institutionId, addJob]);

  // ── Reset individual tools ─────────────────────────────

  const resetIngest = useCallback(() => {
    setIngestPhase('idle');
    setIngestResult(null);
    setIngestError(null);
    ingestRunningRef.current = false;
  }, []);

  const resetReChunk = useCallback(() => {
    setReChunkPhase('idle');
    setReChunkResult(null);
    setReChunkError(null);
    reChunkRunningRef.current = false;
  }, []);

  const resetAll = useCallback(() => {
    resetIngest();
    resetReChunk();
  }, [resetIngest, resetReChunk]);

  // ── Computed ───────────────────────────────────────────

  const isAnyRunning = ingestPhase === 'running' || reChunkPhase === 'running';

  return {
    // Ingest state
    ingestPhase,
    ingestResult,
    ingestError,

    // Re-chunk state
    reChunkPhase,
    reChunkResult,
    reChunkError,

    // Shared
    jobHistory,
    isAnyRunning,

    // Actions
    runIngest,
    runReChunk,
    resetIngest,
    resetReChunk,
    resetAll,
  };
}
