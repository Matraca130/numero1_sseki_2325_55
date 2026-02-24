// ============================================================
// Axon — KeywordPopup (Student: hub central por keyword)
//
// Tabbed popup with 4 tabs:
//   Info:     definition + student notes
//   Subtemas: subtopics with mastery dots
//   Red:      connections + cross-nav + ConnectionsMap SVG
//   Acciones: flashcard/quiz counts + AI explain
//
// Routes (all FLAT):
//   GET /keyword-connections?keyword_id=xxx
//   GET /kw-student-notes?keyword_id=xxx (scopeToUser)
//   GET /kw-prof-notes?keyword_id=xxx (professor notes, visible to student)
//   GET /flashcards?keyword_id=xxx (count)
//   GET /quiz-questions?keyword_id=xxx (count)
//   POST /ai/explain { concept, context }
//
// bktMap + subtopicsCache passed from KeywordBadges (batch, no N+1)
// ============================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import {
  Layers, Link2, ArrowRight, Brain, HelpCircle,
  Loader2, X, ChevronRight, Sparkles, BookOpen,
  StickyNote, Trash2, Edit3, Send, Zap, FileText,
  ExternalLink, MessageSquare,
} from 'lucide-react';
import clsx from 'clsx';
import { apiCall } from '@/app/lib/api';
import { MasteryIndicator } from '@/app/components/shared/MasteryIndicator';
import { ConnectionsMap } from './ConnectionsMap';
import * as summariesApi from '@/app/services/summariesApi';
import * as studentApi from '@/app/services/studentSummariesApi';
import type { SummaryKeyword, Subtopic } from '@/app/services/summariesApi';
import type { KwStudentNote } from '@/app/services/studentSummariesApi';
import {
  type BktState,
  getKeywordMastery,
  getMasteryColor,
  getMasteryLabel,
} from '@/app/lib/mastery-helpers';

// ── Types ─────────────────────────────────────────────────
interface KeywordConnection {
  id: string;
  keyword_a_id: string;
  keyword_b_id: string;
  relationship: string | null;
  created_at: string;
}

interface ExternalKeyword {
  id: string;
  name: string;
  summary_id: string;
  definition: string | null;
}

interface KwProfNote {
  id: string;
  keyword_id: string;
  professor_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

type TabKey = 'info' | 'subtemas' | 'red' | 'acciones';

function extractItems<T>(result: any): T[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

// ── Priority config ───────────────────────────────────────
const priorityConfig: Record<number, { label: string; bg: string; text: string }> = {
  1: { label: 'P1 Baja',  bg: 'bg-zinc-700',  text: 'text-zinc-300' },
  2: { label: 'P2 Media', bg: 'bg-amber-900/50', text: 'text-amber-400' },
  3: { label: 'P3 Alta',  bg: 'bg-red-900/50',   text: 'text-red-400' },
};

// ── Tab config ────────────────────────────────────────────
const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'info',     label: 'Info',     icon: <BookOpen size={11} /> },
  { key: 'subtemas', label: 'Subtemas', icon: <Layers size={11} /> },
  { key: 'red',      label: 'Red',      icon: <Link2 size={11} /> },
  { key: 'acciones', label: 'Acciones', icon: <Zap size={11} /> },
];

// ── Props ─────────────────────────────────────────────────
interface KeywordPopupProps {
  keyword: SummaryKeyword;
  allKeywords: SummaryKeyword[];
  bktMap: Map<string, BktState>;
  subtopicsCache?: Map<string, Subtopic[]>;
  onClose: () => void;
  onNavigateKeyword?: (keywordId: string, summaryId: string) => void;
}

