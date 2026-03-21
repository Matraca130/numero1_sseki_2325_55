// ============================================================
// FlashcardToolbar — Header bar, filter bar, and bulk action bar
//
// Contains:
// - Header with title, counters, import/export/create buttons
// - Filter bar with search, type filter, keyword pills, deleted toggle
// - Bulk action bar with select all, activate, deactivate, delete, assign
// ============================================================
import React from 'react';
import type { FlashcardItem } from '@/app/services/flashcardApi';
import type { Keyword } from '@/app/types/platform';
import type { FilterType } from './useFlashcardsManager';
import {
  CreditCard, Plus, Trash2,
  Search, Tag,
  X, Upload,
  Archive,
  ToggleLeft, ToggleRight, ChevronDown, Download,
  Filter, CheckSquare, Square,
  XCircle, Type, TextCursorInput,
  Image as ImageIcon,
} from 'lucide-react';

// ── Props ─────────────────────────────────────────────────

interface FlashcardToolbarProps {
  // Header data
  counters: { active: number; inactive: number };
  selectedFlashcards: string[];

  // Filter state
  flashcardsTotal: number;
  flashcardsCount: number;
  filterKeywordId: string | null;
  setFilterKeywordId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showDeleted: boolean;
  setShowDeleted: (v: boolean) => void;
  filterType: FilterType;
  setFilterType: (v: FilterType) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  filteredCount: number;

  // Keyword data
  keywords: Keyword[];
  keywordStats: Map<string, number>;

  // Selection
  filteredCards: FlashcardItem[];
  setSelectedFlashcards: (ids: string[]) => void;
  handleSelectAll: () => void;

  // Actions
  onCreateClick: () => void;
  onBulkImportClick: () => void;
  onBulkToggleActive: (activate: boolean) => void;
  onBulkDelete: () => void;
  onBulkAssignKeyword: (kwId: string) => void;
  onExport: (format: 'csv' | 'json', onlySelected: boolean) => void;
}

// ── Component ─────────────────────────────────────────────

