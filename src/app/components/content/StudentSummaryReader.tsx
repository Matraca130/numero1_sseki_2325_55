// ============================================================
// Axon — StudentSummaryReader (read-only summary with student features)
//
// Rebuilt with design-kit.tsx primitives. All E2E connections preserved:
//   - summariesApi (chunks, keywords, subtopics, blocks)
//   - studentSummariesApi (reading state, annotations, kw notes)
//   - VideoPlayer, SummaryViewer, useReadingTimeTracker (reading time)
// ============================================================
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowLeft, ChevronRight, Layers, Tag, Video as VideoIcon,
  CheckCircle2, Clock, Loader2, ChevronDown, ChevronUp,
  Plus, Trash2, Save, X, Edit3,
  StickyNote, BookOpen, Send,
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import * as studentApi from '@/app/services/studentSummariesApi';
import type { Summary } from '@/app/services/summariesApi';
import type { ReadingState } from '@/app/services/studentSummariesApi';
import { VideoPlayer } from '@/app/components/student/VideoPlayer';
import { SummaryViewer } from '@/app/components/student/SummaryViewer';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/hooks/queries/queryKeys';
import type { TextAnnotation, KwStudentNote } from '@/app/services/studentSummariesApi';
import { useSummaryReaderQueries } from '@/app/hooks/queries/useSummaryReaderQueries';
import { useKeywordDetailQueries } from '@/app/hooks/queries/useKeywordDetailQueries';
import {
  PageNavigation,
  CompletionCard,
  KeywordPill,
  XpToast,
  focusRing,
  proseClasses,
} from '@/app/components/design-kit';
import { KeywordHighlighterInline } from '@/app/components/student/KeywordHighlighterInline';
import { useReadingTimeTracker } from '@/app/hooks/useReadingTimeTracker';
import { useVideoListQuery } from '@/app/hooks/queries/useVideoPlayerQueries';

// ── Helpers ───────────────────────────────────────────────
const MD_IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const RAW_IMAGE_URL_RE = /^https?:\/\/\S+\.(jpe?g|png|gif|webp|svg|avif|bmp)(\?\S*)?$/i;

function enrichHtmlWithImages(html: string): string {
  let result = html.replace(
    /<p[^>]*>\s*(https?:\/\/[^\s<]+\.(?:jpe?g|png|gif|webp|svg|avif|bmp)(?:\?[^\s<]*)?)\s*<\/p>/gi,
    (_m, url) =>
      `<figure class="my-4"><img src="${url}" alt="" loading="lazy" class="rounded-xl border border-zinc-200 shadow-sm max-w-full h-auto mx-auto block" /></figure>`
  );
  result = result.replace(
    /<p[^>]*>\s*!\[([^\]]*)\]\((https?:\/\/[^)]+)\)\s*<\/p>/gi,
    (_m, alt, url) =>
      `<figure class="my-4"><img src="${url}" alt="${alt || ''}" loading="lazy" class="rounded-xl border border-zinc-200 shadow-sm max-w-full h-auto mx-auto block" />${alt ? `<figcaption class="mt-2 text-center text-xs text-zinc-400 italic">${alt}</figcaption>` : ''}</figure>`
  );
  result = result.replace(
    /(?<!["'=])(https?:\/\/[^\s<>"']+\.(?:jpe?g|png|gif|webp|svg|avif|bmp)(?:\?[^\s<>"']*)?)(?![^<]*<\/a>)/gi,
    (url) =>
      `<img src="${url}" alt="" loading="lazy" class="rounded-xl border border-zinc-200 shadow-sm max-w-full h-auto mx-auto block my-4" />`
  );
  return result;
}

function paginateHtml(html: string, pageSize: number): string[] {
  const blockRe = /(<\/(?:p|div|h[1-6]|figure|blockquote|ul|ol|li|table|pre|hr)>)/gi;
  const parts: string[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(html)) !== null) {
    const end = match.index + match[0].length;
    parts.push(html.slice(last, end));
    last = end;
  }
  if (last < html.length) parts.push(html.slice(last));

  const pages: string[] = [];
  let current = '';
  for (const part of parts) {
    if (current.length + part.length > pageSize && current.length > 0) {
      pages.push(current);
      current = part;
    } else {
      current += part;
    }
  }
  if (current) pages.push(current);
  return pages.length > 0 ? pages : [html];
}

