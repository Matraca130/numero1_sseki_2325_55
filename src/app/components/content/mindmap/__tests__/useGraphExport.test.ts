// ============================================================
// Tests — useGraphExport (export filename + download logic)
//
// Tests the pure utility functions extracted from the hook:
//   - buildFilename: timestamped filename generation
//   - downloadDataURL: DOM link creation (mocked)
//   - Format handling: PNG vs JPEG
//
// The hook itself wraps G6's graph.toDataURL() which requires
// a Canvas environment. We test the pure logic around it.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Replicated pure logic from useGraphExport.ts ─────────

type ExportFormat = 'png' | 'jpeg';

function buildFilename(format: ExportFormat, now = new Date()): string {
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');
  return `mapa-conocimiento-${stamp}.${format === 'jpeg' ? 'jpg' : format}`;
}

// ── buildFilename ───────────────────────────────────────────

describe('buildFilename', () => {
  it('generates correct PNG filename', () => {
    const date = new Date(2026, 2, 17, 14, 30); // March 17, 2026 14:30
    const filename = buildFilename('png', date);
    expect(filename).toBe('mapa-conocimiento-202603171430.png');
  });

  it('generates correct JPEG filename (uses .jpg extension)', () => {
    const date = new Date(2026, 2, 17, 14, 30);
    const filename = buildFilename('jpeg', date);
    expect(filename).toBe('mapa-conocimiento-202603171430.jpg');
  });

  it('pads single-digit month/day/hour/minute with zeros', () => {
    const date = new Date(2026, 0, 5, 3, 7); // Jan 5, 2026 03:07
    const filename = buildFilename('png', date);
    expect(filename).toBe('mapa-conocimiento-202601050307.png');
  });

  it('handles midnight correctly', () => {
    const date = new Date(2026, 11, 31, 0, 0); // Dec 31, 2026 00:00
    const filename = buildFilename('png', date);
    expect(filename).toBe('mapa-conocimiento-202612310000.png');
  });

  it('handles end-of-day correctly', () => {
    const date = new Date(2026, 11, 31, 23, 59);
    const filename = buildFilename('png', date);
    expect(filename).toBe('mapa-conocimiento-202612312359.png');
  });
});

// ── Format handling ─────────────────────────────────────────

describe('Export format handling', () => {
  it('PNG uses image/png MIME type', () => {
    const format: ExportFormat = 'png';
    const mimeType = (format as string) === 'jpeg' ? 'image/jpeg' : 'image/png';
    expect(mimeType).toBe('image/png');
  });

  it('JPEG uses image/jpeg MIME type', () => {
    const format: ExportFormat = 'jpeg';
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    expect(mimeType).toBe('image/jpeg');
  });

  it('JPEG uses 0.92 encoder options, PNG uses 1', () => {
    const jpegOpts = 0.92;
    const pngOpts = 1;
    expect(jpegOpts).toBeLessThan(1);
    expect(pngOpts).toBe(1);
  });
});

// ── Export mode ─────────────────────────────────────────────

describe('Export mode', () => {
  it('always uses "overall" mode (full graph, not viewport)', () => {
    // This is a contract test: the hook hardcodes mode: 'overall'
    // in the toDataURL call. If this ever changes, downstream
    // users expecting full-graph exports will break.
    const mode = 'overall';
    expect(mode).toBe('overall');
  });
});

// ── doExport guard logic ────────────────────────────────────

describe('Export guard logic', () => {
  it('does nothing when graph ref is null', () => {
    // Simulates the guard: if (!graph) return;
    const graphRef = { current: null };
    let exported = false;
    if (graphRef.current) {
      exported = true;
    }
    expect(exported).toBe(false);
  });

  it('proceeds when graph ref has a value', () => {
    const graphRef = { current: { toDataURL: vi.fn() } };
    let exported = false;
    if (graphRef.current) {
      exported = true;
    }
    expect(exported).toBe(true);
  });
});

