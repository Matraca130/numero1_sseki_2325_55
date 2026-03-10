// ============================================================
// Axon — useSearch Hook (T-02)
//
// Debounced search with 300ms delay.
// Consumes searchApi.search() from services/searchApi.ts.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { search as searchApi } from '@/app/services/searchApi';
import type { SearchResult, SearchType } from '@/app/services/searchApi';

// ── Types ─────────────────────────────────────────────────

export interface UseSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  searchType: SearchType;
  setSearchType: (t: SearchType) => void;
  clear: () => void;
}

// ── Hook ──────────────────────────────────────────────────

export function useSearch(debounceMs: number = 300): UseSearchReturn {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced search effect
  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Reset if query is too short
    if (!query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    timerRef.current = setTimeout(async () => {
      // Cancel previous in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const data = await searchApi(query.trim(), searchType);
        if (!controller.signal.aborted) {
          setResults(data);
          setError(null);
        }
      } catch (err: any) {
        if (!controller.signal.aborted) {
          console.error('[useSearch] Error:', err);
          setError(err?.message || 'Error en busqueda');
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, searchType, debounceMs]);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    setLoading(false);
    abortRef.current?.abort();
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    searchType,
    setSearchType,
    clear,
  };
}
