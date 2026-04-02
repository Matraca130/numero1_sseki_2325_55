// ============================================================
// Axon — ViewerBlock TTS Button Filtering Test
//
// Verifies TTSButton renders ONLY for text-bearing blocks
// that have extractable text content (isHighlightable + ttsText).
// Non-text blocks and blocks without extractable text should NOT
// render TTSButton.
// ============================================================

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ViewerBlock } from '../ViewerBlock';
import { makeBlock, FIXTURES } from '../blocks/__tests__/test-utils';

// Block types where TTS SHOULD appear (text-bearing with extractable content)
// These fixtures have title/text/content/html fields that extractBlockText picks up
const TEXT_BEARING_TYPES = [
  { name: 'prose', fixture: FIXTURES.prose },
  { name: 'key_point', fixture: FIXTURES.key_point },
  { name: 'callout', fixture: FIXTURES.callout_tip },
  { name: 'stages', fixture: FIXTURES.stages },
] as const;

// Block types where TTS should NOT appear:
// - non-text types (image, section_divider) are not isHighlightable
// - two_column is isHighlightable but has no extractable text (no title/text/html fields)
const NO_TTS_TYPES = [
  { name: 'section_divider', fixture: FIXTURES.section_divider },
  { name: 'two_column (no extractable text)', fixture: FIXTURES.two_column },
] as const;

describe('ViewerBlock — TTSButton filtering', () => {
  TEXT_BEARING_TYPES.forEach(({ name, fixture }) => {
    it(`shows TTS wrapper for ${name} block`, () => {
      const block = makeBlock(fixture);
      const { container } = render(
        <ViewerBlock block={block} isMobile={false} summaryId="test-summary" />
      );
      // TTSButton renders a <button> with aria-label "Ler em voz alta"
      const ttsButton = container.querySelector('button[aria-label="Ler em voz alta"]');
      expect(ttsButton).toBeTruthy();
    });
  });

  NO_TTS_TYPES.forEach(({ name, fixture }) => {
    it(`does NOT show TTS wrapper for ${name} block`, () => {
      const block = makeBlock(fixture);
      const { container } = render(
        <ViewerBlock block={block} isMobile={false} summaryId="test-summary" />
      );
      const ttsButton = container.querySelector('button[aria-label="Ler em voz alta"]');
      expect(ttsButton).toBeFalsy();
    });
  });
});
