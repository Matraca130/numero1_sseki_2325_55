import { describe, expect, it } from 'vitest';
import { sanitizeNoteHtml } from '../noteHtml';

// Regression tests for issue #442 — sanitize-on-read contract for StickyNotes.
// sanitizeNoteHtml() MUST strip any tag outside the allow-list ([u, br])
// and flatten the XSS payloads listed in the issue acceptance criteria.
describe('sanitizeNoteHtml — XSS hardening (issue #442)', () => {
  it('strips <img onerror> without preserving the src/handler', () => {
    const malicious = '<img src=x onerror=alert(1)>';
    const out = sanitizeNoteHtml(malicious);
    expect(out).not.toContain('<img');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('src=x');
  });

  it('strips <script> blocks entirely', () => {
    const malicious = '<script>alert(1)</script>';
    const out = sanitizeNoteHtml(malicious);
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
  });

  it('preserves the allow-listed <u> and <br> tags', () => {
    expect(sanitizeNoteHtml('<u>foo</u>')).toBe('<u>foo</u>');
    expect(sanitizeNoteHtml('hi<br>there')).toBe('hi<br>there');
  });

  it('flattens <div> / <p> wrappers into trailing <br>s', () => {
    expect(sanitizeNoteHtml('<div>line1</div><div>line2</div>')).toBe(
      'line1<br>line2<br>',
    );
  });

  it('escapes raw entity characters in text nodes', () => {
    expect(sanitizeNoteHtml('<<x>>')).toContain('&lt;');
    expect(sanitizeNoteHtml('&')).toBe('&amp;');
  });

  it('returns empty string for falsy input', () => {
    expect(sanitizeNoteHtml('')).toBe('');
  });
});