export const FlashcardToolbar = React.memo(function FlashcardToolbar({
  counters,
  selectedFlashcards,
  flashcardsTotal,
  flashcardsCount,
  filterKeywordId,
  setFilterKeywordId,
  searchQuery,
  setSearchQuery,
  showDeleted,
  setShowDeleted,
  filterType,
  setFilterType,
  hasActiveFilters,
  clearFilters,
  filteredCount,
  keywords,
  keywordStats,
  filteredCards,
  setSelectedFlashcards,
  handleSelectAll,
  onCreateClick,
  onBulkImportClick,
  onBulkToggleActive,
  onBulkDelete,
  onBulkAssignKeyword,
  onExport,
}: FlashcardToolbarProps) {
  return (
    <>
      {/* ── Header Bar ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <CreditCard size={16} className="text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Flashcards</h2>
              <p className="text-[11px] text-gray-400">
                {counters.active} activa{counters.active !== 1 ? 's' : ''}
                {counters.inactive > 0 && (
                  <span className="text-amber-500">, {counters.inactive} inactiva{counters.inactive !== 1 ? 's' : ''}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBulkImportClick}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 transition-all"
            >
              <Upload size={14} />
              Importar en lote
            </button>
            {/* Export dropdown */}
            <div className="relative group/export">
              <button
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-green-50 hover:border-green-200 hover:text-green-600 transition-all"
              >
                <Download size={14} />
                Exportar
                <ChevronDown size={12} />
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20 hidden group-hover/export:block min-w-[180px]">
                <button onClick={() => onExport('csv', false)} className="w-full px-4 py-2 text-xs text-left text-gray-600 hover:bg-gray-50">
                  Exportar CSV (todas)
                </button>
                <button onClick={() => onExport('json', false)} className="w-full px-4 py-2 text-xs text-left text-gray-600 hover:bg-gray-50">
                  Exportar JSON (todas)
                </button>
                {selectedFlashcards.length > 0 && (
                  <>
                    <div className="border-t border-gray-100 my-1" />
                    <button onClick={() => onExport('csv', true)} className="w-full px-4 py-2 text-xs text-left text-purple-600 hover:bg-purple-50">
                      CSV seleccionadas ({selectedFlashcards.length})
                    </button>
                    <button onClick={() => onExport('json', true)} className="w-full px-4 py-2 text-xs text-left text-purple-600 hover:bg-purple-50">
                      JSON seleccionadas ({selectedFlashcards.length})
                    </button>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onCreateClick}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-all shadow-sm shadow-teal-200"
            >
              <Plus size={16} />
              Nueva Flashcard
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      {flashcardsCount > 0 && (
        <div className="bg-white border-b border-gray-100 px-6 py-2.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar flashcards..."
                  className="pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-xs w-52 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                />
              </div>

              {/* Type filter */}
              <div className="flex items-center gap-1">
                {([
                  { val: 'all' as const, label: 'Todos', icon: null },
                  { val: 'text' as const, label: 'Texto', icon: <Type size={10} /> },
                  { val: 'image' as const, label: 'Imagen', icon: <ImageIcon size={10} /> },
                  { val: 'cloze' as const, label: 'Cloze', icon: <TextCursorInput size={10} /> },
                ]).map(ft => (
                  <button
                    key={ft.val}
                    onClick={() => setFilterType(ft.val)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                      filterType === ft.val
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-[#F0F2F5] text-gray-500 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {ft.icon}
                    {ft.label}
                  </button>
                ))}
              </div>

              {/* Keyword pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setFilterKeywordId(null)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                    !filterKeywordId
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-[#F0F2F5] text-gray-500 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Todos
                  <span className="text-[10px] opacity-70">({flashcardsTotal})</span>
                </button>
                {keywords.filter(kw => keywordStats.has(kw.id)).map(kw => (
                  <button
                    key={kw.id}
                    onClick={() => setFilterKeywordId(filterKeywordId === kw.id ? null : kw.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                      filterKeywordId === kw.id
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-[#F0F2F5] text-gray-500 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Tag size={10} />
                    {kw.term}
                    <span className="text-[10px] opacity-70">({keywordStats.get(kw.id) || 0})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Counter */}
              {hasActiveFilters && (
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {filteredCount} de {flashcardsTotal}
                </span>
              )}
              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 bg-[#F0F2F5] border border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                >
                  <XCircle size={12} />
                  Limpiar
                </button>
              )}
              {/* Show deleted toggle */}
              <button
                onClick={() => setShowDeleted(!showDeleted)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  showDeleted
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-[#F0F2F5] text-gray-500 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Archive size={12} />
                Eliminados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Action Bar ── */}
      {selectedFlashcards.length > 0 && (
        <div className="bg-purple-50 border-b border-purple-200 px-6 py-2.5 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 text-[11px] font-medium text-purple-700"
            >
              {selectedFlashcards.length === filteredCards.length
                ? <CheckSquare size={14} />
                : <Square size={14} />}
              {selectedFlashcards.length === filteredCards.length ? 'Deseleccionar' : 'Seleccionar'} todas
            </button>
            <span className="text-[11px] text-purple-500 font-medium">
              {selectedFlashcards.length} seleccionada{selectedFlashcards.length !== 1 ? 's' : ''}
            </span>
            <div className="flex-1" />
            <select
              onChange={(e) => { if (e.target.value) onBulkAssignKeyword(e.target.value); e.target.value = ''; }}
              className="px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white text-[11px] text-purple-700 font-medium focus:outline-none"
              defaultValue=""
            >
              <option value="" disabled>Asignar keyword...</option>
              {keywords.map(kw => (
                <option key={kw.id} value={kw.id}>{kw.term}</option>
              ))}
            </select>
            <button
              onClick={() => onBulkToggleActive(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-600 border border-green-200 text-[11px] font-medium hover:bg-green-100 transition-all"
            >
              <ToggleRight size={12} /> Activar
            </button>
            <button
              onClick={() => onBulkToggleActive(false)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 text-[11px] font-medium hover:bg-amber-100 transition-all"
            >
              <ToggleLeft size={12} /> Desactivar
            </button>
            <button
              onClick={onBulkDelete}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[11px] font-medium hover:bg-red-100 transition-all"
            >
              <Trash2 size={12} /> Eliminar
            </button>
            <button
              onClick={() => setSelectedFlashcards([])}
              className="p-1.5 rounded-lg text-purple-400 hover:bg-purple-100 transition-all"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
});
