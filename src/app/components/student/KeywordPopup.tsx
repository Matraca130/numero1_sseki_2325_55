// ============================================================
// Axon — KeywordPopup (Student: hub central por keyword)
//
// Collapsible sections (replaces old tab system):
//   Definición:  definition + professor notes (with tags) + student notes
//   Subtemas:    subtopics with mastery dots
//   Conexiones:  connections map + professor/student connections + ConnectForm
//   Acciones:    flashcard/quiz counts + AI explain + suggested questions + chat
//
// Routes (all FLAT):
//   GET /keyword-connections?keyword_id=xxx
//   GET /kw-student-notes?keyword_id=xxx (scopeToUser)
//   GET /kw-prof-notes?keyword_id=xxx (professor notes, visible to student)
//   GET /flashcards?keyword_id=xxx (count)
//   GET /quiz-questions?keyword_id=xxx (count)
//   POST /ai/explain { concept, context }
//   POST /keyword-connections { keyword_a_id, keyword_b_id, relationship }
//
// bktMap + subtopicsCache passed from parent (batch, no N+1)
// ============================================================
import React, { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
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
  source?: 'professor' | 'student';
  reason?: string | null;
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
  tag?: 'tip' | 'mnemonic' | 'clinical' | 'correction';
  created_at: string;
  updated_at: string;
}

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
      await apiCall('/keyword-connections', {
        method: 'POST',
        body: JSON.stringify({
          keyword_a_id: keywordId,
          keyword_b_id: targetId,
          relationship: reason.trim() || null,
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

  // AI chat
  const [aiChatInput, setAiChatInput] = useState('');

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
  const fetchConnections = useCallback(async () => {
    setConnectionsLoading(true);
    try {
      const result = await apiCall<any>(`/keyword-connections?keyword_id=${keyword.id}`);
      const conns = extractItems<KeywordConnection>(result);
      setConnections(conns);

      const localIdSet = new Set(allKeywords.map(k => k.id));
      const externalIds = conns
        .map(c => c.keyword_a_id === keyword.id ? c.keyword_b_id : c.keyword_a_id)
        .filter(id => !localIdSet.has(id));

      if (externalIds.length > 0) {
        const results = await Promise.allSettled(
          externalIds.map(id => apiCall<any>(`/keywords/${id}`))
        );
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
    } catch {
      setConnections([]);
    } finally {
      setConnectionsLoading(false);
    }
  }, [keyword.id, allKeywords]);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  // ── Fetch student notes ��────────────────────────────────
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

  // ── Fetch flashcard & quiz counts (eager now) ────────────
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      apiCall<any>(`/flashcards?keyword_id=${keyword.id}`),
      apiCall<any>(`/quiz-questions?keyword_id=${keyword.id}`),
    ]).then(([fcResult, qResult]) => {
      if (cancelled) return;
      setFlashcardCount(fcResult.status === 'fulfilled' ? extractItems<any>(fcResult.value).length : 0);
      setQuizCount(qResult.status === 'fulfilled' ? extractItems<any>(qResult.value).length : 0);
    });
    return () => { cancelled = true; };
  }, [keyword.id]);

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
        mastery: -1,
        isCrossSummary: !isLocal,
      };
    });
  }, [connections, keyword.id, localIds, externalKws, allKeywords]);

  // ── Existing connected keyword IDs (for ConnectForm filter) ──
  const existingConnectionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of connections) {
      ids.add(c.keyword_a_id === keyword.id ? c.keyword_b_id : c.keyword_a_id);
    }
    return ids;
  }, [connections, keyword.id]);

  // ── Separate professor vs student connections ───────────
  const professorConnections = useMemo(
    () => connections.filter(c => c.source === 'professor' || !c.source),
    [connections]
  );
  const studentConnections = useMemo(
    () => connections.filter(c => c.source === 'student'),
    [connections]
  );

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
    const isStudent = conn.source === 'student';
    const targetSummaryId = otherLocal?.summary_id || otherExt?.summary_id;
    const canNavigate = !!targetSummaryId && !!onNavigateKeyword;

    return (
      <button
        key={conn.id}
        onClick={() => {
          console.log('[KeywordPopup] Connection item clicked:', {
            otherId,
            targetSummaryId,
            canNavigate,
            hasOnNavigate: !!onNavigateKeyword,
            otherLocal: !!otherLocal,
            otherExt: !!otherExt,
          });
          if (!canNavigate || !targetSummaryId) {
            toast.info('No se puede navegar a esta keyword');
            return;
          }
          // Close popup first, then navigate
          onClose();
          // Small delay to let React process the close before navigating
          setTimeout(() => {
            onNavigateKeyword!(otherId, targetSummaryId);
          }, 50);
        }}
        className={clsx(
          'w-full flex flex-col gap-0.5 py-1.5 px-2 -mx-1 text-left group rounded transition-colors',
          isStudent
            ? 'hover:bg-teal-500/10 border border-transparent hover:border-teal-500/20'
            : 'hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20'
        )}
      >
        <div className="flex items-center gap-2 w-full">
          {isStudent ? (
            <MessageSquare size={10} className="text-teal-400 shrink-0" />
          ) : isCross ? (
            <ExternalLink size={10} className="text-violet-400 shrink-0" />
          ) : (
            <BookOpen size={10} className="text-violet-400 shrink-0" />
          )}
          <span className={clsx(
            'text-xs truncate group-hover:transition-colors',
            isStudent ? 'text-zinc-300 group-hover:text-teal-300' : 'text-zinc-300 group-hover:text-violet-300'
          )}>
            {kwName(otherId)}
          </span>
          {isStudent && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-400 shrink-0" style={{ fontWeight: 600 }}>
              Tuya
            </span>
          )}
          {conn.relationship && (
            <>
              <ArrowRight size={8} className="text-zinc-600 shrink-0" />
              <span className="text-[10px] text-zinc-500 italic truncate">{conn.relationship}</span>
            </>
          )}
          <ChevronRight size={10} className="text-zinc-600 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {isStudent && conn.reason && (
          <span className="text-[9px] text-zinc-500 italic ml-5 truncate">{conn.reason}</span>
        )}
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

        {/* ─── 1. DEFINICIÓN & NOTAS ────────────────────────── */}
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
                  console.log('[KeywordPopup] SVG node clicked:', {
                    id,
                    targetSummaryId,
                    hasOnNavigate: !!onNavigateKeyword,
                    isLocal: !!local,
                    isExt: !!ext,
                  });
                  if (targetSummaryId && onNavigateKeyword) {
                    onClose();
                    setTimeout(() => {
                      onNavigateKeyword(id, targetSummaryId);
                    }, 50);
                  } else {
                    toast.info('No se puede navegar a esta keyword');
                  }
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
              <div className="space-y-2">
                {/* Professor connections */}
                {professorConnections.length > 0 && (
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <BookOpen size={9} className="text-violet-400" />
                      Del profesor
                    </p>
                    <div className="space-y-0.5">
                      {professorConnections.map(renderConnectionItem)}
                    </div>
                  </div>
                )}

                {/* Student connections */}
                {studentConnections.length > 0 && (
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <MessageSquare size={9} className="text-teal-400" />
                      Mis conexiones
                    </p>
                    <div className="space-y-0.5">
                      {studentConnections.map(renderConnectionItem)}
                    </div>
                  </div>
                )}
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
                      onClick={() => {
                        console.log('[KeywordPopup] Cross-summary button clicked:', {
                          extId: ext.id,
                          extSummaryId: ext.summary_id,
                          hasOnNavigate: !!onNavigateKeyword,
                        });
                        if (onNavigateKeyword && ext.summary_id) {
                          onClose();
                          setTimeout(() => {
                            onNavigateKeyword(ext.id, ext.summary_id);
                          }, 50);
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

            {/* ConnectForm */}
            <ConnectForm
              keywordId={keyword.id}
              allKeywords={allKeywords}
              existingConnectionIds={existingConnectionIds}
              onCreated={fetchConnections}
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