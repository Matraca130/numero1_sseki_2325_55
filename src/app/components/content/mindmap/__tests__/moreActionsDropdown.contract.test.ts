// ============================================================
// Tests -- MoreActionsDropdown contract tests
//
// Source-contract tests for MoreActionsDropdown component:
//   - Module exports shape
//   - Props interface contract
//   - Conditional rendering logic (canPresent, canShare, canAddNote, isFullscreen)
//   - Accessibility: aria-expanded, aria-haspopup, role menu/menuitem, keyboard nav
//   - Dependencies
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const COMPONENT_PATH = resolve(__dirname, '..', 'MoreActionsDropdown.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// -- Module contract ----------------------------------------------------------

describe('MoreActionsDropdown: module contract', () => {
  it('exports MoreActionsDropdown as a named memo-wrapped component', () => {
    expect(source).toMatch(/export\s+const\s+MoreActionsDropdown\s*=\s*memo\s*\(\s*function\s+MoreActionsDropdown/);
  });

  it('has no default export', () => {
    expect(source).not.toMatch(/export\s+default/);
  });

  it('does not export the props interface (internal only)', () => {
    expect(source).not.toMatch(/export\s+interface\s+MoreActionsDropdownProps/);
  });
});

// -- Props interface ----------------------------------------------------------

describe('MoreActionsDropdown: props interface', () => {
  it('declares MoreActionsDropdownProps interface', () => {
    expect(source).toMatch(/interface\s+MoreActionsDropdownProps/);
  });

  it('requires toggle callbacks', () => {
    expect(source).toContain('onToggleHistory: () => void');
    expect(source).toContain('onTogglePresentation: () => void');
    expect(source).toContain('onToggleShare: () => void');
    expect(source).toContain('onToggleComparison: () => void');
    expect(source).toContain('onToggleFullscreen: () => void');
  });

  it('requires onRefresh and onAddStickyNote callbacks', () => {
    expect(source).toContain('onRefresh: () => void');
    expect(source).toContain('onAddStickyNote: () => void');
  });

  it('requires boolean state flags', () => {
    expect(source).toContain('historyActive: boolean');
    expect(source).toContain('comparisonActive: boolean');
    expect(source).toContain('canPresent: boolean');
    expect(source).toContain('canShare: boolean');
    expect(source).toContain('canAddNote: boolean');
    expect(source).toContain('isFullscreen: boolean');
  });

  it('requires stickyNoteCount as number', () => {
    expect(source).toContain('stickyNoteCount: number');
  });
});

// -- Conditional rendering logic ----------------------------------------------

describe('MoreActionsDropdown: conditional rendering', () => {
  it('conditionally adds sticky note item when canAddNote is true', () => {
    expect(source).toMatch(/if\s*\(\s*canAddNote\s*\)/);
  });

  it('conditionally adds present item when canPresent is true', () => {
    expect(source).toMatch(/if\s*\(\s*canPresent\s*\)/);
  });

  it('conditionally adds share item when canShare is true', () => {
    expect(source).toMatch(/if\s*\(\s*canShare\s*\)/);
  });

  it('swaps fullscreen icon between Maximize2 and Minimize2 based on isFullscreen', () => {
    expect(source).toMatch(/isFullscreen\s*\?\s*Minimize2\s*:\s*Maximize2/);
  });

  it('shows active indicator dot when item.active is true', () => {
    expect(source).toContain('item.active');
    expect(source).toContain('aria-label="activo"');
  });

  it('shows badge when item.badge is a positive number', () => {
    expect(source).toMatch(/item\.badge\s*!=\s*null\s*&&\s*item\.badge\s*>\s*0/);
  });

  it('only renders dropdown menu when open state is true', () => {
    expect(source).toMatch(/\{open\s*&&/);
  });
});

// -- Hardcoded i18n labels (Spanish) ------------------------------------------

describe('MoreActionsDropdown: labels (hardcoded Spanish)', () => {
  it('does not use GraphI18nStrings (no i18n integration)', () => {
    expect(source).not.toContain('GraphI18nStrings');
  });

  it('uses hardcoded Spanish labels for all menu items', () => {
    expect(source).toContain("'Nota adhesiva'");
    expect(source).toContain("'Actualizar'");
    expect(source).toContain("'Historial'");
    expect(source).toContain("'Presentar'");
    expect(source).toContain("'Compartir'");
    expect(source).toContain("'Comparar'");
  });

  it('uses hardcoded fullscreen labels', () => {
    expect(source).toContain("'Salir de pantalla completa'");
    expect(source).toContain("'Pantalla completa'");
  });
});

// -- Accessibility ------------------------------------------------------------

describe('MoreActionsDropdown: accessibility', () => {
  it('sets aria-label on the trigger button', () => {
    expect(source).toMatch(/aria-label="M[aá]s opciones"/);
  });

  it('sets aria-expanded on the trigger button reflecting open state', () => {
    expect(source).toContain('aria-expanded={open}');
  });

  it('sets aria-haspopup on the trigger button', () => {
    expect(source).toContain('aria-haspopup="true"');
  });

  it('assigns role="menu" to the dropdown panel', () => {
    expect(source).toContain('role="menu"');
  });

  it('assigns role="menuitem" to each item button', () => {
    expect(source).toContain('role="menuitem"');
  });

  it('sets aria-label on the dropdown panel', () => {
    expect(source).toContain('aria-label="Opciones adicionales"');
  });

  it('supports keyboard navigation with ArrowDown and ArrowUp', () => {
    expect(source).toContain("e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowUp'");
  });

  it('supports Home and End keyboard shortcuts', () => {
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('closes on Escape key press', () => {
    expect(source).toContain("e.key === 'Escape'");
  });

  it('sets tabIndex={-1} on menu items for managed focus', () => {
    expect(source).toContain('tabIndex={-1}');
  });
});

// -- Outside click handling ---------------------------------------------------

describe('MoreActionsDropdown: outside click dismiss', () => {
  it('registers mousedown listener when open', () => {
    expect(source).toContain("document.addEventListener('mousedown', handleClick)");
  });

  it('cleans up listeners on close', () => {
    expect(source).toContain("document.removeEventListener('mousedown', handleClick)");
    expect(source).toContain("document.removeEventListener('keydown', handleKey)");
  });
});

// -- Dependencies -------------------------------------------------------------

describe('MoreActionsDropdown: dependencies', () => {
  it('imports useState, useRef, useEffect, and memo from react', () => {
    expect(source).toMatch(/import\s+\{[^}]*useState[^}]*\}\s+from\s+['"]react['"]/);
    expect(source).toMatch(/import\s+\{[^}]*useRef[^}]*\}\s+from\s+['"]react['"]/);
    expect(source).toMatch(/import\s+\{[^}]*useEffect[^}]*\}\s+from\s+['"]react['"]/);
    expect(source).toMatch(/import\s+\{[^}]*memo[^}]*\}\s+from\s+['"]react['"]/);
  });

  it('imports MoreHorizontal from lucide-react as the trigger icon', () => {
    expect(source).toMatch(/import\s+\{[^}]*MoreHorizontal[^}]*\}\s+from\s+['"]lucide-react['"]/);
  });

  it('imports all required lucide icons', () => {
    for (const icon of ['Clock', 'Presentation', 'Share2', 'GitCompareArrows', 'Maximize2', 'Minimize2', 'RefreshCw']) {
      expect(source).toMatch(new RegExp(`import\\s+\\{[^}]*${icon}[^}]*\\}\\s+from\\s+['"]lucide-react['"]`));
    }
  });

  it('does not import from graphI18n', () => {
    expect(source).not.toContain('./graphI18n');
  });
});
