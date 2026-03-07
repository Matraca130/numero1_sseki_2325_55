// ============================================================
// Axon — KeywordPopup (Student: hub central por keyword)
//
// Collapsible sections (replaces old tab system):
//   Definicion:  definition + professor notes (with tags) + student notes
//   Subtemas:    subtopics with mastery dots
//   Conexiones:  connections map + professor/student connections + ConnectForm
//   Acciones:    flashcard/quiz counts + AI explain + suggested questions + chat
//
// S1 migration: ALL data fetching moved to useKeywordPopupQueries
// (React Query). Eliminates 11 useState + 5 useEffect + 2 useCallback
// of manual fetching. Note CRUD uses useMutation with optimistic
// delete. Cache seeding from useKeywordMasteryQuery means subtopics
// are instant on first open.
//
// bktMap passed from parent (batch, no N+1)
// subtopicsCache prop removed — React Query cache replaces it
// ============================================================
import React, { useState, useMemo, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Layers, Link2, ArrowRight, Brain, HelpCircle,
  Loader2, X, ChevronRight, ChevronDown, Sparkles, BookOpen,
  StickyNote, Trash2, Edit3, Send, Zap, FileText,
  ExternalLink, MessageSquare, Plus, Search,
} from 'lucide-react';
import clsx from 'clsx';
import { apiCall } from '@/app/lib/api';
import { MasteryIndicator } from '@/app/components/shared/MasteryIndicator';
import { ConnectionsMap } from './ConnectionsMap';
import type { SummaryKeyword, Subtopic } from '@/app/services/summariesApi';
import {
  type BktState,
  getKeywordMastery,
  getMasteryColor,
  getMasteryLabel,
} from '@/app/lib/mastery-helpers';
import {
  useKeywordPopupQueries,
  type KeywordConnection,
  type ExternalKeyword,
  type KwProfNote,
} from '@/app/hooks/queries/useKeywordPopupQueries';
import { ConnectionTypeBadge } from '@/app/components/shared/ConnectionTypeBadge';
import { useKeywordMasteryQuery } from '@/app/hooks/queries/useKeywordMasteryQuery';

// ── Priority config ───────────────────────────────────────
const priorityConfig: Record<number, { label: string; bg: string; text: string }> = {
  1: { label: 'P1 Baja',  bg: 'bg-zinc-700',  text: 'text-zinc-300' },
  2: { label: 'P2 Media', bg: 'bg-amber-900/50', text: 'text-amber-400' },
  3: { label: 'P3 Alta',  bg: 'bg-red-900/50',   text: 'text-red-400' },
};

// ── Comment tag config (professor notes) ──────────────────
const commentTagConfig: Record<string, { label: string; bg: string; text: string }> = {
  tip:        { label: 'Tip',         bg: 'bg-blue-900/30',   text: 'text-blue-400' },
  mnemonic:   { label: 'Mnemotecnia', bg: 'bg-purple-900/30', text: 'text-purple-400' },
  clinical:   { label: 'Clinica',     bg: 'bg-rose-900/30',   text: 'text-rose-400' },
  correction: { label: 'Correccion',  bg: 'bg-orange-900/30', text: 'text-orange-400' },
};

// ── CollapsibleSection ────────────────────────────────────
function CollapsibleSection({ icon, title, badge, children, defaultOpen = false, id }: {
  icon: ReactNode;
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  id?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-800">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-zinc-800/50 cursor-pointer transition-colors" aria-expanded={isOpen}>
        {icon}
        <span className="text-[11px] text-zinc-400 flex-1 text-left" style={{ fontWeight: 700 }}>{title}</span>
        {badge}
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div id={id} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }} className="overflow-hidden">
            <div className="px-4 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── ConnectForm (inline keyword connection creator) ────────
