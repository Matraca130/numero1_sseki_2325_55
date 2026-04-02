// ============================================================
// Axon — KeywordAutocomplete (3D Pin Linking)
//
// Autocomplete input for linking a pin to a keyword.
// Fetches keywords via:
//   1. GET /summaries?topic_id=xxx → get summary_id
//   2. GET /keywords?summary_id=xxx → get keywords
// Used in PinCreationForm and PinEditor.
//
// ZERO backend changes: the keyword_id column already exists
// in model_3d_pins — this component just exposes it in the UI.
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Link2, X, Loader2 } from 'lucide-react';
import { apiCall } from '@/app/lib/api';

interface Keyword {
  id: string;
  name?: string;
  term?: string;
  definition?: string;
  summary_id?: string;
}

interface KeywordAutocompleteProps {
  /** Topic ID to scope keyword search */
  topicId?: string;
  /** Currently selected keyword ID */
  value: string | null;
  /** Callback when keyword is selected/cleared */
  onChange: (keywordId: string | null, keyword: Keyword | null) => void;
  /** Compact mode for inline use */
  compact?: boolean;
}

export function KeywordAutocomplete({ topicId, value, onChange, compact }: KeywordAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Keyword | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch keywords on query change (debounced)
  const fetchKeywords = useCallback(async (searchQuery: string) => {
    if (!topicId) return;
    setLoading(true);
    try {
      // Step 1: Get summaries for the topic (to find summary_id)
      const summariesRes = await apiCall<{ items?: Array<{ id: string }> } | Array<{ id: string }>>(
        `/summaries?topic_id=${topicId}&limit=10`
      );
      const summaries = Array.isArray(summariesRes) ? summariesRes : (summariesRes?.items || []);

      if (summaries.length === 0) {
        setResults([]);
        return;
      }

      // Step 2: Fetch keywords for each summary
      const allKeywords: Keyword[] = [];
      for (const summary of summaries) {
        try {
          const kwRes = await apiCall<{ items?: Keyword[] } | Keyword[]>(
            `/keywords?summary_id=${summary.id}&limit=50`
          );
          const items = Array.isArray(kwRes) ? kwRes : (kwRes?.items || []);
          allKeywords.push(...items);
        } catch {
          // Skip if a specific summary's keywords fail
        }
      }

      // Deduplicate by id
      const seen = new Set<string>();
      const unique = allKeywords.filter(k => {
        if (seen.has(k.id)) return false;
        seen.add(k.id);
        return true;
      });

      // Client-side filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        setResults(unique.filter(k =>
          (k.name || k.term || '').toLowerCase().includes(q) ||
          (k.definition || '').toLowerCase().includes(q)
        ));
      } else {
        setResults(unique);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchKeywords(val), 300);
  }, [fetchKeywords]);

  // Load initial results when opening
  const handleFocus = useCallback(() => {
    setOpen(true);
    if (results.length === 0 && !loading) {
      fetchKeywords(query);
    }
  }, [results.length, loading, fetchKeywords, query]);

  const handleSelect = useCallback((kw: Keyword) => {
    setSelected(kw);
    setQuery(kw.name || kw.term || '');
    setOpen(false);
    onChange(kw.id, kw);
  }, [onChange]);

  const handleClear = useCallback(() => {
    setSelected(null);
    setQuery('');
    setResults([]);
    onChange(null, null);
  }, [onChange]);

  const keywordName = (kw: Keyword) => kw.name || kw.term || 'Sin nombre';

  if (compact && selected) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/20">
        <Link2 size={9} className="text-violet-400 shrink-0" />
        <span className="text-[9px] text-violet-300 truncate flex-1">
          {keywordName(selected)}
        </span>
        <button
          type="button"
          onClick={handleClear}
          className="text-violet-500 hover:text-violet-300 transition-colors shrink-0"
        >
          <X size={9} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={handleFocus}
          placeholder="Vincular keyword (opcional)..."
          className="w-full pl-6 pr-8 py-1.5 text-[10px] bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-500/30"
        />
        {(selected || query) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
          >
            <X size={10} />
          </button>
        )}
        {loading && (
          <Loader2 size={10} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-gray-500" />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg bg-zinc-800 border border-white/10 shadow-2xl">
          {results.length === 0 && !loading && (
            <div className="px-3 py-2 text-[9px] text-gray-500 text-center">
              {query ? 'Sin resultados' : 'Escribe para buscar keywords'}
            </div>
          )}
          {results.map(kw => (
            <button
              key={kw.id}
              type="button"
              onClick={() => handleSelect(kw)}
              className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
            >
              <div className="flex items-center gap-1.5">
                <Link2 size={9} className="text-violet-400 shrink-0" />
                <span className="text-[10px] text-white truncate">
                  {keywordName(kw)}
                </span>
              </div>
              {kw.definition && (
                <p className="text-[8px] text-gray-500 mt-0.5 line-clamp-1 pl-4">
                  {kw.definition}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Selected badge */}
      {selected && (
        <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/20">
          <Link2 size={9} className="text-violet-400 shrink-0" />
          <span className="text-[9px] text-violet-300 truncate flex-1">
            {keywordName(selected)}
          </span>
          {selected.definition && (
            <span className="text-[8px] text-gray-500 truncate max-w-[120px]">
              {selected.definition}
            </span>
          )}
        </div>
      )}
    </div>
  );
}