// ============================================================
// Axon — Professor: Flashcards Management
// PARALLEL-SAFE: This file is independent.
// Backend: FLAT routes via /src/app/services/flashcardApi.ts
//
// Refactored: CRUD logic extracted to FlashcardsManager component.
// This page provides the ContentTreePanel (shared CascadeNavigator)
// + mounts <FlashcardsManager summaryId={...} /> for the selected summary.
// ============================================================
import React, { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import type { Summary } from '@/app/types/platform';
import { FlashcardsManager } from '@/app/components/content/FlashcardsManager';
import { ContentTreePanel, buildTopicPath } from '@/app/components/shared/CascadeNavigator';
import { CreditCard, FileText } from 'lucide-react';

// ── Main Page Component ──────────────────────────────────

export function ProfessorFlashcardsPage() {
  const { activeMembership } = useAuth();
  const { tree, loading: treeLoading } = useContentTree();
  const institutionId = activeMembership?.institution_id || null;

  // Navigation state
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedTopicName, setSelectedTopicName] = useState<string>('');
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);

  // ── Handlers ────────────────────────────────────────────
  const handleSelectTopic = (topicId: string, topicName: string) => {
    setSelectedTopicId(topicId);
    setSelectedTopicName(topicName);
    setSelectedSummary(null);
  };

  const handleSelectSummary = (summary: Summary) => {
    setSelectedSummary(summary);
  };

  // Topic breadcrumb
  const topicPath = selectedTopicId ? buildTopicPath(tree, selectedTopicId) : '';

  return (
    <div className="flex h-full overflow-hidden">
      {/* ══════ LEFT PANEL — Content Tree ══════ */}
      <ContentTreePanel
        selectedTopicId={selectedTopicId}
        selectedSummaryId={selectedSummary?.id || null}
        onSelectTopic={handleSelectTopic}
        onSelectSummary={handleSelectSummary}
        institutionId={institutionId}
        tree={tree}
        treeLoading={treeLoading}
        accent="purple"
      />

      {/* ══════ RIGHT PANEL — Flashcard Management ══════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50">

        {/* ── Page Header ── */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <CreditCard size={18} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Flashcards</h1>
              <p className="text-xs text-gray-400">
                {selectedSummary
                  ? topicPath
                  : 'Selecciona un topico y resumen para gestionar flashcards'
                }
              </p>
            </div>
          </div>
        </div>

        {/* ── Content: FlashcardsManager or placeholder ── */}
        {selectedSummary ? (
          <FlashcardsManager summaryId={selectedSummary.id} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            {!selectedTopicId ? (
              <>
                <div className="w-20 h-20 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                  <CreditCard size={32} className="text-purple-300" />
                </div>
                <h3 className="text-gray-700 mb-1" style={{ fontWeight: 700 }}>Gestion de Flashcards</h3>
                <p className="text-sm text-gray-400 max-w-md">
                  Selecciona un topico en el arbol de contenido para ver y gestionar los flashcards asociados a sus resumenes.
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                  <FileText size={28} className="text-amber-300" />
                </div>
                <h3 className="text-gray-700 mb-1" style={{ fontWeight: 700 }}>Selecciona un resumen</h3>
                <p className="text-sm text-gray-400 max-w-md">
                  Selecciona un resumen del topico <strong>{selectedTopicName}</strong> en el panel izquierdo para gestionar sus flashcards.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}