// ============================================================
// Axon — useRagAnalytics Hook (v4.5)
//
// RAG query metrics and embedding coverage for admin dashboard.
// BACKEND: GET /ai/rag-analytics, GET /ai/embedding-coverage
// ============================================================

import { useState, useCallback, useRef } from 'react';
import {
  getRagAnalytics, getEmbeddingCoverage,
  type RagAnalytics, type EmbeddingCoverage,
} from '@/app/services/aiService';

export type AnalyticsPhase = 'idle' | 'loading' | 'ready' | 'error';
export interface DateRange { from?: string; to?: string; }

export function useRagAnalytics(institutionId: string) {
  const [phase, setPhase] = useState<AnalyticsPhase>('idle');
  const [analytics, setAnalytics] = useState<RagAnalytics | null>(null);
  const [coverage, setCoverage] = useState<EmbeddingCoverage | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchAnalytics = useCallback(async (range?: DateRange) => {
    if (!institutionId) return;
    const activeRange = range ?? dateRange;
    try {
      const result = await getRagAnalytics(institutionId, activeRange);
      setAnalytics(result); return result;
    } catch (err: any) { console.error('[useRagAnalytics] Analytics fetch failed:', err.message); throw err; }
  }, [institutionId, dateRange]);

  const fetchCoverage = useCallback(async () => {
    if (!institutionId) return;
    try {
      const result = await getEmbeddingCoverage(institutionId);
      setCoverage(result); return result;
    } catch (err: any) { console.error('[useRagAnalytics] Coverage fetch failed:', err.message); throw err; }
  }, [institutionId]);

  const fetchAll = useCallback(async (range?: DateRange) => {
    if (!institutionId) return;
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setPhase('loading'); setError(null);
    try {
      const [analyticsResult, coverageResult] = await Promise.all([
        getRagAnalytics(institutionId, range ?? dateRange),
        getEmbeddingCoverage(institutionId),
      ]);
      setAnalytics(analyticsResult); setCoverage(coverageResult); setPhase('ready');
    } catch (err: any) {
      setError(err.message || 'Error al cargar analytics RAG'); setPhase('error');
    } finally { fetchingRef.current = false; }
  }, [institutionId, dateRange]);

  const updateDateRange = useCallback((newRange: DateRange) => {
    setDateRange(newRange);
    fetchAnalytics(newRange).catch(() => {});
  }, [fetchAnalytics]);

  const feedbackRate = analytics ? analytics.total_queries > 0 ? ((analytics.positive_feedback + analytics.negative_feedback) / analytics.total_queries) * 100 : 0 : null;
  const positiveRate = analytics ? (analytics.positive_feedback + analytics.negative_feedback) > 0 ? (analytics.positive_feedback / (analytics.positive_feedback + analytics.negative_feedback)) * 100 : null : null;
  const zeroResultRate = analytics ? analytics.total_queries > 0 ? (analytics.zero_result_queries / analytics.total_queries) * 100 : 0 : null;

  return {
    phase, analytics, coverage, dateRange, error,
    feedbackRate, positiveRate, zeroResultRate,
    fetchAnalytics, fetchCoverage, fetchAll, updateDateRange,
  };
}
