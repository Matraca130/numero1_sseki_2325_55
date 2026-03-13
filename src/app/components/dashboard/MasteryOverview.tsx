// ============================================================
// Axon — MasteryOverview (EV-7 Prompt C) — Modularized
//
// Shows all student keywords sorted by mastery (weakest first).
// Sub-components extracted to:
//   /src/app/components/dashboard/masteryOverviewTypes.ts
//   /src/app/components/dashboard/useMasteryOverviewData.ts
//   /src/app/components/dashboard/KeywordRow.tsx
// ============================================================
import React from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Filter,
  X,
  Sparkles,
  AlertCircle,
  RefreshCw,
  BookOpen,
} from 'lucide-react';

// ── Extracted modules ──
import { FILTER_OPTIONS } from './masteryOverviewTypes';
import { useMasteryOverviewData } from './useMasteryOverviewData';
import { KeywordRow } from './KeywordRow';

// ── Main Component ───────────────────────────────────────

export function MasteryOverview() {
  const {
    keywords,
    loading,
    error,
    loadData,
    grouped,
    kpiCounts,
    allMastered,

    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    showFilterDropdown,
    setShowFilterDropdown,
    hasActiveFilters,
    clearFilters,
    dropdownRef,

    expandedKeywords,
    toggleExpand,
    subtopicsCache,
  } = useMasteryOverviewData();

  // ── Render ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 min-h-[288px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gray-100 animate-pulse" />
          <p className="text-sm text-gray-400 animate-pulse">Cargando dominio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 min-h-[288px] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-red-300" />
        <p className="text-sm text-gray-500 text-center">{error}</p>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  if (keywords.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 min-h-[288px] flex flex-col items-center justify-center gap-3">
        <BookOpen className="w-10 h-10 text-gray-300" />
        <p className="text-sm text-gray-500 text-center">
          Aun no tienes keywords. Empieza estudiando un resumen.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6"
    >
      {/* ── Header + Filters ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h3 className="text-sm font-semibold text-gray-900">Dominio de Conceptos</h3>

        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                filter !== 'all'
                  ? 'border-teal-500/50 bg-teal-50 text-teal-700'
                  : 'border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {FILTER_OPTIONS.find((f) => f.value === filter)?.label || 'Todos'}
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 top-full mt-1 z-40 w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1">
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setFilter(opt.value);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      filter === opt.value
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-36 sm:w-44 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ── KPI Summary bar ── */}
      <div className="mb-4">
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 flex-wrap">
          {kpiCounts.critical > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {kpiCounts.critical} criticos
            </span>
          )}
          {kpiCounts.weak > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              {kpiCounts.weak} debiles
            </span>
          )}
          {kpiCounts.progress > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              {kpiCounts.progress} en progreso
            </span>
          )}
          {kpiCounts.good > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {kpiCounts.good} buenos
            </span>
          )}
          {kpiCounts.mastered > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {kpiCounts.mastered} dominados
            </span>
          )}
          <span className="text-gray-400">· {kpiCounts.total} total</span>
        </div>

        {/* Distribution bar */}
        {kpiCounts.total > 0 && (
          <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 gap-px">
            {kpiCounts.critical > 0 && (
              <div className="bg-red-500 rounded-sm" style={{ width: `${(kpiCounts.critical / kpiCounts.total) * 100}%` }} />
            )}
            {kpiCounts.weak > 0 && (
              <div className="bg-orange-500 rounded-sm" style={{ width: `${(kpiCounts.weak / kpiCounts.total) * 100}%` }} />
            )}
            {kpiCounts.progress > 0 && (
              <div className="bg-yellow-500 rounded-sm" style={{ width: `${(kpiCounts.progress / kpiCounts.total) * 100}%` }} />
            )}
            {kpiCounts.good > 0 && (
              <div className="bg-blue-500 rounded-sm" style={{ width: `${(kpiCounts.good / kpiCounts.total) * 100}%` }} />
            )}
            {kpiCounts.mastered > 0 && (
              <div className="bg-emerald-500 rounded-sm" style={{ width: `${(kpiCounts.mastered / kpiCounts.total) * 100}%` }} />
            )}
            {kpiCounts.noData > 0 && (
              <div className="bg-gray-300 rounded-sm" style={{ width: `${(kpiCounts.noData / kpiCounts.total) * 100}%` }} />
            )}
          </div>
        )}
      </div>

      {/* Active filter badge */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-500">
            Filtrando: {filter !== 'all' ? FILTER_OPTIONS.find((f) => f.value === filter)?.label : ''}{' '}
            {searchQuery ? `"${searchQuery}"` : ''}{' '}
            ({grouped.reduce((s, g) => s + g.items.length, 0)} keyword{grouped.reduce((s, g) => s + g.items.length, 0) !== 1 ? 's' : ''})
          </span>
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-3 h-3" />
            Limpiar
          </button>
        </div>
      )}

      {/* ── All mastered celebration ── */}
      {allMastered && !hasActiveFilters && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200 mb-4">
          <Sparkles className="w-6 h-6 text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-700">
            ¡Felicitaciones! Dominas todos tus conceptos.
          </p>
        </div>
      )}

      {/* ── Sorted hint ── */}
      {!hasActiveFilters && !allMastered && (
        <p className="text-[11px] text-gray-400 mb-3">Ordenado por: necesidad de repaso</p>
      )}

      {/* ── Keyword groups ── */}
      <div className="space-y-5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar-light">
        {grouped.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No se encontraron keywords con este filtro.
          </p>
        ) : (
          grouped.map((group) => (
            <div key={group.key}>
              {/* Group header */}
              <p className="text-[11px] font-medium text-gray-400 mb-2 uppercase tracking-wider">
                {group.courseName} › {group.topicName}
              </p>

              {/* Keywords in group */}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <KeywordRow
                    key={item.keyword.id}
                    item={item}
                    expanded={expandedKeywords.has(item.keyword.id)}
                    onToggle={() => toggleExpand(item.keyword.id)}
                    subtopics={subtopicsCache.get(item.keyword.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
