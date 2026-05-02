import React from 'react';
import KeywordChip from './KeywordChip';
import type { SummaryKeyword } from '@/app/services/summariesApi';

/** Parse inline markdown (bold, italic, code, image ref) — no external libs. */
function parseInlineMarkdown(text: string): React.ReactNode[] {
  // Handle horizontal rule: paragraph is exactly "---"
  if (text.trim() === '---') {
    return [<hr key="hr" className="my-2 border-slate-200 dark:border-slate-700" />];
  }

  const nodes: React.ReactNode[] = [];
  // 1. Split by backtick code spans first
  const codeParts = text.split(/(`[^`]+`)/g);
  codeParts.forEach((codePart, ci) => {
    const codeMatch = codePart.match(/^`([^`]+)`$/);
    if (codeMatch) {
      nodes.push(
        <code key={`c${ci}`} className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono">
          {codeMatch[1]}
        </code>,
      );
      return;
    }
    // 2. Split by bold **...**
    const boldParts = codePart.split(/(\*\*[^*]+\*\*)/g);
    boldParts.forEach((boldPart, bi) => {
      const boldMatch = boldPart.match(/^\*\*([^*]+)\*\*$/);
      if (boldMatch) {
        // Parse italic inside bold
        const inner = parseItalicAndImage(boldMatch[1], `${ci}-${bi}`);
        nodes.push(<strong key={`b${ci}-${bi}`}>{inner}</strong>);
        return;
      }
      // 3. Parse italic and image refs in remaining text
      nodes.push(...parseItalicAndImage(boldPart, `${ci}-${bi}`));
    });
  });
  return nodes;
}

/** Parse *italic* and [Imagen: ...] in a text fragment. */
function parseItalicAndImage(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Split by italic *...* (single asterisk, not double)
  const italicParts = text.split(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g);
  for (let ii = 0; ii < italicParts.length; ii++) {
    if (ii % 2 === 1) {
      nodes.push(<em key={`i${keyPrefix}-${ii}`}>{italicParts[ii]}</em>);
    } else {
      // Parse [Imagen: ...] in remaining text
      nodes.push(...parseImageRef(italicParts[ii], `${keyPrefix}-${ii}`));
    }
  }
  return nodes;
}

/** Parse [Imagen: descripción] references. */
function parseImageRef(text: string, keyPrefix: string): React.ReactNode[] {
  if (!text) return [];
  const parts = text.split(/(\[Imagen:\s*[^\]]+\])/g);
  return parts.map((part, idx) => {
    if (/^\[Imagen:\s*[^\]]+\]$/.test(part)) {
      return (
        <span key={`img${keyPrefix}-${idx}`} className="text-xs text-slate-400 italic">
          {part}
        </span>
      );
    }
    return part || null;
  }).filter(Boolean) as React.ReactNode[];
}

// UUID v4 pattern for bare keyword IDs that lost their {{}} wrapper.
// Lifted to module scope (was rebuilt per call inside wrapBareKeywordUuids).
const BARE_UUID_WRAP_RE =
  /(?<!\{\{)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?!\}\})/gi;

interface KeywordLookup {
  /** Lowercased ids of ALL keywords (including inactive) — for bare-UUID wrapping */
  idSetAll: Set<string>;
  /** Active-only keyword by id */
  byId: Map<string, SummaryKeyword>;
  /** Active-only keyword by lowercased name */
  byNameLower: Map<string, SummaryKeyword>;
}

// Module-level cache keyed on the keywords array reference. The same array
// is reused across all block renderers for a given summary (per the React
// Query cache), so callers within one render typically share the cache hit.
// WeakMap lets the cache GC naturally when the keyword array is replaced.
const lookupCache = new WeakMap<SummaryKeyword[], KeywordLookup>();

function getKeywordLookup(keywords: SummaryKeyword[]): KeywordLookup {
  const cached = lookupCache.get(keywords);
  if (cached) return cached;
  const idSetAll = new Set<string>();
  const byId = new Map<string, SummaryKeyword>();
  const byNameLower = new Map<string, SummaryKeyword>();
  for (const k of keywords) {
    idSetAll.add(k.id.toLowerCase());
    if (k.is_active !== false) {
      byId.set(k.id, k);
      byNameLower.set(k.name.toLowerCase(), k);
    }
  }
  const lookup: KeywordLookup = { idSetAll, byId, byNameLower };
  lookupCache.set(keywords, lookup);
  return lookup;
}

