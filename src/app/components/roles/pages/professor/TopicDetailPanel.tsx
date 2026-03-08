// ============================================================
// Axon — TopicDetailPanel (Professor view for topic content)
//
// Shows summaries list for a selected topic. Clicking a summary
// opens SummaryDetailView with chunks, keywords, videos tabs.
// All data comes from real backend via summariesApi.ts.
//
// React Query migration (S1): uses useProfessorSummariesQuery,
// useSummarySubCountsQuery, and CRUD mutations from
// useTopicDetailQueries.ts. No direct service calls for data
// fetching or mutations.
// ============================================================
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Plus, ChevronRight, Loader2, RefreshCw,
  Edit3, Trash2, RotateCcw, Eye, EyeOff,
  AlertCircle, Layers, Tag, Video as VideoIcon,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { ConfirmDialog } from '@/app/components/shared/ConfirmDialog';
import { SummaryDetailView } from './SummaryDetailView';
import { SummaryFormDialog } from './SummaryFormDialog';
import type { Summary } from '@/app/services/summariesApi';
import {
  useProfessorSummariesQuery,
  useSummarySubCountsQuery,
  useCreateSummaryMutation,
  useUpdateSummaryMutation,
  useDeleteSummaryMutation,
  useRestoreSummaryMutation,
  useToggleStatusMutation,
} from '@/app/hooks/queries/useTopicDetailQueries';

interface TopicDetailPanelProps {
  topicId: string;
  topicName: string;
  /** When provided, clicking a summary calls this instead of opening inline SummaryDetailView */
  onEditSummary?: (summary: Summary, topicName: string) => void;
}

