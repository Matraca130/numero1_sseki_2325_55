// ============================================================
// Contract Tests — MiniKnowledgeGraph
//
// Source-based contract tests using readFileSync + string/regex
// matching to verify structural contracts without importing
// heavy dependencies (G6, etc.).
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(
  resolve(__dirname, '..', 'MiniKnowledgeGraph.tsx'),
  'utf-8',
);

describe('MiniKnowledgeGraph contract', () => {
  // ── Export ─────────────────────────────────────────────────

  it('exports MiniKnowledgeGraph as a named function (not memo-wrapped)', () => {
    expect(source).toMatch(/export\s+function\s+MiniKnowledgeGraph/);
    // Verify it is NOT wrapped in memo
    expect(source).not.toMatch(/export\s+const\s+MiniKnowledgeGraph\s*=\s*memo/);
  });

  // ── G6 Graph constructor ──────────────────────────────────

  it('imports Graph from @antv/g6', () => {
    expect(source).toMatch(/import\s*\{[^}]*Graph[^}]*\}\s*from\s*['"]@antv\/g6['"]/);
  });

  it('creates a G6 Graph instance', () => {
    expect(source).toContain('new Graph(');
  });

  // ── buildNodeStyle helper ─────────────────────────────────

  it('defines buildNodeStyle helper function', () => {
    expect(source).toMatch(/function\s+buildNodeStyle/);
  });

  it('buildNodeStyle uses isFocal parameter for styling', () => {
    expect(source).toContain('isFocal');
  });

  // ── Node click handler ────────────────────────────────────

  it('has click event handler for node click', () => {
    expect(source).toContain("graph.on('node:click'");
  });

  it('unsubscribes click handler on cleanup', () => {
    expect(source).toContain("graph.off('node:click'");
  });

  // ── Mastery color constants ───────────────────────────────

  it('uses MASTERY_HEX for node colors', () => {
    expect(source).toContain('MASTERY_HEX');
    expect(source).toMatch(/import\s*\{[^}]*MASTERY_HEX[^}]*\}\s*from/);
  });

  it('uses MASTERY_HEX_LIGHT for node colors', () => {
    expect(source).toContain('MASTERY_HEX_LIGHT');
    expect(source).toMatch(/import\s*\{[^}]*MASTERY_HEX_LIGHT[^}]*\}\s*from/);
  });

  // ── truncateLabel ─────────────────────────────────────────

  it('uses truncateLabel for label display', () => {
    expect(source).toContain('truncateLabel');
    expect(source).toMatch(/import\s*\{[^}]*truncateLabel[^}]*\}\s*from/);
  });

  // ── Cleanup: graph.destroy ────────────────────────────────

  it('destroys graph in useEffect cleanup', () => {
    expect(source).toContain('graph.destroy()');
  });

  it('nulls graphRef on destroy', () => {
    expect(source).toContain('graphRef.current = null');
  });

  // ── containerRef for DOM mounting ─────────────────────────

  it('has containerRef for DOM mounting', () => {
    expect(source).toContain('containerRef');
    expect(source).toContain('ref={containerRef}');
  });

  // ── Layout ────────────────────────────────────────────────

  it('uses a layout type for graph positioning', () => {
    // The component uses radial layout
    expect(source).toMatch(/layout:\s*\{[^}]*type:\s*['"]radial['"]/s);
  });

  // ── onNodeClickRef pattern ────────────────────────────────

  it('uses onNodeClickRef to avoid stale closures', () => {
    expect(source).toContain('onNodeClickRef');
    expect(source).toContain('onNodeClickRef.current = onNodeClick');
  });

  // ── ResizeObserver ────────────────────────────────────────

  it('uses ResizeObserver for responsive resizing', () => {
    expect(source).toContain('ResizeObserver');
    expect(source).toContain('ro.observe(container)');
    expect(source).toContain('ro.disconnect()');
  });

  // ── Accessibility ─────────────────────────────────────────

  it('has aria-label in Spanish for the container', () => {
    expect(source).toMatch(/aria-label=\{?[`"'].*Mini mapa de conocimiento/);
  });

  it('has aria-roledescription for graph semantics', () => {
    expect(source).toContain('aria-roledescription="grafo de conocimiento"');
  });
});
