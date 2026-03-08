// ============================================================
// Flashcard Module -- Barrel File
// Single import point for all flashcard screens and components.
//
// PHASE 3: Removed ProgressRing (replaced by MasteryRing),
// removed FlashcardSidebar (replaced by TopicSidebar).
// ============================================================

// ── Screens ──
export { HubScreen } from './FlashcardHubScreen';
export { SectionScreen } from './FlashcardSectionScreen';
export { DeckScreen } from './FlashcardDeckScreen';
export { SessionScreen } from './FlashcardSessionScreen';
export { SummaryScreen } from './FlashcardSummaryScreen';

// ── Shared UI Primitives ──
export { ProgressBar } from './ProgressBar';
export { MasteryRing } from './MasteryRing';
export { MasteryBadges } from './MasteryBadges';
export { SpeedometerGauge } from './SpeedometerGauge';
export { FlashcardMiniCard } from './FlashcardMiniCard';

// ── Layout ──
export { FlashcardHero } from './FlashcardHero';
export type { FlashcardHeroProps } from './FlashcardHero';
export { FlashcardDeckList } from './FlashcardDeckList';
export type { FlashcardDeck, FlashcardDeckListProps } from './FlashcardDeckList';

// ── Screen Props (for consumer type safety) ──
export type { SummaryScreenProps } from './FlashcardSummaryScreen';

// ── Constants ──
export { focusRing, CARD_GRID_CLASSES, GROUP_COLORS } from './constants';

// ── Mastery Colors (single source of truth) ──
export {
  getMasteryColor,
  getMasteryColorFromPct,
  DOT_COLORS,
  MASTERY_HEX_SCALE,
} from './mastery-colors';
export type { MasteryColorSet } from './mastery-colors';