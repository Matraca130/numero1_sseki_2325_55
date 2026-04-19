// ============================================================
// Tests -- GraphMultiSelectBar contract tests
//
// Source-contract tests for GraphMultiSelectBar component:
//   - Module exports shape
//   - Props interface contract
//   - Conditional rendering: null when 0, delete/connect/group gating
//   - Accessibility: role="toolbar", aria-labels, aria-hidden on icons
//   - i18n usage (GraphI18nStrings)
//   - Dependencies
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const COMPONENT_PATH = resolve(__dirname, '..', 'GraphMultiSelectBar.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// -- Module contract ----------------------------------------------------------

describe('GraphMultiSelectBar: module contract', () => {
  it('exports GraphMultiSelectBar as a named memo-wrapped component', () => {
    expect(source).toMatch(/export\s+const\s+GraphMultiSelectBar\s*=\s*memo\s*\(\s*function\s+GraphMultiSelectBar/);
  });

  it('exports the GraphMultiSelectBarProps interface', () => {
    expect(source).toMatch(/export\s+interface\s+GraphMultiSelectBarProps/);
  });

  it('has no default export', () => {
    expect(source).not.toMatch(/export\s+default/);
  });
});

// -- Props interface ----------------------------------------------------------

describe('GraphMultiSelectBar: props interface', () => {
  it('requires multiSelectedIds as Set<string>', () => {
    expect(source).toContain('multiSelectedIds: Set<string>');
  });

  it('requires multiSelectedCount as number', () => {
    expect(source).toContain('multiSelectedCount: number');
  });

  it('requires selectedUserCreatedIds as string array', () => {
    expect(source).toContain('selectedUserCreatedIds: string[]');
  });

  it('accepts optional onDeleteNodes callback', () => {
    expect(source).toContain('onDeleteNodes?: (nodeIds: string[]) => void');
  });

  it('accepts optional onConnectNodes callback', () => {
    expect(source).toContain('onConnectNodes?: (sourceId: string, targetId: string) => void');
  });

  it('requires onGroupSelection callback', () => {
    expect(source).toContain('onGroupSelection: () => void');
  });

  it('requires onFocusSelection callback', () => {
    expect(source).toContain('onFocusSelection: () => void');
  });

  it('requires onClearSelection callback', () => {
    expect(source).toContain('onClearSelection: () => void');
  });

  it('requires t of type GraphI18nStrings', () => {
    expect(source).toContain('t: GraphI18nStrings');
  });
});

// -- Conditional rendering logic ----------------------------------------------

describe('GraphMultiSelectBar: conditional rendering', () => {
  it('returns null when multiSelectedCount is 0', () => {
    expect(source).toMatch(/if\s*\(\s*multiSelectedCount\s*===\s*0\s*\)\s*return\s+null/);
  });

  it('shows delete button only when user-created nodes are selected AND onDeleteNodes is provided', () => {
    expect(source).toMatch(/selectedUserCreatedIds\.length\s*>\s*0\s*&&\s*onDeleteNodes/);
  });

  it('shows connect button only when exactly 2 nodes are selected AND onConnectNodes is provided', () => {
    expect(source).toMatch(/multiSelectedCount\s*===\s*2\s*&&\s*onConnectNodes/);
  });

  it('shows group button when 2 or more nodes are selected', () => {
    expect(source).toMatch(/multiSelectedCount\s*>=\s*2/);
  });

  it('always shows focus selection button (no condition)', () => {
    expect(source).toContain('onClick={onFocusSelection}');
  });

  it('always shows deselect/clear button (no condition)', () => {
    expect(source).toContain('onClick={onClearSelection}');
  });

  it('calls onClearSelection after delete', () => {
    // After onDeleteNodes, it also calls onClearSelection
    expect(source).toMatch(/onDeleteNodes\(selectedUserCreatedIds\)[\s\S]*?onClearSelection\(\)/);
  });

  it('calls onClearSelection after connect', () => {
    expect(source).toMatch(/onConnectNodes\(ids\[0\],\s*ids\[1\]\)[\s\S]*?onClearSelection\(\)/);
  });
});

// -- Accessibility ------------------------------------------------------------

describe('GraphMultiSelectBar: accessibility', () => {
  it('uses role="toolbar" on the container', () => {
    expect(source).toContain('role="toolbar"');
  });

  it('uses t.nSelected(multiSelectedCount) as toolbar aria-label', () => {
    expect(source).toContain('aria-label={t.nSelected(multiSelectedCount)}');
  });

  it('uses t.deleteSelection as delete button aria-label', () => {
    expect(source).toContain('aria-label={t.deleteSelection}');
  });

  it('uses t.connect as connect button aria-label', () => {
    expect(source).toContain('aria-label={t.connect}');
  });

  it('uses t.groupSelection as group button aria-label', () => {
    expect(source).toContain('aria-label={t.groupSelection}');
  });

  it('uses t.focusSelection as focus button aria-label', () => {
    expect(source).toContain('aria-label={t.focusSelection}');
  });

  it('uses t.deselect as clear selection button aria-label', () => {
    expect(source).toContain('aria-label={t.deselect}');
  });

  it('marks all lucide icons as aria-hidden="true"', () => {
    const ariaHiddenCount = (source.match(/aria-hidden="true"/g) || []).length;
    // At least 5 icons: Trash2, Link, Group, Focus, X
    expect(ariaHiddenCount).toBeGreaterThanOrEqual(5);
  });
});

// -- i18n usage ---------------------------------------------------------------

describe('GraphMultiSelectBar: i18n usage', () => {
  it('displays selected count using t.nSelected()', () => {
    expect(source).toContain('t.nSelected(multiSelectedCount)');
  });

  it('uses t.deleteSelection for delete button label', () => {
    expect(source).toContain('{t.deleteSelection}');
  });

  it('uses t.connect for connect button label', () => {
    expect(source).toContain('{t.connect}');
  });

  it('uses t.groupSelection for group button label', () => {
    expect(source).toContain('{t.groupSelection}');
  });

  it('uses t.focusSelection for focus button label', () => {
    expect(source).toContain('{t.focusSelection}');
  });

  it('uses t.deselect for clear button label', () => {
    expect(source).toContain('{t.deselect}');
  });
});

// -- Dependencies -------------------------------------------------------------

describe('GraphMultiSelectBar: dependencies', () => {
  it('imports memo from react', () => {
    expect(source).toMatch(/import\s+\{[^}]*memo[^}]*\}\s+from\s+['"]react['"]/);
  });

  it('imports required lucide-react icons', () => {
    for (const icon of ['X', 'Link', 'Trash2', 'Group', 'Focus']) {
      expect(source).toMatch(new RegExp(`import\\s+\\{[^}]*${icon}[^}]*\\}\\s+from\\s+['"]lucide-react['"]`));
    }
  });

  it('imports GraphI18nStrings type from graphI18n', () => {
    expect(source).toMatch(/import\s+type\s+\{[^}]*GraphI18nStrings[^}]*\}\s+from\s+['"]\.\/graphI18n['"]/);
  });
});