export function TopicDetailPanel({ topicId, topicName, onEditSummary }: TopicDetailPanelProps) {
  // ── React Query ─────────────────────────────────────────
  const {
    data: summaries = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useProfessorSummariesQuery(topicId);
  const { data: subCounts = {} } = useSummarySubCountsQuery(topicId, summaries);
  const error = queryError ? (queryError as any).message || 'Error al cargar resumenes' : null;

  // Mutations
  const createMutation = useCreateSummaryMutation(topicId);
  const updateMutation = useUpdateSummaryMutation(topicId);
  const deleteMutation = useDeleteSummaryMutation(topicId);
  const restoreMutation = useRestoreSummaryMutation(topicId);
  const toggleStatusMutation = useToggleStatusMutation(topicId);

  // Selected summary for detail view
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);

  // CRUD dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSummary, setEditingSummary] = useState<Summary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reset selection when topic changes
  // (React Query handles refetching automatically via queryKey change)
  useEffect(() => {
    setSelectedSummaryId(null);
  }, [topicId]);

  // ── CRUD handlers ───────────────────────────────────────
  const handleCreate = async (data: { title: string; content_markdown: string; status: 'draft' | 'published' }) => {
    try {
      await createMutation.mutateAsync(data);
      setShowCreateDialog(false);
    } catch {
      // error toast handled by mutation hook
    }
  };

  const handleUpdate = async (data: { title: string; content_markdown: string; status: 'draft' | 'published' }) => {
    if (!editingSummary) return;
    try {
      await updateMutation.mutateAsync({
        summaryId: editingSummary.id,
        data: {
          title: data.title,
          content_markdown: data.content_markdown,
          status: data.status,
        },
      });
      setEditingSummary(null);
    } catch {
      // error toast handled by mutation hook
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      if (selectedSummaryId === deletingId) setSelectedSummaryId(null);
      setDeletingId(null);
    } catch {
      // error toast handled by mutation hook
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreMutation.mutateAsync(id);
    } catch {
      // error toast handled by mutation hook
    }
  };

  const handleToggleStatus = async (s: Summary) => {
    const newStatus = s.status === 'published' ? 'draft' : 'published';
    try {
      await toggleStatusMutation.mutateAsync({
        summaryId: s.id,
        newStatus: newStatus as 'draft' | 'published',
      });
    } catch {
      // error toast handled by mutation hook
    }
  };

  // ── If a summary is selected → show detail view ─────────
  const selectedSummary = summaries.find(s => s.id === selectedSummaryId);
  if (selectedSummaryId && selectedSummary) {
    return (
      <SummaryDetailView
        summary={selectedSummary}
        topicName={topicName}
        onBack={() => setSelectedSummaryId(null)}
        onSummaryUpdated={() => refetch()}
      />
    );
  }

  // ── Status badge helper ─────────────────────────────────
  const statusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-red-50 text-red-600 border border-red-200">
          <EyeOff size={10} /> Eliminado
        </span>
      );
    }
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Eye size={10} /> Publicado
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
            <Edit3 size={10} /> Borrador
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-gray-50 text-gray-600 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <span>Curriculum</span>
          <ChevronRight size={14} />
          <span className="text-gray-600">{topicName}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
              <FileText size={20} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-gray-900">{topicName}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {loading ? 'Cargando...' : `${summaries.length} resumen${summaries.length !== 1 ? 'es' : ''}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={loading}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus size={14} />
              Nuevo Resumen
            </Button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle size={24} className="text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
              Reintentar
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && summaries.length === 0 && (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-purple-300" />
            </div>
            <p className="text-sm text-gray-500 mb-1">
              No hay resumenes en este topico
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Crea el primer resumen para empezar a agregar contenido
            </p>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus size={14} />
              Crear primer resumen
            </Button>
          </div>
        )}

        {/* Summaries list */}
        {!loading && !error && summaries.length > 0 && (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {summaries.map((s, index) => (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                  className={`group bg-white rounded-xl border transition-all cursor-pointer ${
                    !s.is_active
                      ? 'border-red-200 bg-red-50/30 opacity-60'
                      : 'border-gray-200 hover:border-purple-200 hover:shadow-sm'
                  }`}
                  onClick={() => {
                    if (!s.is_active) return;
                    if (onEditSummary) {
                      onEditSummary(s, topicName);
                    } else {
                      setSelectedSummaryId(s.id);
                    }
                  }}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText size={14} className="text-purple-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm text-gray-900 truncate">
                              {s.title || 'Sin titulo'}
                            </h3>
                            {statusBadge(s.status, s.is_active)}
                          </div>
                          {s.content_markdown && (
                            <p className="text-xs text-gray-400 truncate max-w-md">
                              {s.content_markdown.substring(0, 120)}
                              {s.content_markdown.length > 120 ? '...' : ''}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] text-gray-300">
                              {new Date(s.created_at).toLocaleDateString('es-MX', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })}
                            </span>
                            {s.order_index != null && (
                              <span className="text-[10px] text-gray-300">
                                Orden: {s.order_index}
                              </span>
                            )}
                          </div>

                          {/* Sub-content counters */}
                          {s.is_active && subCounts[s.id] && (
                            <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-gray-50">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-gray-400 bg-gray-50 rounded">
                                <Layers size={9} />
                                {subCounts[s.id].chunks} chunk{subCounts[s.id].chunks !== 1 ? 's' : ''}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded ${
                                subCounts[s.id].keywords > 0
                                  ? 'text-purple-500 bg-purple-50'
                                  : 'text-gray-400 bg-gray-50'
                              }`}>
                                <Tag size={9} />
                                {subCounts[s.id].keywords} keyword{subCounts[s.id].keywords !== 1 ? 's' : ''}
                              </span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-gray-400 bg-gray-50 rounded">
                                <VideoIcon size={9} />
                                {subCounts[s.id].videos} video{subCounts[s.id].videos !== 1 ? 's' : ''}
                              </span>
                              <span className="text-[10px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                                Click para editar contenido
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                        {s.is_active ? (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleStatus(s); }}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                              title={s.status === 'published' ? 'Cambiar a borrador' : 'Publicar'}
                            >
                              {s.status === 'published' ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingSummary(s); }}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                              title="Editar"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeletingId(s.id); }}
                              className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500"
                              title="Eliminar"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRestore(s.id); }}
                            className="p-1.5 rounded-md hover:bg-emerald-50 text-gray-400 hover:text-emerald-600"
                            title="Restaurar"
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}

                        {s.is_active && (
                          <ChevronRight size={14} className="text-gray-300 ml-1" />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <SummaryFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        title="Nuevo Resumen"
      />

      {/* Edit Dialog */}
      {editingSummary && (
        <SummaryFormDialog
          open={true}
          onOpenChange={(open) => { if (!open) setEditingSummary(null); }}
          onSubmit={handleUpdate}
          title="Editar Resumen"
          defaultValues={{
            title: editingSummary.title || '',
            content_markdown: editingSummary.content_markdown || '',
            status: editingSummary.status as 'draft' | 'published',
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => { if (!open) setDeletingId(null); }}
        title="Eliminar resumen"
        description="El resumen sera marcado como eliminado. Podras restaurarlo despues si es necesario."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}