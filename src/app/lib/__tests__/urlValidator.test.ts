import { describe, expect, it } from 'vitest';
import { safeUrl } from '../urlValidator';

// Regression coverage for issue #443 — safeUrl must block any scheme
// that can execute code when assigned to href/src, while allowing the
// http(s) URLs that legitimately flow through ViewerBlock (PDFs) and
// StudentSettingsPage (Telegram bot deep link).
describe('safeUrl — scheme allow-list (issue #443)', () => {
  it('accepts https URLs unchanged', () => {
    const url = 'https://t.me/AxonBot?start=abc123';
    expect(safeUrl(url)).toBe(url);
  });

  it('accepts http URLs unchanged', () => {
    const url = 'http://localhost:3000/foo.pdf';
    expect(safeUrl(url)).toBe(url);
  });

  it('accepts relative paths', () => {
    expect(safeUrl('/assets/brochure.pdf')).toBe('/assets/brochure.pdf');
    expect(safeUrl('brochure.pdf')).toBe('brochure.pdf');
  });

  it('rejects javascript: URLs', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl('JavaScript:alert(1)')).toBe('');
    expect(safeUrl('  javascript:alert(1)  ')).toBe('');
  });

  it('rejects data: URLs', () => {
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('rejects file: URLs', () => {
    expect(safeUrl('file:///etc/passwd')).toBe('');
  });

  it('rejects vbscript: URLs', () => {
    expect(safeUrl('vbscript:msgbox(1)')).toBe('');
  });

  it('returns empty string for empty / falsy input', () => {
    expect(safeUrl('')).toBe('');
    expect(safeUrl('   ')).toBe('');
    expect(safeUrl(null)).toBe('');
    expect(safeUrl(undefined)).toBe('');
    expect(safeUrl(42)).toBe('');
  });

  it('trims surrounding whitespace on accepted URLs', () => {
    expect(safeUrl('  https://axon.app/  ')).toBe('https://axon.app/');
  });
});
