// ============================================================
// Tests -- GraphShortcutsDialog contract tests
//
// Source-contract tests for GraphShortcutsDialog component:
//   - Module exports shape
//   - Props interface contract
//   - Rendering logic: null when !show, dual dialog (desktop + mobile)
//   - Accessibility: role="dialog", aria-modal, aria-labels, focus trap, Escape
//   - i18n usage (GraphI18nStrings)
//   - Dependencies
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const COMPONENT_PATH = resolve(__dirname, '..', 'GraphShortcutsDialog.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// -- Module contract ----------------------------------------------------------

describe('GraphShortcutsDialog: module contract', () => {
  it('exports GraphShortcutsDialog as a named memo-wrapped component', () => {
    expect(source).toMatch(/export\s+const\s+GraphShortcutsDialog\s*=\s*memo\s*\(\s*function\s+GraphShortcutsDialog/);
  });

  it('exports the GraphShortcutsDialogProps interface', () => {
    expect(source).toMatch(/export\s+interface\s+GraphShortcutsDialogProps/);
  });

  it('has no default export', () => {
    expect(source).not.toMatch(/export\s+default/);
  });
});

// -- Props interface ----------------------------------------------------------

describe('GraphShortcutsDialog: props interface', () => {
  it('requires show boolean', () => {
    expect(source).toContain('show: boolean');
  });

  it('requires onClose callback', () => {
    expect(source).toContain('onClose: () => void');
  });

  it('requires t of type GraphI18nStrings', () => {
    expect(source).toContain('t: GraphI18nStrings');
  });

  it('requires triggerRef for focus restoration', () => {
    expect(source).toMatch(/triggerRef:\s*React\.RefObject<HTMLElement\s*\|\s*null>/);
  });
});

// -- Rendering logic ----------------------------------------------------------

describe('GraphShortcutsDialog: rendering logic', () => {
  it('returns null when show is false', () => {
    expect(source).toMatch(/if\s*\(\s*!show\s*\)\s*return\s+null/);
  });

  it('renders a desktop shortcuts panel (hidden on mobile)', () => {
    expect(source).toContain('hidden sm:block');
  });

  it('renders a mobile gesture guide (hidden on desktop)', () => {
    expect(source).toContain('sm:hidden');
  });

  it('renders keyboard shortcuts via t.keys.map', () => {
    expect(source).toContain('t.keys.map');
  });

  it('renders gestures via t.gestures.map', () => {
    expect(source).toContain('t.gestures.map');
  });

  it('renders a <kbd> element for each shortcut key', () => {
    expect(source).toMatch(/<kbd\s/);
  });

  it('restores focus to triggerRef on close', () => {
    expect(source).toContain('triggerRef.current?.focus()');
  });

  it('captures active element into triggerRef when dialog opens', () => {
    expect(source).toContain('triggerRef.current = document.activeElement');
  });

  it('provides a tap-outside overlay to dismiss', () => {
    expect(source).toContain('onClick={handleClose}');
    expect(source).toContain('aria-hidden="true"');
  });
});

// -- Accessibility ------------------------------------------------------------

describe('GraphShortcutsDialog: accessibility', () => {
  it('assigns role="dialog" to the desktop shortcuts panel', () => {
    expect(source).toContain('role="dialog"');
  });

  it('sets aria-modal="true" on the desktop dialog', () => {
    expect(source).toContain('aria-modal="true"');
  });

  it('uses t.shortcutDialog as aria-label for desktop dialog', () => {
    expect(source).toContain('aria-label={t.shortcutDialog}');
  });

  it('uses t.gestureGuideTitle as aria-label for mobile dialog', () => {
    expect(source).toContain('aria-label={t.gestureGuideTitle}');
  });

  it('uses t.closeShortcuts as aria-label for close buttons', () => {
    expect(source).toContain('aria-label={t.closeShortcuts}');
  });

  it('closes on Escape key press in both panels', () => {
    // Escape handling appears in both desktop and mobile onKeyDown
    const escapeMatches = source.match(/e\.key\s*===\s*'Escape'/g);
    expect(escapeMatches).not.toBeNull();
    expect(escapeMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it('implements focus trap on Tab key in the desktop dialog', () => {
    expect(source).toContain("e.key === 'Tab'");
    expect(source).toContain('e.shiftKey');
  });

  it('auto-focuses close button when dialog opens', () => {
    expect(source).toContain('if (el) el.focus()');
  });
});

// -- i18n usage ---------------------------------------------------------------

describe('GraphShortcutsDialog: i18n usage', () => {
  it('displays t.shortcuts as the desktop panel title', () => {
    expect(source).toContain('{t.shortcuts}');
  });

  it('displays t.gestureGuideTitle as the mobile panel title', () => {
    expect(source).toContain('{t.gestureGuideTitle}');
  });

  it('uses key from t.keys as React key', () => {
    expect(source).toContain('key={key}');
  });

  it('uses gesture from t.gestures as React key', () => {
    expect(source).toContain('key={gesture}');
  });
});

// -- Dependencies -------------------------------------------------------------

describe('GraphShortcutsDialog: dependencies', () => {
  it('imports memo, useRef, and useEffect from react', () => {
    expect(source).toMatch(/import\s+\{[^}]*memo[^}]*\}\s+from\s+['"]react['"]/);
    expect(source).toMatch(/import\s+\{[^}]*useRef[^}]*\}\s+from\s+['"]react['"]/);
    expect(source).toMatch(/import\s+\{[^}]*useEffect[^}]*\}\s+from\s+['"]react['"]/);
  });

  it('imports GraphI18nStrings type from graphI18n', () => {
    expect(source).toMatch(/import\s+type\s+\{[^}]*GraphI18nStrings[^}]*\}\s+from\s+['"]\.\/graphI18n['"]/);
  });

  it('does not import any lucide-react icons', () => {
    expect(source).not.toContain('lucide-react');
  });
});
