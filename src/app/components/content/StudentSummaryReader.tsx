// ============================================================
// Axon — StudentSummaryReader (read-only summary with student features)
//
// Tabs: Contenido (chunks) | Keywords (+ student notes) | Videos (+ timestamp notes)
// Features: reading state tracking, text annotations, mark as completed
// All data from real backend via summariesApi + studentSummariesApi.
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowLeft, ChevronRight, FileText, Layers, Tag, Video as VideoIcon,
  CheckCircle2, Clock, Loader2, ChevronDown, ChevronUp,
  ExternalLink, Plus, Trash2, Save, X, Edit3,
  StickyNote, BookOpen, Send,
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Skeleton } from '@/app/components/ui/skeleton';
import * as summariesApi from '@/app/services/summariesApi';
import * as studentApi from '@/app/services/studentSummariesApi';
import type { Summary, Chunk, SummaryKeyword, Subtopic, Video } from '@/app/services/summariesApi';
import type { ReadingState, TextAnnotation, KwStudentNote, VideoNote } from '@/app/services/studentSummariesApi';

// ── Helper: extract items from CRUD factory response ──────
function extractItems<T>(result: any): T[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

// ── Format seconds as mm:ss ───────────────────────────────
function formatTimestamp(seconds: number | null): string {
  if (seconds == null || seconds < 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ── Props ─────────────────────────────────────────────────

interface StudentSummaryReaderProps {
  summary: Summary;
  topicName: string;
  readingState: ReadingState | null;
  onBack: () => void;
  onReadingStateChanged: (rs: ReadingState) => void;
}

export function StudentSummaryReader({
  summary,
  topicName,
  readingState,
  onBack,
  onReadingStateChanged,
}: StudentSummaryReaderProps) {
  const [activeTab, setActiveTab] = useState('chunks');
  const startTimeRef = useRef(Date.now());

  // ── Chunks state ────────────────────────────────────────
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [chunksLoading, setChunksLoading] = useState(true);

  // ── Keywords state ──────────────────────────────────────
  const [keywords, setKeywords] = useState<SummaryKeyword[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(true);
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const [subtopicsMap, setSubtopicsMap] = useState<Record<string, Subtopic[]>>({});
  const [subtopicsLoading, setSubtopicsLoading] = useState<string | null>(null);

  // Keyword student notes
  const [kwNotesMap, setKwNotesMap] = useState<Record<string, KwStudentNote[]>>({});
  const [kwNotesLoading, setKwNotesLoading] = useState<string | null>(null);
  const [newKwNote, setNewKwNote] = useState('');
  const [savingKwNote, setSavingKwNote] = useState(false);
  const [editingKwNoteId, setEditingKwNoteId] = useState<string | null>(null);
  const [editKwNoteText, setEditKwNoteText] = useState('');

  // ── Videos state ────────────────────────────────────────
  const [videos, setVideos] = useState<Video[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);

  // Video notes
  const [videoNotesMap, setVideoNotesMap] = useState<Record<string, VideoNote[]>>({});
  const [videoNotesLoading, setVideoNotesLoading] = useState<string | null>(null);
  const [activeVideoNotes, setActiveVideoNotes] = useState<string | null>(null);
  const [newVideoNote, setNewVideoNote] = useState('');
  const [newVideoTimestamp, setNewVideoTimestamp] = useState('');
  const [savingVideoNote, setSavingVideoNote] = useState(false);
  const [editingVideoNoteId, setEditingVideoNoteId] = useState<string | null>(null);
  const [editVideoNoteText, setEditVideoNoteText] = useState('');

  // ── Text Annotations state ──────────────────────────────
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [annotationsLoading, setAnnotationsLoading] = useState(true);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [newAnnotationNote, setNewAnnotationNote] = useState('');
  const [newAnnotationColor, setNewAnnotationColor] = useState('yellow');
  const [savingAnnotation, setSavingAnnotation] = useState(false);

  // ── Reading state ───────────────────────────────────────
  const [currentReadingState, setCurrentReadingState] = useState<ReadingState | null>(readingState);
  const [markingRead, setMarkingRead] = useState(false);

  // ── Fetch chunks ────────────────────────────────────────
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

  // ── Fetch keywords ──────────────────────────────────────
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

  // ── Fetch videos ────────────────────────────────────────
  const fetchVideos = useCallback(async () => {
    setVideosLoading(true);
    try {
      const result = await summariesApi.getVideos(summary.id);
      setVideos(extractItems<Video>(result).filter(v => v.is_active).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));
    } catch (err: any) {
      console.error('[StudentReader] Videos load error:', err);
      setVideos([]);
    } finally {
      setVideosLoading(false);
    }
  }, [summary.id]);

  // ── Fetch text annotations ──────────────────────────────
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

  // ── Fetch subtopics ─────────────────────────────────────
  const fetchSubtopics = useCallback(async (keywordId: string) => {
    setSubtopicsLoading(keywordId);
    try {
      const result = await summariesApi.getSubtopics(keywordId);
      setSubtopicsMap(prev => ({
        ...prev,
        [keywordId]: extractItems<Subtopic>(result).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
      }));
    } catch (err: any) {
      console.error('[StudentReader] Subtopics load error:', err);
      setSubtopicsMap(prev => ({ ...prev, [keywordId]: [] }));
    } finally {
      setSubtopicsLoading(null);
    }
  }, []);

  // ── Fetch keyword student notes ─────────────────────────
  const fetchKwNotes = useCallback(async (keywordId: string) => {
    setKwNotesLoading(keywordId);
    try {
      const result = await studentApi.getKwStudentNotes(keywordId);
      setKwNotesMap(prev => ({
        ...prev,
        [keywordId]: extractItems<KwStudentNote>(result),
      }));
    } catch (err: any) {
      console.error('[StudentReader] KwNotes load error:', err);
      setKwNotesMap(prev => ({ ...prev, [keywordId]: [] }));
    } finally {
      setKwNotesLoading(null);
    }
  }, []);

  // ── Fetch video notes ───────────────────────────────────
  const fetchVideoNotes = useCallback(async (videoId: string) => {
    setVideoNotesLoading(videoId);
    try {
      const result = await studentApi.getVideoNotes(videoId);
      setVideoNotesMap(prev => ({
        ...prev,
        [videoId]: extractItems<VideoNote>(result).sort(
          (a, b) => (a.timestamp_seconds ?? 0) - (b.timestamp_seconds ?? 0)
        ),
      }));
    } catch (err: any) {
      console.error('[StudentReader] VideoNotes load error:', err);
      setVideoNotesMap(prev => ({ ...prev, [videoId]: [] }));
    } finally {
      setVideoNotesLoading(null);
    }
  }, []);

  // ── Initial load ────────────────────────────────────────
  useEffect(() => {
    fetchChunks();
    fetchKeywords();
    fetchVideos();
    fetchAnnotations();
  }, [fetchChunks, fetchKeywords, fetchVideos, fetchAnnotations]);

  // ── Track reading time on unmount ───────────────────────
  useEffect(() => {
    return () => {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (elapsed > 5) {
        // Fire and forget — save reading time
        studentApi.upsertReadingState({
          summary_id: summary.id,
          time_spent_seconds: (currentReadingState?.time_spent_seconds || 0) + elapsed,
          last_read_at: new Date().toISOString(),
        }).catch(() => { /* silent */ });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mark as completed ───────────────────────────────────
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
      startTimeRef.current = Date.now(); // reset timer
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
      const rs = await studentApi.upsertReadingState({
        summary_id: summary.id,
        completed: false,
      });
      setCurrentReadingState(rs);
      onReadingStateChanged(rs);
      toast.success('Marcado como no leido');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar');
    } finally {
      setMarkingRead(false);
    }
  };

  // ── Text Annotation CRUD ────────────────────────────────
  const handleCreateAnnotation = async () => {
    if (!newAnnotationNote.trim()) return;
    setSavingAnnotation(true);
    try {
      await studentApi.createTextAnnotation({
        summary_id: summary.id,
        start_offset: 0, // simplified — we use note-based annotations
        end_offset: 0,
        color: newAnnotationColor,
        note: newAnnotationNote.trim(),
      });
      toast.success('Anotacion creada');
      setNewAnnotationNote('');
      setShowAnnotationForm(false);
      await fetchAnnotations();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear anotacion');
    } finally {
      setSavingAnnotation(false);
    }
  };

  const handleDeleteAnnotation = async (id: string) => {
    try {
      await studentApi.deleteTextAnnotation(id);
      toast.success('Anotacion eliminada');
      await fetchAnnotations();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  // ── Keyword Note CRUD ───────────────────────────────────
  const handleCreateKwNote = async (keywordId: string) => {
    if (!newKwNote.trim()) return;
    setSavingKwNote(true);
    try {
      await studentApi.createKwStudentNote({
        keyword_id: keywordId,
        note: newKwNote.trim(),
      });
      toast.success('Nota agregada');
      setNewKwNote('');
      await fetchKwNotes(keywordId);
    } catch (err: any) {
      toast.error(err.message || 'Error al crear nota');
    } finally {
      setSavingKwNote(false);
    }
  };

  const handleUpdateKwNote = async (noteId: string, keywordId: string) => {
    if (!editKwNoteText.trim()) return;
    setSavingKwNote(true);
    try {
      await studentApi.updateKwStudentNote(noteId, { note: editKwNoteText.trim() });
      toast.success('Nota actualizada');
      setEditingKwNoteId(null);
      await fetchKwNotes(keywordId);
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar');
    } finally {
      setSavingKwNote(false);
    }
  };

  const handleDeleteKwNote = async (noteId: string, keywordId: string) => {
    try {
      await studentApi.deleteKwStudentNote(noteId);
      toast.success('Nota eliminada');
      await fetchKwNotes(keywordId);
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  // ── Video Note CRUD ─────────────────────────────────────
  const parseTimestamp = (input: string): number | undefined => {
    if (!input.trim()) return undefined;
    const parts = input.split(':').map(Number);
    if (parts.length === 2 && parts.every(n => !isNaN(n))) {
      return parts[0] * 60 + parts[1];
    }
    const num = parseInt(input, 10);
    return isNaN(num) ? undefined : num;
  };

  const handleCreateVideoNote = async (videoId: string) => {
    if (!newVideoNote.trim()) return;
    setSavingVideoNote(true);
    try {
      await studentApi.createVideoNote({
        video_id: videoId,
        timestamp_seconds: parseTimestamp(newVideoTimestamp),
        note: newVideoNote.trim(),
      });
      toast.success('Nota de video agregada');
      setNewVideoNote('');
      setNewVideoTimestamp('');
      await fetchVideoNotes(videoId);
    } catch (err: any) {
      toast.error(err.message || 'Error al crear nota');
    } finally {
      setSavingVideoNote(false);
    }
  };

  const handleUpdateVideoNote = async (noteId: string, videoId: string) => {
    if (!editVideoNoteText.trim()) return;
    setSavingVideoNote(true);
    try {
      await studentApi.updateVideoNote(noteId, { note: editVideoNoteText.trim() });
      toast.success('Nota actualizada');
      setEditingVideoNoteId(null);
      await fetchVideoNotes(videoId);
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar');
    } finally {
      setSavingVideoNote(false);
    }
  };

  const handleDeleteVideoNote = async (noteId: string, videoId: string) => {
    try {
      await studentApi.deleteVideoNote(noteId);
      toast.success('Nota eliminada');
      await fetchVideoNotes(videoId);
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  // ── Expand keyword to show subtopics + notes ────────────
  const toggleKeywordExpand = (keywordId: string) => {
    if (expandedKeyword === keywordId) {
      setExpandedKeyword(null);
    } else {
      setExpandedKeyword(keywordId);
      if (!subtopicsMap[keywordId]) fetchSubtopics(keywordId);
      if (!kwNotesMap[keywordId]) fetchKwNotes(keywordId);
    }
  };

  // ── Toggle video notes ──────────────────────────────────
  const toggleVideoNotes = (videoId: string) => {
    if (activeVideoNotes === videoId) {
      setActiveVideoNotes(null);
    } else {
      setActiveVideoNotes(videoId);
      if (!videoNotesMap[videoId]) fetchVideoNotes(videoId);
    }
  };

  // ── Annotation colors ──────────────────────────────────
  const annotationColorMap: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    yellow: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400' },
    blue:   { bg: 'bg-blue-50',  border: 'border-blue-200',  text: 'text-blue-700',  dot: 'bg-blue-400' },
    green:  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400' },
    pink:   { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', dot: 'bg-pink-400' },
  };

  // ── Detect platform from URL ────────────────────────────
  const detectPlatform = (url: string): string => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
    if (url.includes('vimeo.com')) return 'Vimeo';
    if (url.includes('loom.com')) return 'Loom';
    return 'Video';
  };

  // ── Loading skeleton ────────────────────────────────────
  const ListSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="w-6 h-6 rounded" />
          <div className="flex-1">
            <Skeleton className="h-3 w-48 mb-2" />
            <Skeleton className="h-2.5 w-32" />
          </div>
        </div>
      ))}
    </div>
  );

  const isCompleted = currentReadingState?.completed === true;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full overflow-y-auto bg-gray-50/50"
    >
      <div className="max-w-4xl mx-auto p-8">
        {/* Breadcrumb + back */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Resumenes</span>
          </button>
          <ChevronRight size={14} />
          <span className="text-gray-400">{topicName}</span>
          <ChevronRight size={14} />
          <span className="text-gray-600 truncate max-w-[200px]">{summary.title || 'Sin titulo'}</span>
        </div>

        {/* Summary header card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={clsx(
                "w-10 h-10 rounded-xl border flex items-center justify-center",
                isCompleted
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-teal-50 border-teal-100"
              )}>
                {isCompleted ? (
                  <CheckCircle2 size={20} className="text-emerald-500" />
                ) : (
                  <BookOpen size={20} className="text-teal-600" />
                )}
              </div>
              <div>
                <h2 className="text-gray-900">{summary.title || 'Sin titulo'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 size={10} /> Leido
                    </span>
                  )}
                  <span className="text-[10px] text-gray-300">
                    {new Date(summary.created_at).toLocaleDateString('es-MX', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                  {currentReadingState?.time_spent_seconds != null && currentReadingState.time_spent_seconds > 0 && (
                    <span className="text-[10px] text-gray-300 flex items-center gap-1">
                      <Clock size={9} />
                      {Math.round(currentReadingState.time_spent_seconds / 60)} min de lectura
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Mark as read / unread */}
            <Button
              size="sm"
              variant={isCompleted ? 'outline' : 'default'}
              onClick={isCompleted ? handleUnmarkCompleted : handleMarkCompleted}
              disabled={markingRead}
              className={clsx(
                !isCompleted && "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
            >
              {markingRead ? (
                <Loader2 size={13} className="animate-spin" />
              ) : isCompleted ? (
                <><CheckCircle2 size={13} /> Marcar no leido</>
              ) : (
                <><CheckCircle2 size={13} /> Marcar como leido</>
              )}
            </Button>
          </div>

          {/* Markdown preview */}
          {summary.content_markdown && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 whitespace-pre-wrap">
                {summary.content_markdown}
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="chunks" className="gap-1.5">
              <Layers size={13} />
              Contenido
              {!chunksLoading && (
                <span className="ml-1 text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
                  {chunks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="keywords" className="gap-1.5">
              <Tag size={13} />
              Keywords
              {!keywordsLoading && (
                <span className="ml-1 text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
                  {keywords.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-1.5">
              <VideoIcon size={13} />
              Videos
              {!videosLoading && (
                <span className="ml-1 text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
                  {videos.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="annotations" className="gap-1.5">
              <StickyNote size={13} />
              Mis Notas
              {!annotationsLoading && textAnnotations.length > 0 && (
                <span className="ml-1 text-[10px] bg-teal-100 text-teal-700 rounded-full px-1.5 py-0.5">
                  {textAnnotations.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════ */}
          {/* CHUNKS / CONTENT TAB                           */}
          {/* ═══════════════════════════════════════════════ */}
          <TabsContent value="chunks">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm text-gray-700">Contenido del resumen</h3>
              </div>

              <div className="p-6">
                {chunksLoading ? (
                  <ListSkeleton />
                ) : chunks.length === 0 ? (
                  <div className="text-center py-8">
                    <Layers size={24} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Este resumen aun no tiene contenido</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chunks.map((chunk, idx) => (
                      <motion.div
                        key={chunk.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="group"
                      >
                        <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
                          {chunk.content.split('\n').map((line, lineIdx) => {
                            if (!line.trim()) return <br key={lineIdx} />;

                            // Simple markdown-like parsing
                            if (line.startsWith('## ')) {
                              return (
                                <h3 key={lineIdx} className="text-gray-800 mt-6 mb-2">
                                  {line.replace('## ', '')}
                                </h3>
                              );
                            }
                            if (line.startsWith('### ')) {
                              return (
                                <h4 key={lineIdx} className="text-gray-800 mt-4 mb-1.5">
                                  {line.replace('### ', '')}
                                </h4>
                              );
                            }
                            if (line.startsWith('- ') || line.startsWith('* ')) {
                              return (
                                <li key={lineIdx} className="ml-4 text-gray-600">
                                  {line.replace(/^[-*]\s/, '')}
                                </li>
                              );
                            }

                            return (
                              <p key={lineIdx} className="mb-2 text-gray-600 text-justify">
                                {line}
                              </p>
                            );
                          })}
                        </div>
                        {idx < chunks.length - 1 && (
                          <div className="border-b border-gray-50 mt-4" />
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════ */}
          {/* KEYWORDS TAB                                   */}
          {/* ═══════════════════════════════════════════════ */}
          <TabsContent value="keywords">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm text-gray-700">Palabras clave</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Expande cada keyword para ver subtemas y agregar notas personales</p>
              </div>

              <div className="p-4">
                {keywordsLoading ? (
                  <ListSkeleton />
                ) : keywords.length === 0 ? (
                  <div className="text-center py-8">
                    <Tag size={24} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No hay keywords en este resumen</p>
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
                        <div key={kw.id} className="border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                          {/* Keyword header */}
                          <button
                            onClick={() => toggleKeywordExpand(kw.id)}
                            className="w-full flex items-center justify-between p-3 text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Tag size={12} className="text-teal-500 shrink-0" />
                              <span className="text-sm text-gray-900 truncate">{kw.name}</span>
                              {kw.priority > 0 && (
                                <span className="text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full shrink-0">
                                  P{kw.priority}
                                </span>
                              )}
                            </div>
                            {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                          </button>

                          {/* Expanded content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-3 border-t border-gray-50">
                                  {/* Definition */}
                                  {kw.definition && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                      <p className="text-xs text-gray-500 leading-relaxed">{kw.definition}</p>
                                    </div>
                                  )}

                                  {/* Subtopics */}
                                  <div className="mt-3">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">Subtemas</span>
                                    {isLoadingSubs ? (
                                      <div className="flex items-center gap-2 mt-1">
                                        <Loader2 size={12} className="animate-spin text-gray-300" />
                                        <span className="text-[10px] text-gray-400">Cargando...</span>
                                      </div>
                                    ) : subtopics.length === 0 ? (
                                      <p className="text-[10px] text-gray-400 mt-1">Sin subtemas</p>
                                    ) : (
                                      <div className="mt-1 space-y-1">
                                        {subtopics.map(sub => (
                                          <div key={sub.id} className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded text-xs text-gray-600">
                                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                                            {sub.name}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Student personal notes */}
                                  <div className="mt-4">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">Mis notas personales</span>
                                    {isLoadingNotes ? (
                                      <div className="flex items-center gap-2 mt-1">
                                        <Loader2 size={12} className="animate-spin text-gray-300" />
                                        <span className="text-[10px] text-gray-400">Cargando...</span>
                                      </div>
                                    ) : (
                                      <>
                                        {kwNotes.length > 0 && (
                                          <div className="mt-1 space-y-1.5">
                                            {kwNotes.map(note => (
                                              <div key={note.id} className="group/note flex items-start gap-2 p-2 bg-teal-50/50 rounded-lg border border-teal-100">
                                                {editingKwNoteId === note.id ? (
                                                  <div className="flex-1 space-y-1.5">
                                                    <Textarea
                                                      value={editKwNoteText}
                                                      onChange={(e) => setEditKwNoteText(e.target.value)}
                                                      className="min-h-[50px] text-xs"
                                                      autoFocus
                                                    />
                                                    <div className="flex justify-end gap-1">
                                                      <Button size="sm" variant="ghost" onClick={() => setEditingKwNoteId(null)} className="h-6 text-[10px] px-2">
                                                        <X size={10} /> Cancelar
                                                      </Button>
                                                      <Button
                                                        size="sm"
                                                        onClick={() => handleUpdateKwNote(note.id, kw.id)}
                                                        disabled={savingKwNote}
                                                        className="h-6 text-[10px] px-2 bg-teal-600 hover:bg-teal-700 text-white"
                                                      >
                                                        {savingKwNote ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                                                        Guardar
                                                      </Button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <>
                                                    <StickyNote size={11} className="text-teal-400 shrink-0 mt-0.5" />
                                                    <p className="text-xs text-gray-600 flex-1">{note.note}</p>
                                                    <div className="flex items-center gap-0.5 opacity-0 group-hover/note:opacity-100 transition-opacity shrink-0">
                                                      <button
                                                        onClick={() => { setEditingKwNoteId(note.id); setEditKwNoteText(note.note); }}
                                                        className="p-1 rounded hover:bg-teal-100 text-gray-400 hover:text-teal-600"
                                                      >
                                                        <Edit3 size={10} />
                                                      </button>
                                                      <button
                                                        onClick={() => handleDeleteKwNote(note.id, kw.id)}
                                                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                                                      >
                                                        <Trash2 size={10} />
                                                      </button>
                                                    </div>
                                                  </>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Add note form */}
                                        <div className="mt-2 flex items-start gap-2">
                                          <Input
                                            value={newKwNote}
                                            onChange={(e) => setNewKwNote(e.target.value)}
                                            placeholder="Agregar nota personal..."
                                            className="text-xs h-8 flex-1"
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleCreateKwNote(kw.id);
                                              }
                                            }}
                                          />
                                          <Button
                                            size="sm"
                                            onClick={() => handleCreateKwNote(kw.id)}
                                            disabled={savingKwNote || !newKwNote.trim()}
                                            className="h-8 px-2 bg-teal-600 hover:bg-teal-700 text-white"
                                          >
                                            {savingKwNote ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
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

          {/* ═══════════════════════════════════════════════ */}
          {/* VIDEOS TAB                                     */}
          {/* ═══════════════════════════════════════════════ */}
          <TabsContent value="videos">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm text-gray-700">Videos del resumen</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Agrega notas con timestamp para cada video</p>
              </div>

              <div className="p-4">
                {videosLoading ? (
                  <ListSkeleton />
                ) : videos.length === 0 ? (
                  <div className="text-center py-8">
                    <VideoIcon size={24} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No hay videos en este resumen</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {videos.map(video => {
                      const platform = video.platform || detectPlatform(video.url);
                      const isShowingNotes = activeVideoNotes === video.id;
                      const vNotes = videoNotesMap[video.id] || [];
                      const isLoadingVNotes = videoNotesLoading === video.id;

                      return (
                        <div key={video.id} className="border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                          {/* Video info */}
                          <div className="p-3 flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                              <VideoIcon size={16} className="text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm text-gray-900 truncate">{video.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                {platform && (
                                  <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                                    {platform}
                                  </span>
                                )}
                                {video.duration_seconds != null && (
                                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                    <Clock size={9} />
                                    {formatTimestamp(video.duration_seconds)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink size={13} />
                              </a>
                              <button
                                onClick={() => toggleVideoNotes(video.id)}
                                className={clsx(
                                  "p-1.5 rounded transition-colors",
                                  isShowingNotes
                                    ? "bg-teal-50 text-teal-600"
                                    : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                )}
                                title="Notas del video"
                              >
                                <StickyNote size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Video notes section */}
                          <AnimatePresence>
                            {isShowingNotes && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-3 border-t border-gray-50">
                                  <div className="mt-3">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">Mis notas</span>

                                    {isLoadingVNotes ? (
                                      <div className="flex items-center gap-2 mt-1">
                                        <Loader2 size={12} className="animate-spin text-gray-300" />
                                        <span className="text-[10px] text-gray-400">Cargando...</span>
                                      </div>
                                    ) : (
                                      <>
                                        {vNotes.length > 0 && (
                                          <div className="mt-1.5 space-y-1.5">
                                            {vNotes.map(note => (
                                              <div key={note.id} className="group/vnote flex items-start gap-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                                                {editingVideoNoteId === note.id ? (
                                                  <div className="flex-1 space-y-1.5">
                                                    <Textarea
                                                      value={editVideoNoteText}
                                                      onChange={(e) => setEditVideoNoteText(e.target.value)}
                                                      className="min-h-[50px] text-xs"
                                                      autoFocus
                                                    />
                                                    <div className="flex justify-end gap-1">
                                                      <Button size="sm" variant="ghost" onClick={() => setEditingVideoNoteId(null)} className="h-6 text-[10px] px-2">
                                                        <X size={10} /> Cancelar
                                                      </Button>
                                                      <Button
                                                        size="sm"
                                                        onClick={() => handleUpdateVideoNote(note.id, video.id)}
                                                        disabled={savingVideoNote}
                                                        className="h-6 text-[10px] px-2 bg-teal-600 hover:bg-teal-700 text-white"
                                                      >
                                                        {savingVideoNote ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                                                        Guardar
                                                      </Button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <>
                                                    {note.timestamp_seconds != null && (
                                                      <span className="text-[10px] text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded font-mono shrink-0 mt-0.5">
                                                        {formatTimestamp(note.timestamp_seconds)}
                                                      </span>
                                                    )}
                                                    <p className="text-xs text-gray-600 flex-1">{note.note}</p>
                                                    <div className="flex items-center gap-0.5 opacity-0 group-hover/vnote:opacity-100 transition-opacity shrink-0">
                                                      <button
                                                        onClick={() => { setEditingVideoNoteId(note.id); setEditVideoNoteText(note.note); }}
                                                        className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600"
                                                      >
                                                        <Edit3 size={10} />
                                                      </button>
                                                      <button
                                                        onClick={() => handleDeleteVideoNote(note.id, video.id)}
                                                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                                                      >
                                                        <Trash2 size={10} />
                                                      </button>
                                                    </div>
                                                  </>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Add video note form */}
                                        <div className="mt-2 flex items-start gap-2">
                                          <Input
                                            value={newVideoTimestamp}
                                            onChange={(e) => setNewVideoTimestamp(e.target.value)}
                                            placeholder="mm:ss"
                                            className="text-xs h-8 w-16 text-center font-mono shrink-0"
                                          />
                                          <Input
                                            value={newVideoNote}
                                            onChange={(e) => setNewVideoNote(e.target.value)}
                                            placeholder="Agregar nota..."
                                            className="text-xs h-8 flex-1"
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleCreateVideoNote(video.id);
                                              }
                                            }}
                                          />
                                          <Button
                                            size="sm"
                                            onClick={() => handleCreateVideoNote(video.id)}
                                            disabled={savingVideoNote || !newVideoNote.trim()}
                                            className="h-8 px-2 bg-teal-600 hover:bg-teal-700 text-white"
                                          >
                                            {savingVideoNote ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
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

          {/* ═══════════════════════════════════════════════ */}
          {/* TEXT ANNOTATIONS TAB                            */}
          {/* ═══════════════════════════════════════════════ */}
          <TabsContent value="annotations">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm text-gray-700">Mis anotaciones</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Tus notas y subrayados privados sobre este resumen</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowAnnotationForm(true)}>
                  <Plus size={12} /> Agregar nota
                </Button>
              </div>

              <div className="p-4">
                {annotationsLoading ? (
                  <ListSkeleton />
                ) : (
                  <>
                    {/* New annotation form */}
                    <AnimatePresence>
                      {showAnnotationForm && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="mb-4 border border-teal-200 rounded-lg p-3 bg-teal-50/30"
                        >
                          <Textarea
                            value={newAnnotationNote}
                            onChange={(e) => setNewAnnotationNote(e.target.value)}
                            placeholder="Escribe tu nota o anotacion..."
                            className="min-h-[60px] mb-2 text-xs"
                            autoFocus
                          />

                          {/* Color picker */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] text-gray-400">Color:</span>
                            {Object.entries(annotationColorMap).map(([color, styles]) => (
                              <button
                                key={color}
                                onClick={() => setNewAnnotationColor(color)}
                                className={clsx(
                                  "w-5 h-5 rounded-full border-2 transition-all",
                                  styles.dot,
                                  newAnnotationColor === color
                                    ? "border-gray-800 scale-110"
                                    : "border-transparent hover:border-gray-300"
                                )}
                              />
                            ))}
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setShowAnnotationForm(false); setNewAnnotationNote(''); }}
                              disabled={savingAnnotation}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleCreateAnnotation}
                              disabled={savingAnnotation || !newAnnotationNote.trim()}
                              className="bg-teal-600 hover:bg-teal-700 text-white"
                            >
                              {savingAnnotation ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                              Crear
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Annotations list */}
                    {textAnnotations.length === 0 && !showAnnotationForm ? (
                      <div className="text-center py-8">
                        <StickyNote size={24} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400 mb-1">No tienes anotaciones en este resumen</p>
                        <p className="text-[10px] text-gray-400 mb-3">Agrega notas personales para recordar puntos importantes</p>
                        <Button size="sm" variant="outline" onClick={() => setShowAnnotationForm(true)}>
                          <Plus size={12} /> Crear primera nota
                        </Button>
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
                                className={clsx(
                                  "group rounded-lg border p-3 transition-shadow hover:shadow-sm",
                                  colorStyles.bg,
                                  colorStyles.border
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <div className={clsx("w-2 h-2 rounded-full mt-1.5 shrink-0", colorStyles.dot)} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-600">{ann.note || '(sin nota)'}</p>
                                    <span className="text-[10px] text-gray-400 mt-1 inline-block">
                                      {new Date(ann.created_at).toLocaleDateString('es-MX', {
                                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteAnnotation(ann.id)}
                                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                  >
                                    <Trash2 size={11} />
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
