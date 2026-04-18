/**
 * @module @axon/design-system/gradients
 * @version 1.0.0
 *
 * Gradient tokens for the Axon Medical Academy design system.
 *
 * NOTE: Gradients on buttons and icons are FORBIDDEN by design rules.
 * These tokens are for decorative backgrounds, progress bars, overlays,
 * and result/feedback surfaces only.
 *
 * All hex values reference the canonical palette in colors.ts:
 *   - #2dd4a8  = colors.primary[400]  (progress start)
 *   - #0d9488  = colors.chart.bar     (progress end)
 *   - #2a8c7a  = colors.primary[500]  (teal accent)
 *   - #1B3B36  = colors.primary[700]  (dark teal)
 *   - #1a2e2a  = colors.primary[800]  (dark panel)
 *   - #244e47  = colors.primary[600]  (hover teal)
 *   - #14b8a6  = teal-500 (Tailwind)
 *   - #34D399  = emerald-400 (Tailwind)
 *
 * Standalone:  import { gradients } from '@/app/design-system/gradients';
 * Barrel:      import { gradients } from '@/app/design-system';
 */

// ─────────────────────────────────────────────
// GRADIENT TOKENS
// ─────────────────────────────────────────────

export const gradients = {

  // ── Progress bars ──────────────────────────
  /** Progress bar fill: teal-400 to progress-end (horizontal) */
  progress: {
    css: 'linear-gradient(to right, #2dd4a8, #0d9488)',
    tw: 'bg-gradient-to-r from-[#2dd4a8] to-[#0d9488]',
  },
  /** Progress bar fill: reversed direction (progress-end to teal-400) */
  progressReverse: {
    css: 'linear-gradient(to right, #0d9488, #2dd4a8)',
    tw: 'bg-gradient-to-r from-[#0d9488] to-[#2dd4a8]',
  },

  // ── Decorative icon backgrounds ────────────
  /** Teal accent icon badge: soft diagonal with transparency */
  tealIconBg: {
    css: 'linear-gradient(to bottom right, rgba(42,140,122,0.2), rgba(27,59,54,0.1))',
    tw: 'bg-gradient-to-br from-[#2a8c7a]/20 to-[#1B3B36]/10',
  },

  // ── Hero / dark surfaces ───────────────────
  /** Hero section dark teal gradient */
  heroDark: {
    css: 'linear-gradient(to bottom right, #1B3B36, #1a2e2a)',
    tw: 'bg-gradient-to-br from-[#1B3B36] to-[#1a2e2a]',
  },

  // ── Gamification ───────────────────────────
  /** Gold podium gradient: amber-400 to amber-500 */
  gold: {
    css: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    tw: 'bg-gradient-to-br from-amber-400 to-amber-500',
  },
  /** Silver podium gradient: gray-400 to gray-500 */
  silver: {
    css: 'linear-gradient(135deg, #9ca3af, #6b7280)',
    tw: 'bg-gradient-to-br from-gray-400 to-gray-500',
  },
  /** Bronze podium gradient: orange-400 to orange-600 */
  bronze: {
    css: 'linear-gradient(135deg, #fb923c, #ea580c)',
    tw: 'bg-gradient-to-br from-orange-400 to-orange-600',
  },
  /** Badge earned toast: warm amber surface */
  badgeEarned: {
    css: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    tw: 'bg-gradient-to-br from-amber-50 to-amber-100',
  },

  // ── Level-up celebration ───────────────────
  /** Level-up overlay: teal-50 to teal-100 to teal-200 */
  levelUp: {
    css: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 50%, #99f6e4 100%)',
    tw: 'bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200',
  },
  /** Level-up icon: teal-500 to teal-600 */
  levelUpIcon: {
    css: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    tw: 'bg-gradient-to-br from-teal-500 to-teal-600',
  },

  // ── Quiz result streaks ────────────────────
  /** Success/active streak badge */
  streakActive: {
    css: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    border: '#86efac',
  },
  /** At-risk streak badge */
  streakAtRisk: {
    css: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
    border: '#fca5a5',
  },
  /** Default/warning streak badge */
  streakDefault: {
    css: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
    border: '#fdba74',
  },

  // ── Schedule task bars ─────────────────────
  /** Active/completed task left accent bar */
  scheduleBarActive: {
    css: 'linear-gradient(to bottom, #34D399, #2a8c7a)',
  },
  /** Inactive/pending task left accent bar */
  scheduleBarInactive: {
    css: 'linear-gradient(to bottom, #e5e7eb, #dfe2e8)',
  },

  // ── Schedule surfaces ──────────────────────
  /** Completed task row: very subtle green-to-white */
  scheduleCompletedRow: {
    css: 'linear-gradient(to right, #f6fffb, #ffffff)',
    tw: 'bg-gradient-to-r from-[#f6fffb] to-white',
  },
  /** Dashboard completed task row: rgb variant */
  dashboardCompletedRow: {
    css: 'linear-gradient(90deg, rgb(250,255,254) 0%, rgb(255,255,255) 100%)',
  },
  /** Dashboard completed task accent bar: rgb variant */
  dashboardBarActive: {
    css: 'linear-gradient(to bottom, rgb(52,211,153), rgb(42,140,122))',
  },
  /** Dashboard pending task accent bar: rgb variant */
  dashboardBarInactive: {
    css: 'linear-gradient(to bottom, rgb(229,231,235), rgb(223,226,232))',
  },

  // ── Day summary / header backgrounds ───────
  /** Day summary card header: soft teal surface */
  daySummaryHeader: {
    css: 'linear-gradient(90deg, rgb(230,245,241) 0%, rgb(237,248,245) 100%)',
  },
  /** Subject divider fade-out line */
  subjectDivider: {
    css: 'linear-gradient(90deg, rgb(232,234,237), rgba(0,0,0,0))',
  },

  // ── Current day highlight ──────────────────
  /** Current day header: very subtle teal surface */
  currentDayHeader: {
    css: 'linear-gradient(to right, #e6f5f1, #f0f9f7)',
    tw: 'bg-gradient-to-r from-[#e6f5f1] to-[#f0f9f7]',
  },

  // ── Quiz XP card ───────────────────────────
  /** XP card confirmed state: green glass surface */
  xpConfirmed: {
    css: 'linear-gradient(135deg, rgba(236,253,245,0.9) 0%, rgba(209,250,229,0.85) 50%, rgba(167,243,208,0.8) 100%)',
    border: 'rgba(16,185,129,0.35)',
    shadow: '0 8px 32px -4px rgba(16,185,129,0.15), 0 0 0 1px rgba(16,185,129,0.05), inset 0 1px 0 rgba(255,255,255,0.6)',
  },
  /** XP card pending state: amber glass surface */
  xpPending: {
    css: 'linear-gradient(135deg, rgba(254,243,199,0.85) 0%, rgba(253,230,138,0.8) 50%, rgba(252,211,77,0.75) 100%)',
    border: 'rgba(253,224,71,0.5)',
    shadow: '0 8px 32px -4px rgba(245,158,11,0.18), 0 0 0 1px rgba(245,158,11,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
  },
  /** XP card confirmed icon: emerald gradient */
  xpConfirmedIcon: {
    css: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    shadow: '0 4px 12px rgba(16,185,129,0.35)',
  },
  /** XP card pending icon: amber gradient */
  xpPendingIcon: {
    css: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    shadow: '0 4px 12px rgba(245,158,11,0.3)',
  },
  /** XP card outer wrapper: very subtle dark tint */
  xpCardOuter: {
    css: 'linear-gradient(135deg, rgba(15,23,42,0.03) 0%, rgba(15,23,42,0.01) 100%)',
  },
  /** XP card shimmer loading overlay */
  xpShimmer: {
    css: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
  },

  // ── Video overlay ──────────────────────────
  /** Video thumbnail dark overlay: dark teal with gradient opacity */
  videoOverlay: {
    css: 'linear-gradient(to top, rgba(27,59,54,0.85) 0%, rgba(27,59,54,0.3) 50%, rgba(27,59,54,0.1) 100%)',
  },

  // ── Method tag (quiz) ──────────────────────
  /** Quiz method tag background gradient */
  methodQuiz: {
    css: 'linear-gradient(90deg, rgb(254,248,224), rgb(254,243,198))',
  },

  // ── Leaderboard ────────────────────────────
  /** "Tu posición" rank banner background: soft blue diagonal */
  userRankBanner: {
    css: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    border: '#bfdbfe',
  },
} as const;
