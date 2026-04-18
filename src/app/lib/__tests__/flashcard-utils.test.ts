// ============================================================
// Axon -- Tests for flashcard-utils.ts
//
// Pure functions: extractImageUrl, extractText, detectCardType
// ============================================================

import { describe, it, expect } from 'vitest';

import {
  extractImageUrl,
  extractText,
  detectCardType,
} from '@/app/lib/flashcard-utils';

// ================================================================
// extractImageUrl
// ================================================================

describe('extractImageUrl', () => {
  it('extracts URL from markdown ![img](URL)', () => {
    expect(extractImageUrl('![img](https://example.com/pic.png)')).toBe('https://example.com/pic.png');
  });

  it('extracts URL when markdown is inside longer content', () => {
    const content = 'Some text before ![img](https://example.com/a.jpg) trailing';
    expect(extractImageUrl(content)).toBe('https://example.com/a.jpg');
  });

  it('extracts standalone HTTPS image URL', () => {
    expect(extractImageUrl('https://example.com/pic.png')).toBe('https://example.com/pic.png');
  });

  it('extracts standalone HTTP image URL', () => {
    expect(extractImageUrl('http://example.com/pic.jpeg')).toBe('http://example.com/pic.jpeg');
  });

  it('extracts URL with .jpg extension', () => {
    expect(extractImageUrl('https://foo.com/bar.jpg')).toBe('https://foo.com/bar.jpg');
  });

  it('extracts URL with .webp extension', () => {
    expect(extractImageUrl('https://foo.com/bar.webp')).toBe('https://foo.com/bar.webp');
  });

  it('extracts URL with .gif, .svg, .bmp extensions', () => {
    expect(extractImageUrl('https://a.com/x.gif')).toBe('https://a.com/x.gif');
    expect(extractImageUrl('https://a.com/x.svg')).toBe('https://a.com/x.svg');
    expect(extractImageUrl('https://a.com/x.bmp')).toBe('https://a.com/x.bmp');
  });

  it('is case-insensitive for file extensions', () => {
    expect(extractImageUrl('https://foo.com/bar.PNG')).toBe('https://foo.com/bar.PNG');
    expect(extractImageUrl('https://foo.com/bar.Jpeg')).toBe('https://foo.com/bar.Jpeg');
  });

  it('trims surrounding whitespace before matching standalone URL', () => {
    expect(extractImageUrl('   https://example.com/a.png   ')).toBe('https://example.com/a.png');
  });

  it('returns null for plain text', () => {
    expect(extractImageUrl('just some text')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractImageUrl('')).toBeNull();
  });

  it('returns null when URL is not an image extension (standalone)', () => {
    expect(extractImageUrl('https://example.com/page.html')).toBeNull();
  });

  it('prefers markdown match over standalone detection', () => {
    // Content includes both markdown AND plain text that is not an image.
    const content = 'intro ![img](https://a.com/inside.png) more';
    expect(extractImageUrl(content)).toBe('https://a.com/inside.png');
  });
});

// ================================================================
// extractText
// ================================================================

describe('extractText', () => {
  it('returns original string when no image markdown present', () => {
    expect(extractText('hello world')).toBe('hello world');
  });

  it('removes markdown ![img](URL) token', () => {
    expect(extractText('before ![img](https://a.com/x.png) after')).toBe('before  after');
  });

  it('removes multiple image markdown tokens', () => {
    const input = '![img](a.png) middle ![img](b.png)';
    expect(extractText(input)).toBe('middle');
  });

  it('trims leading and trailing whitespace', () => {
    expect(extractText('   hello   ')).toBe('hello');
  });

  it('returns empty string when input is only markdown image', () => {
    expect(extractText('![img](https://a.com/x.png)')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(extractText('')).toBe('');
  });
});

// ================================================================
// detectCardType
// ================================================================

describe('detectCardType', () => {
  it('detects "cloze" when front has {{...}} syntax', () => {
    expect(detectCardType('The capital is {{Paris}}', 'Paris')).toBe('cloze');
  });

  it('cloze detection takes precedence over images', () => {
    const front = '![img](https://a.com/x.png) and {{answer}}';
    expect(detectCardType(front, 'back')).toBe('cloze');
  });

  it('detects "text" when neither side has images', () => {
    expect(detectCardType('question?', 'answer')).toBe('text');
  });

  it('detects "text_image" when only back has an image', () => {
    expect(
      detectCardType('question?', '![img](https://a.com/x.png)')
    ).toBe('text_image');
  });

  it('detects "image_text" when only front has an image', () => {
    expect(
      detectCardType('![img](https://a.com/x.png)', 'answer')
    ).toBe('image_text');
  });

  it('detects "image_image" when both sides have only images (no text)', () => {
    expect(
      detectCardType('![img](https://a.com/q.png)', '![img](https://a.com/a.png)')
    ).toBe('image_image');
  });

  it('detects "text_both" when both sides have images + text', () => {
    const front = 'Question text ![img](https://a.com/q.png)';
    const back = 'Answer text ![img](https://a.com/a.png)';
    expect(detectCardType(front, back)).toBe('text_both');
  });

  it('does not classify as text_both if one side has no text', () => {
    const front = '![img](https://a.com/q.png)';
    const back = 'text only + ![img](https://a.com/a.png)';
    // fTxt is empty, so text_both fails; falls through to image_image? No,
    // bTxt is present so it's not image_image. That leaves image_text
    // (only front has image, back has both). Per the algorithm, fImg &&
    // bImg && fTxt && bTxt must ALL be true for text_both — here fTxt is
    // empty. Next check: fImg && bImg => image_image.
    expect(detectCardType(front, back)).toBe('image_image');
  });

  it('handles empty strings as text type', () => {
    expect(detectCardType('', '')).toBe('text');
  });
});
