// ============================================================
// Axon — ProfessorNotesPanel (Professor: CRUD notas por keyword)
//
// Renders within KeywordsManager when expanding a keyword.
// React Query migration (S1): uses useProfNotesQuery,
// useUpsertProfNoteMutation, useDeleteProfNoteMutation from
// useProfessorNotesQueries.ts. No direct apiCall.
//
// Routes (all FLAT):
//   GET    /kw-prof-notes?keyword_id=xxx
//   POST   /kw-prof-notes { keyword_id, note }  — UPSERT on (professor_id, keyword_id)
//   DELETE /kw-prof-notes/:id                    — hard delete
//
// NO PUT route — updates go through POST (UPSERT).
// Schema: id, keyword_id, professor_id, note(text), created_at, updated_at
// NO "is_visible", NO "note_text". Field = "note". All notes visible.
// ============================================================
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  MessageSquare, Plus, Edit3, Trash2, Save, X,
  Loader2, Send,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/app/context/AuthContext';
import {
  useProfNotesQuery,
  useUpsertProfNoteMutation,
  useDeleteProfNoteMutation,
} from '@/app/hooks/queries/useProfessorNotesQueries';

// ── Props ─────────────────────────────────────────────────
interface ProfessorNotesPanelProps {
  keywordId: string;
  keywordName?: string;
  /** Optional: when provided, mutations also invalidate keywordCounts(summaryId) for badge refresh */
  summaryId?: string;
}

