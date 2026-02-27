// ============================================================
// Axon — BulkPreviewTable (Editable preview table for bulk import)
//
// Shows parsed flashcard rows before importing.
// Columns: # | Front | Back | Keyword | Subtopic | Status
// Supports inline editing, bulk keyword assignment, row deletion.
// ============================================================
import React, { useState, useMemo, useCallback } from 'react';
import {
  Trash2, Check, AlertTriangle, XCircle,
  ChevronDown, Tag, CheckSquare, Square, Loader2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────

interface Subtopic {
  id: string;
  keyword_id: string;
  name: string;
  order_index: number;
  is_active?: boolean;
  deleted_at?: string | null;
}

interface Keyword {
  id: string;
  term: string;
  definition?: string;
}

export interface BulkRow {
  id: string;
  front: string;
  back: string;
  keywordId: string;
  subtopicId: string;
  selected: boolean;
  status: 'ok' | 'no_keyword' | 'error';
  error?: string;
}

interface BulkPreviewTableProps {
  rows: BulkRow[];
  keywords: Keyword[];
  subtopicsMap: Map<string, Subtopic[]>;
  onUpdateRow: (id: string, updates: Partial<BulkRow>) => void;
  onDeleteRow: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkKeyword: (keywordId: string) => void;
  onBulkSubtopic: (subtopicId: string) => void;
  loadSubtopicsForKeyword: (keywordId: string) => Promise<void>;
}

// ── Inline Editable Cell ──────────────────────────────────

function EditableCell({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { onChange(draft); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onChange(draft); setEditing(false); }
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className="w-full px-2 py-1 text-xs border border-purple-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={() => { setDraft(value); setEditing(true); }}
      className="px-2 py-1 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 rounded-md min-h-[28px] flex items-center"
      title="Click para editar"
    >
      {value || <span className="text-gray-300 italic">{placeholder || 'Vacio'}</span>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────

export function BulkPreviewTable({
  rows,
  keywords,
  subtopicsMap,
  onUpdateRow,
  onDeleteRow,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onBulkKeyword,
  onBulkSubtopic,
  loadSubtopicsForKeyword,
}: BulkPreviewTableProps) {
  const [bulkKeywordOpen, setBulkKeywordOpen] = useState(false);

  const selectedCount = rows.filter(r => r.selected).length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;

  // Stats
  const stats = useMemo(() => {
    const ok = rows.filter(r => r.status === 'ok').length;
    const noKw = rows.filter(r => r.status === 'no_keyword').length;
    const err = rows.filter(r => r.status === 'error').length;
    return { ok, noKw, err };
  }, [rows]);

  const handleKeywordChange = useCallback(async (rowId: string, keywordId: string) => {
    onUpdateRow(rowId, {
      keywordId,
      subtopicId: '',
      status: keywordId ? 'ok' : 'no_keyword',
    });
    if (keywordId) {
      await loadSubtopicsForKeyword(keywordId);
    }
  }, [onUpdateRow, loadSubtopicsForKeyword]);

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* ── Stats bar ── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-600">
            <Check size={12} /> {stats.ok} lista{stats.ok !== 1 ? 's' : ''}
          </span>
          {stats.noKw > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle size={12} /> {stats.noKw} sin keyword
            </span>
          )}
          {stats.err > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle size={12} /> {stats.err} error{stats.err !== 1 ? 'es' : ''}
            </span>
          )}
        </div>

        {/* Bulk actions */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{selectedCount} seleccionada{selectedCount !== 1 ? 's' : ''}</span>

            {/* Bulk keyword dropdown */}
            <div className="relative">
              <button
                onClick={() => setBulkKeywordOpen(!bulkKeywordOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 transition-all"
              >
                <Tag size={10} />
                Asignar keyword
                <ChevronDown size={10} />
              </button>
              {bulkKeywordOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setBulkKeywordOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px] max-h-60 overflow-y-auto">
                    {keywords.map(kw => (
                      <button
                        key={kw.id}
                        onClick={() => {
                          onBulkKeyword(kw.id);
                          setBulkKeywordOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-purple-50 text-gray-700 transition-colors"
                      >
                        {kw.term}
                      </button>
                    ))}
                    {keywords.length === 0 && (
                      <p className="px-3 py-2 text-xs text-gray-400 italic">Sin keywords</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-10 px-3 py-2.5">
                  <button
                    onClick={allSelected ? onDeselectAll : onSelectAll}
                    className="text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                  </button>
                </th>
                <th className="w-8 px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">#</th>
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[180px]">Frente</th>
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[180px]">Reverso</th>
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[140px]">Keyword</th>
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[120px]">Subtopic</th>
                <th className="w-16 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Estado</th>
                <th className="w-10 px-2 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const currentSubtopics = row.keywordId ? (subtopicsMap.get(row.keywordId) || []) : [];
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-100 last:border-b-0 transition-colors ${
                      row.status === 'error' ? 'bg-red-50/50' :
                      row.status === 'no_keyword' ? 'bg-amber-50/50' :
                      row.selected ? 'bg-purple-50/30' : 'hover:bg-gray-50/50'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-2">
                      <button
                        onClick={() => onToggleSelect(row.id)}
                        className="text-gray-400 hover:text-purple-600 transition-colors"
                      >
                        {row.selected ? <CheckSquare size={14} className="text-purple-600" /> : <Square size={14} />}
                      </button>
                    </td>

                    {/* Row number */}
                    <td className="px-2 py-2 text-[10px] text-gray-400 font-mono">{idx + 1}</td>

                    {/* Front (editable) */}
                    <td className="px-2 py-1">
                      <EditableCell
                        value={row.front}
                        onChange={(v) => onUpdateRow(row.id, { front: v })}
                        placeholder="Frente..."
                      />
                    </td>

                    {/* Back (editable) */}
                    <td className="px-2 py-1">
                      <EditableCell
                        value={row.back}
                        onChange={(v) => onUpdateRow(row.id, { back: v })}
                        placeholder="Reverso..."
                      />
                    </td>

                    {/* Keyword dropdown */}
                    <td className="px-2 py-1">
                      <select
                        value={row.keywordId}
                        onChange={(e) => handleKeywordChange(row.id, e.target.value)}
                        className={`w-full px-2 py-1.5 rounded-md text-xs border focus:outline-none focus:ring-1 focus:ring-purple-400 transition-all ${
                          !row.keywordId
                            ? 'border-amber-300 bg-amber-50/50 text-amber-700'
                            : 'border-gray-200 bg-white text-gray-700'
                        }`}
                      >
                        <option value="">— Seleccionar —</option>
                        {keywords.map(kw => (
                          <option key={kw.id} value={kw.id}>{kw.term}</option>
                        ))}
                      </select>
                    </td>

                    {/* Subtopic dropdown */}
                    <td className="px-2 py-1">
                      {row.keywordId ? (
                        currentSubtopics.length > 0 ? (
                          <select
                            value={row.subtopicId}
                            onChange={(e) => onUpdateRow(row.id, { subtopicId: e.target.value })}
                            className="w-full px-2 py-1.5 rounded-md text-xs border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-all"
                          >
                            <option value="">Sin subtopic</option>
                            {currentSubtopics.map(st => (
                              <option key={st.id} value={st.id}>{st.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic px-2">Sin subtopics</span>
                        )
                      ) : (
                        <span className="text-[10px] text-gray-300 italic px-2">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2 text-center">
                      {row.status === 'ok' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-medium">
                          <Check size={10} /> OK
                        </span>
                      )}
                      {row.status === 'no_keyword' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-medium">
                          <AlertTriangle size={10} />
                        </span>
                      )}
                      {row.status === 'error' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-medium" title={row.error}>
                          <XCircle size={10} />
                        </span>
                      )}
                    </td>

                    {/* Delete */}
                    <td className="px-2 py-2">
                      <button
                        onClick={() => onDeleteRow(row.id)}
                        className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default BulkPreviewTable;
