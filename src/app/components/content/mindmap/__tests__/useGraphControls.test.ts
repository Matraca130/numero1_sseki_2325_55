// ============================================================
// Tests — useGraphControls (source contract)
//
// Verifies the hook's API surface: 7 handler functions,
// useCallback usage, ref delegation, try/catch for async
// exports, and toast.error on failure.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(resolve(__dirname, '..', 'useGraphControls.ts'), 'utf-8');

describe('useGraphControls contract', () => {
  // ── Export ───────────────────────────────────────────────
  it('exports useGraphControls function', () => {
    expect(source).toMatch(/export\s+function\s+useGraphControls/);
  });

  it('accepts a RefObject<GraphControls | null> parameter', () => {
    expect(source).toMatch(/useGraphControls\s*\(\s*ref\s*:\s*RefObject<GraphControls\s*\|\s*null>/);
  });

  // ── Returns all 7 handler functions ─────────────────────
  it('returns handleZoomIn', () => {
    expect(source).toContain('handleZoomIn');
  });

  it('returns handleZoomOut', () => {
    expect(source).toContain('handleZoomOut');
  });

  it('returns handleFitView', () => {
    expect(source).toContain('handleFitView');
  });

  it('returns handleCollapseAll', () => {
    expect(source).toContain('handleCollapseAll');
  });

  it('returns handleExpandAll', () => {
    expect(source).toContain('handleExpandAll');
  });

  it('returns handleExportPNG', () => {
    expect(source).toContain('handleExportPNG');
  });

  it('returns handleExportJPEG', () => {
    expect(source).toContain('handleExportJPEG');
  });

  it('returns all 7 handlers in the return object', () => {
    expect(source).toMatch(
      /return\s*\{\s*handleZoomIn\s*,\s*handleZoomOut\s*,\s*handleFitView\s*,\s*handleCollapseAll\s*,\s*handleExpandAll\s*,\s*handleExportPNG\s*,\s*handleExportJPEG\s*\}/
    );
  });

  // ── useCallback for stable references ───────────────────
  it('imports useCallback from React', () => {
    expect(source).toMatch(/import\s*\{[^}]*useCallback[^}]*\}\s*from\s*'react'/);
  });

  it('wraps each handler in useCallback (7 occurrences)', () => {
    const matches = source.match(/useCallback\s*\(/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(7);
  });

  // ── Delegates to ref.current methods ────────────────────
  it('delegates zoomIn to ref.current', () => {
    expect(source).toContain('ref.current?.zoomIn()');
  });

  it('delegates zoomOut to ref.current', () => {
    expect(source).toContain('ref.current?.zoomOut()');
  });

  it('delegates fitView to ref.current', () => {
    expect(source).toContain('ref.current?.fitView()');
  });

  it('delegates collapseAll to ref.current', () => {
    expect(source).toContain('ref.current?.collapseAll()');
  });

  it('delegates expandAll to ref.current', () => {
    expect(source).toContain('ref.current?.expandAll()');
  });

  it('delegates exportPNG to ref.current', () => {
    expect(source).toContain('ref.current?.exportPNG()');
  });

  it('delegates exportJPEG to ref.current', () => {
    expect(source).toContain('ref.current?.exportJPEG()');
  });

  // ── try/catch for async export methods ──────────────────
  it('has try/catch around PNG export', () => {
    expect(source).toMatch(/try\s*\{\s*await\s+ref\.current\?\.exportPNG\(\)/);
  });

  it('has try/catch around JPEG export', () => {
    expect(source).toMatch(/try\s*\{\s*await\s+ref\.current\?\.exportJPEG\(\)/);
  });

  // ── toast.error on export failure ───────────────────────
  it('imports toast from sonner', () => {
    expect(source).toMatch(/import\s*\{[^}]*toast[^}]*\}\s*from\s*'sonner'/);
  });

  it('shows toast.error for PNG export failure', () => {
    expect(source).toContain("toast.error('No se pudo exportar como PNG')");
  });

  it('shows toast.error for JPEG export failure', () => {
    expect(source).toContain("toast.error('No se pudo exportar como JPEG')");
  });

  // ── GraphControls type import ───────────────────────────
  it('imports GraphControls type from mindmap types', () => {
    expect(source).toMatch(/import\s+type\s*\{[^}]*GraphControls[^}]*\}/);
  });

  // ── Export handlers use async for export methods ────────
  it('handleExportPNG is async', () => {
    expect(source).toMatch(/useCallback\s*\(\s*async\s*\(\)\s*=>\s*\{[^}]*exportPNG/);
  });

  it('handleExportJPEG is async', () => {
    expect(source).toMatch(/useCallback\s*\(\s*async\s*\(\)\s*=>\s*\{[^}]*exportJPEG/);
  });
});
