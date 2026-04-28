// ============================================================
// Tests — ShareMapModal contract tests
//
// Tests the pure logic of ShareMapModal:
//   - Share URL generation (encoding, query params)
//   - Clipboard copy behavior
//   - Web Share API payload
//   - Module export shape
//
// Uses filesystem-based export checks for module contract
// and pure function tests for URL/share logic.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const COMPONENT_PATH = resolve(__dirname, '..', 'ShareMapModal.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// ── Module contract ─────────────────────────────────────────

describe('ShareMapModal: module contract', () => {
  it('exports a named function ShareMapModal (optionally wrapped in memo)', () => {
    expect(source).toMatch(/export\s+(const\s+ShareMapModal\s*=\s*memo\s*\(\s*function\s+ShareMapModal|function\s+ShareMapModal)/);
  });

  it('has no default export (named export only)', () => {
    expect(source).not.toMatch(/export\s+default/);
  });
});

// ── Props interface ─────────────────────────────────────────

describe('ShareMapModal: props interface', () => {
  it('requires open, onClose, topicId with correct types', () => {
    expect(source).toContain('open: boolean');
    expect(source).toContain('onClose: () => void');
    expect(source).toContain('topicId: string');
  });

  it('has optional topicName prop', () => {
    expect(source).toContain('topicName?: string');
  });
});

// ── Share URL generation ────────────────────────────────────

describe('ShareMapModal: share URL generation', () => {
  // Replicate the URL generation logic from the component
  function buildShareUrl(origin: string, topicId: string): string {
    return `${origin}/student/knowledge-map?topicId=${encodeURIComponent(topicId)}&shared=1`;
  }

  it('builds correct URL with topicId', () => {
    const url = buildShareUrl('https://app.axon.edu', 'topic-123');
    expect(url).toBe('https://app.axon.edu/student/knowledge-map?topicId=topic-123&shared=1');
  });

  it('encodes special characters in topicId', () => {
    const url = buildShareUrl('https://app.axon.edu', 'topic with spaces & symbols');
    expect(url).toContain('topicId=topic%20with%20spaces%20%26%20symbols');
    expect(url).toContain('&shared=1');
  });

  it('uses /student/knowledge-map path', () => {
    const url = buildShareUrl('https://app.axon.edu', 'any');
    expect(url).toContain('/student/knowledge-map?');
  });

  it('includes shared=1 flag', () => {
    const url = buildShareUrl('https://app.axon.edu', 'any');
    expect(url).toContain('shared=1');
  });

  it('handles UUID-style topicId', () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const url = buildShareUrl('https://app.axon.edu', uuid);
    expect(url).toContain(`topicId=${uuid}`);
  });
});

// ── Clipboard copy logic ────────────────────────────────────

describe('ShareMapModal: clipboard copy behavior', () => {
  it('uses navigator.clipboard.writeText API', () => {
    // The component calls: await navigator.clipboard.writeText(shareUrl)
    expect(source).toContain('navigator.clipboard.writeText');
  });

  it('shows success toast on copy via i18n', () => {
    expect(source).toContain('toast.success(tModal.linkCopied)');
  });

  it('has fallback for clipboard API failure', () => {
    expect(source).toContain('toast.info(tModal.linkCopyFallback)');
  });

  it('resets copied state after timeout', () => {
    expect(source).toContain('setCopied(false)');
    expect(source).toContain('2500'); // 2.5s timeout
  });
});

// ── Web Share API ───────────────────────────────────────────

describe('ShareMapModal: Web Share API', () => {
  it('checks for navigator.share support', () => {
    expect(source).toContain('navigator.share');
  });

  it('constructs share payload with title, text, and url', () => {
    // Verify the share payload structure
    expect(source).toContain('title:');
    expect(source).toContain('text:');
    expect(source).toContain('url: shareUrl');
  });

  it('uses topicName in share title when available', () => {
    expect(source).toContain('topicName');
    expect(source).toContain('Mapa:');
  });

  it('falls back to generic title when no topicName', () => {
    expect(source).toContain('Mapa de Conocimiento');
  });

  it('handles share cancellation (AbortError) gracefully', () => {
    expect(source).toContain('AbortError');
  });

  // Test the share title logic directly
  function buildShareTitle(topicName?: string): string {
    return topicName ? `Mapa: ${topicName}` : 'Mapa de Conocimiento';
  }

  it('buildShareTitle with topicName', () => {
    expect(buildShareTitle('Biologia Celular')).toBe('Mapa: Biologia Celular');
  });

  it('buildShareTitle without topicName', () => {
    expect(buildShareTitle()).toBe('Mapa de Conocimiento');
    expect(buildShareTitle(undefined)).toBe('Mapa de Conocimiento');
  });
});

