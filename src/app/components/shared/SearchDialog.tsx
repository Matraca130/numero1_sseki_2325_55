// ============================================================
// Axon — SearchDialog (T-02)
//
// Cmd+K / Ctrl+K style search dialog.
// Uses useSearch hook for debounced search.
// Results grouped by type (summaries, keywords, videos).
//
// Design: "Frosted Glass on Teal" dark theme modal.
// ============================================================
import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, FileText, Tag, Video, Loader2, ArrowRight } from 'lucide-react';
import { useSearch } from '@/app/hooks/useSearch';
import type { SearchResult, SearchType } from '@/app/services/searchApi';

// ── Props ─────────────────────────────────────────────────

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when a result is clicked. Receives the result. */
  onNavigate?: (result: SearchResult) => void;
}

// ── Type icon + label ───────────────────────────────────

function getTypeConfig(type: string) {
  switch (type) {
    case 'summaries':
    case 'summary':
      return { icon: FileText, label: 'Resumen', color: 'text-violet-400', bg: 'bg-violet-500/15' };
    case 'keywords':
    case 'keyword':
      return { icon: Tag, label: 'Keyword', color: 'text-emerald-400', bg: 'bg-emerald-500/15' };
    case 'videos':
    case 'video':
      return { icon: Video, label: 'Video', color: 'text-sky-400', bg: 'bg-sky-500/15' };
    default:
      return { icon: FileText, label: type, color: 'text-zinc-400', bg: 'bg-zinc-500/15' };
  }
}

// ── Type filter pills ───────────────────────────────────

const TYPE_FILTERS: { value: SearchType; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'summaries', label: 'Resumenes' },
  { value: 'keywords', label: 'Keywords' },
  { value: 'videos', label: 'Videos' },
];

// ── Component ───────────────────────────────────────────

export function SearchDialog({ isOpen, onClose, onNavigate }: SearchDialogProps) {
  const {
    query,
    setQuery,
    results,
    loading,
    error,
    searchType,
    setSearchType,
    clear,
  } = useSearch(300);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      clear();
    }
  }, [isOpen, clear]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Global Cmd+K / Ctrl+K to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        // Opening is handled by the parent
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleResultClick = useCallback((result: SearchResult) => {
    onNavigate?.(result);
    onClose();
  }, [onNavigate, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-lg mx-4 bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
        >
          {/* ── Search input ── */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-700/50">
            {loading ? (
              <Loader2 size={18} className="text-violet-400 animate-spin shrink-0" />
            ) : (
              <Search size={18} className="text-zinc-500 shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar resumenes, keywords, videos..."
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
              >
                <X size={14} />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-500 border border-zinc-700">
              ESC
            </kbd>
          </div>

          {/* ── Type filters ── */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-800/50">
            {TYPE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setSearchType(f.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                  searchType === f.value
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent'
                }`}
                style={{ fontWeight: searchType === f.value ? 600 : 400 }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* ── Results ── */}
          <div className="max-h-[50vh] overflow-y-auto">
            {/* Empty state */}
            {!loading && query.length >= 2 && results.length === 0 && !error && (
              <div className="flex flex-col items-center py-8 text-center px-4">
                <Search size={24} className="text-zinc-600 mb-2" />
                <p className="text-sm text-zinc-500">
                  Sin resultados para &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  Intenta con otros terminos o filtros
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Initial state */}
            {!loading && query.length < 2 && (
              <div className="flex flex-col items-center py-8 text-center px-4">
                <Search size={24} className="text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-600">
                  Escribe al menos 2 caracteres para buscar
                </p>
              </div>
            )}

            {/* Results list */}
            {results.length > 0 && (
              <div className="py-1">
                {results.map((result, idx) => {
                  const config = getTypeConfig(result.type);
                  const Icon = config.icon;
                  return (
                    <button
                      key={`${result.id}-${idx}`}
                      onClick={() => handleResultClick(result)}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-all group text-left"
                    >
                      <div className={`shrink-0 w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center mt-0.5`}>
                        <Icon size={14} className={config.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-200 truncate" style={{ fontWeight: 500 }}>
                            {result.title}
                          </span>
                          <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full ${config.bg} ${config.color}`} style={{ fontWeight: 600 }}>
                            {config.label}
                          </span>
                        </div>
                        {result.snippet && (
                          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                            {result.snippet}
                          </p>
                        )}
                        {result.parent_path && (
                          <p className="text-[10px] text-zinc-600 mt-0.5 truncate">
                            {result.parent_path}
                          </p>
                        )}
                      </div>
                      <ArrowRight
                        size={14}
                        className="shrink-0 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1.5"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800/50">
            <span className="text-[10px] text-zinc-600">
              {results.length > 0 && `${results.length} resultado${results.length !== 1 ? 's' : ''}`}
            </span>
            <div className="flex items-center gap-2 text-[10px] text-zinc-600">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">↑↓</kbd>
              <span>navegar</span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">↵</kbd>
              <span>abrir</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default SearchDialog;
