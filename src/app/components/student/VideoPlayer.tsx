// ============================================================
// Axon — VideoPlayer (Student: video list + embed player + annotations)
//
// Shows active videos for a summary with YouTube/Vimeo embed.
// Route (FLAT): GET /videos?summary_id=xxx
// Filters: is_active === true AND deleted_at IS NULL
//
// Annotations:
//   GET  /video-notes?video_id=xxx  (filtered client-side by student)
//   POST /video-notes { video_id, student_id, note, timestamp_seconds }
//   PUT  /video-notes/:id { note, timestamp_seconds }
//   DELETE /video-notes/:id  (soft delete)
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video, Play, Clock, Loader2, ChevronDown, ChevronUp,
  ExternalLink, X, PenLine, Trash2, Edit3, MessageSquare,
} from 'lucide-react';
import clsx from 'clsx';
import * as api from '@/app/services/summariesApi';
import * as studentApi from '@/app/services/studentSummariesApi';
import type { Video as VideoType } from '@/app/services/summariesApi';
import type { VideoNote } from '@/app/services/studentSummariesApi';
import { useAuth } from '@/app/contexts/AuthContext';
import { VideoNoteForm } from './VideoNoteForm';
import { AnnotationTimeline } from './AnnotationTimeline';

// ── Helper ────────────────────────────────────────────────
function extractItems<T>(result: any): T[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

// ── YouTube ID extractor ──────────────────────────────────
function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

// ── Vimeo ID extractor ────────────────────────────────────
function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

// ── Duration formatter ────────────────────────────────────
function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Timestamp formatter ───────────────────────────────────
function formatTimestamp(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Props ─────────────────────────────────────────────────
interface VideoPlayerProps {
  summaryId: string;
}

export function VideoPlayer({ summaryId }: VideoPlayerProps) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  // ── Annotation state ───────────────────────────────────
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<VideoNote | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);

  // Timer to approximate playback position
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [seekToSeconds, setSeekToSeconds] = useState<number | null>(null);

  // ── Fetch videos ────────────────────────────────────────
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getVideos(summaryId);
      const items = extractItems<VideoType>(result)
        .filter(v => v.is_active && !v.deleted_at)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      setVideos(items);
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [summaryId]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  // ── Fetch annotations for active video ──────────────────
  const fetchNotes = useCallback(async (videoId: string) => {
    if (!user?.id) return;
    setNotesLoading(true);
    try {
      const result = await studentApi.getVideoNotes(videoId);
      const items = extractItems<VideoNote>(result)
        .filter(n => !n.deleted_at && n.student_id === user.id)
        .sort((a, b) => (a.timestamp_seconds ?? 0) - (b.timestamp_seconds ?? 0));
      setNotes(items);
    } catch {
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (activeVideoId) {
      fetchNotes(activeVideoId);
      setShowAnnotations(false);
      setShowForm(false);
      setEditingNote(null);
    } else {
      setNotes([]);
    }
  }, [activeVideoId, fetchNotes]);

  // ── Playback timer ──────────────────────────────────────
  useEffect(() => {
    if (activeVideoId) {
      setElapsedSeconds(seekToSeconds ?? 0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeVideoId, seekToSeconds]);

  // ── Build embed URL (with optional start time) ──────────
  const getEmbedUrl = (v: VideoType, startSeconds?: number | null): string | null => {
    const platform = (v.platform || '').toLowerCase();
    if (platform === 'youtube') {
      const ytId = extractYouTubeId(v.url);
      if (!ytId) return null;
      let url = `https://www.youtube.com/embed/${ytId}?rel=0&enablejsapi=1`;
      if (startSeconds && startSeconds > 0) url += `&start=${startSeconds}`;
      return url;
    }
    if (platform === 'vimeo') {
      const vimeoId = extractVimeoId(v.url);
      if (!vimeoId) return null;
      let url = `https://player.vimeo.com/video/${vimeoId}`;
      if (startSeconds && startSeconds > 0) url += `#t=${startSeconds}s`;
      return url;
    }
    return null;
  };

  // ── Seek handler ────────────────────────────────────────
  const handleSeek = useCallback((seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSeekToSeconds(seconds);
    setElapsedSeconds(seconds);
  }, []);

  // ── CRUD handlers ───────────────────────────────────────
  const handleCreateNote = async (data: { note: string; timestamp_seconds: number | null }) => {
    if (!activeVideoId || !user?.id) return;
    setSaving(true);
    try {
      await studentApi.createVideoNote({
        video_id: activeVideoId,
        note: data.note,
        timestamp_seconds: data.timestamp_seconds ?? undefined,
      });
      await fetchNotes(activeVideoId);
      setShowForm(false);
    } catch (err) {
      console.error('Error creating video note:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNote = async (data: { note: string; timestamp_seconds: number | null }) => {
    if (!editingNote) return;
    setSaving(true);
    try {
      await studentApi.updateVideoNote(editingNote.id, {
        note: data.note,
        timestamp_seconds: data.timestamp_seconds ?? undefined,
      });
      await fetchNotes(activeVideoId!);
      setEditingNote(null);
      setShowForm(false);
    } catch (err) {
      console.error('Error updating video note:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!activeVideoId) return;
    try {
      await studentApi.deleteVideoNote(noteId);
      await fetchNotes(activeVideoId);
    } catch (err) {
      console.error('Error deleting video note:', err);
    }
  };

  const activeVideo = videos.find(v => v.id === activeVideoId);

  // Don't render if no videos
  if (!loading && videos.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Video size={14} className="text-violet-400" />
          <span className="text-xs text-zinc-300">
            Videos
          </span>
          {!loading && (
            <span className="text-[10px] bg-zinc-800 text-zinc-500 rounded-full px-1.5 py-0.5">
              {videos.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-zinc-500" />
        ) : (
          <ChevronDown size={14} className="text-zinc-500" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {loading ? (
              <div className="px-5 pb-4 flex items-center gap-2">
                <Loader2 size={12} className="animate-spin text-zinc-600" />
                <span className="text-[10px] text-zinc-600">Cargando videos...</span>
              </div>
            ) : (
              <div className="px-5 pb-4">
                {/* Active video player */}
                {activeVideo && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-zinc-200 truncate flex-1">{activeVideo.title}</p>
                      <div className="flex items-center gap-1">
                        {/* Elapsed timer */}
                        <span className="text-[9px] text-zinc-600 tabular-nums mr-1">
                          {formatTimestamp(elapsedSeconds)}
                        </span>
                        <button
                          onClick={() => setActiveVideoId(null)}
                          className="text-zinc-500 hover:text-zinc-300 p-0.5"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Player + Timeline side by side */}
                    <div className="flex gap-2">
                      {/* Video embed */}
                      <div className="flex-1 min-w-0">
                        {getEmbedUrl(activeVideo, seekToSeconds) ? (
                          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                            <iframe
                              key={`${activeVideo.id}-${seekToSeconds}`}
                              src={getEmbedUrl(activeVideo, seekToSeconds)!}
                              title={activeVideo.title}
                              className="absolute inset-0 w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <div className="w-full aspect-video rounded-lg bg-zinc-800 flex flex-col items-center justify-center gap-2">
                            <Video size={24} className="text-zinc-600" />
                            <a
                              href={activeVideo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                            >
                              <ExternalLink size={10} />
                              Abrir en nueva pestana
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Annotation Timeline (right side) */}
                      {notes.length > 0 && (
                        <div className="w-10 shrink-0">
                          <AnnotationTimeline
                            notes={notes}
                            videoDuration={activeVideo.duration_seconds}
                            onSeek={handleSeek}
                          />
                        </div>
                      )}
                    </div>

                    {/* Action bar below player */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          setEditingNote(null);
                          setShowForm(true);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/15 text-amber-300 text-[10px] rounded-md hover:bg-amber-500/25 transition-colors"
                      >
                        <PenLine size={10} />
                        Anotar aqui
                        <span className="text-amber-500/60 text-[9px]">
                          [{formatTimestamp(elapsedSeconds)}]
                        </span>
                      </button>

                      <button
                        onClick={() => setShowAnnotations(prev => !prev)}
                        className={clsx(
                          "flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] rounded-md transition-colors",
                          showAnnotations
                            ? "bg-zinc-700 text-zinc-200"
                            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                        )}
                      >
                        <MessageSquare size={10} />
                        Anotaciones
                        {notes.length > 0 && (
                          <span className="text-[9px] bg-zinc-800 text-zinc-500 rounded-full px-1.5 py-0.5">
                            {notes.length}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Note form */}
                    <AnimatePresence>
                      {showForm && (
                        <div className="mt-2">
                          <VideoNoteForm
                            initialTimestamp={elapsedSeconds}
                            editingNote={editingNote}
                            onSubmit={editingNote ? handleUpdateNote : handleCreateNote}
                            onCancel={() => {
                              setShowForm(false);
                              setEditingNote(null);
                            }}
                            saving={saving}
                          />
                        </div>
                      )}
                    </AnimatePresence>

                    {/* Annotations list panel */}
                    <AnimatePresence>
                      {showAnnotations && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 bg-zinc-800/40 border border-zinc-700/40 rounded-lg overflow-hidden">
                            <div className="px-3 py-2 border-b border-zinc-700/30 flex items-center justify-between">
                              <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                                Mis anotaciones
                              </span>
                              {notesLoading && (
                                <Loader2 size={10} className="animate-spin text-zinc-600" />
                              )}
                            </div>

                            {notes.length === 0 && !notesLoading ? (
                              <div className="px-3 py-4 text-center">
                                <p className="text-[10px] text-zinc-600 italic">
                                  Sin anotaciones aun. Usa "Anotar aqui" para crear una.
                                </p>
                              </div>
                            ) : (
                              <div className="max-h-48 overflow-y-auto divide-y divide-zinc-700/30">
                                {notes.map(n => (
                                  <div
                                    key={n.id}
                                    className="px-3 py-2 hover:bg-zinc-700/20 transition-colors group"
                                  >
                                    <div className="flex items-start gap-2">
                                      {/* Timestamp badge — clickable to seek */}
                                      <button
                                        onClick={() => {
                                          if (n.timestamp_seconds !== null && n.timestamp_seconds >= 0) {
                                            handleSeek(n.timestamp_seconds);
                                          }
                                        }}
                                        disabled={n.timestamp_seconds === null}
                                        className={clsx(
                                          "shrink-0 text-[9px] rounded px-1.5 py-0.5 mt-0.5 transition-colors",
                                          n.timestamp_seconds !== null
                                            ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 cursor-pointer"
                                            : "bg-zinc-700/40 text-zinc-500 cursor-default"
                                        )}
                                      >
                                        {formatTimestamp(n.timestamp_seconds)}
                                      </button>

                                      {/* Note text */}
                                      <p className="flex-1 text-xs text-zinc-300 break-words min-w-0">
                                        {n.note}
                                      </p>

                                      {/* Actions */}
                                      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => {
                                            setEditingNote(n);
                                            setShowForm(true);
                                          }}
                                          className="p-1 text-zinc-500 hover:text-zinc-300 rounded"
                                          title="Editar"
                                        >
                                          <Edit3 size={10} />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteNote(n.id)}
                                          className="p-1 text-zinc-500 hover:text-red-400 rounded"
                                          title="Eliminar"
                                        >
                                          <Trash2 size={10} />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Date */}
                                    <span className="text-[8px] text-zinc-600 ml-7">
                                      {new Date(n.updated_at || n.created_at).toLocaleDateString('es-MX', {
                                        day: '2-digit',
                                        month: 'short',
                                      })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Video list */}
                <div className="space-y-1">
                  {videos.map(v => {
                    const isActive = v.id === activeVideoId;
                    const ytId = extractYouTubeId(v.url);
                    return (
                      <button
                        key={v.id}
                        onClick={() => {
                          setActiveVideoId(isActive ? null : v.id);
                          setSeekToSeconds(null);
                        }}
                        className={clsx(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all",
                          isActive
                            ? "bg-violet-500/15 border border-violet-500/30"
                            : "hover:bg-zinc-800/50 border border-transparent"
                        )}
                      >
                        {/* Thumbnail or icon */}
                        {ytId ? (
                          <div className="relative w-16 h-10 rounded overflow-hidden bg-zinc-800 shrink-0">
                            <img
                              src={`https://img.youtube.com/vi/${ytId}/default.jpg`}
                              alt={v.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Play size={12} className="text-white drop-shadow" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-10 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                            <Play size={12} className="text-zinc-500" />
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className={clsx(
                            "text-xs truncate",
                            isActive ? "text-violet-300" : "text-zinc-300"
                          )}>
                            {v.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-zinc-600 capitalize">
                              {v.platform || 'video'}
                            </span>
                            {v.duration_seconds && v.duration_seconds > 0 && (
                              <span className="flex items-center gap-0.5 text-[9px] text-zinc-600">
                                <Clock size={7} />
                                {formatDuration(v.duration_seconds)}
                              </span>
                            )}
                          </div>
                        </div>

                        {isActive && (
                          <span className="text-[9px] text-violet-400 shrink-0">Reproduciendo</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
