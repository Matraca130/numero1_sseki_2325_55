// ============================================================
// Axon — Summary Content Helpers (pure functions)
//
// Extracted from StudentSummaryReader.tsx (Phase 2, Step 1).
// Pure content-parsing utilities with zero side effects.
//
// Consumers:
//   - StudentSummaryReader.tsx (pagination, enrichment, plain line render)
//   - ReaderHeader.tsx (pagination, enrichment, renderPlainLine)
//   - ReaderChunksTab.tsx (enrichment, renderPlainLine)
//   - ChunkRenderer.tsx (enrichment + renderPlainLine, both with 'light' variant)
// ============================================================
import React from 'react';

// ── Constants ─────────────────────────────────────────────

/** Characters per page for HTML content pagination */
export const CONTENT_PAGE_SIZE = 3500;

/** Detect markdown image syntax: ![alt](url) */
export const MD_IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;

/** Detect raw image URL (common web image extensions) */
export const RAW_IMAGE_URL_RE = /^https?:\/\/\S+\.(jpe?g|png|gif|webp|svg|avif|bmp)(\?\S*)?$/i;

// ── HTML Enrichment ───────────────────────────────────────

/**
 * Post-process HTML content: convert bare image URLs and markdown image
 * syntax inside <p> tags into proper <img>/<figure> elements.
 *
 * Three passes:
 *   1. <p> containing only a bare image URL → <figure><img></figure>
 *   2. <p> containing only ![alt](url) → <figure><img><figcaption></figure>
 *   3. Inline bare image URL (not in src/href) → <img>
 *
 * @param html - Raw HTML string to enrich
 * @param variant - Color scheme variant: 'light' (gray-*) for professor, 'dark' (zinc-*) for student
 */
export function enrichHtmlWithImages(html: string, variant: 'light' | 'dark' = 'dark'): string {
  const borderColor = variant === 'light' ? 'border-gray-200' : 'border-zinc-200';
  const captionColor = variant === 'light' ? 'text-gray-400' : 'text-zinc-400';

  // Pass 1: bare URL inside <p>
  let result = html.replace(
    /<p[^>]*>\s*(https?:\/\/[^\s<]+\.(?:jpe?g|png|gif|webp|svg|avif|bmp)(?:\?[^\s<]*)?)\s*<\/p>/gi,
    (_m, url) =>
      `<figure class="my-4"><img src="${url}" alt="" loading="lazy" class="rounded-xl border ${borderColor} shadow-sm max-w-full h-auto mx-auto block" /></figure>`
  );
  // Pass 2: markdown image inside <p>
  result = result.replace(
    /<p[^>]*>\s*!\[([^\]]*)\]\((https?:\/\/[^)]+)\)\s*<\/p>/gi,
    (_m, alt, url) =>
      `<figure class="my-4"><img src="${url}" alt="${alt || ''}" loading="lazy" class="rounded-xl border ${borderColor} shadow-sm max-w-full h-auto mx-auto block" />${alt ? `<figcaption class="mt-2 text-center text-xs ${captionColor} italic">${alt}</figcaption>` : ''}</figure>`
  );
  // Pass 3: inline bare URL (not already in attribute)
  result = result.replace(
    /(?<!["'=])(https?:\/\/[^\s<>"']+\.(?:jpe?g|png|gif|webp|svg|avif|bmp)(?:\?[^\s<>"']*)?)(?![^<]*<\/a>)/gi,
    (url) =>
      `<img src="${url}" alt="" loading="lazy" class="rounded-xl border ${borderColor} shadow-sm max-w-full h-auto mx-auto block my-4" />`
  );
  return result;
}

// ── Pagination ────────────────────────────────────────────

/**
 * Split HTML content into pages by block-level closing tags.
 * Each page stays under `pageSize` characters (soft limit —
 * won't break mid-block).
 */
export function paginateHtml(html: string, pageSize: number): string[] {
  const blockRe = /(<\/(?:p|div|h[1-6]|figure|blockquote|ul|ol|li|table|pre|hr)>)/gi;
  const parts: string[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(html)) !== null) {
    const end = match.index + match[0].length;
    parts.push(html.slice(last, end));
    last = end;
  }
  if (last < html.length) parts.push(html.slice(last));

  const pages: string[] = [];
  let current = '';
  for (const part of parts) {
    if (current.length + part.length > pageSize && current.length > 0) {
      pages.push(current);
      current = part;
    } else {
      current += part;
    }
  }
  if (current) pages.push(current);
  return pages.length > 0 ? pages : [html];
}

/**
 * Split plain text into pages by line count.
 * Returns array of pages, each page is an array of lines.
 */
export function paginateLines(text: string, linesPerPage: number): string[][] {
  const lines = text.split('\n');
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  return pages.length > 0 ? pages : [lines];
}

// ── Plain Text Rendering ──────────────────────────────────

/**
 * Render a single line of plain text / simple markdown as JSX.
 * Handles: blank lines, markdown images, raw image URLs,
 * h2/h3 headings, bullet lists, and regular paragraphs.
 *
 * @param line - Single line of text
 * @param key  - React key for the element
 * @param variant - Color scheme: 'light' (gray-*) for professor, 'dark' (zinc-*) for student
 */
export function renderPlainLine(line: string, key: number, variant: 'light' | 'dark' = 'dark'): React.ReactNode {
  const border = variant === 'light' ? 'border-gray-200' : 'border-zinc-200';
  const caption = variant === 'light' ? 'text-gray-400' : 'text-zinc-400';
  const heading = variant === 'light' ? 'text-gray-800' : 'text-zinc-800';
  const body = variant === 'light' ? 'text-gray-600' : 'text-zinc-600';

  if (!line.trim()) return <br key={key} />;

  // Markdown image: ![alt](url)
  const mdMatch = line.match(MD_IMAGE_RE);
  if (mdMatch) {
    const [, alt, src] = mdMatch;
    return (
      <figure key={key} className="my-4">
        <img src={src} alt={alt || ''} loading="lazy" className={`rounded-xl border ${border} shadow-sm max-w-full h-auto mx-auto block`} />
        {alt && <figcaption className={`mt-2 text-center text-xs ${caption} italic`}>{alt}</figcaption>}
      </figure>
    );
  }

  // Raw image URL
  if (RAW_IMAGE_URL_RE.test(line.trim())) {
    return (
      <figure key={key} className="my-4">
        <img src={line.trim()} alt="" loading="lazy" className={`rounded-xl border ${border} shadow-sm max-w-full h-auto mx-auto block`} />
      </figure>
    );
  }

  // Headings
  if (line.startsWith('## ')) return <h3 key={key} className={`${heading} mt-6 mb-2`}>{line.replace('## ', '')}</h3>;
  if (line.startsWith('### ')) return <h4 key={key} className={`${heading} mt-4 mb-1.5`}>{line.replace('### ', '')}</h4>;

  // Bullet lists
  if (line.startsWith('- ') || line.startsWith('* ')) return <li key={key} className={`ml-4 ${body}`}>{line.replace(/^[-*]\s/, '')}</li>;

  // Regular paragraph
  return <p key={key} className={`mb-2 ${body} text-justify`}>{line}</p>;
}