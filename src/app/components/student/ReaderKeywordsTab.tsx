// ============================================================
// Axon — ReaderKeywordsTab (keyword list with Delta Mastery)
//
// Phase 3 upgrade: shows mastery indicators (Delta color scale),
// and integrates the full KeywordPopup via InlineKeywordPopover.
//
// Sections:
//   1. Header with summary mastery overview (5-segment Delta bar)
//   2. Keyword pills strip (clickable, delta-mastery-colored)
//   3. Expandable keyword cards:
//      - Mastery ring + definition
//      - Subtopics with BKT indicators
//      - Student notes (CRUD inline)
//      - "Ver hub completo" -> opens KeywordPopup
// ============================================================
import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tag, ChevronDown, ChevronUp,
  Loader2, StickyNote, Sparkles,
  Trash2, Save, X, Edit3, Send, ExternalLink,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import type { SummaryKeyword, Subtopic } from '@/app/services/summariesApi';
import type { KwStudentNote } from '@/app/services/studentSummariesApi';
import { focusRing } from '@/app/components/design-kit';
import { ListSkeleton } from '@/app/components/student/reader-atoms';
import { MasteryIndicator } from '@/app/components/shared/MasteryIndicator';
import { InlineKeywordPopover } from './InlineKeywordPopover';
import { ConfirmDialog } from '@/app/components/shared/ConfirmDialog';
import type { BktState, DeltaColorLevel } from '@/app/lib/mastery-helpers';
import {
  getKeywordDeltaColorSafe,
  getDeltaColorClasses,
  getDeltaColorLabel,
} from '@/app/lib/mastery-helpers';

// ── Props ─────────────────────────────────────────────────

export interface ReaderKeywordsTabProps {
  keywords: SummaryKeyword[];
  keywordsLoading: boolean;
  expandedKeyword: string | null;
  onToggleExpand: (id: string) => void;
  // Keyword detail data (from useKeywordDetailQueries in orchestrator):
  subtopics: Subtopic[];
  subtopicsLoading: boolean;
  kwNotes: KwStudentNote[];
  kwNotesLoading: boolean;
  // Mutation handlers:
  onCreateKwNote: (keywordId: string, note: string) => void;
  onUpdateKwNote: (noteId: string, keywordId: string, note: string) => void;
  onDeleteKwNote: (noteId: string, keywordId: string) => void;
  savingKwNote: boolean;
  // Mastery data (optional — defaults to empty):
  keywordMasteryMap?: Map<string, number>;
  bktMap?: Map<string, BktState>;
  // Navigate keyword (for popup connections):
  onNavigateKeyword?: (keywordId: string, summaryId: string) => void;
}

// ── Mastery overview bar (5-segment Delta) ────────────────

