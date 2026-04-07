// ============================================================
// Axon — FlashcardsManager (Orchestrator)
//
// Receives summaryId as prop. Thin orchestrator that composes:
// - useFlashcardsManager (state + handlers)
// - FlashcardToolbar (header, filters, bulk actions)
// - FlashcardStatsBar (type statistics)
// - FlashcardsList (grid + loading/empty states)
// - FlashcardFormModal (create/edit modal — external)
// - FlashcardBulkImport (bulk import modal — external)
// - ConfirmDialog (replaces native confirm())
//
// Used in ProfessorFlashcardsPage and SummaryView (EV-2).
// ============================================================
import React from 'react';
import { useFlashcardsManager } from './useFlashcardsManager';
import { FlashcardToolbar } from './FlashcardToolbar';
import { FlashcardStatsBar } from './FlashcardStatsBar';
import { FlashcardsList } from './FlashcardsList';
import { FlashcardFormModal } from '../professor/FlashcardFormModal';
import { FlashcardBulkImport } from '../professor/FlashcardBulkImport';
import { ConfirmDialog } from '../shared/ConfirmDialog';

// ── Props ─────────────────────────────────────────────────

interface FlashcardsManagerProps {
  summaryId: string;
}

// ── Component ─────────────────────────────────────────────

export function FlashcardsManager({ summaryId }: FlashcardsManagerProps) {
  const state = useFlashcardsManager(summaryId);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Toolbar: Header + Filters + Bulk Actions ── */}
      <FlashcardToolbar
        counters={state.counters}
        selectedFlashcards={state.selectedFlashcards}
        flashcardsTotal={state.flashcardsTotal}
        flashcardsCount={state.flashcards.length}
        filterKeywordId={state.filterKeywordId}
        setFilterKeywordId={state.setFilterKeywordId}
        searchQuery={state.searchQuery}
        setSearchQuery={state.setSearchQuery}
        showDeleted={state.showDeleted}
        setShowDeleted={state.setShowDeleted}
        filterType={state.filterType}
        setFilterType={state.setFilterType}
        hasActiveFilters={state.hasActiveFilters}
        clearFilters={state.clearFilters}
        filteredCount={state.filteredCards.length}
        keywords={state.keywords}
        keywordStats={state.keywordStats}
        filteredCards={state.filteredCards}
        setSelectedFlashcards={state.setSelectedFlashcards}
        handleSelectAll={state.handleSelectAll}
        onCreateClick={state.handleCreate}
        onBulkImportClick={() => state.setBulkImportOpen(true)}
        onBulkToggleActive={state.handleBulkToggleActive}
        onBulkDelete={state.handleBulkDelete}
        onBulkAssignKeyword={state.handleBulkAssignKeyword}
        onExport={state.handleExport}
      />

      {/* ── Content Area ── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {/* Type statistics */}
        {!state.flashcardsLoading && (
          <FlashcardStatsBar
            typeStats={state.typeStats}
            hasActiveFilters={state.hasActiveFilters}
            filteredCount={state.filteredCards.length}
            totalCount={state.flashcardsTotal}
          />
        )}

        {/* Flashcard list / grid */}
        <FlashcardsList
          flashcardsLoading={state.flashcardsLoading}
          filteredCards={state.filteredCards}
          keywords={state.keywords}
          subtopicsMap={state.subtopicsMap}
          selectedFlashcards={state.selectedFlashcards}
          searchQuery={state.searchQuery}
          onEdit={state.handleEdit}
          onDelete={state.handleDelete}
          onRestore={state.handleRestore}
          onToggleActive={state.handleToggleActive}
          onDuplicate={state.handleDuplicate}
          onToggleSelect={state.handleToggleSelect}
          onCreate={state.handleCreate}
        />
      </div>

      {/* ── Form Modal ── */}
      <FlashcardFormModal
        isOpen={state.modalOpen}
        editingCard={state.editingCard}
        keywords={state.keywords}
        subtopicsMap={state.subtopicsMap}
        summaryId={summaryId}
        onClose={() => { state.setModalOpen(false); state.setEditingCard(null); }}
        onSaved={state.loadFlashcards}
        loadSubtopicsForKeyword={state.loadSubtopicsForKeyword}
        userId={state.currentUserId}
      />

      {/* ── Bulk Import Modal ── */}
      <FlashcardBulkImport
        isOpen={state.bulkImportOpen}
        summaryId={summaryId}
        keywords={state.keywords}
        subtopicsMap={state.subtopicsMap}
        loadSubtopicsForKeyword={state.loadSubtopicsForKeyword}
        onClose={() => state.setBulkImportOpen(false)}
        onImported={state.loadFlashcards}
      />

      {/* ── Confirm Dialog (replaces native confirm()) ── */}
      <ConfirmDialog
        open={!!state.confirmAction}
        onOpenChange={(open) => { if (!open) state.setConfirmAction(null); }}
        title={state.confirmAction?.title || ''}
        description={state.confirmAction?.description || ''}
        confirmLabel={state.confirmAction?.confirmLabel || 'Confirmar'}
        variant={state.confirmAction?.variant || 'destructive'}
        onConfirm={() => state.confirmAction?.onConfirm()}
      />
    </div>
  );
}

export default FlashcardsManager;
