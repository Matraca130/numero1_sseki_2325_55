// ============================================================
// Axon — VideosManager (Professor: CRUD videos per summary)
//
// Shown in SummaryView for professors.
// Routes (all FLAT):
//   GET    /videos?summary_id=xxx
//   POST   /videos { summary_id, title, url, platform, duration_seconds?, order_index? }
//   PUT    /videos/:id { title?, url?, platform?, duration_seconds?, order_index?, is_active? }
//   DELETE /videos/:id (soft delete)
//
// Schema: id, summary_id(NOT NULL), title(NOT NULL), url(NOT NULL),
//   platform(NOT NULL "youtube"|"vimeo"|"other"), duration_seconds(nullable),
//   order_index(NOT NULL), is_active(NOT NULL), created_by(NOT NULL), deleted_at
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Video, Plus, Edit3, Trash2, Save, X, Loader2,
  Eye, EyeOff, ExternalLink, Play, Clock,
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { ConfirmDialog } from '@/app/components/shared/ConfirmDialog';
import * as api from '@/app/services/summariesApi';
import type { Video as VideoType } from '@/app/services/summariesApi';

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

// ── Platform detection ────────────────────────────────────
function detectPlatform(url: string): string {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/vimeo\.com/i.test(url)) return 'vimeo';
  return 'other';
}

// ── Duration formatter ────────────────────────────────────
function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Platform badge ────────────────────────────────────────
const platformConfig: Record<string, { label: string; color: string; bg: string }> = {
  youtube: { label: 'YouTube', color: 'text-red-600', bg: 'bg-red-50' },
  vimeo:   { label: 'Vimeo',   color: 'text-blue-600', bg: 'bg-blue-50' },
  other:   { label: 'Otro',    color: 'text-gray-600', bg: 'bg-gray-100' },
};

// ── Props ─────────────────────────────────────────────────
interface VideosManagerProps {
  summaryId: string;
}

