// ============================================================
// Axon — ConnectionForm (Professor: create keyword connections)
//
// Self-contained form extracted from KeywordConnectionsPanel.
// Handles: connection type selection, target keyword selection
// (same-summary dropdown + cross-summary search + suggestions),
// direction control for directional types, relationship note,
// and submission via useCreateConnectionMutation.
//
// V4 modularization (split from KeywordConnectionsPanel):
//   - Owns ALL form state (no lifted state)
//   - Owns its own React Query hooks (mutation, search, suggestions)
//   - Parent only passes connectedIds (derived from connections query)
//     to keep the "available keywords" filter reactive
//
// Canonical order: keyword_a_id < keyword_b_id (lexicographic).
// ============================================================
import React, { useState, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Plus, Loader2, Link2, ArrowRight, Search,
  ExternalLink, X, RotateCcw, Sparkles,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  CONNECTION_TYPES,
  getConnectionType,
} from '@/app/lib/connection-types';
import { useKeywordSuggestionsQuery } from '@/app/hooks/queries/useKeywordSuggestionsQuery';
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue';
import {
  useCreateConnectionMutation,
  useKeywordSearchQuery,
} from '@/app/hooks/queries/useKeywordConnectionsQueries';
import type { SummaryKeyword } from '@/app/services/summariesApi';

// ── Props ─────────────────────────────────────────────────

export interface ConnectionFormProps {
  /** The keyword we are connecting FROM */
  keywordId: string;
  /** Display name of the current keyword (for direction label) */
  keywordName: string;
  /** All keywords in this summary (for same-summary dropdown) */
  allKeywords: SummaryKeyword[];
  /** IDs of keywords already connected (to filter them out). Reactive — recalculated by parent on query invalidation. */
  connectedIds: Set<string>;
  /** When provided, enables cross-summary keyword search */
  summaryId?: string;
}

// ── Private: shared keyword result item ───────────────────

/** Renders a single keyword item in search results or suggestions dropdowns.
 *  Extracted to avoid 24-line duplication between both lists. */
