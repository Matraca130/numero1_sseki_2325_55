// ============================================================
// Tests — ConfirmDialog contract tests
//
// Tests the pure logic and contract of ConfirmDialog:
//   - Module export shape and props interface
//   - Escape key handler
//   - Focus trap via useFocusTrap
//   - Backdrop click behavior
//   - confirmDisabled prop support
//   - zClass customization
//   - ARIA roles and attributes (alertdialog, aria-modal, ids)
//
// Pattern: source-based contract checks.
// No React rendering (no RTL).
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const COMPONENT_PATH = resolve(__dirname, '..', 'ConfirmDialog.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// ── Module contract ─────────────────────────────────────────

describe('ConfirmDialog: module contract', () => {
  it('exports a named function ConfirmDialog', () => {
    expect(source).toMatch(/export\s+function\s+ConfirmDialog/);
  });

  it('has no default export', () => {
    expect(source).not.toMatch(/export\s+default/);
  });
});

// ── Props interface ─────────────────────────────────────────

describe('ConfirmDialog: props interface', () => {
  it('requires title: string', () => {
    expect(source).toContain('title: string');
  });

  it('requires description: string', () => {
    expect(source).toContain('description: string');
  });

  it('requires cancelLabel: string', () => {
    expect(source).toContain('cancelLabel: string');
  });

  it('requires confirmLabel: string', () => {
    expect(source).toContain('confirmLabel: string');
  });

  it('requires onCancel callback', () => {
    expect(source).toContain('onCancel: () => void');
  });

  it('requires onConfirm callback', () => {
    expect(source).toContain('onConfirm: () => void');
  });

  it('has optional zClass prop with default z-50', () => {
    expect(source).toContain('zClass?: string');
    expect(source).toContain("zClass = 'z-50'");
  });

  it('has optional confirmDisabled prop with default false', () => {
    expect(source).toContain('confirmDisabled?: boolean');
    expect(source).toContain('confirmDisabled = false');
  });
});

// ── Escape key handler ──────────────────────────────────────

describe('ConfirmDialog: keyboard interaction', () => {
  it('registers keydown listener for Escape', () => {
    expect(source).toContain("e.key === 'Escape'");
  });

  it('uses ref-stabilized onCancel to avoid stale closures', () => {
    expect(source).toContain('onCancelRef');
    expect(source).toContain('onCancelRef.current = onCancel');
  });

  it('removes keydown listener on cleanup (capture phase)', () => {
    expect(source).toContain("document.removeEventListener('keydown', handler");
  });
});

// ── Focus trap ──────────────────────────────────────────────

describe('ConfirmDialog: focus trap', () => {
  it('uses useFocusTrap hook', () => {
    expect(source).toContain('useFocusTrap');
    expect(source).toContain('const focusTrapRef = useFocusTrap(true)');
  });

  it('applies focusTrapRef to the dialog element', () => {
    expect(source).toContain('ref={focusTrapRef}');
  });
});

// ── Accessibility ───────────────────────────────────────────

describe('ConfirmDialog: accessibility', () => {
  it('uses role="alertdialog"', () => {
    expect(source).toContain('role="alertdialog"');
  });

  it('has aria-modal="true"', () => {
    expect(source).toContain('aria-modal="true"');
  });

  it('has aria-labelledby pointing to title', () => {
    expect(source).toContain('aria-labelledby={titleId}');
  });

  it('has aria-describedby pointing to description', () => {
    expect(source).toContain('aria-describedby={descId}');
  });

  it('generates unique IDs with useId', () => {
    expect(source).toContain('useId()');
  });

  it('backdrop has aria-hidden="true"', () => {
    expect(source).toContain('aria-hidden="true"');
  });
});

// ── Confirm button disabled state ───────────────────────────

describe('ConfirmDialog: confirmDisabled behavior', () => {
  it('passes confirmDisabled to confirm button disabled prop', () => {
    expect(source).toContain('disabled={confirmDisabled}');
  });

  it('has disabled styles on confirm button', () => {
    expect(source).toContain('disabled:opacity-50');
    expect(source).toContain('disabled:cursor-not-allowed');
  });
});

// ── Backdrop click ──────────────────────────────────────────

describe('ConfirmDialog: backdrop click', () => {
  it('backdrop onClick calls onCancel', () => {
    expect(source).toContain('onClick={onCancel}');
  });
});
