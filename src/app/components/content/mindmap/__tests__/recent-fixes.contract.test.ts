// ============================================================
// Tests — Recent Fixes Contract Tests
//
// Verifies recent bug fixes via source-level contract checks:
//   1. useFullscreen: isFullscreenRef synced in handleChange
//   2. useKeyboardNav: applyFocusRing merges states
//   3. useSpacePan: focusout checks relatedTarget
//   4. MapComparisonPanel: no aria-modal, text-gray-500 for %
//   5. ChangeHistoryPanel: no aria-modal on side panel
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const BASE = resolve(__dirname, '..');

function readSource(name: string): string {
  return readFileSync(resolve(BASE, name), 'utf-8');
}

// ── useFullscreen: isFullscreenRef synced in handleChange ────

describe('useFullscreen — handleChange syncs isFullscreenRef', () => {
  const source = readSource('useFullscreen.ts');

  it('sets isFullscreenRef.current = false in fullscreenchange handler', () => {
    // The handleChange function must sync the ref when exiting
    // via browser ESC, so toggleFullscreen reads correct state
    expect(source).toContain('isFullscreenRef.current = false');
  });

  it('handleChange also calls setIsFullscreen(false)', () => {
    // Both ref and state must be updated together
    expect(source).toContain('setIsFullscreen(false)');
  });

  it('isFullscreenRef is set to true in enterFullscreen', () => {
    expect(source).toContain('isFullscreenRef.current = true');
  });

  it('toggleFullscreen reads from isFullscreenRef (not state)', () => {
    expect(source).toContain('isFullscreenRef.current');
    // Should read ref in the toggle function
    expect(source).toMatch(/if\s*\(\s*isFullscreenRef\.current\s*\)/);
  });
});

// ── useKeyboardNav: applyFocusRing merges states ────────────