/**
 * Wrap bare keyword UUIDs (without {{}}) so the main parser can resolve them.
 * Only wraps UUIDs that match an existing keyword ID to avoid false positives.
 */
function wrapBareKeywordUuids(text: string, keywords: SummaryKeyword[]): string {
  if (!keywords.length) return text;
  const { idSetAll } = getKeywordLookup(keywords);
  // BARE_UUID_WRAP_RE has the global flag but we never reuse its state
  // across overlapping calls; String#replace creates its own iterator.
  return text.replace(BARE_UUID_WRAP_RE, (_uuid, captured) =>
    idSetAll.has((captured as string).toLowerCase()) ? `{{${captured}}}` : captured,
  );
}

/**
 * Escape HTML-significant characters to their entity equivalents.
 * Used to prevent XSS when injecting untrusted strings (e.g. keyword names
 * authored by professors) into HTML strings that will be rendered via
 * dangerouslySetInnerHTML. Defense-in-depth: even though sanitizeHtml
 * (DOMPurify) runs later in the pipeline, escaping at injection time
 * prevents ever producing a dangerous HTML fragment in the first place.
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, ch => HTML_ESCAPE_MAP[ch]);
}

/**
 * Replace {{uuid}} or {{name}} placeholders with keyword names in a plain string.
 * Also resolves bare keyword UUIDs (without {{}}).
 * Useful for HTML content rendered via dangerouslySetInnerHTML where React
 * components (KeywordChip) cannot be injected.
 *
 * Security: When `options.escapeHtml` is true (required for HTML contexts),
 * keyword names are HTML-escaped before injection to prevent stored XSS via
 * maliciously-named keywords. Plain-text consumers (React text children,
 * string-matching utilities) should leave `escapeHtml` as the default `false`.
 */
export function replaceKeywordPlaceholders(
  text: string,
  keywords: SummaryKeyword[] = [],
  options: { escapeHtml?: boolean } = {},
): string {
  const { escapeHtml: shouldEscape = false } = options;
  const normalized = wrapBareKeywordUuids(text, keywords);
  const { byId, byNameLower } = getKeywordLookup(keywords);
  return normalized.replace(/\{\{([^}]+)\}\}/g, (_match, ref: string) => {
    // Active-only lookup — matches the prior `is_active !== false` filter.
    const kw = byId.get(ref) ?? byNameLower.get(ref.toLowerCase());
    if (!kw) return _match;
    return shouldEscape ? escapeHtml(kw.name) : kw.name;
  });
}

/**
 * Parses text containing {{keyword_name}} markers and renders them as KeywordChip components.
 * Also resolves bare keyword UUIDs (without {{}}).
 * Non-matching text is rendered with paragraph break support (\n\n -> <br/><br/>)
 * and inline markdown (bold, italic, code, hr, image refs).
 */
export default function renderTextWithKeywords(
  text: string | undefined,
  keywords: SummaryKeyword[] = [],
): React.ReactNode {
  if (!text) return null;

  const normalized = wrapBareKeywordUuids(text, keywords);
  const { byId, byNameLower } = getKeywordLookup(keywords);

  return normalized.split(/(\{\{[^}]+\}\})/g).map((part, i) => {
    const match = part.match(/^\{\{(.+)\}\}$/);
    if (match) {
      const kwRef = match[1];
      const kw = byId.get(kwRef) ?? byNameLower.get(kwRef.toLowerCase());
      if (kw) return <KeywordChip key={i} keyword={kw} />;
      return <span key={i} className="text-xs text-slate-400 italic">{kwRef}</span>;
    }
    // Preserve paragraph breaks + apply inline markdown
    return part.split('\n\n').map((p, j) => (
      <React.Fragment key={`${i}-${j}`}>
        {j > 0 && <><br /><br /></>}
        {parseInlineMarkdown(p)}
      </React.Fragment>
    ));
  });
}
