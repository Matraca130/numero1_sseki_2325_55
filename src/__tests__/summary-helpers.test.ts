// ============================================================
// Axon — Tests for summary-helpers.ts (Sprint 1)
// ============================================================
import { describe, it, expect } from 'vitest';
import { stripMarkdown, getMotivation } from '../app/components/content/summary-helpers';

// ── stripMarkdown ─────────────────────────────────────────────
describe('stripMarkdown', () => {
  it('removes heading markers', () => {
    expect(stripMarkdown('# Title\n## Subtitle')).toBe('Title Subtitle');
  });

  it('removes image syntax', () => {
    expect(stripMarkdown('![alt text](http://img.png)')).toBe('');
  });

  it('converts links to text', () => {
    expect(stripMarkdown('[click here](http://url.com)')).toBe('click here');
  });

  it('removes bold markers', () => {
    expect(stripMarkdown('**bold** and __also bold__')).toBe('bold and also bold');
  });

  it('removes italic markers', () => {
    expect(stripMarkdown('*italic* and _also italic_')).toBe('italic and also italic');
  });

  it('removes strikethrough', () => {
    expect(stripMarkdown('~~deleted~~')).toBe('deleted');
  });

  it('removes inline code', () => {
    expect(stripMarkdown('use `console.log`')).toBe('use');
  });

  it('removes list markers', () => {
    expect(stripMarkdown('- item one\n* item two\n1. item three')).toBe('item one item two item three');
  });

  it('removes blockquotes', () => {
    expect(stripMarkdown('> quoted text')).toBe('quoted text');
  });

  it('removes horizontal rules', () => {
    expect(stripMarkdown('text\n---\nmore')).toBe('text more');
  });

  it('replaces table pipes with spaces', () => {
    expect(stripMarkdown('col1|col2|col3')).toBe('col1 col2 col3');
  });

  it('returns empty string for empty input', () => {
    expect(stripMarkdown('')).toBe('');
  });
});

// ── getMotivation ────────────────────────────────────────────
describe('getMotivation', () => {
  it('returns empty string when total is 0', () => {
    expect(getMotivation(0, 0)).toBe('');
  });

  it('returns start message at 0 progress', () => {
    expect(getMotivation(0, 5)).toBe('Dale, empeza!');
  });

  it('returns "Buen comienzo" for low progress (<30%)', () => {
    expect(getMotivation(1, 10)).toBe('Buen comienzo!');
  });

  it('returns mid-progress message at 30-70%', () => {
    expect(getMotivation(4, 10)).toBe('Vas muy bien, segui asi!');
  });

  it('returns near-finish message at 70-99%', () => {
    expect(getMotivation(8, 10)).toBe('Ya casi terminas!');
  });

  it('returns completion message at 100%', () => {
    expect(getMotivation(10, 10)).toBe('Excelente! Completaste todo!');
  });
});
