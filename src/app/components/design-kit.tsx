/**
 * ════════════════════════════════════════════════════════════════════════
 * AXON v4.4 — DESIGN KIT (BARREL RE-EXPORTER)
 * ════════════════════════════════════════════════════════════════════════
 *
 * This file is a BARREL RE-EXPORTER. All implementations live in
 * the design-kit/ sub-directory. Existing imports are preserved:
 *
 *   import { tokens, ProgressBar, AppNavbar } from "./design-kit";
 *
 * For NEW imports, prefer importing directly from sub-files to
 * reduce bundle coupling and avoid merge conflicts:
 *
 *   import { ProgressBar } from "./design-kit/dk-primitives";
 *   import { tokens } from "./design-kit/dk-tokens";
 *
 * SUB-FILES:
 * ├── dk-tokens.ts        — tokens, focusRing, useFadeUp, useReducedMotionSafe
 * ├── dk-primitives.tsx   — ProgressBar, ProgressRing, UserAvatar, StreakBadge, XpCounter
 * ├── dk-navigation.tsx   — AppNavbar, Breadcrumb
 * ├── dk-layouts.tsx      — HeroSection, ContentCard, StatCard, SectionHeader
 * ├── dk-video.tsx        — VideoThumbnail, VideoBanner
 * ├── dk-feedback.tsx     — XpToast, Confetti, CompletionCard, MasteryBadge
 * ├── dk-sidebar.tsx      — CollapsibleSidebar
 * ├── dk-reader.tsx       — PageDots, PageNavigation, KeywordPill, proseClasses
 * └── dk-interaction.tsx  — CollapsibleSection, CountBadge, SectionLabel, CommentTagBadge, useDismissEffect
 *
 * ════════════════════════════════════════════════════════════════════════
 */

// 1. Tokens & Utilities
export { tokens, focusRing, useFadeUp, useReducedMotionSafe } from "./design-kit/dk-tokens";

// 3. Primitives
export { ProgressBar, ProgressRing, UserAvatar, StreakBadge, XpCounter } from "./design-kit/dk-primitives";

// 4. Navigation
export { AppNavbar, Breadcrumb } from "./design-kit/dk-navigation";

// 5. Layouts
export { HeroSection, ContentCard, StatCard, SectionHeader } from "./design-kit/dk-layouts";

// 6. Video
export { VideoThumbnail, VideoBanner } from "./design-kit/dk-video";

// 7. Feedback
export { XpToast, Confetti, CompletionCard, MasteryBadge } from "./design-kit/dk-feedback";

// 8. Sidebar
export { CollapsibleSidebar } from "./design-kit/dk-sidebar";

// 9. Reader
export { PageDots, PageNavigation, KeywordPill, proseClasses } from "./design-kit/dk-reader";

// 10. Interaction
export { CollapsibleSection, CountBadge, SectionLabel, CommentTagBadge, useDismissEffect } from "./design-kit/dk-interaction";