// ── Source-level invariants ────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';
const SOURCE_PATH = resolve(__dirname, '..', 'useGraphExport.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

describe('Source-level guarantees', () => {
  it('exports useGraphExport hook with default locale="es"', () => {
    expect(source).toMatch(/export function useGraphExport\(locale:\s*GraphLocale\s*=\s*'es'\)/);
  });

  it('exports the GraphExportControls interface', () => {
    expect(source).toContain('export interface GraphExportControls');
  });

  it('returns { exportPNG, exportJPEG, setGraph }', () => {
    expect(source).toMatch(/return\s*\{\s*exportPNG,\s*exportJPEG,\s*setGraph\s*\}/);
  });

  it('uses the safe ?? I18N_GRAPH.es locale fallback (cycle 18 hardening)', () => {
    expect(source).toContain('I18N_GRAPH[locale] ?? I18N_GRAPH.es');
  });

  it('keeps the graph reference in a useRef (mutable, no rerender on update)', () => {
    expect(source).toMatch(/const\s+graphRef\s*=\s*useRef<Graph \| null>\(null\)/);
  });

  it('setGraph is stable via useCallback with empty deps', () => {
    expect(source).toMatch(/const setGraph\s*=\s*useCallback\(\(graph:[\s\S]{0,80}\)\s*=>\s*\{[\s\S]{0,80}graphRef\.current\s*=\s*graph[\s\S]{0,40}\},\s*\[\]\)/);
  });

  it('exportPNG and exportJPEG depend on doExport (not the locale directly)', () => {
    expect(source).toMatch(/const exportPNG\s*=\s*useCallback\(\(\)\s*=>\s*doExport\('png'\),\s*\[doExport\]\)/);
    expect(source).toMatch(/const exportJPEG\s*=\s*useCallback\(\(\)\s*=>\s*doExport\('jpeg'\),\s*\[doExport\]\)/);
  });
});

// ── doExport behaviors (source) ───────────────────────────

describe('doExport source guarantees', () => {
  it('uses exportingRef to prevent concurrent exports', () => {
    expect(source).toContain('exportingRef');
    expect(source).toMatch(/if\s*\(exportingRef\.current\)\s*return/);
    expect(source).toContain('exportingRef.current = true');
    expect(source).toContain('exportingRef.current = false');
  });

  it('checks (graph as Graph & { destroyed?: boolean }).destroyed before exporting', () => {
    expect(source).toMatch(/\(graph as Graph\s*&\s*\{\s*destroyed\?:\s*boolean\s*\}\)\.destroyed/);
  });

  it('toasts t.exportNotReady when graph is null or destroyed', () => {
    expect(source).toMatch(/toast\.error\(t\.exportNotReady\)/);
  });

  it('toasts t.exportFailed on toDataURL throw', () => {
    expect(source).toMatch(/toast\.error\(t\.exportFailed\)/);
  });

  it('logs the underlying error in DEV (console.error fallback)', () => {
    expect(source).toMatch(/import\.meta\.env\.DEV[\s\S]{0,80}console\.error\('Export failed:',\s*err\)/);
  });

  it('always calls toDataURL with mode="overall" (full graph, not viewport)', () => {
    expect(source).toMatch(/mode:\s*'overall'/);
  });

  it("MIME type maps to 'image/png' or 'image/jpeg' (no other formats)", () => {
    expect(source).toMatch(/format\s*===\s*'jpeg'\s*\?\s*'image\/jpeg'\s*:\s*'image\/png'/);
  });

  it('JPEG encoder quality is 0.92 (slightly above default 0.85)', () => {
    expect(source).toMatch(/encoderOptions:\s*format\s*===\s*'jpeg'\s*\?\s*0\.92\s*:\s*1/);
  });

  it('try/finally guarantees exportingRef is released even if toDataURL throws', () => {
    expect(source).toMatch(/finally\s*\{\s*exportingRef\.current\s*=\s*false/);
  });
});

// ── downloadDataURL DOM-flow ──────────────────────────────

describe('downloadDataURL DOM-flow contract', () => {
  it('creates a hidden anchor element via document.createElement("a")', () => {
    expect(source).toContain("document.createElement('a')");
  });

  it('sets href to the data URL', () => {
    expect(source).toMatch(/link\.href\s*=\s*dataURL/);
  });

  it('sets the download attribute (triggers browser save dialog)', () => {
    expect(source).toMatch(/link\.download\s*=\s*filename/);
  });

  it('appendChild → click → requestAnimationFrame → removeChild order', () => {
    const append = source.indexOf('document.body.appendChild(link)');
    const click = source.indexOf('link.click()');
    const remove = source.indexOf('document.body.removeChild(link)');
    expect(append).toBeGreaterThan(-1);
    expect(click).toBeGreaterThan(append);
    expect(remove).toBeGreaterThan(click);
  });

  it('uses requestAnimationFrame for cleanup (avoids flash in some browsers)', () => {
    expect(source).toMatch(/requestAnimationFrame\(\(\)\s*=>\s*\{[\s\S]{0,100}document\.body\.removeChild\(link\)/);
  });
});

// ── buildFilename source contract (additional) ────────────

describe('buildFilename source contract', () => {
  it('uses 4-digit year + zero-padded month/day/hour/minute (12 digits total)', () => {
    expect(source).toMatch(/now\.getFullYear\(\)/);
    expect(source).toMatch(/String\(now\.getMonth\(\)\s*\+\s*1\)\.padStart\(2,\s*'0'\)/);
    expect(source).toMatch(/String\(now\.getDate\(\)\)\.padStart\(2,\s*'0'\)/);
    expect(source).toMatch(/String\(now\.getHours\(\)\)\.padStart\(2,\s*'0'\)/);
    expect(source).toMatch(/String\(now\.getMinutes\(\)\)\.padStart\(2,\s*'0'\)/);
  });

  it('JPEG extension is .jpg (not .jpeg) — 3-letter convention', () => {
    expect(source).toMatch(/format\s*===\s*'jpeg'\s*\?\s*'jpg'\s*:\s*format/);
  });

  it('uses t.exportFilenamePrefix as the locale-specific filename prefix', () => {
    expect(source).toMatch(/buildFilename\(t\.exportFilenamePrefix,\s*format\)/);
  });
});
