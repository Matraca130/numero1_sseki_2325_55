// ============================================================
// Axon — TopicMasteryContext
// Thin context wrapper around useTopicMastery hook.
// Provides a single shared instance across the component tree.
// ============================================================
import React, { createContext, useContext, useMemo } from 'react';
import { useTopicMastery, type UseTopicMasteryResult } from '@/app/hooks/useTopicMastery';

const TopicMasteryCtx = createContext<UseTopicMasteryResult | null>(null);

export function TopicMasteryProvider({ children }: { children: React.ReactNode }) {
  const hook = useTopicMastery();

  const value = useMemo<UseTopicMasteryResult>(() => hook, [
    hook.topicMastery,
    hook.courseMastery,
    hook.fsrsStates,
    hook.flashcardToTopicMap,
    hook.loading,
    hook.error,
    hook.refresh,
  ]);

  return <TopicMasteryCtx.Provider value={value}>{children}</TopicMasteryCtx.Provider>;
}

export function useTopicMasteryContext(): UseTopicMasteryResult {
  const ctx = useContext(TopicMasteryCtx);
  if (!ctx) {
    throw new Error('useTopicMasteryContext must be used within a TopicMasteryProvider');
  }
  return ctx;
}
