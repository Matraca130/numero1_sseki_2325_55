// ============================================================
// Axon — SummaryDetailView (Professor: chunks, keywords, videos)
//
// Tabs: Contenido (chunks) | Keywords | Videos
// All CRUD connected to real backend via summariesApi.ts.
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowLeft, ChevronRight, FileText, Layers, Tag, Video as VideoIcon,
  Plus, Edit3, Trash2, Save, X, Loader2, GripVertical, ExternalLink,
  RotateCcw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Skeleton } from '@/app/components/ui/skeleton';
import { ConfirmDialog } from '@/app/components/shared/ConfirmDialog';
import * as api from '@/app/services/summariesApi';
import type { Summary, Chunk, SummaryKeyword, Subtopic, Video } from '@/app/services/summariesApi';

// ── Helper: extract items from CRUD factory response ──────
function extractItems<T>(result: any): T[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

// ── Props ─────────────────────────────────────────────────

interface SummaryDetailViewProps {
  summary: Summary;
  topicName: string;
  onBack: () => void;
  onSummaryUpdated: () => void;
}

export function SummaryDetailView({
  summary,
  topicName,
  onBack,
  onSummaryUpdated,
}: SummaryDetailViewProps) {
  const [activeTab, setActiveTab] = useState('chunks');

  // ── Chunks state ────────────────────────────────────────
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [chunksLoading, setChunksLoading] = useState(true);
  const [editingChunkId, setEditingChunkId] = useState<string | null>(null);
  const [editingChunkContent, setEditingChunkContent] = useState('');
  const [newChunkContent, setNewChunkContent] = useState('');
  const [showNewChunk, setShowNewChunk] = useState(false);
  const [savingChunk, setSavingChunk] = useState(false);
  const [deletingChunkId, setDeletingChunkId] = useState<string | null>(null);
  const [deleteChunkLoading, setDeleteChunkLoading] = useState(false);

  // ── Keywords state ──────────────────────���───────────────
  const [keywords, setKeywords] = useState<SummaryKeyword[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(true);
  const [showNewKeyword, setShowNewKeyword] = useState(false);
  const [newKeywordName, setNewKeywordName] = useState('');
  const [newKeywordDef, setNewKeywordDef] = useState('');
  const [newKeywordPriority, setNewKeywordPriority] = useState<number>(0);
  const [savingKeyword, setSavingKeyword] = useState(false);
  const [editingKeywordId, setEditingKeywordId] = useState<string | null>(null);
  const [editKwName, setEditKwName] = useState('');
  const [editKwDef, setEditKwDef] = useState('');
  const [editKwPriority, setEditKwPriority] = useState<number>(0);
  const [deletingKeywordId, setDeletingKeywordId] = useState<string | null>(null);
  const [deleteKeywordLoading, setDeleteKeywordLoading] = useState(false);
  // Subtopics per keyword (expanded)
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const [subtopicsMap, setSubtopicsMap] = useState<Record<string, Subtopic[]>>({});
  const [subtopicsLoading, setSubtopicsLoading] = useState<string | null>(null);
  const [newSubtopicName, setNewSubtopicName] = useState('');
  const [savingSubtopic, setSavingSubtopic] = useState(false);

  // ── Videos state ────────────────────────────────────────
  const [videos, setVideos] = useState<Video[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [showNewVideo, setShowNewVideo] = useState(false);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoPlatform, setNewVideoPlatform] = useState('');
  const [savingVideo, setSavingVideo] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editVideoTitle, setEditVideoTitle] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [deleteVideoLoading, setDeleteVideoLoading] = useState(false);

  // ── Fetch chunks ────────────────────────────────────────
  const fetchChunks = useCallback(async () => {
    setChunksLoading(true);
    try {
      const result = await api.getChunks(summary.id);
      setChunks(extractItems<Chunk>(result).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));
    } catch (err: any) {
      console.error('[Chunks] Load error:', err);
      setChunks([]);
    } finally {
      setChunksLoading(false);
    }
  }, [summary.id]);

  // ── Fetch keywords ──────────────────────────────────────
  const fetchKeywords = useCallback(async () => {
    setKeywordsLoading(true);
    try {
      const result = await api.getKeywords(summary.id);
      setKeywords(extractItems<SummaryKeyword>(result));
    } catch (err: any) {
      console.error('[Keywords] Load error:', err);
      setKeywords([]);
    } finally {
      setKeywordsLoading(false);
    }
  }, [summary.id]);

  // ── Fetch videos ────────────────────────────────────────
  const fetchVideos = useCallback(async () => {
    setVideosLoading(true);
    try {
      const result = await api.getVideos(summary.id);
      setVideos(extractItems<Video>(result).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));
    } catch (err: any) {
      console.error('[Videos] Load error:', err);
      setVideos([]);
    } finally {
      setVideosLoading(false);
    }
  }, [summary.id]);

  // ── Fetch subtopics for a keyword ──────────────────────
  const fetchSubtopics = useCallback(async (keywordId: string) => {
    setSubtopicsLoading(keywordId);
    try {
      const result = await api.getSubtopics(keywordId);
      setSubtopicsMap(prev => ({
        ...prev,
        [keywordId]: extractItems<Subtopic>(result).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
      }));
    } catch (err: any) {
      console.error('[Subtopics] Load error:', err);
      setSubtopicsMap(prev => ({ ...prev, [keywordId]: [] }));
    } finally {
      setSubtopicsLoading(null);
    }
  }, []);

  // ── Initial load ────────────────────────────────────────
  useEffect(() => {
    fetchChunks();
    fetchKeywords();
    fetchVideos();
  }, [fetchChunks, fetchKeywords, fetchVideos]);

  // ── Chunk CRUD ──────────────────────────────────────────
  const handleCreateChunk = async () => {
    if (!newChunkContent.trim()) return;
    setSavingChunk(true);
    try {
      await api.createChunk({
        summary_id: summary.id,
        content: newChunkContent.trim(),
        order_index: chunks.length,
      });
      toast.success('Chunk creado');
      setNewChunkContent('');
      setShowNewChunk(false);
      await fetchChunks();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear chunk');
    } finally {
      setSavingChunk(false);
    }
  };

  const handleUpdateChunk = async (id: string) => {
    if (!editingChunkContent.trim()) return;
    setSavingChunk(true);
    try {
      await api.updateChunk(id, { content: editingChunkContent.trim() });
      toast.success('Chunk actualizado');
      setEditingChunkId(null);
      await fetchChunks();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar chunk');
    } finally {
      setSavingChunk(false);
    }
  };

  const handleDeleteChunk = async () => {
    if (!deletingChunkId) return;
    setDeleteChunkLoading(true);
    try {
      await api.deleteChunk(deletingChunkId);
      toast.success('Chunk eliminado');
      setDeletingChunkId(null);
      await fetchChunks();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar chunk');
    } finally {
      setDeleteChunkLoading(false);
    }
  };

  // ── Keyword CRUD ────────────────────────────────────────
  const handleCreateKeyword = async () => {
    if (!newKeywordName.trim()) return;
    setSavingKeyword(true);
    try {
      await api.createKeyword({
        summary_id: summary.id,
        name: newKeywordName.trim(),
        definition: newKeywordDef.trim() || undefined,
        priority: newKeywordPriority,
      });
      toast.success('Keyword creada');
      setNewKeywordName('');
      setNewKeywordDef('');
      setNewKeywordPriority(0);
      setShowNewKeyword(false);
      await fetchKeywords();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear keyword');
    } finally {
      setSavingKeyword(false);
    }
  };

  const handleUpdateKeyword = async (id: string) => {
    if (!editKwName.trim()) return;
    setSavingKeyword(true);
    try {
      await api.updateKeyword(id, {
        name: editKwName.trim(),
        definition: editKwDef.trim() || undefined,
        priority: editKwPriority,
      });
      toast.success('Keyword actualizada');
      setEditingKeywordId(null);
      await fetchKeywords();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar keyword');
    } finally {
      setSavingKeyword(false);
    }
  };

  const handleDeleteKeyword = async () => {
    if (!deletingKeywordId) return;
    setDeleteKeywordLoading(true);
    try {
      await api.deleteKeyword(deletingKeywordId);
      toast.success('Keyword eliminada');
      setDeletingKeywordId(null);
      await fetchKeywords();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar keyword');
    } finally {
      setDeleteKeywordLoading(false);
    }
  };

  // ── Subtopic CRUD ───────────────────────────────────────
  const handleCreateSubtopic = async (keywordId: string) => {
    if (!newSubtopicName.trim()) return;
    setSavingSubtopic(true);
    try {
      await api.createSubtopic({
        keyword_id: keywordId,
        name: newSubtopicName.trim(),
      });
      toast.success('Subtema creado');
      setNewSubtopicName('');
      await fetchSubtopics(keywordId);
    } catch (err: any) {
      toast.error(err.message || 'Error al crear subtema');
    } finally {
      setSavingSubtopic(false);
    }
  };

  const handleDeleteSubtopic = async (id: string, keywordId: string) => {
    try {
      await api.deleteSubtopic(id);
      toast.success('Subtema eliminado');
      await fetchSubtopics(keywordId);
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  // ── Video CRUD ──────────────────────────────────────────
  const handleCreateVideo = async () => {
    if (!newVideoTitle.trim() || !newVideoUrl.trim()) return;
    setSavingVideo(true);
    try {
      await api.createVideo({
        summary_id: summary.id,
        title: newVideoTitle.trim(),
        url: newVideoUrl.trim(),
        platform: newVideoPlatform.trim() || undefined,
        order_index: videos.length,
      });
      toast.success('Video agregado');
      setNewVideoTitle('');
      setNewVideoUrl('');
      setNewVideoPlatform('');
      setShowNewVideo(false);
      await fetchVideos();
    } catch (err: any) {
      toast.error(err.message || 'Error al agregar video');
    } finally {
      setSavingVideo(false);
    }
  };

  const handleUpdateVideo = async (id: string) => {
    if (!editVideoTitle.trim() || !editVideoUrl.trim()) return;
    setSavingVideo(true);
    try {
      await api.updateVideo(id, {
        title: editVideoTitle.trim(),
        url: editVideoUrl.trim(),
      });
      toast.success('Video actualizado');
      setEditingVideoId(null);
      await fetchVideos();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar video');
    } finally {
      setSavingVideo(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (!deletingVideoId) return;
    setDeleteVideoLoading(true);
    try {
      await api.deleteVideo(deletingVideoId);
      toast.success('Video eliminado');
      setDeletingVideoId(null);
      await fetchVideos();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar video');
    } finally {
      setDeleteVideoLoading(false);
    }
  };

  // ── Expand keyword to show subtopics ────────────────────
  const toggleKeywordExpand = (keywordId: string) => {
    if (expandedKeyword === keywordId) {
      setExpandedKeyword(null);
    } else {
      setExpandedKeyword(keywordId);
      if (!subtopicsMap[keywordId]) {
        fetchSubtopics(keywordId);
      }
    }
  };

  // ── Detect platform from URL ────────────────────────────
  const detectPlatform = (url: string): string => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
    if (url.includes('vimeo.com')) return 'Vimeo';
    if (url.includes('loom.com')) return 'Loom';
    return '';
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

  // ── Empty state component ───────────────────────────────
  const EmptyState = ({ icon, text, onAdd }: { icon: React.ReactNode; text: string; onAdd: () => void }) => (
    <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center">
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <p className="text-xs text-gray-400 mb-3">{text}</p>
      <Button size="sm" variant="outline" onClick={onAdd}>
        <Plus size={12} /> Agregar
      </Button>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-8"
    >
      <div className="max-w-4xl">
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
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                <FileText size={20} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-gray-900">{summary.title || 'Sin titulo'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border ${
                    summary.status === 'published'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {summary.status === 'published' ? 'Publicado' : 'Borrador'}
                  </span>
                  <span className="text-[10px] text-gray-300">
                    Creado {new Date(summary.created_at).toLocaleDateString('es-MX', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
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

        {/* Tabs: Chunks | Keywords | Videos */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="chunks" className="gap-1.5">
              <Layers size={13} />
              Chunks
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
                  {keywords.filter(k => k.is_active).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-1.5">
              <VideoIcon size={13} />
              Videos
              {!videosLoading && (
                <span className="ml-1 text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
                  {videos.filter(v => v.is_active).length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════ */}
          {/* CHUNKS TAB */}
          {/* ═══════════════════════════════════════════════ */}
          <TabsContent value="chunks">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm text-gray-700">Fragmentos de contenido</h3>
                <Button size="sm" variant="outline" onClick={() => setShowNewChunk(true)}>
                  <Plus size={12} /> Agregar
                </Button>
              </div>

              <div className="p-4">
                {chunksLoading ? (
                  <ListSkeleton />
                ) : chunks.length === 0 && !showNewChunk ? (
                  <EmptyState
                    icon={<Layers size={16} className="text-gray-300" />}
                    text="No hay chunks en este resumen"
                    onAdd={() => setShowNewChunk(true)}
                  />
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {chunks.map((chunk, idx) => (
                        <motion.div
                          key={chunk.id}
                          layout
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="group border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
                        >
                          {editingChunkId === chunk.id ? (
                            <div className="p-3">
                              <Textarea
                                value={editingChunkContent}
                                onChange={(e) => setEditingChunkContent(e.target.value)}
                                className="min-h-[80px] mb-2"
                                autoFocus
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingChunkId(null)}
                                  disabled={savingChunk}
                                >
                                  <X size={12} /> Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateChunk(chunk.id)}
                                  disabled={savingChunk}
                                  className="bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                  {savingChunk ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                  Guardar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 flex items-start gap-2">
                              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                <GripVertical size={12} className="text-gray-200" />
                                <span className="text-[10px] text-gray-300 w-4 text-center">
                                  {idx + 1}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                                  {chunk.content}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingChunkId(chunk.id);
                                    setEditingChunkContent(chunk.content);
                                  }}
                                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                >
                                  <Edit3 size={12} />
                                </button>
                                <button
                                  onClick={() => setDeletingChunkId(chunk.id)}
                                  className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* New chunk form */}
                    {showNewChunk && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border border-purple-200 rounded-lg p-3 bg-purple-50/30"
                      >
                        <Textarea
                          value={newChunkContent}
                          onChange={(e) => setNewChunkContent(e.target.value)}
                          placeholder="Escribe el contenido del chunk..."
                          className="min-h-[80px] mb-2"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setShowNewChunk(false); setNewChunkContent(''); }}
                            disabled={savingChunk}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleCreateChunk}
                            disabled={savingChunk || !newChunkContent.trim()}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            {savingChunk ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                            Crear
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════ */}
          {/* KEYWORDS TAB */}
          {/* ═══════════════════════════════════════════════ */}
          <TabsContent value="keywords">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm text-gray-700">Palabras clave</h3>
                <Button size="sm" variant="outline" onClick={() => setShowNewKeyword(true)}>
                  <Plus size={12} /> Agregar
                </Button>
              </div>

              <div className="p-4">
                {keywordsLoading ? (
                  <ListSkeleton />
                ) : keywords.length === 0 && !showNewKeyword ? (
                  <EmptyState
                    icon={<Tag size={16} className="text-gray-300" />}
                    text="No hay keywords en este resumen"
                    onAdd={() => setShowNewKeyword(true)}
                  />
                ) : (
                  <div className="space-y-2">
                    {keywords.map(kw => (
                      <div key={kw.id} className={`border rounded-lg transition-colors ${
                        !kw.is_active ? 'border-red-200 bg-red-50/30 opacity-60' : 'border-gray-100 hover:border-gray-200'
                      }`}>
                        {editingKeywordId === kw.id ? (
                          <div className="p-3 space-y-2">
                            <Input
                              value={editKwName}
                              onChange={(e) => setEditKwName(e.target.value)}
                              placeholder="Nombre"
                              autoFocus
                            />
                            <Textarea
                              value={editKwDef}
                              onChange={(e) => setEditKwDef(e.target.value)}
                              placeholder="Definicion (opcional)"
                              className="min-h-[60px]"
                            />
                            <div>
                              <span className="text-[10px] text-gray-400 mb-1 block">Prioridad</span>
                              <div className="flex gap-1.5">
                                {[
                                  { value: 0, label: 'Sin prioridad', active: 'bg-gray-100 border-gray-300 text-gray-600', idle: 'bg-white border-gray-200 text-gray-400' },
                                  { value: 1, label: 'Baja', active: 'bg-blue-50 border-blue-300 text-blue-700', idle: 'bg-white border-gray-200 text-gray-400' },
                                  { value: 2, label: 'Media', active: 'bg-amber-50 border-amber-300 text-amber-700', idle: 'bg-white border-gray-200 text-gray-400' },
                                  { value: 3, label: 'Alta', active: 'bg-red-50 border-red-300 text-red-700', idle: 'bg-white border-gray-200 text-gray-400' },
                                ].map(opt => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setEditKwPriority(opt.value)}
                                    className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] border transition-colors ${
                                      editKwPriority === opt.value ? opt.active : opt.idle
                                    } hover:border-gray-300`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => setEditingKeywordId(null)}>
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateKeyword(kw.id)}
                                disabled={savingKeyword}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                {savingKeyword ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                Guardar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="p-3 flex items-start justify-between group">
                              <div className="flex-1 min-w-0">
                                <button
                                  onClick={() => kw.is_active && toggleKeywordExpand(kw.id)}
                                  className="flex items-center gap-2 text-left"
                                >
                                  {kw.is_active && (
                                    expandedKeyword === kw.id
                                      ? <ChevronUp size={12} className="text-gray-400 shrink-0" />
                                      : <ChevronDown size={12} className="text-gray-400 shrink-0" />
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-800">{kw.name}</span>
                                      {kw.priority > 0 && (
                                        <span className="text-[10px] text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full">
                                          P{kw.priority}
                                        </span>
                                      )}
                                      {!kw.is_active && (
                                        <span className="text-[10px] text-red-500">Eliminada</span>
                                      )}
                                    </div>
                                    {kw.definition && (
                                      <p className="text-xs text-gray-400 mt-0.5">{kw.definition}</p>
                                    )}
                                  </div>
                                </button>
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                {kw.is_active ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingKeywordId(kw.id);
                                        setEditKwName(kw.name);
                                        setEditKwDef(kw.definition || '');
                                        setEditKwPriority(kw.priority);
                                      }}
                                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                    >
                                      <Edit3 size={12} />
                                    </button>
                                    <button
                                      onClick={() => setDeletingKeywordId(kw.id)}
                                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await api.restoreKeyword(kw.id);
                                        toast.success('Keyword restaurada');
                                        await fetchKeywords();
                                      } catch (err: any) {
                                        toast.error(err.message || 'Error');
                                      }
                                    }}
                                    className="p-1 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600"
                                    title="Restaurar"
                                  >
                                    <RotateCcw size={12} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Subtopics (expanded) */}
                            {expandedKeyword === kw.id && kw.is_active && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-gray-100 bg-gray-50/50"
                              >
                                <div className="px-4 py-3 pl-8">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">Subtemas</span>
                                  </div>

                                  {subtopicsLoading === kw.id ? (
                                    <div className="flex items-center gap-2 py-2">
                                      <Loader2 size={12} className="animate-spin text-gray-400" />
                                      <span className="text-xs text-gray-400">Cargando...</span>
                                    </div>
                                  ) : (subtopicsMap[kw.id] || []).length === 0 ? (
                                    <p className="text-xs text-gray-300 py-1">Sin subtemas</p>
                                  ) : (
                                    <div className="space-y-1 mb-2">
                                      {(subtopicsMap[kw.id] || []).map(st => (
                                        <div key={st.id} className="flex items-center justify-between group/st py-0.5">
                                          <span className={`text-xs ${st.is_active ? 'text-gray-600' : 'text-red-400 line-through'}`}>
                                            {st.name}
                                          </span>
                                          {st.is_active && (
                                            <button
                                              onClick={() => handleDeleteSubtopic(st.id, kw.id)}
                                              className="p-0.5 rounded opacity-0 group-hover/st:opacity-100 hover:bg-red-50 text-gray-300 hover:text-red-400"
                                            >
                                              <X size={10} />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Add subtopic inline */}
                                  <div className="flex items-center gap-2 mt-2">
                                    <Input
                                      value={newSubtopicName}
                                      onChange={(e) => setNewSubtopicName(e.target.value)}
                                      placeholder="Nuevo subtema..."
                                      className="h-7 text-xs"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleCreateSubtopic(kw.id);
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2"
                                      disabled={savingSubtopic || !newSubtopicName.trim()}
                                      onClick={() => handleCreateSubtopic(kw.id)}
                                    >
                                      {savingSubtopic ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </>
                        )}
                      </div>
                    ))}

                    {/* New keyword form */}
                    {showNewKeyword && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border border-purple-200 rounded-lg p-3 bg-purple-50/30 space-y-2"
                      >
                        <Input
                          value={newKeywordName}
                          onChange={(e) => setNewKeywordName(e.target.value)}
                          placeholder="Nombre de la keyword"
                          autoFocus
                        />
                        <Textarea
                          value={newKeywordDef}
                          onChange={(e) => setNewKeywordDef(e.target.value)}
                          placeholder="Definicion (opcional)"
                          className="min-h-[60px]"
                        />
                        <div>
                          <span className="text-[10px] text-gray-400 mb-1 block">Prioridad</span>
                          <div className="flex gap-1.5">
                            {[
                              { value: 0, label: 'Sin prioridad', active: 'bg-gray-100 border-gray-300 text-gray-600', idle: 'bg-white border-gray-200 text-gray-400' },
                              { value: 1, label: 'Baja', active: 'bg-blue-50 border-blue-300 text-blue-700', idle: 'bg-white border-gray-200 text-gray-400' },
                              { value: 2, label: 'Media', active: 'bg-amber-50 border-amber-300 text-amber-700', idle: 'bg-white border-gray-200 text-gray-400' },
                              { value: 3, label: 'Alta', active: 'bg-red-50 border-red-300 text-red-700', idle: 'bg-white border-gray-200 text-gray-400' },
                            ].map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setNewKeywordPriority(opt.value)}
                                className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] border transition-colors ${
                                  newKeywordPriority === opt.value ? opt.active : opt.idle
                                } hover:border-gray-300`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setShowNewKeyword(false); setNewKeywordName(''); setNewKeywordDef(''); setNewKeywordPriority(0); }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleCreateKeyword}
                            disabled={savingKeyword || !newKeywordName.trim()}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            {savingKeyword ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                            Crear
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════ */}
          {/* VIDEOS TAB */}
          {/* ═══════════════════════════════════════════════ */}
          <TabsContent value="videos">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm text-gray-700">Videos</h3>
                <Button size="sm" variant="outline" onClick={() => setShowNewVideo(true)}>
                  <Plus size={12} /> Agregar
                </Button>
              </div>

              <div className="p-4">
                {videosLoading ? (
                  <ListSkeleton />
                ) : videos.length === 0 && !showNewVideo ? (
                  <EmptyState
                    icon={<VideoIcon size={16} className="text-gray-300" />}
                    text="No hay videos en este resumen"
                    onAdd={() => setShowNewVideo(true)}
                  />
                ) : (
                  <div className="space-y-2">
                    {videos.map((v, idx) => (
                      <div
                        key={v.id}
                        className={`group border rounded-lg transition-colors ${
                          !v.is_active ? 'border-red-200 bg-red-50/30 opacity-60' : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        {editingVideoId === v.id ? (
                          <div className="p-3 space-y-2">
                            <Input
                              value={editVideoTitle}
                              onChange={(e) => setEditVideoTitle(e.target.value)}
                              placeholder="Titulo del video"
                              autoFocus
                            />
                            <Input
                              value={editVideoUrl}
                              onChange={(e) => setEditVideoUrl(e.target.value)}
                              placeholder="URL del video"
                            />
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => setEditingVideoId(null)}>
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateVideo(v.id)}
                                disabled={savingVideo}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                {savingVideo ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                Guardar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0 mt-0.5">
                              <VideoIcon size={13} className="text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-800 truncate">{v.title}</span>
                                {v.platform && (
                                  <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">
                                    {v.platform}
                                  </span>
                                )}
                                {!v.is_active && (
                                  <span className="text-[10px] text-red-500">Eliminado</span>
                                )}
                              </div>
                              <a
                                href={v.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-purple-500 hover:text-purple-600 flex items-center gap-1 mt-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink size={10} />
                                {v.url.length > 50 ? v.url.substring(0, 50) + '...' : v.url}
                              </a>
                              {v.duration_seconds != null && v.duration_seconds > 0 && (
                                <span className="text-[10px] text-gray-300 mt-0.5 block">
                                  {Math.floor(v.duration_seconds / 60)}:{String(v.duration_seconds % 60).padStart(2, '0')} min
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              {v.is_active ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingVideoId(v.id);
                                      setEditVideoTitle(v.title);
                                      setEditVideoUrl(v.url);
                                    }}
                                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                  <button
                                    onClick={() => setDeletingVideoId(v.id)}
                                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={async () => {
                                    try {
                                      await api.updateVideo(v.id, { is_active: true });
                                      toast.success('Video restaurado');
                                      await fetchVideos();
                                    } catch (err: any) {
                                      toast.error(err.message || 'Error');
                                    }
                                  }}
                                  className="p-1 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600"
                                  title="Restaurar"
                                >
                                  <RotateCcw size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* New video form */}
                    {showNewVideo && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border border-purple-200 rounded-lg p-3 bg-purple-50/30 space-y-2"
                      >
                        <Input
                          value={newVideoTitle}
                          onChange={(e) => setNewVideoTitle(e.target.value)}
                          placeholder="Titulo del video"
                          autoFocus
                        />
                        <Input
                          value={newVideoUrl}
                          onChange={(e) => {
                            setNewVideoUrl(e.target.value);
                            if (!newVideoPlatform) {
                              const detected = detectPlatform(e.target.value);
                              if (detected) setNewVideoPlatform(detected);
                            }
                          }}
                          placeholder="URL del video (YouTube, Vimeo, etc.)"
                        />
                        <Input
                          value={newVideoPlatform}
                          onChange={(e) => setNewVideoPlatform(e.target.value)}
                          placeholder="Plataforma (opcional, ej: YouTube)"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setShowNewVideo(false);
                              setNewVideoTitle('');
                              setNewVideoUrl('');
                              setNewVideoPlatform('');
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleCreateVideo}
                            disabled={savingVideo || !newVideoTitle.trim() || !newVideoUrl.trim()}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            {savingVideo ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                            Agregar
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Chunk Confirmation */}
      <ConfirmDialog
        open={!!deletingChunkId}
        onOpenChange={(open) => { if (!open) setDeletingChunkId(null); }}
        title="Eliminar chunk"
        description="Este chunk sera eliminado permanentemente (hard delete). Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteChunkLoading}
        onConfirm={handleDeleteChunk}
      />

      {/* Delete Keyword Confirmation */}
      <ConfirmDialog
        open={!!deletingKeywordId}
        onOpenChange={(open) => { if (!open) setDeletingKeywordId(null); }}
        title="Eliminar keyword"
        description="La keyword sera marcada como eliminada (soft-delete). Podras restaurarla despues."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteKeywordLoading}
        onConfirm={handleDeleteKeyword}
      />

      {/* Delete Video Confirmation */}
      <ConfirmDialog
        open={!!deletingVideoId}
        onOpenChange={(open) => { if (!open) setDeletingVideoId(null); }}
        title="Eliminar video"
        description="El video sera marcado como eliminado (soft-delete)."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteVideoLoading}
        onConfirm={handleDeleteVideo}
      />
    </motion.div>
  );
}