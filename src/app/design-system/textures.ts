/**
 * @module @axon/design-system/textures
 * @version 1.0.0 — Evolution Premium
 *
 * Premium surface textures: noise grain, subtle gradients,
 * mesh backgrounds, and decorative patterns.
 *
 * These are CSS-in-JS style objects and Tailwind class presets
 * for adding depth and atmosphere to surfaces.
 *
 * Standalone:  import { textures } from '@/app/design-system/textures';
 * Barrel:      import { textures } from '@/app/design-system';
 */

import type { CSSProperties } from 'react';

// ─────────────────────────────────────────────
// TEXTURE TOKENS
// ─────────────────────────────────────────────

export const textures = {
  /** Subtle noise grain overlay — adds organic texture to flat surfaces */
  grain: {
    /** CSS background-image for SVG noise (ultra-light, 4% opacity) */
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
    /** Full style object for applying grain as a pseudo-element background */
    style: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'repeat',
      backgroundSize: '256px 256px',
    } satisfies CSSProperties,
  },

  /** Premium gradient presets */
  gradients: {
    /** Warm ivory gradient — page background enhancement */
    ivoryWarm: 'linear-gradient(135deg, #faf9f6 0%, #f5f0eb 50%, #faf9f6 100%)',
    /** Forest canopy gradient — decorative header/hero */
    forestCanopy: 'linear-gradient(135deg, #2d4a2b 0%, #1B3B36 40%, #1a2e2a 100%)',
    /** Teal to forest — connecting brand teal with forest accents */
    tealForest: 'linear-gradient(135deg, #2a8c7a 0%, #2d4a2b 100%)',
    /** Sage mist — subtle card/section background */
    sageMist: 'linear-gradient(180deg, #faf9f6 0%, #f0efe8 100%)',
    /** Premium dark — sidebar/hero alternative */
    premiumDark: 'linear-gradient(180deg, #1B3B36 0%, #0f2b26 100%)',
    /** Golden hour — warm accent gradient for highlights */
    goldenHour: 'linear-gradient(135deg, #f5f0eb 0%, #ede5d8 100%)',
  },

  /** Decorative dot pattern (very subtle) */
  dots: {
    backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
    backgroundSize: '24px 24px',
    opacity: 0.3,
  },

  /** Mesh background for hero sections */
  mesh: {
    /** Forest mesh — organic gradient for hero backgrounds */
    forest: {
      background: `
        radial-gradient(at 20% 80%, rgba(45, 74, 43, 0.15) 0%, transparent 50%),
        radial-gradient(at 80% 20%, rgba(42, 140, 122, 0.1) 0%, transparent 50%),
        radial-gradient(at 50% 50%, rgba(164, 172, 134, 0.08) 0%, transparent 50%),
        #faf9f6
      `.trim(),
    } satisfies CSSProperties,
    /** Dark forest mesh — for dark hero sections */
    darkForest: {
      background: `
        radial-gradient(at 20% 80%, rgba(42, 140, 122, 0.2) 0%, transparent 50%),
        radial-gradient(at 80% 20%, rgba(45, 74, 43, 0.15) 0%, transparent 50%),
        radial-gradient(at 50% 50%, rgba(107, 143, 94, 0.1) 0%, transparent 50%),
        #1B3B36
      `.trim(),
    } satisfies CSSProperties,
  },

  /** Glass effect presets (used sparingly — for dropdowns/popovers only) */
  glass: {
    /** Light glass — dropdowns, popovers over light surfaces */
    light: 'bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl',
    /** Dark glass — overlays on dark surfaces */
    dark: 'bg-[#1a2e2a]/90 backdrop-blur-xl border border-white/10 shadow-2xl',
  },
} as const;

// ─────────────────────────────────────────────
// STYLE HELPERS
// ─────────────────────────────────────────────

/** Returns CSS properties for a noise grain overlay */
export const grainStyle: CSSProperties = textures.grain.style;

/** Returns CSS properties for the forest mesh background */
export const forestMeshStyle: CSSProperties = textures.mesh.forest;

/** Returns CSS properties for the dark forest mesh background */
export const darkForestMeshStyle: CSSProperties = textures.mesh.darkForest;
