// ============================================================
// TEST: flashcard-utils.ts — Card type detection & content parsing
//
// Pure functions, zero mocks needed.
// Covers: detectCardType (6 types), extractImageUrl, extractText
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  detectCardType,
  extractImageUrl,
  extractText,
} from '../flashcard-utils';

// ── extractImageUrl ───────────────────────────────────────

describe('extractImageUrl', () => {
  it('should extract URL from markdown image syntax', () => {
    const url = extractImageUrl('![img](https://example.com/photo.jpg)');
    expect(url).toBe('https://example.com/photo.jpg');
  });

  it('should extract standalone image URL', () => {
    const url = extractImageUrl('https://cdn.axon.com/card-img.png');
    expect(url).toBe('https://cdn.axon.com/card-img.png');
  });

  it('should return null for plain text', () => {
    expect(extractImageUrl('What is the mitochondria?')).toBeNull();
  });

  it('should return null for non-image URLs', () => {
    expect(extractImageUrl('https://example.com/page')).toBeNull();
  });

  it('should handle webp format', () => {
    const url = extractImageUrl('https://cdn.axon.com/image.webp');
    expect(url).toBe('https://cdn.axon.com/image.webp');
  });

  it('should handle svg format', () => {
    const url = extractImageUrl('https://cdn.axon.com/diagram.svg');
    expect(url).toBe('https://cdn.axon.com/diagram.svg');
  });
});

// ── extractText ───────────────────────────────────────────

describe('extractText', () => {
  it('should return plain text as-is', () => {
    expect(extractText('What is ATP?')).toBe('What is ATP?');
  });

  it('should strip markdown image and return remaining text', () => {
    const result = extractText('![img](https://example.com/photo.jpg) What is this organ?');
    expect(result).toBe('What is this organ?');
  });

  it('should return empty string when content is only an image', () => {
    expect(extractText('![img](https://example.com/photo.jpg)')).toBe('');
  });

  it('should handle multiple images', () => {
    const result = extractText('![img](https://a.com/1.jpg) text ![img](https://a.com/2.jpg)');
    expect(result).toBe('text');
  });
});

// ── detectCardType ────────────────────────────────────────

describe('detectCardType', () => {
  it('should detect "text" type (plain front and back)', () => {
    expect(detectCardType('What is ATP?', 'Adenosine triphosphate')).toBe('text');
  });

  it('should detect "cloze" type (front has {{...}} pattern)', () => {
    expect(detectCardType('ATP stands for {{Adenosine triphosphate}}', 'Adenosine triphosphate')).toBe('cloze');
  });

  it('should detect "text_image" type (text front, image back)', () => {
    expect(detectCardType(
      'What does this organ look like?',
      '![img](https://cdn.axon.com/heart.png)',
    )).toBe('text_image');
  });

  it('should detect "image_text" type (image front, text back)', () => {
    expect(detectCardType(
      '![img](https://cdn.axon.com/organ.jpg)',
      'This is the liver',
    )).toBe('image_text');
  });

  it('should detect "image_image" type (image front, image back)', () => {
    expect(detectCardType(
      '![img](https://cdn.axon.com/front.png)',
      '![img](https://cdn.axon.com/back.png)',
    )).toBe('image_image');
  });

  it('should detect "text_both" type (image+text front, image+text back)', () => {
    expect(detectCardType(
      '![img](https://cdn.axon.com/front.png) What is this?',
      '![img](https://cdn.axon.com/back.png) The liver',
    )).toBe('text_both');
  });

  it('should prioritize cloze over image detection', () => {
    expect(detectCardType(
      '{{ATP}} is produced in ![img](https://cdn.axon.com/mito.png)',
      'mitochondria',
    )).toBe('cloze');
  });
});