function KeywordResultItem({
  name,
  definition,
  summaryTitle,
  onSelect,
}: {
  name: string;
  definition?: string | null;
  summaryTitle?: string | null;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-start gap-2 px-3 py-1.5 text-left hover:bg-violet-50 transition-colors"
    >
      <ExternalLink size={10} className="text-indigo-400 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <span className="text-xs text-gray-700 block truncate" style={{ fontWeight: 500 }}>
          {name}
        </span>
        {definition && (
          <span className="text-[10px] text-gray-400 block truncate">
            {definition.length > 60 ? definition.slice(0, 58) + '...' : definition}
          </span>
        )}
        {summaryTitle && (
          <span className="text-[9px] text-indigo-400 block truncate">
            {summaryTitle}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Component ─────────────────────────────────────────────

export function ConnectionForm({
  keywordId,
  keywordName,
  allKeywords,
  connectedIds,
  summaryId,
}: ConnectionFormProps) {

  // ── Mutation (own instance — invalidation targets same query key) ──
  const createMutation = useCreateConnectionMutation(keywordId);

  // ── Form state ──────────────────────────────────────────
  const [targetKeywordId, setTargetKeywordId] = useState('');
  const [targetKeywordName, setTargetKeywordName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [connectionType, setConnectionType] = useState('');

  // Direction: who is the "source" in directional types
  // false = current keyword is source (A→B)
  // true  = target keyword is source (B→A, flipped)
  const [directionFlipped, setDirectionFlipped] = useState(false);

  // ── Cross-summary search state ──────────────────────────
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 350);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Derived: available same-summary keywords ────────────
  const availableKeywords = useMemo(() => allKeywords.filter(
    k => k.id !== keywordId && !connectedIds.has(k.id) && k.is_active,
  ), [allKeywords, keywordId, connectedIds]);

  // ── Derived: is the selected connection type directional? ──
  const selectedTypeCfg = getConnectionType(connectionType);
  const isDirectional = selectedTypeCfg?.directional ?? false;

  // ── Keyword suggestions (React Query — sibling summaries) ──
  const showSuggestions = searchMode && !searchQuery.trim() && !targetKeywordId;
  const {
    data: rawSuggestions = [],
    isLoading: suggestionsLoading,
  } = useKeywordSuggestionsQuery(summaryId, showSuggestions);

  const suggestions = useMemo(() =>
    rawSuggestions.filter(s => s.id !== keywordId && !connectedIds.has(s.id)),
    [rawSuggestions, keywordId, connectedIds],
  );

  // ── Cross-summary search (React Query) ──────────────────
  const searchQueryHook = useKeywordSearchQuery(
    debouncedSearch,
    summaryId,
    { enabled: searchMode },
  );

  const searchResults = useMemo(() =>
    (searchQueryHook.data ?? [])
      .filter(k => k.id !== keywordId && !connectedIds.has(k.id))
      .slice(0, 10),
    [searchQueryHook.data, keywordId, connectedIds],
  );
  const searchLoading = searchQueryHook.isFetching;

  // ── Form helpers ────────────────────────────────────────
  const resetForm = () => {
    setTargetKeywordId('');
    setTargetKeywordName('');
    setRelationship('');
    setConnectionType('');
    setDirectionFlipped(false);
    setSearchMode(false);
    setSearchQuery('');
  };

  const selectSearchResult = (kw: { id: string; name: string }) => {
    setTargetKeywordId(kw.id);
    setTargetKeywordName(kw.name);
    setSearchQuery('');
    // Keep searchMode true so the user sees they selected a cross-summary kw
  };

  // ── Resolve keyword name (simplified — no conn embeds needed in form) ──
  const resolveKwName = (id: string): string => {
    const local = allKeywords.find(k => k.id === id);
    if (local) return local.name;
    return id.slice(0, 8);
  };

  // ── Add connection ──────────────────────────────────────
  const handleAdd = () => {
    if (!targetKeywordId) return;
    if (!connectionType) {
      toast.error('Selecciona un tipo de conexion');
      return;
    }

    // Canonical order: a < b (lexicographic UUID comparison)
    const a = keywordId < targetKeywordId ? keywordId : targetKeywordId;
    const b = keywordId < targetKeywordId ? targetKeywordId : keywordId;

    // Source keyword for directional types
    let sourceKwId: string | null = null;
    if (isDirectional) {
      sourceKwId = directionFlipped ? targetKeywordId : keywordId;
    }

    createMutation.mutate({
      keyword_a_id: a,
      keyword_b_id: b,
      relationship: relationship.trim() || null,
      connection_type: connectionType,
      source_keyword_id: sourceKwId,
    }, {
      onSuccess: () => resetForm(),
    });
  };

  // ── Direction label helper ──────────────────────────────
  const directionLabel = () => {
    if (!isDirectional || !targetKeywordId) return null;
    const src = directionFlipped ? (targetKeywordName || resolveKwName(targetKeywordId)) : keywordName;
    const dst = directionFlipped ? keywordName : (targetKeywordName || resolveKwName(targetKeywordId));
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-1.5 pl-0.5">
        <span className="text-gray-700" style={{ fontWeight: 600 }}>{src}</span>
        <ArrowRight size={10} className="text-gray-400 shrink-0" />
        <span className="text-gray-700" style={{ fontWeight: 600 }}>{dst}</span>
        <button
          type="button"
          onClick={() => setDirectionFlipped(f => !f)}
          className="ml-1 p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-violet-600 transition-colors"
          title="Invertir direccion"
        >
          <RotateCcw size={10} />
        </button>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="mt-3 space-y-2">

      {/* Step 1: Connection type selector */}
      <div>
        <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
          Tipo de conexion
        </label>
        <select
          value={connectionType}
          onChange={e => {
            setConnectionType(e.target.value);
            setDirectionFlipped(false);
          }}
          className="h-7 text-xs bg-white border border-gray-200 rounded px-2 py-1 w-full"
        >
          <option value="">Seleccionar tipo...</option>
          {CONNECTION_TYPES.map(t => (
            <option key={t.value} value={t.value}>
              {t.label} {t.directional ? '\u2192' : '\u2194'} — {t.description}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: Target keyword selection (same-summary OR cross-summary search) */}
      {connectionType && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">
              Conectar con
            </label>
            {/* Toggle between same-summary select and cross-summary search */}
            {summaryId && (
              <button
                type="button"
                onClick={() => {
                  setSearchMode(m => !m);
                  setTargetKeywordId('');
                  setTargetKeywordName('');
                  setSearchQuery('');
                }}
                className="text-[10px] text-violet-500 hover:text-violet-700 flex items-center gap-1 transition-colors"
              >
                {searchMode ? (
                  <>
                    <Link2 size={10} />
                    Mismo resumen
                  </>
                ) : (
                  <>
                    <Search size={10} />
                    Buscar en el curso
                  </>
                )}
              </button>
            )}
          </div>

          {/* Mode A: Same-summary dropdown (default, always available) */}
          {!searchMode && (
            <>
              {availableKeywords.length > 0 ? (
                <select
                  value={targetKeywordId}
                  onChange={e => {
                    setTargetKeywordId(e.target.value);
                    const kw = availableKeywords.find(k => k.id === e.target.value);
                    setTargetKeywordName(kw?.name || '');
                  }}
                  className="h-7 text-xs bg-white border border-gray-200 rounded px-2 py-1 w-full"
                >
                  <option value="">Seleccionar keyword...</option>
                  {availableKeywords.map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-[10px] text-gray-300">
                  {allKeywords.length > 1
                    ? 'Todos los keywords de este resumen ya estan conectados'
                    : 'Solo hay 1 keyword en este resumen'}
                  {summaryId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchMode(true);
                        setTimeout(() => searchInputRef.current?.focus(), 50);
                      }}
                      className="ml-1 text-violet-500 hover:text-violet-700 underline"
                    >
                      Buscar en otro resumen
                    </button>
                  )}
                </p>
              )}
            </>
          )}

          {/* Mode B: Cross-summary search (when summaryId provided) */}
          {searchMode && (
            <div className="space-y-1.5">
              {/* Selected keyword chip OR search input */}
              {targetKeywordId ? (
                <div className="flex items-center gap-2 h-7 bg-violet-50 border border-violet-200 rounded px-2">
                  <ExternalLink size={10} className="text-violet-500 shrink-0" />
                  <span className="text-xs text-violet-700 truncate flex-1" style={{ fontWeight: 500 }}>
                    {targetKeywordName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetKeywordId('');
                      setTargetKeywordName('');
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    }}
                    className="text-violet-400 hover:text-violet-600 p-0.5"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar keyword en el curso..."
                    className="h-7 text-xs bg-white border border-gray-200 rounded pl-7 pr-2 py-1 w-full outline-none focus:border-violet-400 transition-colors"
                    autoFocus
                  />
                  {searchLoading && (
                    <Loader2 size={12} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
                  )}
                </div>
              )}

              {/* Search results dropdown */}
              {!targetKeywordId && searchQuery.trim().length >= 2 && (
                <div className="bg-white border border-gray-200 rounded shadow-sm max-h-[150px] overflow-y-auto">
                  {searchLoading && searchResults.length === 0 && (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <Loader2 size={12} className="animate-spin text-gray-400" />
                      <span className="text-[10px] text-gray-400">Buscando...</span>
                    </div>
                  )}
                  {!searchLoading && searchResults.length === 0 && (
                    <p className="text-[10px] text-gray-400 px-3 py-2">
                      Sin resultados para &quot;{searchQuery}&quot;
                    </p>
                  )}
                  {searchResults.map(kw => (
                    <KeywordResultItem
                      key={kw.id}
                      name={kw.name}
                      definition={kw.definition}
                      summaryTitle={kw.summary_title}
                      onSelect={() => selectSearchResult(kw)}
                    />
                  ))}
                </div>
              )}

              {/* Keyword suggestions dropdown */}
              {showSuggestions && (
                <div className="bg-white border border-gray-200 rounded shadow-sm max-h-[150px] overflow-y-auto">
                  {/* Header */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-100 bg-gray-50/50 sticky top-0">
                    <Sparkles size={10} className="text-amber-500" />
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                      Sugerencias del topico
                    </span>
                  </div>
                  {suggestionsLoading && (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <Loader2 size={12} className="animate-spin text-gray-400" />
                      <span className="text-[10px] text-gray-400">Cargando sugerencias...</span>
                    </div>
                  )}
                  {!suggestionsLoading && suggestions.length === 0 && (
                    <p className="text-[10px] text-gray-400 px-3 py-2">
                      No hay keywords en otros resumenes del mismo topico
                    </p>
                  )}
                  {!suggestionsLoading && suggestions.map(kw => (
                    <KeywordResultItem
                      key={kw.id}
                      name={kw.name}
                      definition={kw.definition}
                      summaryTitle={kw.summary_title}
                      onSelect={() => selectSearchResult(kw)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Direction indicator for directional types */}
      {connectionType && targetKeywordId && isDirectional && directionLabel()}

      {/* Step 3: Optional relationship note */}
      {connectionType && targetKeywordId && (
        <Input
          value={relationship}
          onChange={e => setRelationship(e.target.value)}
          placeholder="Nota adicional (opcional, ej: 'via receptor beta-1')"
          className="h-7 text-xs"
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
        />
      )}

      {/* Submit button */}
      {connectionType && targetKeywordId && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-3 text-xs text-violet-600 flex-1"
            onClick={handleAdd}
            disabled={createMutation.isPending || !targetKeywordId || !connectionType}
          >
            {createMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            <span className="ml-1">Crear conexion</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-gray-400"
            onClick={resetForm}
          >
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}