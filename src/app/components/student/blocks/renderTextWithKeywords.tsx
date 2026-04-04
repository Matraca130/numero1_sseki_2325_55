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

// UUID v4 pattern for bare keyword IDs that lost their {{}} wrapper
const BARE_UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Wrap bare keyword UUIDs (without {{}}) so the main parser can resolve them.
 * Only wraps UUIDs that match an existing keyword ID to avoid false positives.
 */
function wrapBareKeywordUuids(text: string, keywords: SummaryKeyword[]): string {
  if (!keywords.length) return text;
  const kwIds = new Set(keywords.map(k => k.id.toLowerCase()));
  return text.replace(
    new RegExp(`(?<!\\{\\{)(${BARE_UUID_RE.source})(?!\\}\\})`, 'gi'),
    (uuid) => kwIds.has(uuid.toLowerCase()) ? `{{${uuid}}}` : uuid,
  );
}

/**
 * Replace {{uuid}} or {{name}} placeholders with keyword names in a plain string.
 * Also resolves bare keyword UUIDs (without {{}}).
 * Useful for HTML content rendered via dangerouslySetInnerHTML where React
 * components (KeywordChip) cannot be injected.
 */
export function replaceKeywordPlaceholders(
  text: string,
  keywords: SummaryKeyword[] = [],
): string {
  const normalized = wrapBareKeywordUuids(text, keywords);
  return normalized.replace(/\{\{([^}]+)\}\}/g, (_match, ref: string) => {
    const kw = keywords.find(
      k => (k.id === ref || k.name.toLowerCase() === ref.toLowerCase()) && k.is_active !== false,
    );
    return kw ? kw.name : _match;
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

  return normalized.split(/(\{\{[^}]+\}\})/g).map((part, i) => {
    const match = part.match(/^\{\{(.+)\}\}$/);
    if (match) {
      const kwRef = match[1];
      const kw = keywords.find(
        k => (k.id === kwRef || k.name.toLowerCase() === kwRef.toLowerCase()) && k.is_active !== false,
      );
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
