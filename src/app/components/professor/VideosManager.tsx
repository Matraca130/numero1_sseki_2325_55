// ============================================================
// Axon — VideosManager (Professor: Mux video management per summary)
//
// Shown in SummaryView for professors.
// Videos are uploaded exclusively via Mux (MuxUploadPanel).
//
// React Query migration (S1): uses useProfessorVideosQuery,
// useUpdateVideoMutation, useDeleteVideoMutation from
// useVideosManagerQueries.ts. No direct service calls.
//
// Routes (all FLAT):
//   GET    /videos?summary_id=xxx
//   PUT    /videos/:id { title?, is_active? }
//   DELETE /videos/:id (soft delete)
//   POST   /mux/create-upload (via MuxUploadPanel)
// ============================================================
import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Video, Edit3, Trash2, Save, X, Loader2,
  Eye, EyeOff, Play, Clock, Upload,
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { ConfirmDialog } from '@/app/components/shared/ConfirmDialog';
import type { Video as VideoType } from '@/app/services/summariesApi';
import { MuxUploadPanel } from '../video/MuxUploadPanel';
import { formatDuration } from '@/app/lib/api-helpers';
import {
  useProfessorVideosQuery,
  useUpdateVideoMutation,
  useDeleteVideoMutation,
} from '@/app/hooks/queries/useVideosManagerQueries';
import { queryKeys } from '@/app/hooks/queries/queryKeys';

// ── Props ─────────────────────────────────────────────────
interface VideosManagerProps {
  summaryId: string;
  /** Called whenever the video list changes (add/edit/delete/toggle) so parent can update badge counts */
  onVideosChanged?: (activeCount: number) => void;
}

