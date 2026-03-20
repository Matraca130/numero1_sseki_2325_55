// ============================================================
// Tests — useFullscreen (source contract)
//
// Verifies the hook's API surface, Fullscreen API usage,
// sessionStorage persistence, ancestor transform clearing,
// requestAnimationFrame scheduling, and ref-based stale
// closure avoidance — all via static source analysis.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(resolve(__dirname, '..', 'useFullscreen.ts'), 'utf-8');

describe('useFullscreen contract', () => {
  // ── Export ───────────────────────────────────────────────
  it('exports useFullscreen function', () => {
    expect(source).toMatch(/export\s+function\s+useFullscreen/);
  });

  it('exports UseFullscreenReturn interface', () => {
    expect(source).toMatch(/export\s+interface\s+UseFullscreenReturn/);
  });

  // ── Return shape ────────────────────────────────────────
  it('returns isFullscreen, toggleFullscreen, and fullscreenRef', () => {
    expect(source).toMatch(/return\s*\{\s*isFullscreen\s*,\s*toggleFullscreen\s*,\s*fullscreenRef\s*\}/);
  });

  it('UseFullscreenReturn declares isFullscreen as boolean', () => {
    expect(source).toContain('isFullscreen: boolean');
  });

  it('UseFullscreenReturn declares toggleFullscreen as () => void', () => {
    expect(source).toContain('toggleFullscreen: () => void');
  });

  it('UseFullscreenReturn declares fullscreenRef as RefObject', () => {
    expect(source).toMatch(/fullscreenRef:\s*React\.RefObject<HTMLDivElement\s*\|\s*null>/);
  });

  // ── Fullscreen API usage ────────────────────────────────
  it('uses requestFullscreen from the Fullscreen API', () => {
    expect(source).toContain('requestFullscreen()');
  });

  it('uses document.exitFullscreen', () => {
    expect(source).toContain('document.exitFullscreen()');
  });

  it('checks document.fullscreenElement before exiting', () => {
    expect(source).toContain('document.fullscreenElement');
  });

  it('checks for Fullscreen API support via document.documentElement.requestFullscreen', () => {
    expect(source).toContain('document.documentElement.requestFullscreen');
  });

  // ── fullscreenchange event listener with cleanup ────────
  it('listens for fullscreenchange events', () => {
    expect(source).toContain("addEventListener('fullscreenchange'");
  });

  it('removes fullscreenchange listener on cleanup', () => {
    expect(source).toContain("removeEventListener('fullscreenchange'");
  });

  // ── sessionStorage for reload persistence ───────────────
  it('uses sessionStorage to persist fullscreen state', () => {
    expect(source).toContain("sessionStorage.setItem('axon_map_fullscreen'");
  });

  it('reads sessionStorage on mount for reload detection', () => {
    expect(source).toContain("sessionStorage.getItem('axon_map_fullscreen')");
  });

  it('removes sessionStorage item on exit', () => {
    expect(source).toContain("sessionStorage.removeItem('axon_map_fullscreen')");
  });

  // ── clearAncestorTransforms ─────────────────────────────
  it('defines clearAncestorTransforms helper that walks DOM ancestors', () => {
    expect(source).toMatch(/function\s+clearAncestorTransforms/);
    expect(source).toContain('el.parentElement');
  });

  it('clearAncestorTransforms checks computed transform !== none', () => {
    expect(source).toContain("getComputedStyle(parent).transform");
    expect(source).toContain("!== 'none'");
  });

  it('clearAncestorTransforms sets transform to none with !important', () => {
    expect(source).toContain("setProperty('transform', 'none', 'important')");
  });

  it('clearAncestorTransforms returns a cleanup that restores original styles', () => {
    expect(source).toContain('node.style.transform = prev');
    expect(source).toContain("node.style.removeProperty('transform')");
  });

  // ── requestAnimationFrame for DOM operations ────────────
  it('uses requestAnimationFrame for DOM updates', () => {
    expect(source).toContain('requestAnimationFrame(');
  });

  it('has cancelAnimationFrame cleanup on unmount/toggle', () => {
    expect(source).toContain('cancelAnimationFrame(');
  });

  // ── Refs to avoid stale closures ────────────────────────
  it('uses isFullscreenRef to track desired state', () => {
    expect(source).toContain('isFullscreenRef');
    expect(source).toMatch(/useRef<boolean|isFullscreenRef\.current/);
  });

  it('uses rafIdRef for animation frame ID', () => {
    expect(source).toContain('rafIdRef');
    expect(source).toMatch(/useRef<number>/);
  });

  it('uses restoreRef for cleanup function', () => {
    expect(source).toContain('restoreRef');
    expect(source).toMatch(/useRef<\(\(\)\s*=>\s*void\)\s*\|\s*null>/);
  });

  // ── React hooks usage ───────────────────────────────────
  it('imports useState, useCallback, useEffect, useRef from React', () => {
    expect(source).toMatch(/import\s*\{[^}]*useState[^}]*\}\s*from\s*'react'/);
    expect(source).toMatch(/import\s*\{[^}]*useCallback[^}]*\}\s*from\s*'react'/);
    expect(source).toMatch(/import\s*\{[^}]*useEffect[^}]*\}\s*from\s*'react'/);
    expect(source).toMatch(/import\s*\{[^}]*useRef[^}]*\}\s*from\s*'react'/);
  });
});
