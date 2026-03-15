// ============================================================
// Adaptive Flashcard Module — Barrel File
//
// Phase 4 of the "Adaptive AI Flashcard Session" plan.
// Components for the between-rounds summary, AI generation
// loading screen, and keyword mastery visualization.
//
// Usage:
//   import { AdaptivePartialSummary, AdaptiveGenerationScreen }
//     from './flashcard/adaptive';
// ============================================================

// ── Screens ──
export { AdaptivePartialSummary } from './AdaptivePartialSummary';
export type { AdaptivePartialSummaryProps } from './AdaptivePartialSummary';

export { AdaptiveGenerationScreen } from './AdaptiveGenerationScreen';
export type { AdaptiveGenerationScreenProps } from './AdaptiveGenerationScreen';

// ── Panels & Controls ──
export { AdaptiveKeywordPanel } from './AdaptiveKeywordPanel';
export type { AdaptiveKeywordPanelProps } from './AdaptiveKeywordPanel';

export { AdaptiveCountSelector } from './AdaptiveCountSelector';
export type { AdaptiveCountSelectorProps } from './AdaptiveCountSelector';

// ── Extracted sub-screens ──
export { AdaptiveCompletedScreen } from './AdaptiveCompletedScreen';
export type { AdaptiveCompletedScreenProps } from './AdaptiveCompletedScreen';

export { AdaptiveIdleLanding } from './AdaptiveIdleLanding';
export type { AdaptiveIdleLandingProps } from './AdaptiveIdleLanding';

// ── Shared sub-components ──
export { DeltaBadges } from './DeltaBadges';
export type { DeltaBadgesProps } from './DeltaBadges';

export { RoundHistoryList } from './RoundHistoryList';
export type { RoundHistoryListProps } from './RoundHistoryList';
