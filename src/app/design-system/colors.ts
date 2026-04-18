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
    350: '#3cc9a8',   // Mid-teal — KeyPoint icon/text, ComparisonBlock highlight
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
    sidebarTextInactive: '#8fbfb3',  // Sidebar nav text inactive
    sidebarSubtitle:     '#6db5a5',  // Sidebar logo subtitle / section labels
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

  /** Mastery / spaced repetition levels — Delta Mastery Scale */
  mastery: {
    descubrir:   '#a1a1aa',  // zinc-400 — Por descubrir
    emergente:   '#ef4444',  // red-500 — Emergente
    enProgreso:  '#f59e0b',  // amber-500 — En progreso
    consolidado: '#10b981',  // emerald-500 — Consolidado
    maestria:    '#3b82f6',  // blue-500 — Maestria
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

  /** Reader toolbar — Axon Dark Teal derivatives */
  reader: {
    headerBg:     '#1B3B36',   // Dark Teal — same as dark.navBar
    headerBgDark: '#0d0e11',   // Near-black for dark mode
    iconDefault:  '#b4d9d1',   // Muted teal — toolbar icons
    iconSubtle:   '#8cb8af',   // Dimmer teal — dates, metadata
    iconActive:   '#6ee7b7',   // Emerald-300 — completed state
  },

  /** Unified z-index scale for the student reader surface.
   *  Keep layers explicit to avoid "z-index soup": toolbar < sidebar rail <
   *  drawer backdrop < drawer < popovers < floating widgets < modals < focus-exit. */
  zIndex: {
    toolbar:         100,  // Sticky top header (SummaryReaderToolbar)
    sidebarRail:     105,  // Collapsed 52px rail (desktop)
    drawerBackdrop:  114,  // Darkening layer behind slide-in drawers
    drawer:          115,  // Mobile sidebar drawer / outline overlay
    popover:         140,  // Bookmarks, ReadingSettings dropdown
    floatingWidget:  400,  // StudyTimer, StickyNotes (draggable widgets)
    modal:           500,  // Full-screen modals (BlockQuiz, ImageLightbox)
    focusExit:       600,  // Focus-mode exit button (highest)
  },
} as const;
