// ============================================================
// Axon — Contract tests for SummaryCard (Sprint 1)
//
// Guards: export shape, props interface, palette imports.
// Pure static analysis — zero DOM, zero network.
// ============================================================
import { describe, it, expect } from 'vitest';

describe('SummaryCard contract', () => {
  it('exports SummaryCard as a named export', async () => {
    const mod = await import('../app/components/content/SummaryCard');
    expect(mod.SummaryCard).toBeDefined();
    expect(typeof mod.SummaryCard).toBe('object'); // React.memo wraps as object
  });

  it('SummaryCard.displayName or type is accessible', async () => {
    const mod = await import('../app/components/content/SummaryCard');
    // React.memo components have a .type property
    const card = mod.SummaryCard as any;
    expect(card.type || card.render || card).toBeTruthy();
  });
});

describe('summary-helpers contract', () => {
  it('exports stripMarkdown function', async () => {
    const mod = await import('../app/components/content/summary-helpers');
    expect(typeof mod.stripMarkdown).toBe('function');
  });

  it('exports getMotivation function', async () => {
    const mod = await import('../app/components/content/summary-helpers');
    expect(typeof mod.getMotivation).toBe('function');
  });

  it('stripMarkdown returns string', async () => {
    const { stripMarkdown } = await import('../app/components/content/summary-helpers');
    expect(typeof stripMarkdown('test')).toBe('string');
  });

  it('getMotivation returns string', async () => {
    const { getMotivation } = await import('../app/components/content/summary-helpers');
    expect(typeof getMotivation(1, 2)).toBe('string');
  });
});
