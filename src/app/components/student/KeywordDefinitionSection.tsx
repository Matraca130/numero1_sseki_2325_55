// ============================================================
// Axon — KeywordDefinitionSection (definition + prof notes + student notes)
//
// Extracted from KeywordPopup.tsx in Phase 2, Step 7a.
// Self-contained: owns note form state (newNoteText, editingNoteId,
// editNoteText). Parent passes raw mutation fns from useKeywordPopupQueries.
//
// commentTagConfig co-located here (sole consumer, decision D3).
// Note form state local (decision D6).
// ============================================================
import React, { useState } from 'react';
import {
  MessageSquare, StickyNote, Loader2, Edit3, Trash2, Send,
} from 'lucide-react';
import clsx from 'clsx';
import type { SummaryKeyword } from '@/app/services/summariesApi';
import type { KwProfNote } from '@/app/types/keyword-notes';
import type { KwStudentNote } from '@/app/services/studentSummariesApi';

// ── Comment tag config (professor notes) ──────────────────
const commentTagConfig: Record<string, { label: string; bg: string; text: string }> = {
  tip:        { label: 'Tip',         bg: 'bg-teal-900/30',   text: 'text-teal-400' },
  mnemonic:   { label: 'Mnemotecnia', bg: 'bg-teal-900/30', text: 'text-teal-400' },
  clinical:   { label: 'Clinica',     bg: 'bg-rose-900/30',   text: 'text-rose-400' },
  correction: { label: 'Correccion',  bg: 'bg-orange-900/30', text: 'text-orange-400' },
};

// ── Props ─────────────────────────────────────────────────
export interface KeywordDefinitionSectionProps {
  keyword: SummaryKeyword;
  profNotes: KwProfNote[];
  profNotesLoading: boolean;
  notes: KwStudentNote[];
  notesLoading: boolean;
  isNoteMutating: boolean;
  createNote: (note: string) => Promise<void>;
  updateNote: (noteId: string, note: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
}

// ── Component ─────────────────────────────────────────────
export function KeywordDefinitionSection({
  keyword,
  profNotes,
  profNotesLoading,
  notes,
  notesLoading,
  isNoteMutating,
  createNote,
  updateNote,
  deleteNote,
}: KeywordDefinitionSectionProps) {
  // ── Local form state (D6) ──
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  // ── Handlers ──
  const handleAddNote = async () => {
    if (!newNoteText.trim() || newNoteText.length > 500) return;
    try {
      await createNote(newNoteText.trim());
      setNewNoteText('');
    } catch {
      // Error already toasted by mutation
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNoteId || !editNoteText.trim() || editNoteText.length > 500) return;
    try {
      await updateNote(editingNoteId, editNoteText.trim());
      setEditingNoteId(null);
      setEditNoteText('');
    } catch {
      // Error already toasted by mutation
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote(noteId);
  };

  return (
    <div className="space-y-3">
      {/* Definition */}
      {keyword.definition ? (
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Definicion</p>
          <p className="text-xs text-zinc-300 italic leading-relaxed">
            {keyword.definition}
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-zinc-600 italic">Sin definicion registrada</p>
      )}

      {/* Professor notes (with comment tags) */}
      {!profNotesLoading && profNotes.length > 0 && (
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <MessageSquare size={10} className="text-pink-400" />
            Notas del profesor
            <span className="text-zinc-600">({profNotes.length})</span>
          </p>
          <div className="space-y-1.5">
            {profNotes.map(pn => {
              const tagCfg = pn.tag ? commentTagConfig[pn.tag] : null;
              return (
                <div
                  key={pn.id}
                  className="bg-pink-500/10 border border-pink-500/20 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {tagCfg && (
                      <span className={clsx('text-[8px] px-1.5 py-0.5 rounded-full', tagCfg.bg, tagCfg.text)} style={{ fontWeight: 700 }}>
                        {tagCfg.label}
                      </span>
                    )}
                    <span className="text-[9px] text-zinc-600">
                      Profesor &middot;{' '}
                      {new Date(pn.updated_at || pn.created_at).toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'short',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 whitespace-pre-wrap break-words">{pn.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {profNotesLoading && (
        <div className="flex items-center gap-2 py-1">
          <Loader2 size={10} className="animate-spin text-zinc-700" />
          <span className="text-[9px] text-zinc-700">Cargando notas del profesor...</span>
        </div>
      )}

      <div className="border-t border-zinc-800" />

      {/* Student notes */}
      <div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <StickyNote size={10} />
          Mis notas
          {!notesLoading && notes.length > 0 && (
            <span className="text-zinc-600">({notes.length})</span>
          )}
        </p>

        {notesLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 size={12} className="animate-spin text-zinc-600" />
            <span className="text-[10px] text-zinc-600">Cargando...</span>
          </div>
        ) : (
          <>
            {notes.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {notes.map(n => (
                  <div
                    key={n.id}
                    className="bg-teal-500/10 border border-teal-500/20 rounded-lg px-3 py-2 group"
                  >
                    {editingNoteId === n.id ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={editNoteText}
                          onChange={e => setEditNoteText(e.target.value)}
                          maxLength={500}
                          className="w-full text-xs text-zinc-200 bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 resize-none min-h-[48px] focus:outline-none focus:border-teal-500"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUpdateNote(); }
                            if (e.key === 'Escape') { setEditingNoteId(null); setEditNoteText(''); }
                          }}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-zinc-600">{editNoteText.length}/500</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditingNoteId(null); setEditNoteText(''); }}
                              className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleUpdateNote}
                              disabled={isNoteMutating || !editNoteText.trim()}
                              className="text-[10px] text-teal-400 hover:text-teal-300 px-1.5 py-0.5 disabled:opacity-50"
                            >
                              {isNoteMutating ? <Loader2 size={10} className="animate-spin" /> : 'Guardar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-zinc-300 whitespace-pre-wrap break-words">{n.note}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[9px] text-zinc-600">
                            {new Date(n.created_at).toLocaleDateString('es-MX', {
                              day: '2-digit', month: 'short',
                            })}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingNoteId(n.id); setEditNoteText(n.note); }}
                              className="text-zinc-500 hover:text-teal-400 transition-colors p-0.5"
                              title="Editar nota"
                            >
                              <Edit3 size={10} />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(n.id)}
                              className="text-zinc-500 hover:text-red-400 transition-colors p-0.5"
                              title="Eliminar nota"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add new note */}
            <div className="flex items-start gap-2">
              <textarea
                value={newNoteText}
                onChange={e => setNewNoteText(e.target.value)}
                maxLength={500}
                placeholder="Anade tus notas personales..."
                rows={1}
                className="flex-1 text-xs text-zinc-200 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 resize-none placeholder:text-zinc-600 focus:outline-none focus:border-teal-500/50 min-h-[32px]"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); }
                }}
                onFocus={e => { e.target.style.minHeight = '60px'; }}
                onBlur={e => { if (!e.target.value) e.target.style.minHeight = '32px'; }}
              />
              <button
                onClick={handleAddNote}
                disabled={isNoteMutating || !newNoteText.trim()}
                className="mt-1 text-teal-400 hover:text-teal-300 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors p-1"
                title="Agregar nota"
              >
                {isNoteMutating ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
            {newNoteText.length > 0 && (
              <span className="text-[9px] text-zinc-600 mt-0.5 block">{newNoteText.length}/500</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}