// ── Accessibility ───────────────────────────────────────────

describe('ShareMapModal: accessibility', () => {
  it('has role="dialog" and aria-modal="true"', () => {
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
  });

  it('has aria-labelledby and aria-describedby using dynamic IDs', () => {
    expect(source).toContain('aria-labelledby={titleId}');
    expect(source).toContain('aria-describedby={descId}');
    expect(source).toContain('id={titleId}');
    expect(source).toContain('id={descId}');
  });

  it('close button has aria-label', () => {
    expect(source).toContain('aria-label="Cerrar"');
  });

  it('supports Escape key to close', () => {
    expect(source).toContain("e.key === 'Escape'");
  });

  it('uses focus trap', () => {
    expect(source).toContain('useFocusTrap');
  });

  it('locks body scroll when open', () => {
    expect(source).toContain("overflow = 'hidden'");
  });
});

// ── Share URL invariants (replicated) ──────────────────────

describe('Share URL invariants (replicated)', () => {
  function buildShareUrl(origin: string, topicId: string): string {
    return `${origin}/student/knowledge-map?topicId=${encodeURIComponent(topicId)}&shared=1`;
  }

  it('uses encodeURIComponent on topicId so special chars do not break the URL', () => {
    const url = buildShareUrl('https://app.example.com', 'topic with spaces & ?');
    expect(url).toContain('topicId=topic%20with%20spaces%20%26%20%3F');
  });

  it('always sets shared=1 query flag', () => {
    expect(buildShareUrl('https://x', 'abc')).toMatch(/&shared=1$/);
  });

  it('routes to /student/knowledge-map (not professor or other)', () => {
    expect(buildShareUrl('https://x', 'abc')).toContain('/student/knowledge-map?');
  });

  it('SSR-safe: returns "" when window is undefined', () => {
    expect(source).toMatch(/typeof window\s*!==\s*'undefined'/);
    expect(source).toMatch(/:\s*''/);
  });
});

// ── Clipboard fallback flow ────────────────────────────────

describe('Clipboard copy + fallback', () => {
  it('uses navigator.clipboard.writeText as primary path', () => {
    expect(source).toContain('navigator.clipboard.writeText(shareUrl)');
  });

  it('on success: shows linkCopied toast + flips copied state', () => {
    expect(source).toContain('toast.success(tModal.linkCopied)');
    expect(source).toContain('setCopied(true)');
  });

  it('on failure: selects input + shows linkCopyFallback toast (manual copy)', () => {
    expect(source).toMatch(/inputRef\.current\?\.select\(\)[\s\S]{0,80}toast\.info\(tModal\.linkCopyFallback\)/);
  });

  it('clears the prior copy timer before scheduling a new one (no stacked timers)', () => {
    expect(source).toMatch(/clearTimeout\(copiedTimerRef\.current\)[\s\S]{0,200}setTimeout/);
  });

  it('copied state auto-resets after 2500ms', () => {
    expect(source).toMatch(/setTimeout\(\(\)\s*=>\s*setCopied\(false\),\s*2500\)/);
  });

  it('clears the timer on unmount/close (cleanup return on open effect)', () => {
    expect(source).toMatch(/return\s*\(\)\s*=>\s*clearTimeout\(copiedTimerRef\.current\)/);
  });
});

// ── Web Share API ──────────────────────────────────────────

