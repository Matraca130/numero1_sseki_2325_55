// ============================================================
// Axon — KeywordsManager (Professor: full CRUD for keywords)
//
// Routes: GET /keywords?summary_id=xxx, POST, PUT, DELETE
// Features: table with name/definition/priority/subtopic count,
//   modal create/edit, expandable rows for SubtopicsPanel +
//   KeywordConnectionsPanel.
// priority is INTEGER: 1 (baja), 2 (media), 3 (alta). NEVER strings.
//
// Data layer: React Query hooks from useKeywordsManagerQueries.
// Cache key `queryKeys.summaryKeywords(summaryId)` is SHARED
// with useSummaryReaderQueries & useKeywordMasteryQuery.
// Mutations auto-invalidate → QuickKeywordCreator also
// invalidates the same key, so the list refreshes automatically
// without needing an `onKeywordCreated` callback.
//
// Modularized (Issue #29):
//   - KeywordListItem.tsx: row + toggle buttons + expandable panels
//   - KeywordFormDialog.tsx: create/edit modal (self-contained)
//   - keyword-manager-helpers.ts: shared priorityLabels + types
// ============================================================
import React, { useCallback, useState } from 'react';
import { Plus, Tag } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { ConfirmDialog } from '@/app/components/shared/ConfirmDialog';
import { KeywordListItem } from './KeywordListItem';
import { KeywordFormDialog, type KeywordFormData } from './KeywordFormDialog';
import type { ExpandablePanel } from './keyword-manager-helpers';
import type { SummaryKeyword } from '@/app/services/summariesApi';
import {
  useKeywordsQuery,
  useKeywordCountsQuery,
  useCreateKeywordMutation,
  useUpdateKeywordMutation,
  useDeleteKeywordMutation,
} from '@/app/hooks/queries/useKeywordsManagerQueries';

// ── Props ─────────────────────────────────────────────────
interface KeywordsManagerProps {
  summaryId: string;
}

// ── Component ─────────────────────────────────────────────
export function KeywordsManager({ summaryId }: KeywordsManagerProps) {
  // ── Data (React Query) ──────────────────────────────────
  const { data: keywords = [], isLoading: loading } = useKeywordsQuery(summaryId);
  const { data: counts } = useKeywordCountsQuery(summaryId, keywords);
  const subtopicCounts = counts?.subtopicCounts ?? {};
  const noteCounts = counts?.noteCounts ?? {};

  // Mutations
  const createMutation = useCreateKeywordMutation(summaryId);
  const updateMutation = useUpdateKeywordMutation(summaryId);
  const deleteMutation = useDeleteKeywordMutation(summaryId);

  // ── Panel expansion state ──────────────────────────────
  // Only one panel per keyword can be expanded at a time.
  // Map: keywordId -> which panel is open (or absent = none).
  const [expandedPanels, setExpandedPanels] = useState<Record<string, ExpandablePanel>>({});

  const togglePanel = useCallback((kwId: string, panel: ExpandablePanel) => {
    setExpandedPanels(prev => {
      const next = { ...prev };
      if (next[kwId] === panel) {
        delete next[kwId];
      } else {
        next[kwId] = panel;
      }
      return next;
    });
  }, []);

  // ── Modal state ─────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<SummaryKeyword | null>(null);

  const openCreate = () => {
    setEditingKeyword(null);
    setShowModal(true);
  };

  const openEdit = (kw: SummaryKeyword) => {
    setEditingKeyword(kw);
    setShowModal(true);
  };

  // ── Save handler (delegates to create or update mutation) ──
  const handleSave = useCallback((data: KeywordFormData) => {
    if (editingKeyword) {
      updateMutation.mutate(
        { keywordId: editingKeyword.id, data },
        { onSuccess: () => setShowModal(false) },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => setShowModal(false),
      });
    }
  }, [editingKeyword, createMutation, updateMutation]);

  // ── Delete state ────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(() => {
    if (!deletingId) return;
    deleteMutation.mutate(deletingId, {
      onSuccess: () => {
        setDeletingId(null);
        // Clear expanded panel for deleted keyword
        setExpandedPanels(prev => {
          const next = { ...prev };
          delete next[deletingId];
          return next;
        });
      },
    });
  }, [deletingId, deleteMutation]);

  // ── Derived ─────────────────────────────────────────────
  const savingModal = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm text-gray-700 flex items-center gap-1.5">
            <Tag size={14} className="text-violet-500" />
            Keywords
            {!loading && (
              <span className="ml-1 text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
                {keywords.length}
              </span>
            )}
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Gestiona palabras clave, subtemas y conexiones
          </p>
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          className="bg-[#2a8c7a] hover:bg-[#244e47] text-white h-7 text-xs px-3 rounded-full"
        >
          <Plus size={12} className="mr-1" />
          Nuevo Keyword
        </Button>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
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
        ) : keywords.length === 0 ? (
          <div className="text-center py-8">
            <Tag size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No hay keywords en este resumen</p>
            <p className="text-[10px] text-gray-300 mt-1">Crea el primer keyword para organizar el contenido</p>
          </div>
        ) : (
          <div className="space-y-1">
            {keywords.map(kw => (
              <KeywordListItem
                key={kw.id}
                keyword={kw}
                summaryId={summaryId}
                allKeywords={keywords}
                subtopicCount={subtopicCounts[kw.id] ?? 0}
                noteCount={noteCounts[kw.id] ?? 0}
                expandedPanel={expandedPanels[kw.id] ?? null}
                onTogglePanel={panel => togglePanel(kw.id, panel)}
                onEdit={() => openEdit(kw)}
                onDelete={() => setDeletingId(kw.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <KeywordFormDialog
        open={showModal}
        onOpenChange={setShowModal}
        editingKeyword={editingKeyword}
        onSave={handleSave}
        saving={savingModal}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={open => { if (!open) setDeletingId(null); }}
        title="Eliminar keyword"
        description="Se eliminaran tambien los subtemas asociados. Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
