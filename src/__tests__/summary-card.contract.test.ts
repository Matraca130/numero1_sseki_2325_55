// ============================================================
// Axon — Contract tests for SummaryCard (Sprint 1)
//
// Guards: export shape, props interface, palette imports.
// Source-based static analysis — zero DOM, zero network.
// ============================================================
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CARD_PATH = resolve(__dirname, '..', 'app', 'components', 'content', 'SummaryCard.tsx');
const cardSource = readFileSync(CARD_PATH, 'utf-8');

const HELPERS_PATH = resolve(__dirname, '..', 'app', 'components', 'content', 'summary-helpers.ts');
const helpersSource = readFileSync(HELPERS_PATH, 'utf-8');

describe('SummaryCard contract', () => {
  it('exports SummaryCard as a named export (optionally memo-wrapped)', () => {
    expect(cardSource).toMatch(/export\s+(const\s+SummaryCard\s*=\s*React\.memo\s*\(|function\s+SummaryCard)/);
  });

  it('defines SummaryCardProps interface', () => {
    expect(cardSource).toContain('export interface SummaryCardProps');
  });

  it('imports from palette (no generic Tailwind colors)', () => {
    expect(cardSource).toContain("from '@/app/lib/palette'");
  });
});

describe('summary-helpers contract', () => {
  it('exports stripMarkdown function', () => {
    expect(helpersSource).toMatch(/export\s+function\s+stripMarkdown/);
  });

  it('exports getMotivation function', () => {
    expect(helpersSource).toMatch(/export\s+function\s+getMotivation/);
  });
});