describe('useKeyboardNav — applyFocusRing merges with existing states', () => {
  const source = readSource('useKeyboardNav.ts');

  it('reads existing states via getElementState before setting selected', () => {
    // Must read existing states to merge, not replace
    expect(source).toContain('getElementState(nodeId)');
  });

  it('filters out selected from existing states to avoid duplicates', () => {
    // Should filter existing states to remove 'selected' before adding it back
    expect(source).toMatch(/filter\(.*!==\s*'selected'/);
  });

  it('spreads existing states and appends selected', () => {
    // Should create array with existing filtered states + 'selected'
    expect(source).toMatch(/\[\.\.\.existing.*'selected'\]/s);
  });

  it('has fallback if getElementState fails', () => {
    // Fallback: just set ['selected'] if reading states throws
    const applyFocusRingSection = source.slice(
      source.indexOf('const applyFocusRing'),
      source.indexOf('const clearFocus'),
    );
    // Should have a catch block with fallback
    expect(applyFocusRingSection).toContain("['selected']");
    expect(applyFocusRingSection.match(/catch/g)?.length).toBeGreaterThanOrEqual(1);
  });

  it('clearFocus also preserves other states when removing selected', () => {
    // clearFocus should filter out 'selected' but keep other states
    const clearFocusSection = source.slice(
      source.indexOf('const clearFocus'),
      source.indexOf('// Sync:'),
    );
    expect(clearFocusSection).toMatch(/filter.*!==\s*'selected'/);
  });
});

// ── useSpacePan: focusout checks relatedTarget ──────────────

describe('useSpacePan — focusout checks relatedTarget', () => {
  const source = readSource('useSpacePan.ts');

  it('focusout handler receives FocusEvent (typed parameter)', () => {
    expect(source).toMatch(/const\s+handleFocusOut\s*=\s*\(e:\s*FocusEvent\)/);
  });

  it('checks relatedTarget to avoid intra-container false resets', () => {
    expect(source).toContain('e.relatedTarget');
  });

  it('calls container.contains(relatedTarget) to check if focus stays inside', () => {
    expect(source).toContain('container.contains(e.relatedTarget');
  });

  it('returns early if focus stays within container', () => {
    // Should return before calling handleBlur when focus is internal
    expect(source).toMatch(/container\.contains\(e\.relatedTarget.*\)\s*return/s);
  });

  it('still calls handleBlur when focus actually leaves container', () => {
    // After the relatedTarget check, handleBlur should still be called
    const focusoutSection = source.slice(
      source.indexOf('handleFocusOut'),
      source.indexOf('handleVisibility'),
    );
    expect(focusoutSection).toContain('handleBlur()');
  });
});

// ── MapComparisonPanel: no aria-modal + WCAG text contrast ──

describe('MapComparisonPanel — side panel a11y', () => {
  const source = readSource('MapComparisonPanel.tsx');

  it('has role="dialog" on the panel', () => {
    expect(source).toContain('role="dialog"');
  });

  it('does NOT have aria-modal="true" (side panel, not a true modal)', () => {
    // Side panels don't block interaction with underlying content
    expect(source).not.toContain('aria-modal="true"');
  });

  it('has descriptive aria-label on the panel', () => {
    expect(source).toContain('aria-label="Panel de comparación de mapa"');
  });
});

describe('MapComparisonPanel — WCAG contrast for mastery percentage', () => {
  const source = readSource('MapComparisonPanel.tsx');

  it('uses text-gray-500 (not text-gray-400) for mastery percentage in GapItem', () => {
    // gray-500 (#6b7280) has ~4.5:1 contrast on bg-gray-50
    // gray-400 (#9ca3af) only has ~2.85:1 — fails WCAG AA
    const gapItemSection = source.slice(
      source.indexOf('function GapItem'),
      source.indexOf('function CustomEdgeItem'),
    );
    // The pct% span should use gray-500
    expect(gapItemSection).toContain('text-gray-500');
    // And should NOT use gray-400 for informational text
    expect(gapItemSection).not.toContain('text-gray-400');
  });

  it('donut "dominio" label uses #6b7280 (gray-500) not #9ca3af (gray-400)', () => {
    // The "dominio" text in the MasteryDonut SVG needs WCAG AA contrast on white
    const donutSection = source.slice(
      source.indexOf('function MasteryDonut'),
      source.indexOf('// ── Component'),
    );
    expect(donutSection).toContain('fill="#6b7280"');
    expect(donutSection).not.toContain('fill="#9ca3af"');
  });

  it('"Sin datos" StatBadge uses #6b7280 (gray-500) for count text', () => {
    // #9ca3af on #f3f4f6 bg has only ~2.22:1 contrast — fails WCAG AA
    // #6b7280 on #f3f4f6 bg has ~3.6:1 — passes for large/bold text
    expect(source).not.toMatch(/label="Sin datos"[\s\S]*?color="#9ca3af"/);
    expect(source).toMatch(/label="Sin datos"[\s\S]*?color="#6b7280"/);
  });
});

describe('KnowledgeGraph — tooltip WCAG contrast (now in useGraphInit)', () => {
  const source = readSource('useGraphInit.ts');

  it('tooltip mastery text uses #6b7280 (gray-500) not #9ca3af (gray-400)', () => {
    // Tooltip has white background — #9ca3af fails WCAG AA
    expect(source).toContain('color:#6b7280');
    expect(source).not.toMatch(/color:#9ca3af/);
  });
});

describe('AddNodeEdgeModal — rAF cleanup', () => {
  const source = readSource('AddNodeEdgeModal.tsx');

  it('cleans up requestAnimationFrame on tab/open change', () => {
    // Must cancel rAF to prevent focus attempts after unmount
    expect(source).toContain('cancelAnimationFrame(rafId)');
  });
});

// ── ChangeHistoryPanel: no aria-modal on side panel ─────────

describe('ChangeHistoryPanel — side panel does not use aria-modal', () => {
  const source = readSource('ChangeHistoryPanel.tsx');

  it('has role="dialog" on the panel', () => {
    expect(source).toContain('role="dialog"');
  });

  it('does NOT have aria-modal="true" (side panel, not a true modal)', () => {
    // Side panels coexist with the graph — no aria-modal
    expect(source).not.toContain('aria-modal="true"');
  });

  it('has descriptive aria-label on the panel', () => {
    expect(source).toContain('aria-label="Panel de historial de cambios"');
  });
});

// ── KnowledgeGraph: setElementState merges existing states ──

describe('setElementState merges with existing states (now in useGraphEvents)', () => {
  const source = readSource('useGraphEvents.ts');

  it('uses getElementState before setting state', () => {
    expect(source).toContain('getElementState');
  });

  it('merges states with filter pattern', () => {
    expect(source).toMatch(/filter/);
  });

  it('handles active state transitions', () => {
    expect(source).toContain('active');
  });
});

// ── ShareMapModal: scroll lock saves/restores original values ──

describe('ShareMapModal — scroll lock restores original overflow', () => {
  const source = readSource('ShareMapModal.tsx');

  it('saves original documentElement.style.overflow before overriding', () => {
    expect(source).toContain('const prevHtml = document.documentElement.style.overflow');
  });

  it('saves original body.style.overflow before overriding', () => {
    expect(source).toContain('const prevBody = document.body.style.overflow');
  });

  it('restores prevHtml on cleanup, not empty string', () => {
    expect(source).toContain('document.documentElement.style.overflow = prevHtml');
  });
});

// ── ConfirmDialog: iOS-safe scroll lock ────────────────────────

describe('ConfirmDialog — locks both body and documentElement', () => {
  const source = readSource('ConfirmDialog.tsx');

  it('locks documentElement overflow for iOS Safari scroll prevention', () => {
    expect(source).toContain("document.documentElement.style.overflow = 'hidden'");
  });

  it('restores original documentElement overflow on unmount', () => {
    expect(source).toContain('document.documentElement.style.overflow = prevHtml');
  });
});

// ── changeHistoryHelpers: invalid date guard ─────────────────

describe('changeHistoryHelpers — formatRelativeTime guards against invalid dates', () => {
  const source = readSource('changeHistoryHelpers.ts');

  it('checks isNaN(date.getTime()) before computing relative time', () => {
    expect(source).toContain('isNaN(date.getTime())');
  });
});

// ── PresentationMode: onNodeFocus ref-stabilized ──────────────

describe('PresentationMode — onNodeFocus stabilized via ref', () => {
  const source = readSource('PresentationMode.tsx');

  it('stores onNodeFocus in a ref to prevent effect churn', () => {
    expect(source).toContain('onNodeFocusRef');
  });

  it('calls onNodeFocusRef.current instead of onNodeFocus directly', () => {
    expect(source).toContain('onNodeFocusRef.current(currentId)');
  });
});

// ── useKeyboardNav: focus cleared when node is deleted ────────

describe('useKeyboardNav — focus ring cleared when node removed', () => {
  const source = readSource('useKeyboardNav.ts');

  it('clears focusedNodeId when focused node disappears from nodes array', () => {
    expect(source).toContain('!nodeByIdRef.current.has(focusedNodeId)');
  });
});

// ── KnowledgeGraph: shortcuts overlay Escape handler ────────

describe('shortcuts overlay (now in GraphShortcutsDialog)', () => {
  const source = readSource('GraphShortcutsDialog.tsx');

  it('shortcuts dialog has role="dialog"', () => {
    expect(source).toContain('role="dialog"');
  });

  it('has close/dismiss functionality', () => {
    expect(source).toContain('onClose');
  });
});

// ── GraphTemplatePanel: stale request guard ──────────────────

describe('GraphTemplatePanel — stale request guard on loadTemplates', () => {
  const source = readSource('GraphTemplatePanel.tsx');

  it('uses a fetchId counter to prevent stale template data', () => {
    expect(source).toContain('fetchIdRef');
    expect(source).toContain('fetchId === fetchIdRef.current');
  });

  it('caps animation stagger delay to prevent long delays with many templates', () => {
    expect(source).toMatch(/Math\.min\(index\s*\*\s*0\.04/);
  });
});

// ── useUndoRedo: e.repeat guard on keyboard handler ──────────

describe('useUndoRedo — blocks held-key repeats', () => {
  const source = readSource('useUndoRedo.ts');

  it('checks e.repeat before processing undo/redo keyboard shortcuts', () => {
    expect(source).toContain('if (e.repeat) return');
  });
});

// ── GraphSkeleton: reactive prefers-reduced-motion ──────────

describe('GraphSkeleton — reactive reduced-motion via matchMedia', () => {
  const source = readSource('GraphSkeleton.tsx');

  it('uses matchMedia addEventListener for reactive updates', () => {
    expect(source).toContain("addEventListener('change'");
    expect(source).toContain("removeEventListener('change'");
  });

  it('uses useState for prefersReducedMotion (not render-time only)', () => {
    expect(source).toContain('useState(');
    expect(source).toContain('setPrefersReducedMotion');
  });
});

// ── GraphToolbar: layout radio group arrow key navigation ────

describe('GraphToolbar — layout radio group keyboard navigation', () => {
  const source = readSource('GraphToolbar.tsx');

  it('has onKeyDown handler on the layout radiogroup', () => {
    expect(source).toContain('onKeyDown');
    expect(source).toContain('role="radiogroup"');
  });

  it('handles ArrowRight and ArrowDown to cycle layouts forward', () => {
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
  });

  it('handles ArrowLeft and ArrowUp to cycle layouts backward', () => {
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
  });

  it('uses roving tabIndex on radio buttons', () => {
    expect(source).toContain('tabIndex={layout === value ? 0 : -1}');
  });
});

// ── NodeContextMenu: arrow keys include menuitemradio ────────

describe('NodeContextMenu — arrow keys navigate all interactive items', () => {
  const source = readSource('NodeContextMenu.tsx');

  it('queries both menuitem and menuitemradio for arrow key navigation', () => {
    expect(source).toContain('[role="menuitem"], [role="menuitemradio"]');
  });
});

// ── AiTutorPanel: stale-topic guards ────────────────────────

describe('AiTutorPanel — stale-topic guards on async operations', () => {
  const source = readSource('AiTutorPanel.tsx');

  it('has suggestTopicRef for suggest connections stale-topic guard', () => {
    expect(source).toContain('suggestTopicRef.current = topicId');
    expect(source).toContain('suggestTopicRef.current !== topicId');
  });

  it('has topicIdRef for accept suggestion stale-topic guard', () => {
    expect(source).toContain('topicIdRef.current = topicId');
    expect(source).toContain('topicIdRef.current !== capturedTopicId');
  });
});

// ── useGraphExport: busy guard against concurrent exports ───

describe('useGraphExport — busy guard prevents concurrent exports', () => {
  const source = readSource('useGraphExport.ts');

  it('has exportingRef guard to prevent concurrent exports', () => {
    expect(source).toContain('exportingRef.current');
    expect(source).toContain('if (exportingRef.current) return');
  });

  it('resets exportingRef in finally block', () => {
    expect(source).toContain('exportingRef.current = false');
  });
});

// ── MiniKnowledgeGraph: graph destroyed when data empties ───

describe('MiniKnowledgeGraph — graph cleanup on empty data', () => {
  const source = readSource('MiniKnowledgeGraph.tsx');

  it('destroys graph instance when data.nodes.length === 0', () => {
    expect(source).toContain('graphRef.current.destroy()');
    expect(source).toContain('graphRef.current = null');
  });
});

// ── StickyNote: Shift+Arrow larger keyboard drag steps ──────

describe('StickyNote — keyboard drag supports Shift for larger steps', () => {
  const source = readSource('StickyNote.tsx');

  it('checks e.shiftKey for larger step size', () => {
    expect(source).toContain('e.shiftKey ? 50 : MOVE_STEP');
  });
});

// ── StickyNotesLayer: onNotesChange ref-stabilized ──────────

describe('StickyNotesLayer — onNotesChange stabilized via ref', () => {
  const source = readSource('StickyNote.tsx');

  it('stores onNotesChange in a ref', () => {
    expect(source).toContain('onNotesChangeRef.current = onNotesChange');
  });

  it('undo handler calls onNotesChangeRef.current (not stale closure)', () => {
    expect(source).toContain('onNotesChangeRef.current(restored)');
  });
});

// ── ConfirmDialog: aria-busy during async operations ────────

describe('ConfirmDialog — aria-busy communicates processing state', () => {
  const source = readSource('ConfirmDialog.tsx');

  it('has aria-busy attribute tied to confirmDisabled', () => {
    expect(source).toContain('aria-busy={confirmDisabled || undefined}');
  });
});