export function VideosManager({ summaryId }: VideosManagerProps) {
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoType | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formPlatform, setFormPlatform] = useState('youtube');
  const [formDuration, setFormDuration] = useState('');
  const [savingModal, setSavingModal] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch videos ────────────────────────────────────────
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getVideos(summaryId);
      const items = extractItems<VideoType>(result)
        .filter(v => !v.deleted_at)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      setVideos(items);
    } catch (err: any) {
      console.error('[VideosManager] fetch error:', err);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [summaryId]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  // ── Open modal ──────────────────────────────────────────
  const openCreate = () => {
    setEditingVideo(null);
    setFormTitle('');
    setFormUrl('');
    setFormPlatform('youtube');
    setFormDuration('');
    setShowModal(true);
  };

  const openEdit = (v: VideoType) => {
    setEditingVideo(v);
    setFormTitle(v.title);
    setFormUrl(v.url);
    setFormPlatform(v.platform || 'other');
    setFormDuration(v.duration_seconds ? String(v.duration_seconds) : '');
    setShowModal(true);
  };

  // ── URL change handler (auto-detect platform) ──────────
  const handleUrlChange = (url: string) => {
    setFormUrl(url);
    const detected = detectPlatform(url);
    setFormPlatform(detected);
  };

  // ── Validate URL ────────────────────────────────────────
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // ── Save ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formTitle.trim()) { toast.error('El titulo es obligatorio'); return; }
    if (!formUrl.trim() || !isValidUrl(formUrl.trim())) {
      toast.error('Ingresa una URL valida');
      return;
    }
    setSavingModal(true);
    try {
      const durationNum = formDuration ? parseInt(formDuration, 10) : undefined;
      if (editingVideo) {
        await api.updateVideo(editingVideo.id, {
          title: formTitle.trim(),
          url: formUrl.trim(),
          platform: formPlatform,
          duration_seconds: durationNum || undefined,
        });
        toast.success('Video actualizado');
      } else {
        await api.createVideo({
          summary_id: summaryId,
          title: formTitle.trim(),
          url: formUrl.trim(),
          platform: formPlatform,
          duration_seconds: durationNum || undefined,
          order_index: videos.length,
        });
        toast.success('Video agregado');
      }
      setShowModal(false);
      await fetchVideos();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar video');
    } finally {
      setSavingModal(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await api.deleteVideo(deletingId);
      toast.success('Video eliminado');
      setDeletingId(null);
      await fetchVideos();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Toggle is_active ────────────────────────────────────
  const toggleActive = async (v: VideoType) => {
    try {
      await api.updateVideo(v.id, { is_active: !v.is_active });
      toast.success(v.is_active ? 'Video desactivado' : 'Video activado');
      await fetchVideos();
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar estado');
    }
  };

  // ── YouTube thumbnail ───────────────────────────────────
  const getThumb = (v: VideoType): string | null => {
    if ((v.platform || '').toLowerCase() !== 'youtube') return null;
    const ytId = extractYouTubeId(v.url);
    return ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null;
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
          onClick={openCreate}
          className="bg-violet-600 hover:bg-violet-700 text-white h-7 text-xs px-3"
        >
          <Plus size={12} className="mr-1" />
          Agregar Video
        </Button>
      </div>

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
            <p className="text-[10px] text-gray-300 mt-1">Agrega un video de YouTube o Vimeo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {videos.map(v => {
              const thumb = getThumb(v);
              const plat = platformConfig[v.platform || 'other'] || platformConfig.other;
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
                      <Video size={16} className="text-gray-400" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800 truncate">{v.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={clsx(
                        "text-[9px] px-1.5 py-0.5 rounded-full",
                        plat.bg, plat.color
                      )}>
                        {plat.label}
                      </span>
                      {v.duration_seconds && (
                        <span className="flex items-center gap-0.5 text-[9px] text-gray-400">
                          <Clock size={8} />
                          {formatDuration(v.duration_seconds)}
                        </span>
                      )}
                      {!v.is_active && (
                        <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                          Desactivado
                        </span>
                      )}
                    </div>
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-violet-500 hover:text-violet-600 mt-0.5 inline-flex items-center gap-0.5 truncate max-w-[200px]"
                    >
                      <ExternalLink size={8} />
                      {v.url}
                    </a>
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
                      title="Editar"
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
      {/* CREATE / EDIT MODAL                                    */}
      {/* ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-sm text-gray-800 mb-4">
                {editingVideo ? 'Editar Video' : 'Agregar Video'}
              </h3>

              <div className="space-y-3">
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

                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider">URL *</label>
                  <Input
                    value={formUrl}
                    onChange={e => handleUrlChange(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="mt-1 h-8 text-xs"
                  />
                  {formUrl && !isValidUrl(formUrl) && (
                    <p className="text-[9px] text-red-500 mt-0.5">URL invalida</p>
                  )}
                  {/* YouTube preview */}
                  {formUrl && extractYouTubeId(formUrl) && (
                    <div className="mt-2 rounded overflow-hidden border border-gray-200">
                      <img
                        src={`https://img.youtube.com/vi/${extractYouTubeId(formUrl)}/mqdefault.jpg`}
                        alt="Preview"
                        className="w-full h-auto"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider">Plataforma</label>
                  <div className="flex items-center gap-2 mt-1">
                    {(['youtube', 'vimeo', 'other'] as const).map(p => {
                      const cfg = platformConfig[p];
                      return (
                        <button
                          key={p}
                          onClick={() => setFormPlatform(p)}
                          className={clsx(
                            "flex-1 text-xs py-1.5 rounded-lg border transition-all",
                            formPlatform === p
                              ? "border-violet-400 bg-violet-50 text-violet-700"
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                          )}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider">Duracion (segundos)</label>
                  <Input
                    type="number"
                    value={formDuration}
                    onChange={e => setFormDuration(e.target.value)}
                    placeholder="ej: 360 (6 minutos)"
                    className="mt-1 h-8 text-xs"
                    min={0}
                  />
                  {formDuration && parseInt(formDuration) > 0 && (
                    <p className="text-[9px] text-gray-400 mt-0.5">
                      = {formatDuration(parseInt(formDuration))}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  className="h-8 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={savingModal || !formTitle.trim() || !formUrl.trim()}
                  className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {savingModal ? (
                    <Loader2 size={12} className="animate-spin mr-1" />
                  ) : (
                    <Save size={12} className="mr-1" />
                  )}
                  {editingVideo ? 'Guardar' : 'Agregar'}
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
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
