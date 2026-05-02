// ============================================================
// Tests for flashcard-utils.ts — Card content parsing & detection
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  extractImageUrl,
  extractText,
  detectCardType,
} from '@/app/lib/flashcard-utils';

describe('extractImageUrl', () => {
  it('extracts URL from markdown ![img](URL)', () => {
    expect(
      extractImageUrl('Some text ![img](https://cdn.test/a.png) more')
    ).toBe('https://cdn.test/a.png');
  });

  it('returns the standalone image URL when input is a bare URL', () => {
    expect(extractImageUrl('https://cdn.test/a.jpg')).toBe(
      'https://cdn.test/a.jpg'
    );
  });

  it('handles common image extensions case-insensitively', () => {
    expect(extractImageUrl('https://x/y.PNG')).toBe('https://x/y.PNG');
    expect(extractImageUrl('https://x/y.JPEG')).toBe('https://x/y.JPEG');
    expect(extractImageUrl('https://x/y.webp')).toBe('https://x/y.webp');
  });

  it('returns null for plain text', () => {
    expect(extractImageUrl('Just words here')).toBeNull();
  });

  it('returns null for non-image URL', () => {
    expect(extractImageUrl('https://example.com/page')).toBeNull();
  });

  it('prefers markdown form over standalone match when both present', () => {
    const content = '![img](https://cdn.test/md.png) https://cdn.test/raw.jpg';
    expect(extractImageUrl(content)).toBe('https://cdn.test/md.png');
  });
});

describe('extractText', () => {
  it('returns content unchanged when there is no image markdown', () => {
    expect(extractText('Hello world')).toBe('Hello world');
  });

  it('strips markdown image and returns trimmed text', () => {
    expect(extractText('![img](https://x/a.png) caption')).toBe('caption');
  });

  it('removes multiple markdown images', () => {
    expect(
      extractText('![img](u1) middle ![img](u2) end')
    ).toBe('middle  end');
  });

  it('returns empty string when content is only an image', () => {
    expect(extractText('![img](https://x/a.png)')).toBe('');
  });
});

describe('detectCardType', () => {
  it('returns "cloze" when front contains {{...}} pattern', () => {
    expect(detectCardType('The {{mitochondria}} is...', 'organelle')).toBe(
      'cloze'
    );
  });

  it('returns "text" when both sides are plain text', () => {
    expect(detectCardType('What is X?', 'X is Y.')).toBe('text');
  });

  it('returns "image_text" when only front has an image', () => {
    expect(
      detectCardType('![img](https://x/a.png)', 'A neuron')
    ).toBe('image_text');
  });

  it('returns "text_image" when only back has an image', () => {
    expect(
      detectCardType('What does it look like?', '![img](https://x/a.png)')
    ).toBe('text_image');
  });

  it('returns "image_image" when both sides are image-only', () => {
    expect(
      detectCardType('![img](https://x/a.png)', '![img](https://x/b.png)')
    ).toBe('image_image');
  });

  it('returns "text_both" when both sides have text + image', () => {
    expect(
      detectCardType(
        '![img](https://x/a.png) caption',
        '![img](https://x/b.png) explanation'
      )
    ).toBe('text_both');
  });

  it('cloze detection takes precedence over images', () => {
    // Front has both cloze syntax and an image — should still be classified as cloze.
    expect(
      detectCardType(
        '{{cell}} ![img](https://x/a.png)',
        '![img](https://x/b.png)'
      )
    ).toBe('cloze');
  });
});
