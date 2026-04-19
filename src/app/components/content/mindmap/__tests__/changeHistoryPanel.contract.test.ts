// ============================================================
// Tests -- ChangeHistoryPanel contract tests
//
// Source-contract tests for the ChangeHistoryPanel component:
//   - Module exports and re-exports from changeHistoryHelpers
//   - Props interface contract
//   - Sorting logic (newest-first)
//   - Empty state behavior
//   - Accessibility: dialog role, Escape key close, focus trap
//   - Sub-components: EmptyHistory, TimelineEntry
//   - Icon/color maps for action types
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const COMPONENT_PATH = resolve(__dirname, '..', 'ChangeHistoryPanel.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// ── Module exports ──────────────────────────────────────────

describe('ChangeHistoryPanel: module exports', () => {
  it('exports ChangeHistoryPanel as a named memo-wrapped component', () => {
    expect(source).toMatch(/export\s+const\s+ChangeHistoryPanel\s*=\s*memo\s*\(\s*function\s+ChangeHistoryPanel/);
  });

  it('has no default export', () => {
    expect(source).not.toMatch(/export\s+default/);
  });
});

// ── Re-exports from changeHistoryHelpers ────────────────────

describe('ChangeHistoryPanel: re-exports', () => {
  const reExportedTypes = ['HistoryEntry', 'HistoryActionType'];
  const reExportedFunctions = [
    'loadHistory',
    'saveHistory',
    'clearHistoryStorage',
    'createNodeEntry',
    'createEdgeEntry',
    'createDeleteNodeEntry',
    'createDeleteEdgeEntry',
    'formatRelativeTime',
  ];

  for (const name of reExportedTypes) {
    it(`re-exports type ${name} from changeHistoryHelpers`, () => {
      expect(source).toMatch(new RegExp(`export\\s+type\\s*\\{[^}]*${name}`));
    });
  }

  for (const name of reExportedFunctions) {
    it(`re-exports ${name} from changeHistoryHelpers`, () => {
      expect(source).toContain(name);
      expect(source).toMatch(/from\s+['"]\.\/changeHistoryHelpers['"]/);
    });
  }
});

// ── Props interface ─────────────────────────────────────────

describe('ChangeHistoryPanel: props interface', () => {
  it('requires open boolean prop', () => {
    expect(source).toContain('open: boolean');
  });

  it('requires onClose callback', () => {
    expect(source).toContain('onClose: () => void');
  });

  it('requires entries array of HistoryEntry', () => {
    expect(source).toContain('entries: HistoryEntry[]');
  });

  it('requires onClear callback', () => {
    expect(source).toContain('onClear: () => void');
  });
});

// ── Sorting logic ───────────────────────────────────────────

describe('ChangeHistoryPanel: newest-first sorting', () => {
  it('sorts entries by timestamp in descending order (newest first)', () => {
    // The component sorts entries newest-first via .sort comparing timestamps
    expect(source).toMatch(/\.sort\(\s*\(\s*a\s*,\s*b\s*\)\s*=>\s*new\s+Date\(\s*b\.timestamp\s*\)/);
  });

  it('creates a copy before sorting (does not mutate prop)', () => {
    // Uses spread to create a copy: [...entries].sort(...)
    expect(source).toMatch(/\[\s*\.\.\.entries\s*\]\s*\.sort/);
  });

  it('memoizes the sorted entries', () => {
    expect(source).toContain('useMemo');
    expect(source).toMatch(/useMemo\s*\(\s*\n?\s*\(\)\s*=>\s*\[\s*\.\.\.entries\s*\]\s*\.sort/);
  });
});

// ── Empty state ─────────────────────────────────────────────

describe('ChangeHistoryPanel: empty state', () => {
  it('detects empty state from sortedEntries.length', () => {
    expect(source).toContain('sortedEntries.length === 0');
  });

  it('renders EmptyHistory component when no entries', () => {
    expect(source).toContain('<EmptyHistory');
  });

  it('hides clear button when empty', () => {
    // The clear button is conditionally rendered: {!isEmpty && (
    expect(source).toContain('!isEmpty');
  });

  it('hides count badge when empty', () => {
    expect(source).toContain('!isEmpty');
  });
});

// ── EmptyHistory sub-component ──────────────────────────────

describe('ChangeHistoryPanel: EmptyHistory sub-component', () => {
  it('shows "Sin cambios" heading', () => {
    expect(source).toContain('Sin cambios');
  });

  it('shows descriptive text about future changes', () => {
    expect(source).toContain('no has realizado cambios');
  });

  it('renders Clock icon', () => {
    expect(source).toContain('Clock');
  });
});

// ── TimelineEntry sub-component ─────────────────────────────

describe('ChangeHistoryPanel: TimelineEntry sub-component', () => {
  it('uses entry.type to select icon from ACTION_ICON map', () => {
    expect(source).toContain('ACTION_ICON[entry.type]');
  });

  it('uses entry.type to select dot color from DOT_COLOR map', () => {
    expect(source).toContain('DOT_COLOR[entry.type]');
  });

  it('displays entry.description', () => {
    expect(source).toContain('{entry.description}');
  });

  it('displays entry.badge', () => {
    expect(source).toContain('{entry.badge}');
  });

  it('displays formatted relative timestamp', () => {
    expect(source).toContain('formatRelativeTime(entry.timestamp)');
  });

  it('uses entry.id as React key', () => {
    expect(source).toContain('key={entry.id}');
  });

  it('has staggered animation delay capped at 0.3s', () => {
    expect(source).toMatch(/Math\.min\(\s*index\s*\*\s*0\.04\s*,\s*0\.3\s*\)/);
  });

  it('renders as role="listitem"', () => {
    expect(source).toContain('role="listitem"');
  });
});

// ── Icon / color maps ───────────────────────────────────────

describe('ChangeHistoryPanel: action type maps', () => {
  const actionTypes = ['create-node', 'create-edge', 'delete-node', 'delete-edge'];

  for (const action of actionTypes) {
    it(`ACTION_ICON map covers "${action}"`, () => {
      expect(source).toContain(`'${action}'`);
    });
  }

  it('maps create-node to Plus icon', () => {
    expect(source).toMatch(/'create-node':\s*Plus/);
  });

  it('maps create-edge to Link2 icon', () => {
    expect(source).toMatch(/'create-edge':\s*Link2/);
  });

  it('maps delete-node to Trash2 icon', () => {
    expect(source).toMatch(/'delete-node':\s*Trash2/);
  });

  it('maps delete-edge to Trash2 icon', () => {
    expect(source).toMatch(/'delete-edge':\s*Trash2/);
  });
});

// ── Accessibility ───────────────────────────────────────────

describe('ChangeHistoryPanel: accessibility', () => {
  it('uses role="dialog"', () => {
    expect(source).toContain('role="dialog"');
  });

  it('has aria-label for the dialog', () => {
    expect(source).toContain('aria-label="Panel de historial de cambios"');
  });

  it('has aria-label for close button', () => {
    expect(source).toContain('aria-label="Cerrar historial"');
  });

  it('uses role="list" for entries container', () => {
    expect(source).toContain('role="list"');
  });

  it('uses aria-label on entries list', () => {
    expect(source).toContain('aria-label="Entradas del historial"');
  });

  it('uses aria-hidden on decorative icons', () => {
    expect(source).toContain('aria-hidden="true"');
  });
});

// ── Keyboard interaction ────────────────────────────────────

describe('ChangeHistoryPanel: keyboard interaction', () => {
  it('closes on Escape key', () => {
    expect(source).toContain("e.key === 'Escape'");
  });

  it('prevents default on Escape', () => {
    expect(source).toMatch(/Escape.*preventDefault/s);
  });

  it('stops propagation on Escape', () => {
    expect(source).toMatch(/Escape.*stopPropagation/s);
  });

  it('only registers keydown listener when open', () => {
    expect(source).toMatch(/if\s*\(\s*!open\s*\)\s*return/);
  });

  it('cleans up keydown listener on close', () => {
    expect(source).toContain('removeEventListener');
  });
});

// ── Focus trap ──────────────────────────────────────────────

describe('ChangeHistoryPanel: focus trap', () => {
  it('uses useFocusTrap hook', () => {
    expect(source).toContain('useFocusTrap');
  });

  it('passes open state to useFocusTrap', () => {
    expect(source).toContain('useFocusTrap(open)');
  });

  it('applies focusTrapRef to the panel container', () => {
    expect(source).toContain('ref={focusTrapRef}');
  });
});

// ── Animation ───────────────────────────────────────────────

describe('ChangeHistoryPanel: animation', () => {
  it('uses AnimatePresence for mount/unmount animation', () => {
    expect(source).toContain('<AnimatePresence>');
  });

  it('slides in from the right (x: 320 -> 0)', () => {
    expect(source).toContain('x: 320');
    expect(source).toContain('x: 0');
  });

  it('only renders content when open is true', () => {
    expect(source).toContain('{open && (');
  });
});

// ── Timestamp refresh ───────────────────────────────────────

describe('ChangeHistoryPanel: auto-refresh timestamps', () => {
  it('refreshes every 30 seconds via setInterval', () => {
    expect(source).toContain('30_000');
    expect(source).toContain('setInterval');
  });

  it('clears interval on cleanup', () => {
    expect(source).toContain('clearInterval');
  });

  it('only starts interval when panel is open', () => {
    // The effect checks `if (open)` before creating interval
    expect(source).toMatch(/if\s*\(\s*open\s*\)\s*\{[\s\S]*?setInterval/);
  });
});

// ── Clear button ────────────────────────────────────────────

describe('ChangeHistoryPanel: clear history', () => {
  it('shows "Limpiar historial" button text', () => {
    expect(source).toContain('Limpiar historial');
  });

  it('calls onClear callback on click', () => {
    expect(source).toContain('onClick={onClear}');
  });

  it('renders Trash2 icon next to clear button text', () => {
    expect(source).toContain('Trash2');
  });
});

// ── Dependencies ────────────────────────────────────────────

describe('ChangeHistoryPanel: dependencies', () => {
  it('imports from motion/react (framer motion)', () => {
    expect(source).toContain("from 'motion/react'");
  });

  it('imports from design-system', () => {
    expect(source).toContain("from '@/app/design-system'");
  });

  it('imports useFocusTrap hook', () => {
    expect(source).toContain("from './useFocusTrap'");
  });

  it('imports types and helpers from changeHistoryHelpers', () => {
    expect(source).toContain("from './changeHistoryHelpers'");
  });
});