function paginateLines(text: string, linesPerPage: number): string[][] {
  const lines = text.split('\n');
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  return pages.length > 0 ? pages : [lines];
}

function renderPlainLine(line: string, key: number): React.ReactNode {
  if (!line.trim()) return <br key={key} />;
  const mdMatch = line.match(MD_IMAGE_RE);
  if (mdMatch) {
    const [, alt, src] = mdMatch;
    return (
      <figure key={key} className="my-4">
        <img src={src} alt={alt || ''} loading="lazy" className="rounded-xl border border-zinc-200 shadow-sm max-w-full h-auto mx-auto block" />
        {alt && <figcaption className="mt-2 text-center text-xs text-zinc-400 italic">{alt}</figcaption>}
      </figure>
    );
  }
  if (RAW_IMAGE_URL_RE.test(line.trim())) {
    return (
      <figure key={key} className="my-4">
        <img src={line.trim()} alt="" loading="lazy" className="rounded-xl border border-zinc-200 shadow-sm max-w-full h-auto mx-auto block" />
      </figure>
    );
  }
  if (line.startsWith('## ')) return <h3 key={key} className="text-zinc-800 mt-6 mb-2">{line.replace('## ', '')}</h3>;
  if (line.startsWith('### ')) return <h4 key={key} className="text-zinc-800 mt-4 mb-1.5">{line.replace('### ', '')}</h4>;
  if (line.startsWith('- ') || line.startsWith('* ')) return <li key={key} className="ml-4 text-zinc-600">{line.replace(/^[-*]\s/, '')}</li>;
  return <p key={key} className="mb-2 text-zinc-600 text-justify">{line}</p>;
}

// ── Props ─────────────────────────────────────────────────

// L-2 FIX: Module-scope constants (were inside component body)
const CONTENT_PAGE_SIZE = 3500;

// H-4 FIX: Module-scope constant (was recreated every render)
const ANNOTATION_COLOR_MAP: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  yellow: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-400' },
  green: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', dot: 'bg-pink-400' },
};

// H-3 FIX: Module-scope components (were defined inside StudentSummaryReader,
// causing React Fiber to unmount/remount on every parent render due to
// unstable function reference identity).
function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
          <div className="w-6 h-6 rounded bg-zinc-200" />
          <div className="flex-1">
            <div className="h-3 w-48 bg-zinc-200 rounded mb-2" />
            <div className="h-2.5 w-32 bg-zinc-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TabBadge({ count, active }: { count: number; active?: boolean }) {
  return (
    <span className={`ml-1 text-[10px] rounded-full px-1.5 py-0.5 ${active ? 'bg-teal-100 text-teal-700' : 'bg-zinc-200 text-zinc-600'}`}>
      {count}
    </span>
  );
}

interface StudentSummaryReaderProps {
  summary: Summary;
  topicName: string;
  readingState: ReadingState | null;
  onBack: () => void;
  onReadingStateChanged: (rs: ReadingState) => void;
  /** Navigate to a keyword in another (or same) summary */
  onNavigateKeyword?: (keywordId: string, summaryId: string) => void;
}

