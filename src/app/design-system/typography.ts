/**
 * @module @axon/design-system/typography
 * @version 2.0.0 — Evolution Premium
 *
 * Sistema tipografico premium inspirado en Forest Canopy theme.
 * Playfair Display (heading), Inter (body), DM Sans (display), Lora (editorial).
 *
 * Standalone:  import { typography, headingStyle, bodyStyle, displayStyle } from '@/app/design-system/typography';
 * Barrel:      import { headingStyle, displayStyle } from '@/app/design-system';
 */

import type { CSSProperties } from 'react';

// ─────────────────────────────────────────────
// TYPOGRAPHY TOKENS
// ─────────────────────────────────────────────

export const typography = {
  /** Familias tipograficas — Evolution Premium */
  families: {
    /** Premium serif for headings — luxurious, editorial feel */
    heading: '"Playfair Display", Georgia, serif',
    /** Clean sans-serif for body text — highly legible */
    body: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    /** Geometric sans for display/hero — modern, premium */
    display: '"DM Sans", "Inter", system-ui, sans-serif',
    /** Warm serif for editorial/prose content */
    editorial: '"Lora", Georgia, serif',
    /** Monospace for code blocks */
    mono: '"JetBrains Mono", monospace',
  },

  /** Google Fonts import URLs (loaded via index.html link tags) */
  imports: [
    'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700&display=swap',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&display=swap',
    'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap',
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap',
  ],

  /** Tailwind CSS variable name */
  cssVariable: '--font-sans',

  /** Reglas de uso — Evolution Premium */
  rules: {
    pageTitle: {
      family: 'heading' as const,
      style: "fontFamily: '\"Playfair Display\", Georgia, serif'",
      size: 'text-[clamp(2rem,4vw,3rem)]',
      weight: 'font-bold',
      tracking: 'tracking-tight',
    },
    sectionTitle: {
      family: 'heading' as const,
      style: "fontFamily: '\"Playfair Display\", Georgia, serif'",
      size: 'text-lg',
      weight: 'font-semibold',
    },
    sectionLabel: {
      family: 'display' as const,
      style: "fontFamily: '\"DM Sans\", sans-serif'",
      size: 'text-sm',
      weight: 'font-semibold',
      extra: 'uppercase tracking-wide',
    },
    cardTitle: {
      family: 'heading' as const,
      style: "fontFamily: '\"Playfair Display\", Georgia, serif'",
      size: 'default',
      weight: 'font-bold',
    },
    heroTitle: {
      family: 'heading' as const,
      style: "fontFamily: '\"Playfair Display\", Georgia, serif'",
      size: 'text-[clamp(2.5rem,5vw,4rem)]',
      weight: 'font-black',
      tracking: 'tracking-tight',
    },
    heroSubtitle: {
      family: 'display' as const,
      style: "fontFamily: '\"DM Sans\", sans-serif'",
      size: 'text-[clamp(1rem,2vw,1.25rem)]',
      weight: 'font-medium',
      tracking: 'tracking-normal',
    },
    body: {
      family: 'body' as const,
      style: "fontFamily: 'Inter'",
      size: 'text-sm',
      weight: 'font-medium',
    },
    caption: {
      family: 'body' as const,
      style: "fontFamily: 'Inter'",
      size: 'text-xs',
      weight: 'font-medium',
    },
    label: {
      family: 'display' as const,
      style: "fontFamily: '\"DM Sans\", sans-serif'",
      size: 'text-[10px]',
      weight: 'font-semibold',
      extra: 'uppercase tracking-wider',
    },
    editorial: {
      family: 'editorial' as const,
      style: "fontFamily: '\"Lora\", Georgia, serif'",
      size: 'text-base',
      weight: 'font-normal',
      extra: 'leading-relaxed',
    },
  },
} as const;

// ─────────────────────────────────────────────
// STYLE HELPERS
// ─────────────────────────────────────────────

/** Inline style for heading typography (Playfair Display) */
export const headingStyle: CSSProperties = { fontFamily: typography.families.heading };

/** Inline style for body typography (Inter) */
export const bodyStyle: CSSProperties = { fontFamily: typography.families.body };

/** Inline style for display typography (DM Sans) */
export const displayStyle: CSSProperties = { fontFamily: typography.families.display };

/** Inline style for editorial typography (Lora) */
export const editorialStyle: CSSProperties = { fontFamily: typography.families.editorial };

/** Inline style for hero titles (Playfair Display, extra bold) */
export const heroStyle: CSSProperties = {
  fontFamily: typography.families.heading,
  fontWeight: 900,
  letterSpacing: '-0.02em',
};
