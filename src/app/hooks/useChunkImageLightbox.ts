// ============================================================
// Axon — useChunkImageLightbox
//
// Hook that enables ImageLightbox for chunk-based content
// rendered via dangerouslySetInnerHTML.
//
// Strategy:
//   1. Extract image URLs from chunk HTML strings (regex)
//   2. Event delegation on a container ref: click on <img> → open lightbox
//   3. MutationObserver adds cursor-zoom-in to <img> nodes (since
//      KeywordHighlighterInline may re-inject DOM after initial render)
//
// Consumer: ReaderChunksTab.tsx
// Reuses: ImageLightbox from /student/ImageLightbox.tsx (no modifications)
// ============================================================
import { useState, useEffect, useCallback, useMemo, type RefObject } from 'react';
import type { Chunk } from '@/app/services/summariesApi';
import type { LightboxImage } from '@/app/components/student/ImageLightbox';
import { enrichHtmlWithImages, MD_IMAGE_RE, RAW_IMAGE_URL_RE } from '@/app/lib/summary-content-helpers';

// ── Image extraction from HTML strings ────────────────────

const IMG_TAG_RE = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
const ALT_RE = /alt=["']([^"']*)["']/i;

/** Extract all image URLs + alt text from an HTML string */
function extractImagesFromHtml(html: string): LightboxImage[] {
  const images: LightboxImage[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  // Reset lastIndex for global regex
  IMG_TAG_RE.lastIndex = 0;
  while ((match = IMG_TAG_RE.exec(html)) !== null) {
    const src = match[1];
    if (!src || seen.has(src)) continue;
    seen.add(src);

    const altMatch = match[0].match(ALT_RE);
    images.push({
      src,
      alt: altMatch?.[1] || '',
      caption: '',
    });
  }
  return images;
}

/** Extract images from plain text (markdown images + bare URLs) */
function extractImagesFromPlainText(text: string): LightboxImage[] {
  const images: LightboxImage[] = [];
  const seen = new Set<string>();

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Markdown image: ![alt](url)
    const mdMatch = trimmed.match(MD_IMAGE_RE);
    if (mdMatch) {
      const [, alt, src] = mdMatch;
      if (src && !seen.has(src)) {
        seen.add(src);
        images.push({ src, alt: alt || '', caption: '' });
      }
      continue;
    }

    // Raw image URL
    if (RAW_IMAGE_URL_RE.test(trimmed) && !seen.has(trimmed)) {
      seen.add(trimmed);
      images.push({ src: trimmed, alt: '', caption: '' });
    }
  }
  return images;
}

// ── Hook ──────────────────────────────────────────────────

export interface UseChunkImageLightboxReturn {
  /** All images extracted from chunks (for lightbox navigation) */
  images: LightboxImage[];
  /** Whether the lightbox is open */
  lightboxOpen: boolean;
  /** Current lightbox image index */
  lightboxIndex: number;
  /** Close the lightbox */
  closeLightbox: () => void;
}

export function useChunkImageLightbox(
  chunks: Chunk[],
  containerRef: RefObject<HTMLDivElement | null>,
): UseChunkImageLightboxReturn {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // ── Extract images from all chunk HTML ──────────────────
  const images = useMemo(() => {
    const allImages: LightboxImage[] = [];
    const sorted = [...chunks].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    for (const chunk of sorted) {
      if (!chunk.content) continue;

      const isHtml = /<[a-z][\s\S]*>/i.test(chunk.content);
      if (isHtml) {
        // Run enrichHtmlWithImages FIRST so we also capture images
        // that enrichment creates from bare URLs and markdown syntax
        const enriched = enrichHtmlWithImages(chunk.content);
        allImages.push(...extractImagesFromHtml(enriched));
      } else {
        // Plain text: extract markdown images and bare image URLs
        allImages.push(...extractImagesFromPlainText(chunk.content));
      }
    }
    return allImages;
  }, [chunks]);

  // ── Event delegation: click on <img> → open lightbox ────
  useEffect(() => {
    const container = containerRef.current;
    if (!container || images.length === 0) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'IMG') return;

      const src = (target as HTMLImageElement).src;
      if (!src) return;

      // Find index in our images array
      const idx = images.findIndex(img => {
        // Compare normalized URLs (browser may resolve relative URLs)
        try {
          return new URL(img.src, window.location.origin).href === new URL(src, window.location.origin).href;
        } catch {
          return img.src === src;
        }
      });

      if (idx >= 0) {
        e.preventDefault();
        e.stopPropagation();
        setLightboxIndex(idx);
        setLightboxOpen(true);
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [containerRef, images]);

  // ── MutationObserver: add cursor-zoom-in to <img> nodes ──
  // KeywordHighlighterInline may re-inject DOM, so we observe
  // mutations and style any new <img> elements.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || images.length === 0) return;

    const styleImages = (root: Element | Document) => {
      const imgs = root.querySelectorAll('img');
      imgs.forEach(img => {
        if (img.style.cursor !== 'zoom-in') {
          img.style.cursor = 'zoom-in';
          img.style.transition = 'box-shadow 0.2s, transform 0.2s';
        }
      });
    };

    // Initial pass
    styleImages(container);

    // Observe for new img nodes (KeywordHighlighterInline rewrites DOM)
    const observer = new MutationObserver((mutations) => {
      let hasNewImages = false;
      for (const m of mutations) {
        if (m.type === 'childList' && m.addedNodes.length > 0) {
          hasNewImages = true;
          break;
        }
      }
      if (hasNewImages) styleImages(container);
    });

    observer.observe(container, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [containerRef, images]);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  return { images, lightboxOpen, lightboxIndex, closeLightbox };
}