export function KeywordPopup({
  keyword,
  allKeywords,
  bktMap,
  subtopicsCache,
  onClose,
  onNavigateKeyword,
}: KeywordPopupProps) {
  // ── Tab state ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('info');

  // ── Data state ─────────────────────────────────────────
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [subtopicsLoading, setSubtopicsLoading] = useState(true);

  const [connections, setConnections] = useState<KeywordConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);

  // External keywords (from other summaries)
  const [externalKws, setExternalKws] = useState<Map<string, ExternalKeyword>>(new Map());

  // Student notes
  const [notes, setNotes] = useState<KwStudentNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [newNoteText, setNewNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  // Action counters
  const [flashcardCount, setFlashcardCount] = useState<number | null>(null);
  const [quizCount, setQuizCount] = useState<number | null>(null);

  // AI explain
  const [aiExplaining, setAiExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  // Professor notes (read-only for student)
  const [profNotes, setProfNotes] = useState<KwProfNote[]>([]);
  const [profNotesLoading, setProfNotesLoading] = useState(true);

  // ── Fetch subtopics (use cache if available) ────────────
  useEffect(() => {
    const cached = subtopicsCache?.get(keyword.id);
    if (cached) {
      setSubtopics(cached);
      setSubtopicsLoading(false);
      return;
    }
    let cancelled = false;
    setSubtopicsLoading(true);
    summariesApi.getSubtopics(keyword.id)
      .then(result => {
        if (!cancelled) {
          setSubtopics(
            extractItems<Subtopic>(result)
              .filter(s => s.is_active !== false)
              .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          );
        }
      })
      .catch(() => { if (!cancelled) setSubtopics([]); })
      .finally(() => { if (!cancelled) setSubtopicsLoading(false); });
    return () => { cancelled = true; };
  }, [keyword.id, subtopicsCache]);

  // ── Fetch connections + resolve external keywords ───────
  useEffect(() => {
    let cancelled = false;
    setConnectionsLoading(true);
    apiCall<any>(`/keyword-connections?keyword_id=${keyword.id}`)
      .then(async result => {
        if (cancelled) return;
        const conns = extractItems<KeywordConnection>(result);
        setConnections(conns);

        // Find external keyword IDs (not in allKeywords = different summary)
        const localIds = new Set(allKeywords.map(k => k.id));
        const externalIds = conns
          .map(c => c.keyword_a_id === keyword.id ? c.keyword_b_id : c.keyword_a_id)
          .filter(id => !localIds.has(id));

        if (externalIds.length > 0) {
          // Fetch each external keyword to get name + summary_id
          const results = await Promise.allSettled(
            externalIds.map(id => apiCall<any>(`/keywords/${id}`))
          );
          if (cancelled) return;
          const map = new Map<string, ExternalKeyword>();
          results.forEach((r, i) => {
            if (r.status === 'fulfilled' && r.value) {
              const kw = r.value;
              map.set(externalIds[i], {
                id: kw.id || externalIds[i],
                name: kw.name || externalIds[i].slice(0, 8),
                summary_id: kw.summary_id || '',
                definition: kw.definition || null,
              });
            }
          });
          setExternalKws(map);
        }
      })
      .catch(() => { if (!cancelled) setConnections([]); })
      .finally(() => { if (!cancelled) setConnectionsLoading(false); });
    return () => { cancelled = true; };
  }, [keyword.id, allKeywords]);

  // ── Fetch student notes ─────────────────────────────────
  const fetchNotes = useCallback(async () => {
    setNotesLoading(true);
    try {
      const result = await studentApi.getKwStudentNotes(keyword.id);
      setNotes(extractItems<KwStudentNote>(result).filter(n => !n.deleted_at));
    } catch {
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, [keyword.id]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // ── Fetch professor notes (read-only for student) ───────
  useEffect(() => {
    let cancelled = false;
    setProfNotesLoading(true);
    apiCall<any>(`/kw-prof-notes?keyword_id=${keyword.id}`)
      .then(result => {
        if (!cancelled) setProfNotes(extractItems<KwProfNote>(result));
      })
      .catch(() => { if (!cancelled) setProfNotes([]); })
      .finally(() => { if (!cancelled) setProfNotesLoading(false); });
    return () => { cancelled = true; };
  }, [keyword.id]);

  // ── Fetch flashcard & quiz counts (lazy, when Acciones tab opens) ──
  useEffect(() => {
    if (activeTab !== 'acciones') return;
    if (flashcardCount !== null && quizCount !== null) return; // already fetched
    let cancelled = false;

    Promise.allSettled([
      apiCall<any>(`/flashcards?keyword_id=${keyword.id}`),
      apiCall<any>(`/quiz-questions?keyword_id=${keyword.id}`),
    ]).then(([fcResult, qResult]) => {
      if (cancelled) return;
      if (fcResult.status === 'fulfilled') {
        setFlashcardCount(extractItems<any>(fcResult.value).length);
      } else {
        setFlashcardCount(0);
      }
      if (qResult.status === 'fulfilled') {
        setQuizCount(extractItems<any>(qResult.value).length);
      } else {
        setQuizCount(0);
      }
    });

    return () => { cancelled = true; };
  }, [activeTab, keyword.id, flashcardCount, quizCount]);

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
        mastery: -1, // We don't have mastery for other keywords here
        isCrossSummary: !isLocal,
      };
    });
  }, [connections, keyword.id, localIds, externalKws, allKeywords]);

  // ── Note CRUD ───────────────────────────────────────────
  const handleAddNote = async () => {
    if (!newNoteText.trim() || newNoteText.length > 500) return;
    setSavingNote(true);
    try {
      await studentApi.createKwStudentNote({
        keyword_id: keyword.id,
        note: newNoteText.trim(),
      });
      toast.success('Nota agregada');
      setNewNoteText('');
      await fetchNotes();
    } catch (err: any) {
      toast.error(err.message || 'Error al agregar nota');
    } finally {
      setSavingNote(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNoteId || !editNoteText.trim() || editNoteText.length > 500) return;
    setSavingNote(true);
    try {
      await studentApi.updateKwStudentNote(editingNoteId, { note: editNoteText.trim() });
      toast.success('Nota actualizada');
      setEditingNoteId(null);
      setEditNoteText('');
      await fetchNotes();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await studentApi.deleteKwStudentNote(noteId);
      toast.success('Nota eliminada');
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  // ── AI Explain ──────────────────────────────────────────
  const handleAiExplain = async () => {
    if (aiExplaining) return;
    setAiExplaining(true);
    setAiExplanation(null);
    try {
      const conceptText = `${keyword.name}${keyword.definition ? ': ' + keyword.definition : ''}`;
      const result = await apiCall<any>('/ai/explain', {
        method: 'POST',
        body: JSON.stringify({
          concept: conceptText,
          context: `Concepto medico del area de estudio. Explicar de forma clara y concisa para un estudiante.`,
        }),
      });
      setAiExplanation(result?.explanation || result || 'Sin respuesta de la IA');
    } catch (err: any) {
      toast.error(err.message || 'Error al explicar con IA');
      setAiExplanation(null);
    } finally {
      setAiExplaining(false);
    }
  };

  // ── Render helpers ──────────────────────────────────────

  const renderInfoTab = () => (
    <div className="px-5 py-3 space-y-3">
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

      <div className="border-t border-zinc-800" />

      {/* Professor notes (read-only) */}
      {!profNotesLoading && profNotes.length > 0 && (
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <MessageSquare size={10} className="text-pink-400" />
            Notas del profesor
            <span className="text-zinc-600">({profNotes.length})</span>
          </p>
          <div className="space-y-1.5">
            {profNotes.map(pn => (
              <div
                key={pn.id}
                className="bg-pink-500/10 border border-pink-500/20 rounded-lg px-3 py-2"
              >
                <p className="text-xs text-zinc-300 whitespace-pre-wrap break-words">{pn.note}</p>
                <span className="text-[9px] text-zinc-600 mt-1 block">
                  Profesor &middot;{' '}
                  {new Date(pn.updated_at || pn.created_at).toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'short',
                  })}
                </span>
              </div>
            ))}
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
                              disabled={savingNote || !editNoteText.trim()}
                              className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5 disabled:opacity-50"
                            >
                              {savingNote ? <Loader2 size={10} className="animate-spin" /> : 'Guardar'}
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
                disabled={savingNote || !newNoteText.trim()}
                className="mt-1 text-blue-400 hover:text-blue-300 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors p-1"
                title="Agregar nota"
              >
                {savingNote ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
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

  const renderSubtemasTab = () => (
    <div className="px-5 py-3">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
        <Layers size={10} />
        Subtemas
        {!subtopicsLoading && (
          <span className="text-zinc-600">({subtopics.length})</span>
        )}
      </p>

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
              <div
                key={sub.id}
                className="flex items-center gap-2 py-1 group"
              >
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
    </div>
  );

  const renderRedTab = () => (
    <div className="px-5 py-3 space-y-3">
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
            if (local && onNavigateKeyword) {
              onNavigateKeyword(id, local.summary_id);
            }
            const ext = externalKws.get(id);
            if (ext && onNavigateKeyword) {
              onNavigateKeyword(id, ext.summary_id);
            }
          }}
          className="bg-zinc-800/30 rounded-lg"
        />
      )}

      {/* Connections List */}
      <div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Link2 size={10} />
          Conexiones
          {!connectionsLoading && (
            <span className="text-zinc-600">({connections.length})</span>
          )}
        </p>

        {connectionsLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 size={12} className="animate-spin text-zinc-600" />
            <span className="text-[10px] text-zinc-600">Cargando...</span>
          </div>
        ) : connections.length === 0 ? (
          <p className="text-[10px] text-zinc-600 py-1">Sin conexiones</p>
        ) : (
          <div className="space-y-1">
            {connections.map(conn => {
              const otherId = conn.keyword_a_id === keyword.id ? conn.keyword_b_id : conn.keyword_a_id;
              const otherLocal = allKeywords.find(k => k.id === otherId);
              const otherExt = externalKws.get(otherId);
              const isCross = !otherLocal && !!otherExt;
              return (
                <button
                  key={conn.id}
                  onClick={() => {
                    if (otherLocal && onNavigateKeyword) {
                      onNavigateKeyword(otherId, otherLocal.summary_id);
                    } else if (otherExt && onNavigateKeyword) {
                      onNavigateKeyword(otherId, otherExt.summary_id);
                    }
                  }}
                  className="flex items-center gap-2 py-1 w-full text-left group hover:bg-zinc-800/50 rounded px-1 -mx-1 transition-colors"
                >
                  {isCross ? (
                    <ExternalLink size={10} className="text-violet-400 shrink-0" />
                  ) : (
                    <Link2 size={10} className="text-violet-400 shrink-0" />
                  )}
                  <span className="text-xs text-zinc-300 truncate group-hover:text-violet-300 transition-colors">
                    {kwName(otherId)}
                  </span>
                  {conn.relationship && (
                    <>
                      <ArrowRight size={8} className="text-zinc-600 shrink-0" />
                      <span className="text-[10px] text-zinc-500 italic truncate">
                        {conn.relationship}
                      </span>
                    </>
                  )}
                  <ChevronRight size={10} className="text-zinc-600 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        )}
      </div>

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
                onClick={() => {
                  if (onNavigateKeyword && ext.summary_id) {
                    onNavigateKeyword(ext.id, ext.summary_id);
                  }
                }}
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
    </div>
  );

  const renderAccionesTab = () => (
    <div className="px-5 py-3 space-y-3">
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

      <div className="border-t border-zinc-800" />

      {/* AI Explain */}
      <div>
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
            <>
              <Loader2 size={13} className="animate-spin" />
              Explicando...
            </>
          ) : (
            <>
              <Sparkles size={13} />
              Explicar con IA
            </>
          )}
        </button>

        {aiExplanation && (
          <div className="mt-2 bg-violet-500/5 border border-violet-500/20 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles size={10} className="text-violet-400" />
              <span className="text-[10px] text-violet-400">Explicacion IA</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {typeof aiExplanation === 'string' ? aiExplanation : JSON.stringify(aiExplanation)}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800" />

      {/* Quick action buttons (placeholder for navigation to flashcard/quiz views) */}
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
    </div>
  );

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

      {/* ── TAB BAR ────────────────────────────────────────── */}
      <div className="flex border-t border-b border-zinc-800 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1 py-2 text-[10px] transition-all border-b-2',
              activeTab === tab.key
                ? 'text-violet-400 border-violet-500 bg-violet-500/5'
                : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/50',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'info' && renderInfoTab()}
        {activeTab === 'subtemas' && renderSubtemasTab()}
        {activeTab === 'red' && renderRedTab()}
        {activeTab === 'acciones' && renderAccionesTab()}
      </div>
    </motion.div>
  );
}