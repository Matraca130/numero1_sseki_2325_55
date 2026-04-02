import type { SummaryBlock } from '@/app/services/summariesApi';

export interface KeywordBlockMapping {
  blockId: string;
  keywordNames: string[];
}

export interface BlockKeywordMap {
  summaryId: string;
  mappings: KeywordBlockMapping[];
  keywordToBlocks: Map<string, string[]>;
  blockToKeywords: Map<string, string[]>;
}

const KW_RE = /\{\{([^}]+)\}\}/g;

function findKeywords(text: unknown): string[] {
  if (typeof text !== 'string') return [];
  const out: string[] = [];
  for (const m of text.matchAll(KW_RE)) out.push(m[1].toLowerCase());
  return out;
}

/** Scans all text fields of a SummaryBlock for {{keyword}} markers. */
export function extractKeywordsFromBlock(block: SummaryBlock): string[] {
  const c = block.content ?? {};
  const raw: string[] = [];
  const t = block.type;

  if (t === 'prose' || t === 'text')          raw.push(...findKeywords(c.body));
  if (t === 'key_point')                      raw.push(...findKeywords(c.title), ...findKeywords(c.explanation));
  if (t === 'callout')                        raw.push(...findKeywords(c.title), ...findKeywords(c.body));
  if (t === 'two_column')                     raw.push(...findKeywords(c.left), ...findKeywords(c.right));
  if (t === 'stages' && Array.isArray(c.stages))
    for (const s of c.stages) raw.push(...findKeywords(s.title), ...findKeywords(s.description));
  if (t === 'list_detail' && Array.isArray(c.items))
    for (const it of c.items) raw.push(...findKeywords(it.title), ...findKeywords(it.detail));
  if (t === 'comparison' && Array.isArray(c.items))
    for (const it of c.items) raw.push(...findKeywords(it.title), ...findKeywords(it.description));
  if (t === 'grid' && Array.isArray(c.cells))
    for (const cell of c.cells) raw.push(...findKeywords(cell.title), ...findKeywords(cell.body));
  if (t === 'heading')                        raw.push(...findKeywords(c.text));

  return [...new Set(raw)];
}

/** Builds a bidirectional mapping: keyword<->blocks for an entire summary. */
export function buildKeywordBlockMap(summaryId: string, blocks: SummaryBlock[]): BlockKeywordMap {
  const mappings: KeywordBlockMapping[] = [];
  const keywordToBlocks = new Map<string, string[]>();
  const blockToKeywords = new Map<string, string[]>();

  for (const block of blocks) {
    const kws = extractKeywordsFromBlock(block);
    if (kws.length === 0) continue;
    mappings.push({ blockId: block.id, keywordNames: kws });
    blockToKeywords.set(block.id, kws);
    for (const kw of kws) {
      const arr = keywordToBlocks.get(kw);
      if (arr) arr.push(block.id);
      else keywordToBlocks.set(kw, [block.id]);
    }
  }

  return { summaryId, mappings, keywordToBlocks, blockToKeywords };
}
