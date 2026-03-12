// ============================================================
// Axon — useKeywordNavigation
//
// SRP-3 extraction: encapsulates the cross-topic keyword
// navigation logic that was previously inline in
// StudentSummariesView.tsx (~70 lines, 3 cases).
//
// The hook manages:
//   - selectedSummaryId state (which summary the reader shows)
//   - pendingNavRef for cross-topic jumps
//   - Topic-change reset effect (skips reset during pending nav)
//   - Pending nav resolution effect (waits for new topic data)
//   - handleNavigateKeyword with 3 cases:
//       A: same summary → scroll + flash
//       B: different summary, same topic → instant switch
//       C: cross-topic → fetch target summary, change topic,
//          store pending nav, resolve after data arrives
//
// Inputs: summaries list, effectiveTopicId, selectTopic fn
// Outputs: selectedSummaryId, setSelectedSummaryId, handler,
//          isPendingNav (true while cross-topic navigation resolves)
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import * as summariesApi from '@/app/services/summariesApi';
import type { Summary } from '@/app/services/summariesApi';
import {
  scrollFlashAndAutoOpen,
  NOOP_HANDLE,
  type AutoClickHandle,
} from '@/app/lib/keyword-scroll-helpers';

interface UseKeywordNavigationArgs {
  /** Published summaries for the current topic */
  summaries: Summary[];
  /** Current effective topic ID (may change during cross-topic nav) */
  effectiveTopicId: string | null;
  /** Context function to switch the active topic */
  selectTopic: (topicId: string) => void;
}

interface UseKeywordNavigationResult {
  /** Currently selected summary ID (null = show list view) */
  selectedSummaryId: string | null;
  /** Select a summary directly (e.g., card click) */
  setSelectedSummaryId: (id: string | null) => void;
  /** Navigate to a keyword in any summary (3-case handler) */
  handleNavigateKeyword: (keywordId: string, targetSummaryId: string) => void;
  /** True while a cross-topic navigation is resolving (prevents list flash) */
  isPendingNav: boolean;
}

export function useKeywordNavigation({
  summaries,
  effectiveTopicId,
  selectTopic,
}: UseKeywordNavigationArgs): UseKeywordNavigationResult {
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
  const pendingNavRef = useRef<string | null>(null);
  const [isPendingNav, setIsPendingNav] = useState(false);

  // FIX-E2/E4: Track pending auto-click so we can cancel on
  // new navigation (E2 race) or unmount (E4 timer leak).
  const autoClickRef = useRef<AutoClickHandle>(NOOP_HANDLE);

  // FIX-E4: Cancel any pending auto-click on unmount.
  useEffect(() => {
    return () => autoClickRef.current.cancel();
  }, []);

  // ── Reset selection on topic change (unless pending cross-topic nav) ──
  useEffect(() => {
    if (!pendingNavRef.current) {
      setSelectedSummaryId(null);
    }
  }, [effectiveTopicId]);

  // ── Resolve pending cross-topic navigation after data arrives ──
  useEffect(() => {
    if (!pendingNavRef.current || summaries.length === 0) return;
    const targetId = pendingNavRef.current;
    pendingNavRef.current = null;
    if (summaries.some(s => s.id === targetId)) {
      setSelectedSummaryId(targetId);
    } else if (import.meta.env.DEV) {
      console.warn(
        '[useKeywordNavigation] Pending nav target not found in topic summaries:',
        targetId,
      );
    }
    // Always clear pending flag once resolved (success or fail)
    setIsPendingNav(false);
  }, [summaries]);

  // ── Navigate to keyword in another summary ──────────────
  const handleNavigateKeyword = useCallback(
    async (keywordId: string, targetSummaryId: string) => {
      // L-1 FIX: Debug logging guarded behind dev mode
      if (import.meta.env.DEV) {
        console.log('[useKeywordNavigation] handleNavigateKeyword called:', {
          keywordId,
          targetSummaryId,
          currentSummaryId: selectedSummaryId,
          summariesCount: summaries.length,
          isSameSummary: selectedSummaryId === targetSummaryId,
          isInCurrentTopic: summaries.some(s => s.id === targetSummaryId),
        });
      }

      // Case A: same summary — scroll to the keyword highlight in DOM
      if (selectedSummaryId === targetSummaryId) {
        // FIX-E2: Cancel any previous auto-click before starting a new one.
        autoClickRef.current.cancel();

        requestAnimationFrame(() => {
          const kwSpan = document.querySelector(
            `[data-keyword-id="${keywordId}"]`,
          ) as HTMLElement | null;
          if (kwSpan) {
            // FIX-E2/E3/E4: Delegate scroll + flash + auto-open to shared helper.
            // Returns a cancel handle stored in autoClickRef.
            autoClickRef.current = scrollFlashAndAutoOpen(keywordId, kwSpan);
            toast.info('Keyword encontrada en este resumen');
          } else {
            toast.info('Keyword conectada — mismo resumen');
          }
        });
        return;
      }

      // Case B: different summary in current topic's list
      if (summaries.some(s => s.id === targetSummaryId)) {
        setSelectedSummaryId(targetSummaryId);
        toast.info('Navegando al resumen conectado...');
        return;
      }

      // Case C: cross-topic — fetch target summary to find its topic
      try {
        const targetSummary = await summariesApi.getSummary(targetSummaryId);
        if (!targetSummary) {
          toast.error('No se encontro el resumen destino');
          return;
        }

        if (targetSummary.topic_id && targetSummary.topic_id !== effectiveTopicId) {
          // Store pending navigation so the resolve effect can pick it up
          pendingNavRef.current = targetSummaryId;
          setIsPendingNav(true);
          selectTopic(targetSummary.topic_id);
          toast.info(
            `Cambiando de topico para ir a "${targetSummary.title || 'resumen'}"...`,
          );
        } else {
          // Same topic but somehow not in the published list — try anyway
          setSelectedSummaryId(targetSummaryId);
        }
      } catch (err: any) {
        console.error('[useKeywordNavigation] Navigate error:', err);
        setIsPendingNav(false);
        toast.error('No se pudo navegar al resumen');
      }
    },
    [summaries, selectedSummaryId, effectiveTopicId, selectTopic],
  );

  return {
    selectedSummaryId,
    setSelectedSummaryId,
    handleNavigateKeyword,
    isPendingNav,
  };
}