export function ProfessorNotesPanel({ keywordId, keywordName, summaryId }: ProfessorNotesPanelProps) {
  const { user } = useAuth();
  const userId = user?.id || '';

  // ── React Query ─────────────────────────────────────────
  const { data: notes = [], isLoading: loading } = useProfNotesQuery(keywordId);
  const upsertNote = useUpsertProfNoteMutation(keywordId, summaryId);
  const deleteNoteMutation = useDeleteProfNoteMutation(keywordId, summaryId);

  // ── My existing note (UPSERT = one per professor per keyword) ──
  const myNote = useMemo(
    () => notes.find(n => n.professor_id === userId),
    [notes, userId],
  );

  // New note
  const [showForm, setShowForm] = useState(false);
  const [noteText, setNoteText] = useState('');

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // ── Create / Update note ────────────────────────────────
  const handleSave = async () => {
    const text = noteText.trim();
    if (!text || text.length > 1000) return;
    try {
      await upsertNote.mutateAsync(text);
      toast.success(myNote ? 'Nota actualizada' : 'Nota creada');
      setNoteText('');
      setShowForm(false);
    } catch {
      // error toast handled by mutation hook
    }
  };

  // ── Update note via POST UPSERT ──────────────────────────
  // Backend has no PUT route — POST upserts on (professor_id, keyword_id)
  const handleUpdate = async () => {
    if (!editingId || !editText.trim() || editText.length > 1000) return;
    try {
      await upsertNote.mutateAsync(editText.trim());
      toast.success('Nota actualizada');
      setEditingId(null);
      setEditText('');
    } catch {
      // error toast handled by mutation hook
    }
  };

  // ── Delete note ─────────────────────────────────────────
  const handleDelete = async (noteId: string) => {
    try {
      await deleteNoteMutation.mutateAsync(noteId);
    } catch {
      // error toast handled by mutation hook
    }
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
          <MessageSquare size={10} className="text-pink-500" />
          Notas para alumnos
          {!loading && notes.length > 0 && (
            <span className="text-gray-400">({notes.length})</span>
          )}
        </p>
        {!showForm && !myNote && (
          <button
            onClick={() => { setShowForm(true); setNoteText(''); }}
            className="flex items-center gap-1 text-[10px] text-pink-600 hover:text-pink-700 transition-colors"
          >
            <Plus size={10} />
            Agregar nota
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 size={12} className="animate-spin text-gray-400" />
          <span className="text-[10px] text-gray-400">Cargando notas...</span>
        </div>
      ) : (
        <>
          {/* Existing notes */}
          {notes.length > 0 && (
            <div className="space-y-2 mb-2">
              {notes.map(n => {
                const isMine = n.professor_id === userId;
                return (
                  <div
                    key={n.id}
                    className={clsx(
                      "rounded-lg px-3 py-2 group",
                      isMine
                        ? "bg-pink-50 border border-pink-200"
                        : "bg-gray-50 border border-gray-200"
                    )}
                  >
                    {editingId === n.id ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          maxLength={1000}
                          className="w-full text-xs text-gray-800 bg-white border border-gray-300 rounded px-2 py-1.5 resize-none min-h-[60px] focus:outline-none focus:border-pink-400"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUpdate(); }
                            if (e.key === 'Escape') { setEditingId(null); }
                          }}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-gray-400">{editText.length}/1000</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-[10px] text-gray-500 hover:text-gray-700 px-1.5 py-0.5"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleUpdate}
                              disabled={upsertNote.isPending || !editText.trim()}
                              className="text-[10px] text-pink-600 hover:text-pink-700 px-1.5 py-0.5 disabled:opacity-50"
                            >
                              {upsertNote.isPending ? <Loader2 size={10} className="animate-spin" /> : 'Guardar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">{n.note}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[9px] text-gray-400">
                            {isMine ? 'Tu nota' : 'Otro profesor'} &middot;{' '}
                            {new Date(n.updated_at || n.created_at).toLocaleDateString('es-MX', {
                              day: '2-digit', month: 'short',
                            })}
                          </span>
                          {isMine && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditingId(n.id); setEditText(n.note); }}
                                className="text-gray-400 hover:text-pink-600 transition-colors p-0.5"
                                title="Editar"
                              >
                                <Edit3 size={10} />
                              </button>
                              <button
                                onClick={() => handleDelete(n.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors p-0.5"
                                title="Eliminar"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Create form */}
          {(showForm || (myNote && !editingId)) ? null : !myNote && !showForm ? null : null}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-2">
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    maxLength={1000}
                    placeholder="Escribe una nota visible para tus alumnos..."
                    rows={2}
                    className="flex-1 text-xs text-gray-800 bg-white border border-gray-300 rounded-lg px-3 py-2 resize-none placeholder:text-gray-400 focus:outline-none focus:border-pink-400 min-h-[48px]"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); }
                      if (e.key === 'Escape') { setShowForm(false); setNoteText(''); }
                    }}
                  />
                  <div className="flex flex-col gap-1 mt-1">
                    <button
                      onClick={handleSave}
                      disabled={upsertNote.isPending || !noteText.trim()}
                      className="text-pink-600 hover:text-pink-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors p-1"
                      title="Guardar nota"
                    >
                      {upsertNote.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                    <button
                      onClick={() => { setShowForm(false); setNoteText(''); }}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                      title="Cancelar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                {noteText.length > 0 && (
                  <span className="text-[9px] text-gray-400 mt-0.5 block">{noteText.length}/1000</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {notes.length === 0 && !showForm && (
            <p className="text-[10px] text-gray-400 py-1">
              Sin notas. Agrega una nota visible para tus alumnos.
            </p>
          )}

          {/* If I already have a note, show edit button */}
          {myNote && !editingId && (
            <button
              onClick={() => { setEditingId(myNote.id); setEditText(myNote.note); }}
              className="text-[10px] text-pink-500 hover:text-pink-600 mt-1 flex items-center gap-1"
            >
              <Edit3 size={9} />
              Editar mi nota
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Badge counter (for use in KeywordsManager rows) ───────
export function ProfessorNotesBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] text-pink-600 bg-pink-50 border border-pink-200 rounded-full px-1.5 py-0.5">
      <MessageSquare size={8} />
      {count}
    </span>
  );
}