export function StudentSummaryReader({
  summary,
  topicName,
  readingState,
  onBack,
  onReadingStateChanged,
  onNavigateKeyword,
}: StudentSummaryReaderProps) {
  const [activeTab, setActiveTab] = useState('chunks');

  // ── Content pagination ──────────────────────────────────
  const [contentPage, setContentPage] = useState(0);

  // ── React Query: 4 initial fetches
  const {
    chunks, chunksLoading,
    keywords, keywordsLoading,
    textAnnotations, annotationsLoading,
    hasBlocks, blocksLoading,
    invalidateAnnotations,
  } = useSummaryReaderQueries(summary.id);
  const rqClient = useQueryClient();

  // ── MEJORA-P1: Memoized pagination + keyword-to-page map ──
  // Extracted from inline IIFE so keywordPageMap can reference the pages.
  const { isHtmlContent, htmlPages, textPages, totalPages } = useMemo(() => {
    if (!summary.content_markdown) {
      return { isHtmlContent: false, htmlPages: [] as string[], textPages: [] as string[][], totalPages: 0 };
    }
    const isHtml = /<[a-z][\s\S]*>/i.test(summary.content_markdown);
    const enriched = isHtml ? enrichHtmlWithImages(summary.content_markdown) : '';
    const html = isHtml ? paginateHtml(enriched, CONTENT_PAGE_SIZE) : [];
    const text = !isHtml ? paginateLines(summary.content_markdown, 45) : [];
    return {
      isHtmlContent: isHtml,
      htmlPages: html,
      textPages: text,
      totalPages: isHtml ? html.length : text.length,
    };
  }, [summary.content_markdown]);

  const safePage = Math.min(contentPage, Math.max(0, totalPages - 1));

  // MEJORA-P1: Map each keyword ID to its first page index.
  // Used by the navigation wrapper to auto-switch pages when the
  // target keyword is on a different page than the one displayed.
  const keywordPageMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!keywords.length || totalPages <= 1) return map;

    // Build one searchable text string per page (strip HTML tags)
    const pageTexts = isHtmlContent
      ? htmlPages.map(h => h.replace(/<[^>]+>/g, ''))
      : textPages.map(lines => lines.join('\n'));

    for (const kw of keywords) {
      const needle = kw.name.toLowerCase();
      for (let i = 0; i < pageTexts.length; i++) {
        if (pageTexts[i].toLowerCase().includes(needle)) {
          map.set(kw.id, i);
          break; // first occurrence wins
        }
      }
    }
    return map;
  }, [keywords, htmlPages, textPages, isHtmlContent, totalPages]);

  // MEJORA-P1: Pending cross-page keyword navigation.
  // When the target keyword is on a different page, we switch pages
  // first and then re-invoke the parent handler after the new page
  // mounts (AnimatePresence 150ms + KHI TreeWalker rAF).
  const pendingPageNavRef = useRef<{ keywordId: string; summaryId: string } | null>(null);

  useEffect(() => {
    if (!pendingPageNavRef.current) return;
    const { keywordId, summaryId } = pendingPageNavRef.current;
    pendingPageNavRef.current = null;

    // Wait for AnimatePresence exit (150ms) + enter (150ms) + KHI TreeWalker (~16ms)
    // ≈ 316ms. Use 500ms for safe margin on slow devices.
    const timer = window.setTimeout(() => {
      onNavigateKeyword?.(keywordId, summaryId);
    }, 500);

    return () => clearTimeout(timer);
  }, [contentPage, onNavigateKeyword]);

  // MEJORA-P1: Wrap onNavigateKeyword to handle cross-page navigation.
  // If the keyword is on a different page in the same summary,
  // switch pages first and defer to the parent handler via pendingPageNavRef.
  const handleNavigateKeywordWrapped = useCallback(
    (keywordId: string, summaryId: string) => {
      if (summaryId === summary.id && totalPages > 1) {
        const targetPage = keywordPageMap.get(keywordId);
        if (targetPage !== undefined && targetPage !== safePage) {
          setContentPage(targetPage);
          pendingPageNavRef.current = { keywordId, summaryId };
          toast.info('Navegando a otra pagina del resumen...');
          return;
        }
      }
      // Same page or different summary — delegate directly
      onNavigateKeyword?.(keywordId, summaryId);
    },
    [summary.id, totalPages, keywordPageMap, safePage, onNavigateKeyword],
  );

  // ── Keywords: React Query on-demand (cache per keywordId) ──
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const {
    subtopics, subtopicsLoading,
    kwNotes, kwNotesLoading,
    invalidateKwNotes,
  } = useKeywordDetailQueries(expandedKeyword);
  const [newKwNote, setNewKwNote] = useState('');
  const [editingKwNoteId, setEditingKwNoteId] = useState<string | null>(null);
  const [editKwNoteText, setEditKwNoteText] = useState('');

  // ── Videos ──────────────────────────────────────────────
  const { data: videos, isLoading: videosLoading } = useVideoListQuery(summary.id);
  const videosCount = videos?.length || 0;

  // ── Annotation form state ──────────────────────────────
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [newAnnotationNote, setNewAnnotationNote] = useState('');
  const [newAnnotationColor, setNewAnnotationColor] = useState('yellow');

  // ── Reading state ───────────────────────────────────────
  // H-2 FIX: Removed useState<ReadingState> duplicate. The `readingState`
  // prop (from React Query cache via parent) is now the single source of truth.
  // Mutations update the cache via onReadingStateChanged → prop refreshes.
  const [showXpToast, setShowXpToast] = useState(false);

  // ── Reliable reading time tracking (30s periodic + visibilitychange + beforeunload) ──
  const { snapshotForExternalSave } = useReadingTimeTracker(
    summary.id,
    readingState?.time_spent_seconds ?? 0,
  );

  // ── Fetch callbacks (ALL E2E connections preserved) ─────

  // ── Track reading time on unmount ───────────────────────
  // REPLACED: Old async cleanup was unreliable (chained getSession → upsert in cleanup).
  // Now handled by useReadingTimeTracker with 3-layer persistence:
  //   1. Periodic save every 30s
  //   2. visibilitychange (tab hidden → save)
  //   3. beforeunload with keepalive:true fetch
  // The old useEffect cleanup is no longer needed.

  // ── Mutations ──────────────────────────────────────────

  // Mark as completed (deduplication prevents double-XP)
  const markCompletedMutation = useMutation({
    mutationFn: () => {
      // Atomic snapshot: captures total AND resets session clock
      // so periodic save won't race with this call
      const totalTime = snapshotForExternalSave();
      return studentApi.upsertReadingState({
        summary_id: summary.id,
        completed: true,
        time_spent_seconds: totalTime,
        last_read_at: new Date().toISOString(),
      });
    },
    onSuccess: (rs) => {
      onReadingStateChanged(rs);
      setShowXpToast(true);
      setTimeout(() => setShowXpToast(false), 3000);
      toast.success('Resumen marcado como leido');
      rqClient.invalidateQueries({ queryKey: queryKeys.topicProgress(summary.topic_id) });
    },
    onError: (err: any) => toast.error(err.message || 'Error al marcar como leido'),
  });

  // Unmark completed
  const unmarkCompletedMutation = useMutation({
    mutationFn: () => studentApi.upsertReadingState({ summary_id: summary.id, completed: false }),
    onSuccess: (rs) => {
      onReadingStateChanged(rs);
      toast.success('Marcado como no leido');
      rqClient.invalidateQueries({ queryKey: queryKeys.topicProgress(summary.topic_id) });
    },
    onError: (err: any) => toast.error(err.message || 'Error al actualizar'),
  });

  // Annotation create
  const createAnnotationMutation = useMutation({
    mutationFn: (vars: { note: string; color: string }) =>
      studentApi.createTextAnnotation({
        summary_id: summary.id,
        start_offset: 0, end_offset: 0,
        color: vars.color,
        note: vars.note,
      }),
    onSuccess: () => {
      toast.success('Anotacion creada');
      setNewAnnotationNote('');
      setShowAnnotationForm(false);
      invalidateAnnotations();
    },
    onError: (err: any) => toast.error(err.message || 'Error al crear anotacion'),
  });

  // Annotation delete (optimistic)
  const deleteAnnotationMutation = useMutation({
    mutationFn: (id: string) => studentApi.deleteTextAnnotation(id),
    onMutate: async (id) => {
      await rqClient.cancelQueries({ queryKey: queryKeys.summaryAnnotations(summary.id) });
      const previous = rqClient.getQueryData<TextAnnotation[]>(queryKeys.summaryAnnotations(summary.id));
      rqClient.setQueryData<TextAnnotation[]>(
        queryKeys.summaryAnnotations(summary.id),
        (old) => old?.filter(a => a.id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) rqClient.setQueryData(queryKeys.summaryAnnotations(summary.id), context.previous);
      toast.error('Error al eliminar anotacion');
    },
    onSuccess: () => toast.success('Anotacion eliminada'),
    onSettled: () => invalidateAnnotations(),
  });

  // KW Note create
  const createKwNoteMutation = useMutation({
    mutationFn: (vars: { keywordId: string; note: string }) =>
      studentApi.createKwStudentNote({ keyword_id: vars.keywordId, note: vars.note }),
    onSuccess: (_data, vars) => {
      toast.success('Nota agregada');
      setNewKwNote('');
      invalidateKwNotes(vars.keywordId);
    },
    onError: (err: any) => toast.error(err.message || 'Error al crear nota'),
  });

  // KW Note update
  const updateKwNoteMutation = useMutation({
    mutationFn: (vars: { noteId: string; keywordId: string; note: string }) =>
      studentApi.updateKwStudentNote(vars.noteId, { note: vars.note }),
    onSuccess: (_data, vars) => {
      toast.success('Nota actualizada');
      setEditingKwNoteId(null);
      invalidateKwNotes(vars.keywordId);
    },
    onError: (err: any) => toast.error(err.message || 'Error al actualizar'),
  });

  // KW Note delete (optimistic)
  const deleteKwNoteMutation = useMutation({
    mutationFn: (vars: { noteId: string; keywordId: string }) =>
      studentApi.deleteKwStudentNote(vars.noteId),
    onMutate: async (vars) => {
      await rqClient.cancelQueries({ queryKey: queryKeys.kwNotes(vars.keywordId) });
      const previous = rqClient.getQueryData<KwStudentNote[]>(queryKeys.kwNotes(vars.keywordId));
      rqClient.setQueryData<KwStudentNote[]>(
        queryKeys.kwNotes(vars.keywordId),
        (old) => old?.filter(n => n.id !== vars.noteId) ?? [],
      );
      return { previous };
    },
    onError: (_err, vars, context) => {
      if (context?.previous) rqClient.setQueryData(queryKeys.kwNotes(vars.keywordId), context.previous);
      toast.error('Error al eliminar nota');
    },
    onSuccess: () => toast.success('Nota eliminada'),
    onSettled: (_d, _e, vars) => invalidateKwNotes(vars.keywordId),
  });

  // ── Derived loading flags ──────────────────────────────
  const markingRead = markCompletedMutation.isPending || unmarkCompletedMutation.isPending;
  const savingAnnotation = createAnnotationMutation.isPending;
  const savingKwNote = createKwNoteMutation.isPending || updateKwNoteMutation.isPending;

  // ── Thin handlers (delegate to mutations) ──────────────

  const handleMarkCompleted = () => markCompletedMutation.mutate();
  const handleUnmarkCompleted = () => unmarkCompletedMutation.mutate();

  const handleCreateAnnotation = () => {
    if (!newAnnotationNote.trim()) return;
    createAnnotationMutation.mutate({ note: newAnnotationNote.trim(), color: newAnnotationColor });
  };

  const handleDeleteAnnotation = (id: string) => deleteAnnotationMutation.mutate(id);

  const handleCreateKwNote = (keywordId: string) => {
    if (!newKwNote.trim()) return;
    createKwNoteMutation.mutate({ keywordId, note: newKwNote.trim() });
  };

  const handleUpdateKwNote = (noteId: string, keywordId: string) => {
    if (!editKwNoteText.trim()) return;
    updateKwNoteMutation.mutate({ noteId, keywordId, note: editKwNoteText.trim() });
  };

  const handleDeleteKwNote = (noteId: string, keywordId: string) =>
    deleteKwNoteMutation.mutate({ noteId, keywordId });

  const toggleKeywordExpand = (keywordId: string) => {
    if (expandedKeyword === keywordId) { setExpandedKeyword(null); } else {
      setExpandedKeyword(keywordId);
    }
  };

  const isCompleted = readingState?.completed === true;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full overflow-y-auto bg-zinc-50"
    >
      {/* XP Toast */}
      <XpToast amount={15} show={showXpToast} />

      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        {/* ── Breadcrumb + back ── */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={onBack}
            className={`flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors ${focusRing} rounded-lg px-2 py-1`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span style={{ fontWeight: 500 }}>Resumenes</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-sm text-zinc-400">{topicName}</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-sm text-zinc-700 truncate max-w-[200px]" style={{ fontWeight: 600 }}>
            {summary.title || 'Sin titulo'}
          </span>
        </div>

        {/* ── Summary header card ── */}
        <div className="bg-white rounded-2xl border-2 border-zinc-200 shadow-sm mb-6 overflow-hidden">
          {/* Accent bar */}
          <div className={`h-1 ${isCompleted ? 'bg-emerald-500' : 'bg-teal-500'}`} />

          {/* Title bar */}
          <div className="px-6 sm:px-8 py-6 border-b border-zinc-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${
                  isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-teal-50 border-teal-200'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-teal-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-zinc-900 text-lg tracking-tight" style={{ fontWeight: 700 }}>
                    {summary.title || 'Sin titulo'}
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-700 border border-emerald-200" style={{ fontWeight: 600 }}>
                        <CheckCircle2 className="w-3 h-3" /> Completado
                      </span>
                    )}
                    <span className="text-[11px] text-zinc-400">
                      {new Date(summary.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    {readingState?.time_spent_seconds != null && readingState.time_spent_seconds > 0 && (
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.round(readingState.time_spent_seconds / 60)} min de lectura
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mark as read/unread */}
              <motion.button
                onClick={isCompleted ? handleUnmarkCompleted : handleMarkCompleted}
                disabled={markingRead}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm shrink-0 transition-all cursor-pointer ${focusRing} ${
                  isCompleted
                    ? 'bg-white border-2 border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/25'
                }`}
                style={{ fontWeight: 600 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {markingRead ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isCompleted ? (
                  <><CheckCircle2 className="w-4 h-4" /> Marcar no leido</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Marcar como leido</>
                )}
              </motion.button>
            </div>
          </div>

          {/* ── Paginated content preview ── */}
          {summary.content_markdown && (
              <div className="px-6 sm:px-8 py-6">
                <div className="min-h-[180px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={safePage}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      {isHtmlContent ? (
                        <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={handleNavigateKeywordWrapped}>
                          <div className={proseClasses} dangerouslySetInnerHTML={{ __html: htmlPages[safePage] || '' }} />
                        </KeywordHighlighterInline>
                      ) : (
                        <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={handleNavigateKeywordWrapped}>
                          <div className="axon-prose max-w-none">
                            {textPages[safePage]?.map((line, i) => renderPlainLine(line, i))}
                          </div>
                        </KeywordHighlighterInline>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <PageNavigation
                    currentPage={safePage}
                    totalPages={totalPages}
                    onPrev={() => setContentPage(Math.max(0, safePage - 1))}
                    onNext={() => setContentPage(Math.min(totalPages - 1, safePage + 1))}
                    onPageClick={(i) => setContentPage(i)}
                  />
                )}
              </div>
          )}

          {/* Completion card when read */}
          {isCompleted && (
            <div className="px-6 sm:px-8 pb-6">
              <CompletionCard
                title="Resumen completado!"
                subtitle={`Has leido "${summary.title || 'este resumen'}"`}
                xpEarned={15}
                actions={[
                  { label: `Flashcards`, icon: Layers, onClick: () => setActiveTab('keywords'), variant: 'secondary' },
                ]}
              />
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 bg-white border border-zinc-200 rounded-xl p-1">
            <TabsTrigger value="chunks" className="gap-1.5 rounded-lg">
              <Layers className="w-3.5 h-3.5" />
              Contenido
              {!chunksLoading && <TabBadge count={chunks.length} active={activeTab === 'chunks'} />}
            </TabsTrigger>
            <TabsTrigger value="keywords" className="gap-1.5 rounded-lg">
              <Tag className="w-3.5 h-3.5" />
              Keywords
              {!keywordsLoading && <TabBadge count={keywords.length} active={activeTab === 'keywords'} />}
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-1.5 rounded-lg">
              <VideoIcon className="w-3.5 h-3.5" />
              Videos
              {!videosLoading && <TabBadge count={videosCount} active={activeTab === 'videos'} />}
            </TabsTrigger>
            <TabsTrigger value="annotations" className="gap-1.5 rounded-lg">
              <StickyNote className="w-3.5 h-3.5" />
              Mis Notas
              {!annotationsLoading && textAnnotations.length > 0 && <TabBadge count={textAnnotations.length} active={activeTab === 'annotations'} />}
            </TabsTrigger>
          </TabsList>

          {/* ── CHUNKS TAB ── */}
          <TabsContent value="chunks">
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-sm text-zinc-700" style={{ fontWeight: 600 }}>Contenido del resumen</h3>
                {!blocksLoading && hasBlocks && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-violet-50 text-violet-600 border border-violet-200" style={{ fontWeight: 600 }}>
                    Vista enriquecida
                  </span>
                )}
              </div>
              <div className="p-6">
                {!blocksLoading && hasBlocks ? (
                  <SummaryViewer summaryId={summary.id} />
                ) : chunksLoading ? (
                  <ListSkeleton />
                ) : chunks.length === 0 ? (
                  <div className="text-center py-8">
                    <Layers className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                    <p className="text-xs text-zinc-400">Este resumen aun no tiene contenido</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chunks.map((chunk, idx) => (
                      <motion.div
                        key={chunk.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                      >
                        {/<[a-z][\s\S]*>/i.test(chunk.content) ? (
                          <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={handleNavigateKeywordWrapped}>
                            <div className={proseClasses} dangerouslySetInnerHTML={{ __html: enrichHtmlWithImages(chunk.content) }} />
                          </KeywordHighlighterInline>
                        ) : (
                          <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={handleNavigateKeywordWrapped}>
                            <div className="axon-prose max-w-none">
                              {chunk.content.split('\n').map((line, i) => renderPlainLine(line, i))}
                            </div>
                          </KeywordHighlighterInline>
                        )}
                        {idx < chunks.length - 1 && <div className="border-b border-zinc-100 mt-4" />}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── KEYWORDS TAB ── */}
          <TabsContent value="keywords">
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-100">
                <h3 className="text-sm text-zinc-700" style={{ fontWeight: 600 }}>Palabras clave</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Expande cada keyword para ver subtemas y notas</p>
              </div>

              {/* Keywords as pills */}
              {!keywordsLoading && keywords.length > 0 && (
                <div className="px-5 py-3 border-b border-zinc-100 flex flex-wrap gap-2">
                  {keywords.map((kw, i) => (
                    <KeywordPill
                      key={kw.id}
                      name={kw.name}
                      definition={kw.definition || undefined}
                      delay={i * 0.03}
                    />
                  ))}
                </div>
              )}

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

                      return (
                        <div key={kw.id} className={`border rounded-xl transition-all ${isExpanded ? 'border-teal-200 bg-teal-50/30 shadow-sm' : 'border-zinc-200 hover:border-zinc-300'}`}>
                          <button
                            onClick={() => toggleKeywordExpand(kw.id)}
                            className={`w-full flex items-center justify-between p-3 text-left ${focusRing} rounded-xl`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Tag className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                              <span className="text-sm text-zinc-900 truncate" style={{ fontWeight: 600 }}>{kw.name}</span>
                              {kw.priority > 0 && (
                                <span className="text-[9px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-full shrink-0">P{kw.priority}</span>
                              )}
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
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
                                  {kw.definition && (
                                    <div className="mt-3 p-3 bg-white rounded-lg border border-zinc-200">
                                      <p className="text-xs text-zinc-600 leading-relaxed">{kw.definition}</p>
                                    </div>
                                  )}

                                  {/* Subtopics */}
                                  <div className="mt-3">
                                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider" style={{ fontWeight: 600 }}>Subtemas</span>
                                    {subtopicsLoading ? (
                                      <div className="flex items-center gap-2 mt-1">
                                        <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                                        <span className="text-[10px] text-zinc-400">Cargando...</span>
                                      </div>
                                    ) : subtopics.length === 0 ? (
                                      <p className="text-[10px] text-zinc-400 mt-1">Sin subtemas</p>
                                    ) : (
                                      <div className="mt-1 space-y-1">
                                        {subtopics.map(sub => (
                                          <div key={sub.id} className="flex items-center gap-2 px-2 py-1 bg-white rounded-lg border border-zinc-100 text-xs text-zinc-600">
                                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                                            {sub.name}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

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
                                              <div key={note.id} className="group/note flex items-start gap-2 p-2 bg-white rounded-lg border border-teal-100">
                                                {editingKwNoteId === note.id ? (
                                                  <div className="flex-1 space-y-1.5">
                                                    <Textarea value={editKwNoteText} onChange={(e) => setEditKwNoteText(e.target.value)} className="min-h-[50px] text-xs" autoFocus />
                                                    <div className="flex justify-end gap-1">
                                                      <Button size="sm" variant="ghost" onClick={() => setEditingKwNoteId(null)} className="h-6 text-[10px] px-2"><X className="w-3 h-3" /> Cancelar</Button>
                                                      <Button size="sm" onClick={() => handleUpdateKwNote(note.id, kw.id)} disabled={savingKwNote} className="h-6 text-[10px] px-2 bg-teal-600 hover:bg-teal-700 text-white">
                                                        {savingKwNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Guardar
                                                      </Button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <>
                                                    <StickyNote className="w-3 h-3 text-teal-400 shrink-0 mt-0.5" />
                                                    <p className="text-xs text-zinc-600 flex-1">{note.note}</p>
                                                    <div className="flex items-center gap-0.5 opacity-0 group-hover/note:opacity-100 transition-opacity shrink-0">
                                                      <button onClick={() => { setEditingKwNoteId(note.id); setEditKwNoteText(note.note); }} className="p-1 rounded hover:bg-teal-50 text-zinc-400 hover:text-teal-600">
                                                        <Edit3 className="w-3 h-3" />
                                                      </button>
                                                      <button onClick={() => handleDeleteKwNote(note.id, kw.id)} className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500">
                                                        <Trash2 className="w-3 h-3" />
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
                                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreateKwNote(kw.id); } }}
                                          />
                                          <Button size="sm" onClick={() => handleCreateKwNote(kw.id)} disabled={savingKwNote || !newKwNote.trim()} className="h-8 px-2 bg-teal-600 hover:bg-teal-700 text-white">
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
            </div>
          </TabsContent>

          {/* ── VIDEOS TAB ── */}
          <TabsContent value="videos">
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <VideoPlayer summaryId={summary.id} />
            </div>
          </TabsContent>

          {/* ── ANNOTATIONS TAB ── */}
          <TabsContent value="annotations">
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
                <div>
                  <h3 className="text-sm text-zinc-700" style={{ fontWeight: 600 }}>Mis anotaciones</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Tus notas privadas sobre este resumen</p>
                </div>
                <motion.button
                  onClick={() => setShowAnnotationForm(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs text-zinc-600 hover:bg-zinc-50 ${focusRing}`}
                  style={{ fontWeight: 600 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar nota
                </motion.button>
              </div>

              <div className="p-4">
                {annotationsLoading ? (
                  <ListSkeleton />
                ) : (
                  <>
                    <AnimatePresence>
                      {showAnnotationForm && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="mb-4 border border-teal-200 rounded-xl p-4 bg-teal-50/30"
                        >
                          <Textarea
                            value={newAnnotationNote}
                            onChange={(e) => setNewAnnotationNote(e.target.value)}
                            placeholder="Escribe tu nota o anotacion..."
                            className="min-h-[60px] mb-3 text-xs"
                            autoFocus
                          />
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] text-zinc-400" style={{ fontWeight: 500 }}>Color:</span>
                            {Object.entries(ANNOTATION_COLOR_MAP).map(([color, styles]) => (
                              <button
                                key={color}
                                onClick={() => setNewAnnotationColor(color)}
                                className={clsx(
                                  "w-5 h-5 rounded-full border-2 transition-all cursor-pointer",
                                  styles.dot,
                                  newAnnotationColor === color ? "border-zinc-800 scale-110" : "border-transparent hover:border-zinc-300"
                                )}
                              />
                            ))}
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => { setShowAnnotationForm(false); setNewAnnotationNote(''); }}
                              disabled={savingAnnotation}
                              className={`px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 rounded-lg ${focusRing}`}
                              style={{ fontWeight: 500 }}
                            >
                              Cancelar
                            </button>
                            <motion.button
                              onClick={handleCreateAnnotation}
                              disabled={savingAnnotation || !newAnnotationNote.trim()}
                              className={`flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 text-white rounded-lg text-xs hover:bg-teal-700 disabled:opacity-50 ${focusRing}`}
                              style={{ fontWeight: 600 }}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              {savingAnnotation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                              Crear
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {textAnnotations.length === 0 && !showAnnotationForm ? (
                      <div className="text-center py-8">
                        <StickyNote className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                        <p className="text-xs text-zinc-500 mb-1" style={{ fontWeight: 600 }}>No tienes anotaciones</p>
                        <p className="text-[10px] text-zinc-400 mb-3">Agrega notas para recordar puntos importantes</p>
                        <motion.button
                          onClick={() => setShowAnnotationForm(true)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs text-zinc-600 hover:bg-zinc-50 ${focusRing}`}
                          style={{ fontWeight: 600 }}
                          whileHover={{ scale: 1.03 }}
                        >
                          <Plus className="w-3.5 h-3.5" /> Crear primera nota
                        </motion.button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <AnimatePresence mode="popLayout">
                          {textAnnotations.map(ann => {
                            const colorStyles = ANNOTATION_COLOR_MAP[ann.color || 'yellow'] || ANNOTATION_COLOR_MAP.yellow;
                            return (
                              <motion.div
                                key={ann.id}
                                layout
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: 30 }}
                                className={clsx("group rounded-xl border p-3 transition-shadow hover:shadow-sm", colorStyles.bg, colorStyles.border)}
                              >
                                <div className="flex items-start gap-2">
                                  <div className={clsx("w-2 h-2 rounded-full mt-1.5 shrink-0", colorStyles.dot)} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-zinc-600">{ann.note || '(sin nota)'}</p>
                                    <span className="text-[10px] text-zinc-400 mt-1 inline-block">
                                      {new Date(ann.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteAnnotation(ann.id)}
                                    className={`p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${focusRing}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}