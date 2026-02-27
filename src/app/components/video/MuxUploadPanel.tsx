// ============================================================
// Axon — MuxUploadPanel (Professor: direct upload to Mux)
//
// Flow:
//  1. Professor fills title + selects file (drag & drop or picker)
//  2. createMuxUpload(summaryId, title) → { video_id, upload_url }
//  3. @mux/upchunk uploads chunked with progress
//  4. Poll GET /videos?summary_id=xxx until status="ready"
//  5. Show success with thumbnail + duration
// ============================================================
import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as UpChunk from '@mux/upchunk';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, Film, X, Loader2, CheckCircle2,
  AlertCircle, Trash2, FileVideo,
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import * as muxApi from '@/app/lib/muxApi';
import * as summariesApi from '@/app/services/summariesApi';
import type { Video } from '@/app/services/summariesApi';

// ── Helpers ───────────────────────────────────────────────

function extractItems<T>(result: any): T[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'];
const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

// ── Props ─────────────────────────────────────────────────

interface MuxUploadPanelProps {
  summaryId: string;
  onUploadComplete?: (video: Video) => void;
  onClose?: () => void;
}

type UploadStage = 'idle' | 'uploading' | 'processing' | 'ready' | 'error';

export function MuxUploadPanel({ summaryId, onUploadComplete, onClose }: MuxUploadPanelProps) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<UploadStage>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [readyVideo, setReadyVideo] = useState<Video | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const uploadRef = useRef<any>(null);

  // ── File validation ─────────────────────────────────────
  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return 'Formato no soportado. Usa MP4, MOV o WebM.';
    }
    if (f.size > MAX_SIZE_BYTES) {
      return `El archivo excede 500 MB (${formatBytes(f.size)})`;
    }
    return null;
  };

  // ── Handle file selection ───────────────────────────────
  const handleFileSelect = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setError(err);
      return;
    }
    setFile(f);
    setError(null);
    // Auto-fill title from filename if empty
    if (!title.trim()) {
      const name = f.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(name);
    }
  };

  // ── Drag & drop handlers ────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFileSelect(selected);
  };

  // ── Start upload ────────────────────────────────────────
  const startUpload = async () => {
    if (!file || !title.trim()) return;

    setStage('uploading');
    setProgress(0);
    setError(null);

    try {
      // 1. Create upload on backend → get upload_url
      const result = await muxApi.createMuxUpload(summaryId, title.trim());
      setVideoId(result.video_id);

      // 2. Chunked upload via UpChunk
      const upload = UpChunk.createUpload({
        endpoint: result.upload_url,
        file,
        chunkSize: 5120, // 5 MB chunks
      });

      uploadRef.current = upload;

      upload.on('progress', (detail: any) => {
        setProgress(Math.round(detail.detail ?? detail ?? 0));
      });

      upload.on('success', () => {
        setStage('processing');
        startPolling(result.video_id);
      });

      upload.on('error', (detail: any) => {
        const msg = detail?.detail?.message || detail?.message || 'Error durante la subida';
        setError(msg);
        setStage('error');
      });
    } catch (err: any) {
      setError(err.message || 'Error al iniciar la subida');
      setStage('error');
    }
  };

  // ── Poll for video readiness ────────────────────────────
  const startPolling = (vid: string) => {
    pollCountRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;

      // Max 60 attempts (60 × 10s = 10 minutes)
      if (pollCountRef.current > 60) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setError('Tiempo de espera agotado. El video puede seguir procesandose en Mux.');
        setStage('error');
        return;
      }

      try {
        const result = await summariesApi.getVideos(summaryId);
        const items = extractItems<Video>(result);
        const video = items.find(v => v.id === vid);

        if (video?.status === 'ready') {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setReadyVideo(video);
          setStage('ready');
          onUploadComplete?.(video);
        } else if (video?.status === 'errored') {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setError('Mux reporto un error al procesar el video');
          setStage('error');
        }
      } catch {
        // Keep polling on network errors
      }
    }, 10000);
  };

  // ── Cleanup on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Cancel upload ───────────────────────────────────────
  const cancelUpload = () => {
    if (uploadRef.current?.abort) {
      uploadRef.current.abort();
    }
    if (pollRef.current) clearInterval(pollRef.current);
    setStage('idle');
    setProgress(0);
    setError(null);
    setVideoId(null);
  };

  // ── Reset ───────────────────────────────────────────────
  const resetPanel = () => {
    setTitle('');
    setFile(null);
    setStage('idle');
    setProgress(0);
    setError(null);
    setVideoId(null);
    setReadyVideo(null);
  };

  // ── Mux thumbnail URL ──────────────────────────────────
  const muxThumbnail = readyVideo?.mux_playback_id
    ? `https://image.mux.com/${readyVideo.mux_playback_id}/thumbnail.jpg?width=320&height=180&fit_mode=smartcrop`
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film size={14} className="text-violet-500" />
          <span className="text-sm text-gray-700">Subir Video a Mux</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="p-5">
        <AnimatePresence mode="wait">
          {/* ═══ SUCCESS STATE ═══ */}
          {stage === 'ready' && readyVideo ? (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="text-sm text-emerald-700">Video subido exitosamente</span>
              </div>

              <div className="flex gap-4">
                {muxThumbnail ? (
                  <div className="w-40 h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    <img src={muxThumbnail} alt={readyVideo.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-40 h-24 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                    <FileVideo size={24} className="text-violet-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0 text-sm space-y-1">
                  <p className="text-gray-800 truncate">{readyVideo.title}</p>
                  <p className="text-xs text-gray-400">
                    Duracion: {formatDuration(readyVideo.duration_seconds)}
                  </p>
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Listo
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={resetPanel} className="h-8 text-xs">
                  Subir otro
                </Button>
                {onClose && (
                  <Button size="sm" onClick={onClose} className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white">
                    Cerrar
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* Title input */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Titulo del video *</label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Introduccion a la Mitosis"
                  className="mt-1 h-8 text-xs"
                  disabled={stage !== 'idle'}
                />
              </div>

              {/* Dropzone / File info */}
              {!file ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={clsx(
                    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                    isDragOver
                      ? "border-violet-400 bg-violet-50"
                      : "border-gray-300 hover:border-violet-400 bg-gray-50 hover:bg-violet-50/30"
                  )}
                >
                  <Upload size={28} className={clsx("mx-auto mb-3", isDragOver ? "text-violet-500" : "text-gray-400")} />
                  <p className="text-sm text-gray-600">
                    Arrastra un video aqui
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    o haz click para seleccionar
                  </p>
                  <p className="text-[10px] text-gray-300 mt-3">
                    MP4, MOV, WebM — max 500 MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                    onChange={handleInputChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                        <FileVideo size={14} className="text-violet-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-800 truncate">{file.name}</p>
                        <p className="text-[10px] text-gray-400">{formatBytes(file.size)}</p>
                      </div>
                    </div>
                    {stage === 'idle' && (
                      <button
                        onClick={() => setFile(null)}
                        className="text-gray-400 hover:text-red-500 p-1.5 transition-colors"
                        title="Quitar"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Progress bar */}
                  {(stage === 'uploading' || stage === 'processing') && (
                    <div className="mt-3 space-y-2">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          className={clsx(
                            "h-full rounded-full",
                            stage === 'processing' ? "bg-amber-500" : "bg-violet-500"
                          )}
                          initial={{ width: 0 }}
                          animate={{
                            width: stage === 'processing' ? '100%' : `${progress}%`,
                          }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Loader2 size={10} className={clsx(
                          "animate-spin",
                          stage === 'processing' ? "text-amber-500" : "text-violet-500"
                        )} />
                        <span className="text-[10px] text-gray-500">
                          {stage === 'uploading'
                            ? `Subiendo... ${progress}% — ${formatBytes(Math.round(file.size * progress / 100))} / ${formatBytes(file.size)}`
                            : 'Procesando en Mux... (puede tardar unos minutos)'
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertCircle size={12} className="text-red-500 shrink-0" />
                  <span className="text-xs text-red-600">{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2">
                {stage === 'uploading' || stage === 'processing' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelUpload}
                    className="h-8 text-xs"
                  >
                    Cancelar
                  </Button>
                ) : (
                  <>
                    {onClose && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={onClose}
                        className="h-8 text-xs"
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={startUpload}
                      disabled={!file || !title.trim() || stage !== 'idle'}
                      className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      <Upload size={12} className="mr-1" />
                      Subir Video
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}