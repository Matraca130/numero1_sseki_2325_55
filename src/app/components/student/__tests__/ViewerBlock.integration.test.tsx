// ============================================================
// Axon — ViewerBlock Integration Test
//
// Verifies that each edu block type routes to the correct
// renderer component without crashing.
// ============================================================

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ViewerBlock } from '../ViewerBlock';
import { makeBlock, FIXTURES } from '../blocks/__tests__/test-utils';

const EDU_BLOCK_TYPES = [
  { name: 'prose', fixture: FIXTURES.prose },
  { name: 'key_point', fixture: FIXTURES.key_point },
  { name: 'stages', fixture: FIXTURES.stages },
  { name: 'comparison', fixture: FIXTURES.comparison },
  { name: 'list_detail', fixture: FIXTURES.list_detail },
  { name: 'grid', fixture: FIXTURES.grid },
  { name: 'two_column', fixture: FIXTURES.two_column },
  { name: 'callout', fixture: FIXTURES.callout_tip },
  { name: 'image_reference', fixture: FIXTURES.image_reference },
  { name: 'section_divider', fixture: FIXTURES.section_divider },
] as const;

describe('ViewerBlock — edu block routing', () => {
  EDU_BLOCK_TYPES.forEach(({ name, fixture }) => {
    it(`renders ${name} block without crashing`, () => {
      const block = makeBlock(fixture);
      const { container } = render(
        <ViewerBlock block={block} isMobile={false} />
      );
      // Should not render fallback "Bloque no soportado"
      expect(container.textContent).not.toContain('Bloque no soportado');
    });
  });

  it('still renders legacy text block', () => {
    const block = makeBlock({
      type: 'text' as any,
      content: { text: 'Legacy text content' },
    });
    const { container } = render(
      <ViewerBlock block={block} isMobile={false} />
    );
    expect(container.textContent).toContain('Legacy text content');
  });
});
