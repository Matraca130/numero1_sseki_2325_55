/**
 * @module @axon/design-system/colors
 * @version 2.0.0
 *
 * AUDIT v3 — Palette compliance (Axon Medical Academy):
 *   - Dark surfaces: Dark Teal #1B3B36, Dark Panel #1a2e2a
 *   - Primary interaction: Teal Accent #2a8c7a, Hover Teal #244e47
 *   - Progress gradient: #2dd4a8 → #0d9488
 *   - Page BG: #F0F2F5
 *
 * Standalone:  import { colors } from '@/app/design-system/colors';
 * Barrel:      import { colors } from '@/app/design-system';
 */

// ─────────────────────────────────────────────
// COLOR TOKENS
// ─────────────────────────────────────────────

export const colors = {
  /** Cor primaria de interacao — Axon Medical Academy palette */
  primary: {
    50:  '#e8f5f1',   // Teal tint — fundo de icones
    100: '#d1f0e7',   // Teal soft
    200: '#b3ddd2',   // Teal border
    300: '#5cbdaa',   // Label "Concluido"
    400: '#2dd4a8',   // Progress gradient start
    500: '#2a8c7a',   // Teal Accent — botoes, badges, progresso
    600: '#244e47',   // Hover Teal — botoes hover, texto ativo
    700: '#1B3B36',   // Dark Teal — header, sidebar outer
    800: '#1a2e2a',   // Dark Panel — sidebar body
    900: '#0f2b26',   // Deepest dark (hero gradient end)
  },

  /** Sidebar e header escuro — Axon Dark Teal */
  dark: {
    navBar:       '#1B3B36',   // Header top bar (Axon Dark Teal)
    sidebarBase:  '#1B3B36',   // Sidebar outer shell (Axon Dark Teal)
    sidebarBody:  '#1a2e2a',   // Sidebar content area (Axon Dark Panel)
    cardDark:     '#1a2e2a',   // Performance card (Axon Dark Panel)
  },

  /** Backgrounds de pagina */
  surface: {
    page:       '#f0f2f5',     // bg-[#F0F2F5] — fundo geral
    dashboard:  '#F0F2F5',     // fundo do dashboard (aligned to palette.ts)
    card:       '#ffffff',     // bg-white — cards
    hover:      '#f3f4f6',     // bg-gray-100 — hover states
  },

  /** Bordas e divisores */
  border: {
    card:     '#e5e7eb',       // border-gray-200
    subtle:   'rgba(229,231,235,0.6)', // border-gray-200/60
    dark:     'rgba(255,255,255,0.1)', // border overlay on dark
    darkAlt:  'rgba(255,255,255,0.05)',
  },

  /** Texto */
  text: {
    primary:   '#111827',      // text-gray-900
    secondary: '#6b7280',      // text-gray-500
    tertiary:  '#9ca3af',      // text-gray-400
    disabled:  '#d1d5db',      // text-gray-300
    inverse:   '#ffffff',      // text-white
  },

  /** Semantic / status */
  semantic: {
    success:  '#10b981',       // emerald-500
    warning:  '#f59e0b',       // amber-500
    error:    '#ef4444',       // red-500
    info:     '#06b6d4',       // cyan-500
  },

  /** Mastery / spaced repetition levels */
  mastery: {
    notStarted: '#d1d5db',     // gray-300
    learning:   '#fbbf24',     // yellow-400
    reviewing:  '#2a8c7a',     // Axon Teal Accent
    mastered:   '#0d9488',     // Axon Progress End
  },

  /** Rating scale (flashcard self-assessment) */
  ratings: {
    1: '#f43f5e',  // rose-500     — Nao sei
    2: '#f97316',  // orange-500   — Dificil
    3: '#facc15',  // yellow-400   — Medio
    4: '#84cc16',  // lime-500     — Facil
    5: '#10b981',  // emerald-500  — Perfeito
  } as Record<number, string>,

  /** Cores de acento por disciplina (bg-*) */
  courseAccents: {
    anatomy:   { bg: 'bg-rose-400',   text: 'text-rose-400' },
    histology: { bg: 'bg-indigo-500', text: 'text-indigo-500' },
  } as Record<string, { bg: string; text: string }>,

  /** Chart palette — Axon derivatives */
  chart: {
    flashcards: '#2a8c7a',     // Axon Teal Accent
    videos:     '#06b6d4',     // cyan-500
    bar:        '#0d9488',     // Axon Progress End
    grid:       '#f3f4f6',     // gray-100
  },
} as const;
