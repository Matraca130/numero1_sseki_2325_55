// ============================================================
// Axon — StudentSummaryReader (read-only summary with student features)
//
// Rebuilt with design-kit.tsx primitives. All E2E connections preserved:
//   - summariesApi (chunks, keywords, subtopics, blocks)
//   - studentSummariesApi (reading state, annotations, kw notes)
//   - VideoPlayer, SummaryViewer, supabase (reading time tracking)
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowLeft, ChevronRight, FileText, Layers, Tag, Video as VideoIcon,
  CheckCircle2, Clock, Loader2, ChevronDown, ChevronUp,
  Plus, Trash2, Save, X, Edit3,
  StickyNote, BookOpen, Send, ChevronLeft,
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import * as summariesApi from '@/app/services/summariesApi';
import * as studentApi from '@/app/services/studentSummariesApi';
import type { Summary, Chunk, SummaryKeyword, Subtopic } from '@/app/services/summariesApi';
import type { ReadingState, TextAnnotation, KwStudentNote } from '@/app/services/studentSummariesApi';
import { VideoPlayer } from '@/app/components/student/VideoPlayer';
import { SummaryViewer } from '@/app/components/student/SummaryViewer';
import { supabase } from '@/app/lib/supabase';
import {
  Breadcrumb,
  PageNavigation,
  ProgressBar,
  CompletionCard,
  KeywordPill,
  XpToast,
  focusRing,
  tokens,
  proseClasses,
} from '@/app/components/design-kit';
import { KeywordHighlighterInline } from '@/app/components/student/KeywordHighlighterInline';