function ConnectForm({
  keywordId,
  allKeywords,
  existingConnectionIds,
  onCreated,
}: {
  keywordId: string;
  allKeywords: SummaryKeyword[];
  existingConnectionIds: Set<string>;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allKeywords.filter(
      k => k.id !== keywordId
        && !existingConnectionIds.has(k.id)
        && k.name.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [search, allKeywords, keywordId, existingConnectionIds]);

  const handleCreate = async (targetId: string) => {
    setSaving(true);
    try {
      // F4: Enforce canonical order a < b (per GUIDELINES.md constraint)
      const [aId, bId] = keywordId < targetId
        ? [keywordId, targetId]
        : [targetId, keywordId];

      await apiCall('/keyword-connections', {
        method: 'POST',
        body: JSON.stringify({
          keyword_a_id: aId,
          keyword_b_id: bId,
          relationship: reason.trim() || null,
          connection_type: 'asociacion',
          source_keyword_id: keywordId,
        }),
      });
      toast.success('Conexion creada');
      setSearch('');
      setReason('');
      setOpen(false);
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear conexion');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 rounded-lg text-[10px] text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 transition-colors"
      >
        <Plus size={11} />
        Crear conexion con otra keyword
      </button>
    );
  }

  return (
    <div className="mt-2 bg-zinc-800/50 rounded-lg border border-zinc-700 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Search size={12} className="text-zinc-500 shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar keyword..."
          className="flex-1 text-xs text-zinc-200 bg-transparent border-none outline-none placeholder:text-zinc-600"
          autoFocus
        />
        <button onClick={() => { setOpen(false); setSearch(''); }} className="text-zinc-500 hover:text-zinc-300 p-0.5">
          <X size={12} />
        </button>
      </div>

      {search.trim() && (
        <>
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Relacion (opcional, ej: 'causa de...')"
            className="w-full text-[10px] text-zinc-300 bg-zinc-900/50 border border-zinc-700 rounded px-2 py-1.5 placeholder:text-zinc-600 outline-none focus:border-teal-500/50"
          />
          {filtered.length > 0 ? (
            <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
              {filtered.map(kw => (
                <button
                  key={kw.id}
                  onClick={() => handleCreate(kw.id)}
                  disabled={saving}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded hover:bg-zinc-700/50 transition-colors disabled:opacity-50"
                >
                  <Link2 size={10} className="text-teal-400 shrink-0" />
                  <span className="text-xs text-zinc-300 truncate">{kw.name}</span>
                  {kw.definition && (
                    <span className="text-[9px] text-zinc-600 truncate ml-auto">{kw.definition.slice(0, 30)}...</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-zinc-600 text-center py-1">Sin resultados</p>
          )}
        </>
      )}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────
interface KeywordPopupProps {
  keyword: SummaryKeyword;
  allKeywords: SummaryKeyword[];
  bktMap: Map<string, BktState>;
  onClose: () => void;
  onNavigateKeyword?: (keywordId: string, summaryId: string) => void;
}

export function KeywordPopup({
  keyword,
  allKeywords,
  bktMap,
  onClose,
  onNavigateKeyword,
}: KeywordPopupProps) {
  // ── React Query: all popup data + mutations ─────────────
  const allKeywordIds = useMemo(() => allKeywords.map(k => k.id), [allKeywords]);
  const {
    subtopics,
    subtopicsLoading,
    connections,
    connectionsLoading,
    externalKws,
    invalidateConnections,
    notes,
    notesLoading,
    createNote,
    updateNote,
    deleteNote,
    isNoteMutating,
    profNotes,
    profNotesLoading,
    flashcardCount,
    quizCount,
  } = useKeywordPopupQueries(keyword.id, allKeywordIds, keyword.summary_id);

  // M-4 FIX: Get keywordMasteryMap for local nodes in ConnectionsMap.
  // This is a cache hit (instant, 0 requests) because useKeywordMasteryQuery
  // was already called by KeywordHighlighterInline for the same summary.
  const { keywordMasteryMap } = useKeywordMasteryQuery(keyword.summary_id);

  // ── Local UI state (forms, editing, AI) ─────────────────
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  // AI explain
  const [aiExplaining, setAiExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  // AI chat
  const [aiChatInput, setAiChatInput] = useState('');

  // ── Compute keyword mastery from bktMap ─────────────────
  const kwMastery = useMemo(() => {
    const bkts = subtopics
      .map(s => bktMap.get(s.id))
      .filter((b): b is BktState => b != null);
    return getKeywordMastery(bkts);
  }, [subtopics, bktMap]);

  // ── Resolve keyword name ────────────────────────────────
  const kwName = (id: string) => {
    const local = allKeywords.find(k => k.id === id);
    if (local) return local.name;
    const ext = externalKws.get(id);
    if (ext) return ext.name;
    return id.slice(0, 8);
  };

  const prio = priorityConfig[keyword.priority] || priorityConfig[2];

  // ── Identify cross-summary connections ──────────────────
  const localIds = useMemo(() => new Set(allKeywords.map(k => k.id)), [allKeywords]);

  const crossSummaryConnections = useMemo(() => {
    return connections
      .map(conn => {
        const otherId = conn.keyword_a_id === keyword.id ? conn.keyword_b_id : conn.keyword_a_id;
        if (localIds.has(otherId)) return null;
        const ext = externalKws.get(otherId);
        return ext ? { conn, ext } : null;
      })
      .filter((x): x is { conn: KeywordConnection; ext: ExternalKeyword } => x !== null);
  }, [connections, keyword.id, localIds, externalKws]);

  // ── ConnectionsMap data ─────────────────────────────────
  const mapNodes = useMemo(() => {
    return connections.map(conn => {
      const otherId = conn.keyword_a_id === keyword.id ? conn.keyword_b_id : conn.keyword_a_id;
      const isLocal = localIds.has(otherId);
      return {
        id: otherId,
        name: kwName(otherId),
        relationship: conn.relationship,
        // M-4 FIX: Use real mastery for local nodes (cache hit from useKeywordMasteryQuery)
        mastery: isLocal ? (keywordMasteryMap.get(otherId) ?? -1) : -1,
        isCrossSummary: !isLocal,
      };
    });
  }, [connections, keyword.id, localIds, externalKws, allKeywords, keywordMasteryMap]);

  // ── Existing connected keyword IDs (for ConnectForm filter) ──
  const existingConnectionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of connections) {
      ids.add(c.keyword_a_id === keyword.id ? c.keyword_b_id : c.keyword_a_id);
    }
    return ids;
  }, [connections, keyword.id]);

  // F3 NOTE: When `created_by` column is added to keyword_connections,
  // re-introduce professor/student split here using created_by instead of source.
  // For now, all connections render in a single unified list.

  // ── FIX-I3: Centralized close-then-navigate helper ──────
  // Replaces 3 separate onClose() + setTimeout(50) patterns with
  // a single useCallback. Uses rAF instead of arbitrary 50ms timeout:
  // React 18 automatic batching commits the unmount synchronously,
  // rAF fires after the next paint → popover is guaranteed gone.
  const closeAndNavigate = useCallback(
    (targetKeywordId: string, targetSummaryId: string | undefined) => {
      if (!targetSummaryId || !onNavigateKeyword) {
        toast.info('No se puede navegar a esta keyword');
        return;
      }
      onClose();
      requestAnimationFrame(() => {
        onNavigateKeyword(targetKeywordId, targetSummaryId);
      });
    },
    [onClose, onNavigateKeyword],
  );

  // ── Note CRUD handlers (delegate to mutations) ──────────
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

  // ── AI Explain / Chat ──────────────────────────────────
  const handleAiQuery = async (question: string) => {
    if (aiExplaining || !question.trim()) return;
    setAiExplaining(true);
    setAiExplanation(null);
    try {
      const conceptText = `${keyword.name}${keyword.definition ? ': ' + keyword.definition : ''}`;
      const result = await apiCall<any>('/ai/explain', {
        method: 'POST',
        body: JSON.stringify({
          concept: conceptText,
          context: question,
        }),
      });
      setAiExplanation(result?.explanation || (typeof result === 'string' ? result : JSON.stringify(result)) || 'Sin respuesta de la IA');
    } catch (err: any) {
      toast.error(err.message || 'Error al consultar IA');
      setAiExplanation(null);
    } finally {
      setAiExplaining(false);
    }
  };

  const handleAiExplain = () => {
    handleAiQuery('Concepto medico del area de estudio. Explicar de forma clara y concisa para un estudiante.');
  };

  const handleAiChat = () => {
    if (!aiChatInput.trim()) return;
    const q = aiChatInput.trim();
    setAiChatInput('');
    handleAiQuery(q);
  };

  // ── Suggested AI questions ──────────────────────────────
  const suggestedQuestions = useMemo(() => [
    `Que es "${keyword.name}" en terminos simples?`,
    `Cual es la importancia clinica de "${keyword.name}"?`,
    `Dame un ejemplo practico de "${keyword.name}"`,
  ], [keyword.name]);

  // ── Render connection item helper ───────────────────────
  const renderConnectionItem = (conn: KeywordConnection) => {
    const otherId = conn.keyword_a_id === keyword.id ? conn.keyword_b_id : conn.keyword_a_id;
    const otherLocal = allKeywords.find(k => k.id === otherId);
    const otherExt = externalKws.get(otherId);
    const isCross = !otherLocal && !!otherExt;
    const targetSummaryId = otherLocal?.summary_id || otherExt?.summary_id;

    return (
      <button
        key={conn.id}
        onClick={() => closeAndNavigate(otherId, targetSummaryId)}
        className="w-full flex items-center gap-2 py-1.5 px-2 -mx-1 text-left group rounded transition-colors hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20"
      >
        {isCross ? (
          <ExternalLink size={10} className="text-violet-400 shrink-0" />
        ) : (
          <BookOpen size={10} className="text-violet-400 shrink-0" />
        )}
        <span className="text-xs text-zinc-300 truncate group-hover:text-violet-300 group-hover:transition-colors">
          {kwName(otherId)}
        </span>
        {/* F5: Connection type badge (dark variant for student popup) */}
        <ConnectionTypeBadge type={conn.connection_type} variant="dark" />
        {conn.relationship && (
          <>
            <ArrowRight size={8} className="text-zinc-600 shrink-0" />
            <span className="text-[10px] text-zinc-500 italic truncate">{conn.relationship}</span>
          </>
        )}
        <ChevronRight size={10} className="text-zinc-600 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.15 }}
      className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl max-w-md w-full overflow-hidden max-h-[75vh] flex flex-col"
    >
      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <MasteryIndicator pMastery={kwMastery} size="lg" variant="ring" />
          <div className="min-w-0">
            <h3 className="text-sm text-zinc-100 truncate">{keyword.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={clsx(
                "inline-block text-[10px] px-1.5 py-0.5 rounded-full",
                prio.bg, prio.text
              )}>
                {prio.label}
              </span>
              {kwMastery >= 0 && (
                <MasteryIndicator pMastery={kwMastery} size="sm" variant="badge" />
              )}
              {kwMastery < 0 && (
                <span className="text-[9px] text-zinc-600 italic">Sin datos de estudio</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 -mr-1 -mt-1"
        >
          <X size={14} />
        </button>
      </div>

      {/* ── COLLAPSIBLE SECTIONS ────────────────────────────── */}
      <div className="flex-1 overflow-y-auto border-t border-zinc-800">

        {/* ─── 1. DEFINICION & NOTAS ────────────────────────── */}
        <CollapsibleSection
          icon={<BookOpen size={12} className="text-teal-400" />}
          title="Definicion"
          badge={
            (profNotes.length > 0 || notes.length > 0) ? (
              <span className="text-[9px] bg-zinc-700 text-zinc-400 rounded-full px-1.5 py-0.5">
                {profNotes.length + notes.length}
              </span>
            ) : undefined
          }
          defaultOpen
        >
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
                          className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 group"
                        >
                          {editingNoteId === n.id ? (
                            <div className="space-y-1.5">
                              <textarea
                                value={editNoteText}
                                onChange={e => setEditNoteText(e.target.value)}
                                maxLength={500}
                                className="w-full text-xs text-zinc-200 bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 resize-none min-h-[48px] focus:outline-none focus:border-blue-500"
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
                                    className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5 disabled:opacity-50"
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
                                    className="text-zinc-500 hover:text-blue-400 transition-colors p-0.5"
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
                      className="flex-1 text-xs text-zinc-200 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 resize-none placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 min-h-[32px]"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); }
                      }}
                      onFocus={e => { e.target.style.minHeight = '60px'; }}
                      onBlur={e => { if (!e.target.value) e.target.style.minHeight = '32px'; }}
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={isNoteMutating || !newNoteText.trim()}
                      className="mt-1 text-blue-400 hover:text-blue-300 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors p-1"
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
        </CollapsibleSection>

        {/* ─── 2. SUBTEMAS ──────────────────────────────────── */}
        <CollapsibleSection
          icon={<Layers size={12} className="text-amber-400" />}
          title="Subtemas"
          badge={
            !subtopicsLoading ? (
              <span className="text-[9px] bg-zinc-700 text-zinc-400 rounded-full px-1.5 py-0.5">{subtopics.length}</span>
            ) : undefined
          }
        >
          {subtopicsLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 size={12} className="animate-spin text-zinc-600" />
              <span className="text-[10px] text-zinc-600">Cargando...</span>
            </div>
          ) : subtopics.length === 0 ? (
            <p className="text-[10px] text-zinc-600 py-1">Sin subtemas definidos</p>
          ) : (
            <div className="space-y-1">
              {subtopics.map(sub => {
                const bkt = bktMap.get(sub.id);
                const pKnow = bkt ? bkt.p_know : -1;
                return (
                  <div key={sub.id} className="flex items-center gap-2 py-1 group">
                    <MasteryIndicator pMastery={pKnow} size="md" variant="dot" />
                    <span className="text-xs text-zinc-300 truncate flex-1">{sub.name}</span>
                    {bkt && bkt.total_attempts > 0 && (
                      <span className="text-[9px] text-zinc-600">
                        {Math.round(pKnow * 100)}%
                      </span>
                    )}
                    {!bkt && (
                      <span className="text-[9px] text-zinc-700 italic">sin datos</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleSection>

        {/* ─── 3. CONEXIONES ────────────────────────────────── */}
        <CollapsibleSection
          icon={<Link2 size={12} className="text-violet-400" />}
          title="Conexiones"
          badge={
            !connectionsLoading ? (
              <span className="text-[9px] bg-zinc-700 text-zinc-400 rounded-full px-1.5 py-0.5">{connections.length}</span>
            ) : undefined
          }
        >
          <div className="space-y-3">
            {/* Connections Map SVG */}
            {!connectionsLoading && connections.length > 0 && (
              <ConnectionsMap
                centralKeyword={{
                  id: keyword.id,
                  name: keyword.name,
                  mastery: kwMastery,
                }}
                nodes={mapNodes}
                onNodeClick={(id) => {
                  const local = allKeywords.find(k => k.id === id);
                  const ext = externalKws.get(id);
                  const targetSummaryId = local?.summary_id || ext?.summary_id;
                  closeAndNavigate(id, targetSummaryId);
                }}
                className="bg-zinc-800/30 rounded-lg"
              />
            )}

            {connectionsLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 size={12} className="animate-spin text-zinc-600" />
                <span className="text-[10px] text-zinc-600">Cargando...</span>
              </div>
            ) : connections.length === 0 ? (
              <p className="text-[10px] text-zinc-600 py-1">Sin conexiones</p>
            ) : (
              <div className="space-y-0.5">
                {/* F3: Unified connection list (no professor/student split until created_by exists) */}
                {connections.map(renderConnectionItem)}
              </div>
            )}

            {/* Cross-Summary Navigation */}
            {crossSummaryConnections.length > 0 && (
              <div>
                <div className="border-t border-zinc-800 my-2" />
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <ExternalLink size={10} />
                  Tambien aparece en
                </p>
                <div className="space-y-1">
                  {crossSummaryConnections.map(({ conn, ext }) => (
                    <button
                      key={conn.id}
                      onClick={() => closeAndNavigate(ext.id, ext.summary_id)}
                      className="flex items-center gap-2 py-1.5 w-full text-left group hover:bg-violet-500/10 rounded px-2 -mx-1 transition-colors border border-transparent hover:border-violet-500/20"
                    >
                      <div className="w-5 h-5 rounded bg-violet-500/20 flex items-center justify-center shrink-0">
                        <FileText size={10} className="text-violet-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-zinc-300 truncate block group-hover:text-violet-300 transition-colors">
                          {ext.name}
                        </span>
                        {ext.definition && (
                          <span className="text-[9px] text-zinc-600 truncate block">
                            {ext.definition.length > 50 ? ext.definition.slice(0, 48) + '...' : ext.definition}
                          </span>
                        )}
                      </div>
                      <ChevronRight size={10} className="text-zinc-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ConnectForm */}
            <ConnectForm
              keywordId={keyword.id}
              allKeywords={allKeywords}
              existingConnectionIds={existingConnectionIds}
              onCreated={invalidateConnections}
            />
          </div>
        </CollapsibleSection>

        {/* ─── 4. ACCIONES & IA ─────────────────────────────── */}
        <CollapsibleSection
          icon={<Zap size={12} className="text-rose-400" />}
          title="Acciones & IA"
          badge={
            flashcardCount !== null && quizCount !== null ? (
              <span className="text-[9px] bg-zinc-700 text-zinc-400 rounded-full px-1.5 py-0.5">
                {(flashcardCount || 0) + (quizCount || 0)}
              </span>
            ) : undefined
          }
        >
          <div className="space-y-3">
            {/* Counters */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-800/50 rounded-lg px-3 py-2.5 border border-zinc-800">
                <div className="flex items-center gap-1.5 mb-1">
                  <Brain size={12} className="text-amber-400" />
                  <span className="text-[10px] text-zinc-500 uppercase">Flashcards</span>
                </div>
                <span className="text-lg text-zinc-200">
                  {flashcardCount === null ? (
                    <Loader2 size={14} className="animate-spin text-zinc-600" />
                  ) : (
                    flashcardCount
                  )}
                </span>
              </div>
              <div className="bg-zinc-800/50 rounded-lg px-3 py-2.5 border border-zinc-800">
                <div className="flex items-center gap-1.5 mb-1">
                  <HelpCircle size={12} className="text-blue-400" />
                  <span className="text-[10px] text-zinc-500 uppercase">Preguntas</span>
                </div>
                <span className="text-lg text-zinc-200">
                  {quizCount === null ? (
                    <Loader2 size={14} className="animate-spin text-zinc-600" />
                  ) : (
                    quizCount
                  )}
                </span>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="space-y-1.5">
              <button
                disabled={flashcardCount === 0}
                className={clsx(
                  'w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs transition-all',
                  flashcardCount && flashcardCount > 0
                    ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50',
                )}
                title={flashcardCount === 0 ? 'No hay flashcards para este keyword' : 'Revisar flashcards'}
              >
                <Brain size={12} />
                <span>Revisar {flashcardCount ?? '...'} flashcards</span>
                <ChevronRight size={10} className="ml-auto" />
              </button>
              <button
                disabled={quizCount === 0}
                className={clsx(
                  'w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs transition-all',
                  quizCount && quizCount > 0
                    ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50',
                )}
                title={quizCount === 0 ? 'No hay preguntas para este keyword' : 'Tomar quiz'}
              >
                <HelpCircle size={12} />
                <span>Tomar {quizCount ?? '...'} preguntas</span>
                <ChevronRight size={10} className="ml-auto" />
              </button>
            </div>

            <div className="border-t border-zinc-800" />

            {/* AI Explain button */}
            <button
              onClick={handleAiExplain}
              disabled={aiExplaining}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs transition-all',
                aiExplaining
                  ? 'bg-violet-500/10 text-violet-400 cursor-wait'
                  : 'bg-gradient-to-r from-violet-500/20 to-blue-500/20 text-violet-300 hover:from-violet-500/30 hover:to-blue-500/30 active:scale-[0.98]',
              )}
            >
              {aiExplaining ? (
                <><Loader2 size={13} className="animate-spin" /> Explicando...</>
              ) : (
                <><Sparkles size={13} /> Explicar con IA</>
              )}
            </button>

            {/* AI Explanation result */}
            {aiExplanation && (
              <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles size={10} className="text-violet-400" />
                  <span className="text-[10px] text-violet-400">Explicacion IA</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {typeof aiExplanation === 'string' ? aiExplanation : JSON.stringify(aiExplanation)}
                </p>
              </div>
            )}

            <div className="border-t border-zinc-800" />

            {/* Suggested questions */}
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <HelpCircle size={10} className="text-blue-400" />
                Preguntas sugeridas
              </p>
              <div className="space-y-1">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleAiQuery(q)}
                    disabled={aiExplaining}
                    className="w-full text-left text-[11px] text-zinc-400 hover:text-violet-300 px-2.5 py-1.5 rounded-lg hover:bg-violet-500/10 transition-colors disabled:opacity-50 disabled:cursor-wait"
                  >
                    <span className="text-violet-500 mr-1">?</span> {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat input */}
            <div className="flex items-center gap-2">
              <input
                value={aiChatInput}
                onChange={e => setAiChatInput(e.target.value)}
                placeholder={`Pregunta sobre "${keyword.name}"...`}
                className="flex-1 text-xs text-zinc-200 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAiChat(); }
                }}
                disabled={aiExplaining}
              />
              <button
                onClick={handleAiChat}
                disabled={aiExplaining || !aiChatInput.trim()}
                className="text-violet-400 hover:text-violet-300 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors p-1.5"
                title="Enviar pregunta"
              >
                {aiExplaining ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </motion.div>
  );
}