describe('Native Web Share API', () => {
  it('only renders the Compartir button when navigator.share is supported', () => {
    expect(source).toContain('supportsShare');
    expect(source).toMatch(/typeof navigator\s*!==\s*'undefined'\s*&&\s*!!navigator\.share/);
  });

  it('share payload includes title, text, and url', () => {
    expect(source).toMatch(/navigator\.share\(\{[\s\S]*?title:[\s\S]*?text:[\s\S]*?url:\s*shareUrl/);
  });

  it("title falls back to 'Mapa de Conocimiento' when topicName is missing", () => {
    expect(source).toMatch(/topicName\s*\?\s*`Mapa:\s*\$\{topicName\}`\s*:\s*'Mapa de Conocimiento'/);
  });

  it('AbortError is silently swallowed (user cancelled — not a real error)', () => {
    expect(source).toMatch(/err\s+instanceof\s+Error\s*&&\s*err\.name\s*===\s*'AbortError'\s*\)\s*return/);
  });

  it("real errors are logged via devWarn('ShareMapModal', 'Share failed', err)", () => {
    expect(source).toContain("devWarn('ShareMapModal', 'Share failed', err)");
  });

  it('returns early when navigator.share is missing (defensive — UI hides button anyway)', () => {
    expect(source).toMatch(/if\s*\(!navigator\.share\)\s*return/);
  });
});

// ── Auto-select on open + a11y label IDs ───────────────────

describe('Auto-select + ARIA wiring', () => {
  it('uses requestAnimationFrame to select the input on open (post-paint)', () => {
    expect(source).toMatch(/requestAnimationFrame\(\(\)\s*=>\s*inputRef\.current\?\.select\(\)\)/);
  });

  it('clicking the input also selects it (manual reselect)', () => {
    expect(source).toMatch(/onClick=\{\(\)\s*=>\s*inputRef\.current\?\.select\(\)\}/);
  });

  it('uses useId to derive unique titleId/descId for aria wiring', () => {
    expect(source).toContain('useId()');
    expect(source).toMatch(/const titleId\s*=\s*`share-title-\$\{uid\}`/);
    expect(source).toMatch(/const descId\s*=\s*`share-desc-\$\{uid\}`/);
  });

  it('dialog has both aria-labelledby (title) and aria-describedby (body)', () => {
    expect(source).toMatch(/aria-labelledby=\{titleId\}/);
    expect(source).toMatch(/aria-describedby=\{descId\}/);
  });

  it("dialog uses role='dialog' aria-modal='true' for assistive tech", () => {
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
  });
});

// ── Backdrop / click-outside ───────────────────────────────

describe('Backdrop + click-outside-closes', () => {
  it('the modal-wrapper layer onClick calls onCloseRef.current()', () => {
    expect(source).toContain('onClick={() => onCloseRef.current()}');
  });

  it('the modal panel itself stops propagation (clicks INSIDE do not close)', () => {
    expect(source).toMatch(/onClick=\{\(e\)\s*=>\s*e\.stopPropagation\(\)\}/);
  });

  it('Escape key calls preventDefault + stopPropagation before closing', () => {
    expect(source).toMatch(/e\.key\s*===\s*'Escape'[\s\S]{0,80}e\.preventDefault\(\)[\s\S]{0,40}e\.stopPropagation\(\)[\s\S]{0,40}onCloseRef\.current\(\)/);
  });

  it('backdrop is aria-hidden so screen readers do not narrate it', () => {
    expect(source).toContain('aria-hidden="true"');
  });
});

// ── Body + html scroll lock symmetry ───────────────────────

describe('Body + html scroll lock', () => {
  it('captures BOTH prevHtml AND prevBody before locking', () => {
    expect(source).toMatch(/const prevHtml\s*=\s*document\.documentElement\.style\.overflow/);
    expect(source).toMatch(/const prevBody\s*=\s*document\.body\.style\.overflow/);
  });

  it('restores BOTH overflow values on cleanup (not hardcoded "auto")', () => {
    expect(source).toContain('document.documentElement.style.overflow = prevHtml');
    expect(source).toContain('document.body.style.overflow = prevBody');
  });

  it('removes the keydown listener on cleanup', () => {
    expect(source).toContain("document.removeEventListener('keydown'");
  });
});

// ── Mobile drag handle + responsive layout ─────────────────

describe('Responsive layout', () => {
  it('renders a mobile drag-handle (sm:hidden)', () => {
    expect(source).toContain('sm:hidden');
    expect(source).toMatch(/w-8\s+h-1\s+rounded-full\s+bg-gray-300/);
  });

  it('modal sits at items-end on mobile, items-center on sm+', () => {
    expect(source).toMatch(/items-end\s+sm:items-center/);
  });

  it('rounded-t-2xl on mobile (bottom-sheet), rounded-2xl on sm+', () => {
    expect(source).toMatch(/rounded-t-2xl\s+sm:rounded-2xl/);
  });
});

// ── Locale fallback (cycle 20 hardening regression) ─────────

describe('Locale fallback', () => {
  it('uses I18N_MAP_VIEW[locale] ?? I18N_MAP_VIEW.es (cycle 20 hardening)', () => {
    expect(source).toContain('I18N_MAP_VIEW[locale] ?? I18N_MAP_VIEW.es');
  });

  it("locale prop defaults to 'pt'", () => {
    expect(source).toMatch(/locale\s*=\s*'pt'/);
  });
});