// ── Helpers ───────────────────────────────────────────────
function extractItems<T>(result: any): T[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

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
  const startTimeRef = useRef(Date.now());

  // ── Content pagination ──────────────────────────────────
  const [contentPage, setContentPage] = useState(0);
  const CONTENT_PAGE_SIZE = 3500;

  // ── Chunks ────────────────────────────────────────────
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [chunksLoading, setChunksLoading] = useState(true);

  // ── Keywords ──────────────────────────────────────────
  const [keywords, setKeywords] = useState<SummaryKeyword[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(true);
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const [subtopicsMap, setSubtopicsMap] = useState<Record<string, Subtopic[]>>({});
  const [subtopicsLoading, setSubtopicsLoading] = useState<string | null>(null);
  const [kwNotesMap, setKwNotesMap] = useState<Record<string, KwStudentNote[]>>({});
  const [kwNotesLoading, setKwNotesLoading] = useState<string | null>(null);
  const [newKwNote, setNewKwNote] = useState('');
  const [savingKwNote, setSavingKwNote] = useState(false);
  const [editingKwNoteId, setEditingKwNoteId] = useState<string | null>(null);
  const [editKwNoteText, setEditKwNoteText] = useState('');

  // ── Videos ────────────────────────────────────────────
  const [videosCount, setVideosCount] = useState(0);
  const [videosLoading, setVideosLoading] = useState(true);

  // ── Text Annotations ──────────────────────────────────
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [annotationsLoading, setAnnotationsLoading] = useState(true);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [newAnnotationNote, setNewAnnotationNote] = useState('');
  const [newAnnotationColor, setNewAnnotationColor] = useState('yellow');
  const [savingAnnotation, setSavingAnnotation] = useState(false);

  // ── Reading state ─────────────────────────────────────
  const [currentReadingState, setCurrentReadingState] = useState<ReadingState | null>(readingState);
  const [markingRead, setMarkingRead] = useState(false);
  const [showXpToast, setShowXpToast] = useState(false);

  // ── Blocks detection ──────────────────────────────────
  const [hasBlocks, setHasBlocks] = useState(false);
  const [blocksLoading, setBlocksLoading] = useState(true);

  // ── Fetch callbacks (ALL E2E connections preserved) ─────

  const fetchChunks = useCallback(async () => {
    setChunksLoading(true);
    try {
      const result = await summariesApi.getChunks(summary.id);
      setChunks(extractItems<Chunk>(result).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));
    } catch (err: any) {
      console.error('[StudentReader] Chunks load error:', err);
      setChunks([]);
    } finally {
      setChunksLoading(false);
    }
  }, [summary.id]);

  const fetchKeywords = useCallback(async () => {
    setKeywordsLoading(true);
    try {
      const result = await summariesApi.getKeywords(summary.id);
      setKeywords(extractItems<SummaryKeyword>(result).filter(k => k.is_active));
    } catch (err: any) {
      console.error('[StudentReader] Keywords load error:', err);
      setKeywords([]);
    } finally {
      setKeywordsLoading(false);
    }
  }, [summary.id]);

  const handleVideosLoaded = useCallback((count: number) => {
    setVideosCount(count);
    setVideosLoading(false);
  }, []);

  const fetchAnnotations = useCallback(async () => {
    setAnnotationsLoading(true);
    try {
      const result = await studentApi.getTextAnnotations(summary.id);
      setTextAnnotations(extractItems<TextAnnotation>(result));
    } catch (err: any) {
      console.error('[StudentReader] Annotations load error:', err);
      setTextAnnotations([]);
    } finally {
      setAnnotationsLoading(false);
    }
  }, [summary.id]);

  const fetchSubtopics = useCallback(async (keywordId: string) => {
    setSubtopicsLoading(keywordId);
    try {
      const result = await summariesApi.getSubtopics(keywordId);
      setSubtopicsMap(prev => ({ ...prev, [keywordId]: extractItems<Subtopic>(result).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)) }));
    } catch { setSubtopicsMap(prev => ({ ...prev, [keywordId]: [] })); }
    finally { setSubtopicsLoading(null); }
  }, []);

  const fetchKwNotes = useCallback(async (keywordId: string) => {
    setKwNotesLoading(keywordId);
    try {
      const result = await studentApi.getKwStudentNotes(keywordId);
      setKwNotesMap(prev => ({ ...prev, [keywordId]: extractItems<KwStudentNote>(result) }));
    } catch { setKwNotesMap(prev => ({ ...prev, [keywordId]: [] })); }
    finally { setKwNotesLoading(null); }
  }, []);

  // ── Initial load ──────────────────────────────────────
  useEffect(() => {
    fetchChunks();
    fetchKeywords();
    fetchAnnotations();
    let cancelled = false;
    summariesApi.getSummaryBlocks(summary.id)
      .then(result => {
        if (cancelled) return;
        const items = Array.isArray(result) ? result : (result?.items || []);
        setHasBlocks(items.filter((b: any) => b.is_active !== false).length > 0);
      })
      .catch(() => { if (!cancelled) setHasBlocks(false); })
      .finally(() => { if (!cancelled) setBlocksLoading(false); });
    return () => { cancelled = true; };
  }, [fetchChunks, fetchKeywords, fetchAnnotations, summary.id]);

  // ── Track reading time on unmount ───────────────────────
  const readingStateRef = useRef(currentReadingState);
  readingStateRef.current = currentReadingState;

  useEffect(() => {
    return () => {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (elapsed > 5) {
        supabase.auth.getSession().then(({ data }) => {
          if (data?.session) {
            studentApi.upsertReadingState({
              summary_id: summary.id,
              time_spent_seconds: (readingStateRef.current?.time_spent_seconds || 0) + elapsed,
              last_read_at: new Date().toISOString(),
            }).catch(() => {});
          }
        }).catch(() => {});
      }
    };
  }, []);

  // ── Mark as completed ─────────────────────────────────
  const handleMarkCompleted = async () => {
    setMarkingRead(true);
    try {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      const rs = await studentApi.upsertReadingState({
        summary_id: summary.id,
        completed: true,
        time_spent_seconds: (currentReadingState?.time_spent_seconds || 0) + elapsed,
        last_read_at: new Date().toISOString(),
      });
      setCurrentReadingState(rs);
      onReadingStateChanged(rs);
      startTimeRef.current = Date.now();
      setShowXpToast(true);
      setTimeout(() => setShowXpToast(false), 3000);
      toast.success('Resumen marcado como leido');
    } catch (err: any) {
      toast.error(err.message || 'Error al marcar como leido');
    } finally {
      setMarkingRead(false);
    }
  };

  const handleUnmarkCompleted = async () => {
    setMarkingRead(true);
    try {
      const rs = await studentApi.upsertReadingState({ summary_id: summary.id, completed: false });
      setCurrentReadingState(rs);
      onReadingStateChanged(rs);
      toast.success('Marcado como no leido');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar');
    } finally {
      setMarkingRead(false);
    }
  };

  // ── Annotations CRUD ─────────────────────────────────
  const handleCreateAnnotation = async () => {
    if (!newAnnotationNote.trim()) return;
    setSavingAnnotation(true);
    try {
      await studentApi.createTextAnnotation({
        summary_id: summary.id,
        start_offset: 0, end_offset: 0,
        color: newAnnotationColor,
        note: newAnnotationNote.trim(),
      });
      toast.success('Anotacion creada');
      setNewAnnotationNote('');
      setShowAnnotationForm(false);
      await fetchAnnotations();
    } catch (err: any) { toast.error(err.message || 'Error al crear anotacion'); }
    finally { setSavingAnnotation(false); }
  };

  const handleDeleteAnnotation = async (id: string) => {
    try { await studentApi.deleteTextAnnotation(id); toast.success('Anotacion eliminada'); await fetchAnnotations(); }
    catch (err: any) { toast.error(err.message || 'Error al eliminar'); }
  };

  // ── Keyword Note CRUD ────────────────────────────────
  const handleCreateKwNote = async (keywordId: string) => {
    if (!newKwNote.trim()) return;
    setSavingKwNote(true);
    try {
      await studentApi.createKwStudentNote({ keyword_id: keywordId, note: newKwNote.trim() });
      toast.success('Nota agregada');
      setNewKwNote('');
      await fetchKwNotes(keywordId);
    } catch (err: any) { toast.error(err.message || 'Error al crear nota'); }
    finally { setSavingKwNote(false); }
  };

  const handleUpdateKwNote = async (noteId: string, keywordId: string) => {
    if (!editKwNoteText.trim()) return;
    setSavingKwNote(true);
    try {
      await studentApi.updateKwStudentNote(noteId, { note: editKwNoteText.trim() });
      toast.success('Nota actualizada');
      setEditingKwNoteId(null);
      await fetchKwNotes(keywordId);
    } catch (err: any) { toast.error(err.message || 'Error al actualizar'); }
    finally { setSavingKwNote(false); }
  };

  const handleDeleteKwNote = async (noteId: string, keywordId: string) => {
    try { await studentApi.deleteKwStudentNote(noteId); toast.success('Nota eliminada'); await fetchKwNotes(keywordId); }
    catch (err: any) { toast.error(err.message || 'Error al eliminar'); }
  };

  const toggleKeywordExpand = (keywordId: string) => {
    if (expandedKeyword === keywordId) { setExpandedKeyword(null); } else {
      setExpandedKeyword(keywordId);
      if (!subtopicsMap[keywordId]) fetchSubtopics(keywordId);
      if (!kwNotesMap[keywordId]) fetchKwNotes(keywordId);
    }
  };

  const annotationColorMap: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    yellow: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-400' },
    green: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400' },
    pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', dot: 'bg-pink-400' },
  };

  const isCompleted = currentReadingState?.completed === true;

  // ── Loading skeleton ──────────────────────────────────
  const ListSkeleton = () => (
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

  // ── Tab badge ─────────────────────────────────────────
  const TabBadge = ({ count, active }: { count: number; active?: boolean }) => (
    <span className={`ml-1 text-[10px] rounded-full px-1.5 py-0.5 ${active ? 'bg-teal-100 text-teal-700' : 'bg-zinc-200 text-zinc-600'}`}>
      {count}
    </span>
  );

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
                    {currentReadingState?.time_spent_seconds != null && currentReadingState.time_spent_seconds > 0 && (
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.round(currentReadingState.time_spent_seconds / 60)} min de lectura
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
          {summary.content_markdown && (() => {
            const isHtmlContent = /<[a-z][\s\S]*>/i.test(summary.content_markdown);
            const enriched = isHtmlContent ? enrichHtmlWithImages(summary.content_markdown) : '';
            const htmlPages = isHtmlContent ? paginateHtml(enriched, CONTENT_PAGE_SIZE) : [];
            const textPages = !isHtmlContent ? paginateLines(summary.content_markdown, 45) : [];
            const totalPages = isHtmlContent ? htmlPages.length : textPages.length;
            const safePage = Math.min(contentPage, totalPages - 1);

            return (
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
                        <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={onNavigateKeyword}>
                          <div className={proseClasses} dangerouslySetInnerHTML={{ __html: htmlPages[safePage] || '' }} />
                        </KeywordHighlighterInline>
                      ) : (
                        <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={onNavigateKeyword}>
                          <div className="whitespace-pre-wrap text-zinc-600">
                            {(textPages[safePage] || []).map((line, i) => {
                              const trimmed = line.trim();
                              const mdMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
                              if (mdMatch) return (
                                <figure key={i} className="my-3">
                                  <img src={mdMatch[2]} alt={mdMatch[1] || ''} loading="lazy" className="rounded-xl border border-zinc-200 shadow-sm max-w-full h-auto mx-auto block" />
                                  {mdMatch[1] && <figcaption className="mt-1.5 text-center text-[10px] text-zinc-400 italic">{mdMatch[1]}</figcaption>}
                                </figure>
                              );
                              if (/^https?:\/\/\S+\.(jpe?g|png|gif|webp|svg|avif|bmp)(\?\S*)?$/i.test(trimmed)) return (
                                <figure key={i} className="my-3"><img src={trimmed} alt="" loading="lazy" className="rounded-xl border border-zinc-200 shadow-sm max-w-full h-auto mx-auto block" /></figure>
                              );
                              return <React.Fragment key={i}>{line}{'\n'}</React.Fragment>;
                            })}
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
            );
          })()}

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
                          <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={onNavigateKeyword}>
                            <div className={proseClasses} dangerouslySetInnerHTML={{ __html: enrichHtmlWithImages(chunk.content) }} />
                          </KeywordHighlighterInline>
                        ) : (
                          <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={onNavigateKeyword}>
                            <div className="prose prose-sm max-w-none text-zinc-600 leading-relaxed">
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
                      const subtopics = subtopicsMap[kw.id] || [];
                      const kwNotes = kwNotesMap[kw.id] || [];
                      const isLoadingSubs = subtopicsLoading === kw.id;
                      const isLoadingNotes = kwNotesLoading === kw.id;

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
                                    {isLoadingSubs ? (
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
                                    {isLoadingNotes ? (
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
              <VideoPlayer summaryId={summary.id} onVideosLoaded={handleVideosLoaded} />
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
                            {Object.entries(annotationColorMap).map(([color, styles]) => (
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
                            const colorStyles = annotationColorMap[ann.color || 'yellow'] || annotationColorMap.yellow;
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