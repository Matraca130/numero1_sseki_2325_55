// ============================================================
// Tests -- GraphSkeleton contract tests
//
// Source-contract tests for the GraphSkeleton component:
//   - Module exports (named, no default)
//   - Props interface contract
//   - Variant behavior (default vs mini)
//   - Node/edge counts per variant
//   - SVG viewBox per variant
//   - Label indices per variant
//   - prefers-reduced-motion support
//   - Shimmer gradient animation
//   - Accessibility (role="status", aria-hidden on SVG)
//   - Label rendering logic
//   - useId for SVG-safe gradient ID
//   - i18n strings (Spanish)
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const COMPONENT_PATH = resolve(__dirname, '..', 'GraphSkeleton.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// ── Module exports ──────────────────────────────────────────

describe('GraphSkeleton: module exports', () => {
  it('exports GraphSkeleton as a named function', () => {
    expect(source).toMatch(/export\s+function\s+GraphSkeleton/);
  });

  it('has no default export', () => {
    expect(source).not.toMatch(/export\s+default/);
  });
});

// ── Props interface ─────────────────────────────────────────

describe('GraphSkeleton: props interface', () => {
  it('accepts optional label with default "Cargando mapa de conocimiento..."', () => {
    expect(source).toContain('label?: string');
    expect(source).toContain("label = 'Cargando mapa de conocimiento...'");
  });

  it('accepts optional className with default empty string', () => {
    expect(source).toContain('className?: string');
    expect(source).toContain("className = ''");
  });

  it('accepts optional variant: default or mini', () => {
    expect(source).toMatch(/variant\?\s*:\s*'default'\s*\|\s*'mini'/);
    expect(source).toContain("variant = 'default'");
  });
});

// ── Node and edge data ──────────────────────────────────────

describe('GraphSkeleton: node and edge counts', () => {
  it('defines 8 default NODES', () => {
    const nodeMatches = source.match(/const\s+NODES\s*=\s*\[([\s\S]*?)\];/);
    expect(nodeMatches).not.toBeNull();
    const count = (nodeMatches![1].match(/\{/g) || []).length;
    expect(count).toBe(8);
  });

  it('defines 5 MINI_NODES', () => {
    const nodeMatches = source.match(/const\s+MINI_NODES\s*=\s*\[([\s\S]*?)\];/);
    expect(nodeMatches).not.toBeNull();
    const count = (nodeMatches![1].match(/\{/g) || []).length;
    expect(count).toBe(5);
  });

  it('defines 10 default EDGES', () => {
    const edgeMatches = source.match(/const\s+EDGES:\s*\[number,\s*number\]\[\]\s*=\s*\[([\s\S]*?)\];/);
    expect(edgeMatches).not.toBeNull();
    const count = (edgeMatches![1].match(/\[/g) || []).length;
    expect(count).toBe(10);
  });

  it('defines 5 MINI_EDGES', () => {
    const edgeMatches = source.match(/const\s+MINI_EDGES:\s*\[number,\s*number\]\[\]\s*=\s*\[([\s\S]*?)\];/);
    expect(edgeMatches).not.toBeNull();
    const count = (edgeMatches![1].match(/\[/g) || []).length;
    expect(count).toBe(5);
  });
});

// ── Variant behavior ────────────────────────────────────────

describe('GraphSkeleton: variant behavior', () => {
  it('selects MINI_NODES when variant is mini', () => {
    expect(source).toContain('isMini ? MINI_NODES : NODES');
  });

  it('selects MINI_EDGES when variant is mini', () => {
    expect(source).toContain('isMini ? MINI_EDGES : EDGES');
  });

  it('uses viewBox 0 0 280 110 for mini variant', () => {
    expect(source).toContain("isMini ? '0 0 280 110' : '0 0 400 260'");
  });

  it('uses label indices [0,1,3] for mini variant', () => {
    expect(source).toContain('isMini ? [0, 1, 3] : [0, 1, 3, 4, 6]');
  });

  it('uses thinner stroke (1) for mini variant edges', () => {
    expect(source).toContain('isMini ? 1 : 1.5');
  });
});

// ── Wrapper styling per variant ─────────────────────────────

describe('GraphSkeleton: wrapper styling', () => {
  it('mini variant uses rounded-xl and bg-gray-50', () => {
    expect(source).toMatch(/isMini[\s\S]*?bg-gray-50[\s\S]*?rounded-xl/);
  });

  it('default variant uses rounded-2xl and shadow-sm', () => {
    expect(source).toMatch(/rounded-2xl[\s\S]*?shadow-sm/);
  });

  it('default variant has min-h responsive breakpoints', () => {
    expect(source).toContain('min-h-[180px]');
    expect(source).toContain('sm:min-h-[300px]');
  });
});

// ── SVG-safe gradient ID ────────────────────────────────────

describe('GraphSkeleton: unique gradient ID', () => {
  it('uses useId from React', () => {
    expect(source).toMatch(/import\s*\{[^}]*useId[^}]*\}\s*from\s*'react'/);
  });

  it('replaces colons with underscores for SVG-safe ID', () => {
    expect(source).toContain(".replace(/:/g, '_')");
  });

  it('prefixes gradient ID with skeleton-shimmer-', () => {
    expect(source).toContain('`skeleton-shimmer-${uniqueId}`');
  });
});

// ── prefers-reduced-motion ──────────────────────────────────

describe('GraphSkeleton: prefers-reduced-motion', () => {
  it('queries prefers-reduced-motion media', () => {
    expect(source).toContain("'(prefers-reduced-motion: reduce)'");
  });

  it('initializes state from matchMedia on mount', () => {
    expect(source).toMatch(/useState\s*\(\s*\(\)\s*=>\s*\n?\s*typeof\s+window\s*!==\s*'undefined'\s*&&\s*window\.matchMedia/);
  });

  it('listens for changes to reduced-motion preference', () => {
    expect(source).toContain("mql.addEventListener('change', onChange)");
  });

  it('cleans up the matchMedia listener', () => {
    expect(source).toContain("mql.removeEventListener('change', onChange)");
  });

  it('only renders animateTransform when motion is allowed', () => {
    expect(source).toContain('!prefersReducedMotion');
    expect(source).toContain('animateTransform');
  });
});

// ── Shimmer gradient ────────────────────────────────────────

describe('GraphSkeleton: shimmer gradient', () => {
  it('uses a linearGradient sweeping left-to-right', () => {
    expect(source).toContain('linearGradient');
    expect(source).toContain('x1="0%"');
    expect(source).toContain('x2="100%"');
  });

  it('animates gradient transform from -1 to 1', () => {
    expect(source).toContain('from="-1 0"');
    expect(source).toContain('to="1 0"');
  });

  it('uses 1.8s duration for shimmer cycle', () => {
    expect(source).toContain('dur="1.8s"');
  });

  it('repeats shimmer indefinitely', () => {
    expect(source).toContain('repeatCount="indefinite"');
  });

  it('fills nodes with the gradient', () => {
    expect(source).toContain('fill={`url(#${gradientId})`}');
  });
});

// ── SVG structure ───────────────────────────────────────────

describe('GraphSkeleton: SVG structure', () => {
  it('renders edges as line elements', () => {
    expect(source).toContain('<line');
    expect(source).toContain('strokeLinecap="round"');
  });

  it('renders nodes as circle elements', () => {
    expect(source).toContain('<circle');
  });

  it('renders label placeholders as rect elements', () => {
    expect(source).toContain('<rect');
    expect(source).toContain('rx={h / 2}');
  });

  it('alternates node stroke color based on index parity', () => {
    expect(source).toContain("i % 2 === 0 ? '#d1d5db' : '#e5e7eb'");
  });
});

// ── Label rendering ─────────────────────────────────────────

describe('GraphSkeleton: label rendering', () => {
  it('only renders label text in default variant', () => {
    expect(source).toContain('label && !isMini');
  });

  it('renders label in a paragraph element', () => {
    expect(source).toContain('<p className=');
    expect(source).toContain('{label}</p>');
  });

  it('uses animate-pulse with motion-reduce override', () => {
    expect(source).toContain('animate-pulse motion-reduce:animate-none');
  });
});

// ── Accessibility ───────────────────────────────────────────

describe('GraphSkeleton: accessibility', () => {
  it('uses role="status" on wrapper div', () => {
    expect(source).toContain('role="status"');
  });

  it('has aria-label falling back to "Cargando grafo"', () => {
    expect(source).toContain("aria-label={label || 'Cargando grafo'}");
  });

  it('marks SVG as aria-hidden', () => {
    expect(source).toContain('aria-hidden="true"');
  });
});

// ── i18n strings (Spanish) ──────────────────────────────────

describe('GraphSkeleton: i18n strings', () => {
  it('contains default loading label in Spanish', () => {
    expect(source).toContain('Cargando mapa de conocimiento...');
  });

  it('contains fallback aria-label in Spanish', () => {
    expect(source).toContain('Cargando grafo');
  });
});

// ── Dependencies ────────────────────────────────────────────

describe('GraphSkeleton: dependencies', () => {
  it('imports useId, useState, useEffect from react', () => {
    expect(source).toMatch(/import\s*\{[^}]*useId[^}]*useState[^}]*useEffect[^}]*\}\s*from\s*'react'/);
  });

  it('has no external library dependencies', () => {
    // GraphSkeleton only imports from react — no motion, lucide, etc.
    const importLines = source.split('\n').filter(l => l.startsWith('import'));
    expect(importLines).toHaveLength(1);
    expect(importLines[0]).toContain("from 'react'");
  });
});