function MasteryOverview({
  keywords,
  masteryMap,
}: {
  keywords: SummaryKeyword[];
  masteryMap: Map<string, number>;
}) {
  if (keywords.length === 0) return null;

  const counts: Record<DeltaColorLevel, number> = { blue: 0, green: 0, yellow: 0, red: 0, gray: 0 };
  for (const kw of keywords) {
    const m = masteryMap.get(kw.id) ?? -1;
    const level = getKeywordDeltaColorSafe(m, kw.priority || 2);
    counts[level]++;
  }

  const total = keywords.length;
  const vals = keywords.map(kw => masteryMap.get(kw.id) ?? -1).filter(v => v >= 0);
  const avgMastery = vals.length === 0 ? -1 : vals.reduce((a, b) => a + b, 0) / vals.length;

  // Compute avg delta level for badge
  const avgDeltaLevel: DeltaColorLevel = avgMastery < 0
    ? 'gray'
    : getKeywordDeltaColorSafe(avgMastery, 2);

  const segments: { level: DeltaColorLevel; count: number; label: string }[] = [
    { level: 'blue', count: counts.blue, label: 'maestria' },
    { level: 'green', count: counts.green, label: 'consolidado' },
    { level: 'yellow', count: counts.yellow, label: 'en progreso' },
    { level: 'red', count: counts.red, label: 'emergente' },
    { level: 'gray', count: counts.gray, label: 'por descubrir' },
  ];

  return (
    <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>
          Dominio general
        </span>
        {avgMastery >= 0 && (
          <MasteryIndicator
            pMastery={avgMastery}
            size="sm"
            variant="badge"
            deltaLevel={avgDeltaLevel}
          />
        )}
      </div>
      {/* Stacked bar — 5 segments */}
      <div className="h-2 rounded-full overflow-hidden flex bg-zinc-200">
        {segments.map(seg =>
          seg.count > 0 ? (
            <div
              key={seg.level}
              className="h-full transition-all"
              style={{
                width: `${(seg.count / total) * 100}%`,
                backgroundColor: getDeltaColorClasses(seg.level).hex,
              }}
            />
          ) : null,
        )}
      </div>
      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        {segments.map(seg =>
          seg.count > 0 ? (
            <span
              key={seg.level}
              className="text-[9px] flex items-center gap-1"
              style={{ color: getDeltaColorClasses(seg.level).hex }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: getDeltaColorClasses(seg.level).hex }}
              />
              {seg.count} {seg.label}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

// ── Component (React.memo) ────────────────────────────────

const DEFAULT_MASTERY_MAP = new Map<string, number>();
const DEFAULT_BKT_MAP = new Map<string, BktState>();

export const ReaderKeywordsTab = React.memo(function ReaderKeywordsTab({
  keywords,
  keywordsLoading,
  expandedKeyword,
  onToggleExpand,
  subtopics,
  subtopicsLoading,
  kwNotes,
  kwNotesLoading,
  onCreateKwNote,
  onUpdateKwNote,
  onDeleteKwNote,
  savingKwNote,
  keywordMasteryMap = DEFAULT_MASTERY_MAP,
  bktMap = DEFAULT_BKT_MAP,
  onNavigateKeyword,
}: ReaderKeywordsTabProps) {
  // ── Local form state (optimistic reset on submit) ──
  const [newKwNote, setNewKwNote] = useState('');
  const [editingKwNoteId, setEditingKwNoteId] = useState<string | null>(null);
  const [editKwNoteText, setEditKwNoteText] = useState('');

  // ── Popup state for full keyword hub ──
  const [popupKeywordId, setPopupKeywordId] = useState<string | null>(null);
  const [popupAnchorEl, setPopupAnchorEl] = useState<HTMLElement | null>(null);

  // ── ConfirmDialog state (controlled) ──
  const [pendingDelete, setPendingDelete] = useState<{ noteId: string; kwId: string } | null>(null);

  const handleOpenPopup = useCallback((kwId: string, el: HTMLElement) => {
    setPopupKeywordId(kwId);
    setPopupAnchorEl(el);
  }, []);

  const handleClosePopup = useCallback(() => {
    setPopupKeywordId(null);
    setPopupAnchorEl(null);
  }, []);

  const popupKeyword = useMemo(
    () => keywords.find(k => k.id === popupKeywordId) ?? null,
    [keywords, popupKeywordId],
  );

  const handleCreateNote = useCallback((keywordId: string) => {
    if (!newKwNote.trim()) return;
    onCreateKwNote(keywordId, newKwNote.trim());
    setNewKwNote('');
  }, [newKwNote, onCreateKwNote]);

  const handleUpdateNote = useCallback((noteId: string, keywordId: string) => {
    if (!editKwNoteText.trim()) return;
    onUpdateKwNote(noteId, keywordId, editKwNoteText.trim());
    setEditingKwNoteId(null);
  }, [editKwNoteText, onUpdateKwNote]);

  const startEditing = useCallback((noteId: string, currentText: string) => {
    setEditingKwNoteId(noteId);
    setEditKwNoteText(currentText);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    onDeleteKwNote(pendingDelete.noteId, pendingDelete.kwId);
    setPendingDelete(null);
  }, [pendingDelete, onDeleteKwNote]);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm text-zinc-700" style={{ fontWeight: 600 }}>Palabras clave</h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Clic en una keyword para ver conexiones y detalles
            </p>
          </div>
          {!keywordsLoading && keywords.length > 0 && (
            <span className="text-[10px] bg-zinc-100 text-zinc-500 rounded-full px-2 py-0.5" style={{ fontWeight: 600 }}>
              {keywords.length} keywords
            </span>
          )}
        </div>
      </div>

      {/* Mastery overview */}
      <MasteryOverview
        keywords={keywords}
        masteryMap={keywordMasteryMap}
      />

      {/* Keyword pills strip — clickable with delta mastery color */}
      {!keywordsLoading && keywords.length > 0 && (
        <div className="px-5 py-3 border-b border-zinc-100 flex flex-wrap gap-2">
          {keywords.map((kw) => {
            const mastery = keywordMasteryMap.get(kw.id) ?? -1;
            const level = getKeywordDeltaColorSafe(mastery, kw.priority || 2);
            const dc = getDeltaColorClasses(level);

            return (
              <button
                key={kw.id}
                onClick={() => onToggleExpand(kw.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all cursor-pointer
                  ${focusRing}
                  ${expandedKeyword === kw.id
                    ? 'ring-2 ring-offset-1 shadow-sm'
                    : ''
                  }
                  ${dc.bgLight} ${dc.text} hover:opacity-80 active:scale-95`}
              >
                <MasteryIndicator
                  pMastery={mastery}
                  size="sm"
                  variant="dot"
                  showTooltip={false}
                  deltaLevel={level}
                />
                {kw.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Expandable keyword list */}
      <div className="p-4">
        {keywordsLoading ? (
          <ListSkeleton />
        ) : keywords.length === 0 ? (
          <div className="text-center py-8">
            <Tag className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
            <p className="text-xs text-zinc-400">No hay keywords en este resumen</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keywords.map(kw => {
              const isExpanded = expandedKeyword === kw.id;
              const mastery = keywordMasteryMap.get(kw.id) ?? -1;
              const level = getKeywordDeltaColorSafe(mastery, kw.priority || 2);

              return (
                <div key={kw.id} className="border rounded-xl transition-all"
                  style={{
                    borderColor: isExpanded ? '#b3ddd2' : '#e4e4e7',
                    backgroundColor: isExpanded ? 'rgba(232,245,241,0.3)' : 'transparent',
                    ...(isExpanded ? { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } : {}),
                  }}
                >
                  <button
                    onClick={() => onToggleExpand(kw.id)}
                    aria-expanded={isExpanded}
                    className={`w-full flex items-center justify-between p-3 text-left ${focusRing} rounded-xl cursor-pointer`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MasteryIndicator
                        pMastery={mastery}
                        size="md"
                        variant="ring"
                        showTooltip
                        deltaLevel={level}
                      />
                      <div className="min-w-0">
                        <span className="text-sm text-zinc-900 truncate block" style={{ fontWeight: 600 }}>{kw.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {kw.priority > 0 && (
                            <span className="text-[9px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-full">P{kw.priority}</span>
                          )}
                          {mastery >= 0 && (
                            <span className="text-[9px] text-zinc-400">
                              {getDeltaColorLabel(level)} · {Math.round(mastery * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 border-t border-zinc-100">
                          {/* Definition */}
                          {kw.definition && (
                            <div className="mt-3 p-3 bg-white rounded-lg border border-zinc-200">
                              <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1" style={{ fontWeight: 600 }}>Definicion</p>
                              <p className="text-xs text-zinc-600 leading-relaxed">{kw.definition}</p>
                            </div>
                          )}

                          {/* Subtopics with BKT mastery */}
                          <div className="mt-3">
                            <span className="text-[10px] text-zinc-400 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                              Subtemas {subtopics.length > 0 ? `(${subtopics.length})` : ''}
                            </span>
                            {isExpanded && expandedKeyword === kw.id && subtopicsLoading ? (
                              <div className="flex items-center gap-2 mt-1">
                                <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                                <span className="text-[10px] text-zinc-400">Cargando...</span>
                              </div>
                            ) : subtopics.length === 0 ? (
                              <p className="text-[10px] text-zinc-400 mt-1">Sin subtemas</p>
                            ) : (
                              <div className="mt-1 space-y-1">
                                {subtopics.map(sub => {
                                  const bkt = bktMap.get(sub.id);
                                  const pKnow = bkt ? bkt.p_know : -1;
                                  const subLevel = getKeywordDeltaColorSafe(pKnow, 2);
                                  return (
                                    <div key={sub.id} className="flex items-center gap-2 px-2 py-1.5 bg-white rounded-lg border border-zinc-100 group/sub">
                                      <MasteryIndicator
                                        pMastery={pKnow}
                                        size="sm"
                                        variant="dot"
                                        deltaLevel={subLevel}
                                      />
                                      <span className="text-xs text-zinc-600 flex-1 truncate">{sub.name}</span>
                                      {bkt && bkt.total_attempts > 0 && (
                                        <span className="text-[9px] text-zinc-400">{Math.round(pKnow * 100)}%</span>
                                      )}
                                      {!bkt && (
                                        <span className="text-[9px] text-zinc-400 italic">sin datos</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Open full keyword hub */}
                          <button
                            onClick={(e) => handleOpenPopup(kw.id, e.currentTarget)}
                            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs transition-all
                              active:scale-[0.98] cursor-pointer"
                            style={{
                              background: 'rgba(42,140,122,0.1)',
                              color: '#2a8c7a',
                              border: '1px solid rgba(42,140,122,0.25)',
                              fontWeight: 500,
                            }}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Ver hub completo: conexiones, IA y mas
                            <ExternalLink className="w-3 h-3 opacity-50" />
                          </button>

                          {/* Keyword notes */}
                          <div className="mt-4">
                            <span className="text-[10px] text-zinc-400 uppercase tracking-wider" style={{ fontWeight: 600 }}>Mis notas</span>
                            {kwNotesLoading ? (
                              <div className="flex items-center gap-2 mt-1">
                                <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                                <span className="text-[10px] text-zinc-400">Cargando...</span>
                              </div>
                            ) : (
                              <>
                                {kwNotes.length > 0 && (
                                  <div className="mt-1 space-y-1.5">
                                    {kwNotes.map(note => (
                                      <div key={note.id} className="group/note flex items-start gap-2 p-2 bg-white rounded-lg border" style={{ borderColor: '#b3ddd2' }}>
                                        {editingKwNoteId === note.id ? (
                                          <div className="flex-1 space-y-1.5">
                                            <Textarea value={editKwNoteText} onChange={(e) => setEditKwNoteText(e.target.value)} className="min-h-[50px] text-xs" autoFocus />
                                            <div className="flex justify-end gap-1">
                                              <Button size="sm" variant="ghost" onClick={() => setEditingKwNoteId(null)} className="h-6 text-[10px] px-2"><X className="w-3 h-3" /> Cancelar</Button>
                                              <Button size="sm" onClick={() => handleUpdateNote(note.id, kw.id)} disabled={savingKwNote} className="h-6 text-[10px] px-2 text-white" style={{ backgroundColor: '#2a8c7a' }}>
                                                {savingKwNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Guardar
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            <StickyNote className="w-3 h-3 shrink-0 mt-0.5" style={{ color: '#2a8c7a' }} />
                                            <p className="text-xs text-zinc-600 flex-1">{note.note}</p>
                                            <div className="flex items-center gap-0.5 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/note:opacity-100 transition-opacity shrink-0">
                                              <button
                                                onClick={() => startEditing(note.id, note.note)}
                                                className="p-1.5 rounded cursor-pointer"
                                                style={{ color: '#9ca3af' }}
                                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e8f5f1'; e.currentTarget.style.color = '#2a8c7a'; }}
                                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
                                                aria-label="Editar nota"
                                              >
                                                <Edit3 className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                onClick={() => setPendingDelete({ noteId: note.id, kwId: kw.id })}
                                                className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 cursor-pointer"
                                                aria-label="Eliminar nota"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="mt-2 flex items-start gap-2">
                                  <Input
                                    value={newKwNote}
                                    onChange={(e) => setNewKwNote(e.target.value)}
                                    placeholder="Agregar nota personal..."
                                    className="text-xs h-8 flex-1"
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreateNote(kw.id); } }}
                                  />
                                  <Button size="sm" onClick={() => handleCreateNote(kw.id)} disabled={savingKwNote || !newKwNote.trim()} className="h-8 px-2 text-white" style={{ backgroundColor: '#2a8c7a' }}>
                                    {savingKwNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full KeywordPopup via InlineKeywordPopover */}
      {popupKeyword && popupAnchorEl && (
        <InlineKeywordPopover
          keyword={popupKeyword}
          allKeywords={keywords}
          bktMap={bktMap}
          anchorEl={popupAnchorEl}
          onClose={handleClosePopup}
          onNavigateKeyword={onNavigateKeyword}
        />
      )}

      {/* Confirm delete dialog (controlled) */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title="Eliminar nota de keyword?"
        description="Esta nota se eliminara permanentemente."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
});
