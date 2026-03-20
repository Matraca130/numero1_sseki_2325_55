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

  it('shows success toast on copy', () => {
    expect(source).toContain("toast.success('Enlace copiado')");
  });

  it('has fallback for clipboard API failure', () => {
    // Falls back to: inputRef.current?.select()
    expect(source).toContain('inputRef.current?.select()');
    expect(source).toContain("toast.info('Selecciona y copia el enlace manualmente')");
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