export function VideosManager({ summaryId, onVideosChanged }: VideosManagerProps) {
  const queryClient = useQueryClient();

  // ── React Query ─────────────────────────────────────────
  const { data: videos = [], isLoading: loading } = useProfessorVideosQuery(summaryId);
  const updateVideo = useUpdateVideoMutation(summaryId);
  const deleteVideo = useDeleteVideoMutation(summaryId);

  // ── Report active count to parent ───────────────────────
  useEffect(() => {
    const activeCount = videos.filter(v => v.is_active).length;
    onVideosChanged?.(activeCount);
  }, [videos, onVideosChanged]);

  // Edit title modal
  const [editingVideo, setEditingVideo] = useState<VideoType | null>(null);
  const [formTitle, setFormTitle] = useState('');

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Mux upload panel
  const [showMuxUpload, setShowMuxUpload] = useState(false);

  // ── Open edit modal ─────────────────────────────────────
  const openEdit = (v: VideoType) => {
    setEditingVideo(v);
    setFormTitle(v.title);
  };

  // ── Save title ──────────────────────────────────────────
  const handleSave = async () => {
    if (!editingVideo || !formTitle.trim()) return;
    try {
      await updateVideo.mutateAsync({
        videoId: editingVideo.id,
        data: { title: formTitle.trim() },
      });
      toast.success('Titulo actualizado');
      setEditingVideo(null);
    } catch {
      // error toast handled by mutation hook onError
    }
  };

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteVideo.mutateAsync(deletingId);
      setDeletingId(null);
    } catch {
      // error toast handled by mutation hook
    }
  };

  // ── Toggle is_active ────────────────────────────────────
  const toggleActive = async (v: VideoType) => {
    try {
      await updateVideo.mutateAsync({
        videoId: v.id,
        data: { is_active: !v.is_active },
      });
      toast.success(v.is_active ? 'Video desactivado' : 'Video activado');
    } catch {
      // error toast handled by mutation hook
    }
  };

  // ── Mux thumbnail ──────────────────────────────────────
  const getThumb = (v: VideoType): string | null => {
    if (v.mux_playback_id) {
      return `https://image.mux.com/${v.mux_playback_id}/thumbnail.jpg?width=240&height=135&fit_mode=smartcrop`;
    }
    if (v.thumbnail_url) return v.thumbnail_url;
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm text-gray-700 flex items-center gap-1.5">
            <Video size={14} className="text-violet-500" />
            Videos
            {!loading && (
              <span className="ml-1 text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
                {videos.length}
              </span>
            )}
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Videos asociados a este resumen
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowMuxUpload(prev => !prev)}
          className="bg-violet-600 hover:bg-violet-700 text-white h-7 text-xs px-3"
        >
          <Upload size={12} className="mr-1" />
          Subir Video
        </Button>
      </div>

      {/* Mux Upload Panel (collapsible) */}
      <AnimatePresence>
        {showMuxUpload && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-gray-100"
          >
            <div className="p-4">
              <MuxUploadPanel
                summaryId={summaryId}
                onUploadComplete={() => {
                  queryClient.invalidateQueries({
                    queryKey: queryKeys.summaryVideos(summaryId),
                  });
                  toast.success('Video Mux listo');
                }}
                onClose={() => setShowMuxUpload(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-24 h-14 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-48 mb-2" />
                  <Skeleton className="h-2.5 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-8">
            <Video size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No hay videos en este resumen</p>
            <p className="text-[10px] text-gray-300 mt-1">Sube un video para comenzar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {videos.map(v => {
              const thumb = getThumb(v);
              const isProcessing = v.status !== 'ready' && v.status !== 'errored';
              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={clsx(
                    "flex items-start gap-3 px-3 py-2.5 rounded-lg border group transition-colors",
                    v.is_active
                      ? "border-gray-100 hover:bg-gray-50/50"
                      : "border-gray-100 bg-gray-50 opacity-60"
                  )}
                >
                  {/* Thumbnail */}
                  {thumb ? (
                    <div className="relative w-24 h-14 rounded overflow-hidden bg-gray-100 shrink-0">
                      <img
                        src={thumb}
                        alt={v.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Play size={16} className="text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-24 h-14 rounded bg-gray-100 flex items-center justify-center shrink-0">
                      {isProcessing ? (
                        <Loader2 size={16} className="text-amber-400 animate-spin" />
                      ) : (
                        <Video size={16} className="text-gray-400" />
                      )}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800 truncate">{v.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600">
                        Mux
                      </span>
                      {v.duration_seconds && (
                        <span className="flex items-center gap-0.5 text-[9px] text-gray-400">
                          <Clock size={8} />
                          {formatDuration(v.duration_seconds)}
                        </span>
                      )}
                      {isProcessing && (
                        <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Loader2 size={8} className="animate-spin" />
                          Procesando
                        </span>
                      )}
                      {v.status === 'ready' && (
                        <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                          Listo
                        </span>
                      )}
                      {v.status === 'errored' && (
                        <span className="text-[9px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                          Error
                        </span>
                      )}
                      {!v.is_active && (
                        <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                          Desactivado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => toggleActive(v)}
                      className="text-gray-400 hover:text-violet-600 transition-colors p-1"
                      title={v.is_active ? 'Desactivar' : 'Activar'}
                    >
                      {v.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button
                      onClick={() => openEdit(v)}
                      className="text-gray-400 hover:text-violet-600 transition-colors p-1"
                      title="Editar titulo"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => setDeletingId(v.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* EDIT TITLE MODAL                                       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {editingVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setEditingVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-full max-w-sm mx-4"
            >
              <h3 className="text-sm text-gray-800 mb-4">Editar Video</h3>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Titulo *</label>
                <Input
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Titulo del video"
                  className="mt-1 h-8 text-xs"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingVideo(null)}
                  className="h-8 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateVideo.isPending || !formTitle.trim()}
                  className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {updateVideo.isPending ? (
                    <Loader2 size={12} className="animate-spin mr-1" />
                  ) : (
                    <Save size={12} className="mr-1" />
                  )}
                  Guardar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={open => { if (!open) setDeletingId(null); }}
        title="Eliminar video"
        description="El video sera eliminado. Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteVideo.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}