// ============================================================
// Axon — KeywordHighlighterInline
//
// Scans summary text (plain or HTML) for keyword names and wraps
// matches in highlighted clickable <span>s. Clicking a keyword
// opens InlineKeywordPopover (positioned with useSmartPosition).
//
// Connects to REAL backend:
//   GET /keywords?summary_id=xxx
//   GET /bkt-states (batch, scopeToUser)
//   GET /subtopics?keyword_id=xxx (per keyword)
//
// Usage:
//   <KeywordHighlighterInline summaryId={id}>
//     <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
//   </KeywordHighlighterInline>
//
// Or for plain text:
//   <KeywordHighlighterInline summaryId={id} plainText={text} />
// ============================================================
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { apiCall } from '@/app/lib/api';
import * as summariesApi from '@/app/services/summariesApi';
import type { SummaryKeyword, Subtopic } from '@/app/services/summariesApi';
import type { BktState } from '@/app/lib/mastery-helpers';
import {
  getKeywordMastery,
  getMasteryColor,
} from '@/app/lib/mastery-helpers';
import { InlineKeywordPopover } from './InlineKeywordPopover';

// ── Helpers ───────────────────────────────────────────────

function extractItems<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && Array.isArray((result as any).items))
    return (result as any).items;
  return [];
}

/** Escape regex special chars */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Mastery color → Tailwind classes for highlight ────────

function getHighlightClasses(mastery: number): {
  bg: string;
  hoverBg: string;
  border: string;
  text: string;
} {
  if (mastery < 0) {
    return {
      bg: 'bg-violet-100/60',
      hoverBg: 'hover:bg-violet-200/80',
      border: 'border-b-2 border-violet-300',
      text: 'text-violet-800',
    };
  }
  const color = getMasteryColor(mastery);
  switch (color) {
    case 'green':
      return {
        bg: 'bg-emerald-100/60',
        hoverBg: 'hover:bg-emerald-200/80',
        border: 'border-b-2 border-emerald-400',
        text: 'text-emerald-800',
      };
    case 'yellow':
      return {
        bg: 'bg-amber-100/60',
        hoverBg: 'hover:bg-amber-200/80',
        border: 'border-b-2 border-amber-400',
        text: 'text-amber-800',
      };
    case 'red':
      return {
        bg: 'bg-red-100/60',
        hoverBg: 'hover:bg-red-200/80',
        border: 'border-b-2 border-red-400',
        text: 'text-red-800',
      };
    default:
      return {
        bg: 'bg-violet-100/60',
        hoverBg: 'hover:bg-violet-200/80',
        border: 'border-b-2 border-violet-300',
        text: 'text-violet-800',
      };
  }
}

// ── Types ─────────────────────────────────────────────────

interface KeywordHighlighterInlineProps {
  summaryId: string;
  /** If provided, renders plain text with highlights. Otherwise wraps children. */
  plainText?: string;
  /** Children to wrap — typically a rendered HTML div. Highlights injected via DOM overlay. */
  children?: ReactNode;
  /** Called when user navigates to another keyword's summary */
  onNavigateKeyword?: (keywordId: string, summaryId: string) => void;
}

// ── Segment type for text splitting ───────────────────────

interface TextSegment {
  text: string;
  keyword?: SummaryKeyword;
}

function splitTextByKeywords(
  text: string,
  keywords: SummaryKeyword[]
): TextSegment[] {
  if (keywords.length === 0) return [{ text }];

  // Sort keywords by name length (longest first) to avoid partial matches
  const sorted = [...keywords].sort((a, b) => b.name.length - a.name.length);
  const pattern = sorted.map((k) => escapeRegex(k.name)).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }
    // Find which keyword matched (case insensitive)
    const matchedText = match[1];
    const kw = sorted.find(
      (k) => k.name.toLowerCase() === matchedText.toLowerCase()
    );
    segments.push({ text: matchedText, keyword: kw });
    lastIndex = regex.lastIndex;
  }

  // Remaining text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return segments;
}

// ── Main Component ────────────────────────────────────────

export function KeywordHighlighterInline({
  summaryId,
  plainText,
  children,
  onNavigateKeyword,
}: KeywordHighlighterInlineProps) {
  // ── Data state ──────────────────────────────────────────
  const [keywords, setKeywords] = useState<SummaryKeyword[]>([]);
  const [bktMap, setBktMap] = useState<Map<string, BktState>>(new Map());
  const [subtopicsMap, setSubtopicsMap] = useState<Map<string, Subtopic[]>>(new Map());
  const [dataReady, setDataReady] = useState(false);

  // ── Popup state ─────────────────────────────────────────
  const [activeKeywordId, setActiveKeywordId] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  // ── Container ref for HTML mode ─────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Fetch keywords ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await summariesApi.getKeywords(summaryId);
        const kws = extractItems<SummaryKeyword>(result).filter(
          (k) => k.is_active !== false
        );
        if (!cancelled) setKeywords(kws);
      } catch {
        if (!cancelled) setKeywords([]);
      }
    })();
    return () => { cancelled = true; };
  }, [summaryId]);

  // ── Fetch BKT states + subtopics (batch) ────────────────
  useEffect(() => {
    if (keywords.length === 0) {
      setDataReady(true);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        // 1. Batch BKT
        const bktResult = await apiCall<unknown>('/bkt-states');
        const bktItems = extractItems<BktState>(bktResult);
        const map = new Map<string, BktState>();
        for (const b of bktItems) map.set(b.subtopic_id, b);
        if (!cancelled) setBktMap(map);

        // 2. Subtopics per keyword (parallel)
        const results = await Promise.all(
          keywords.map(async (kw) => {
            try {
              const r = await summariesApi.getSubtopics(kw.id);
              return {
                keywordId: kw.id,
                subtopics: extractItems<Subtopic>(r).filter(
                  (s) => s.is_active !== false
                ),
              };
            } catch {
              return { keywordId: kw.id, subtopics: [] };
            }
          })
        );

        if (!cancelled) {
          const sMap = new Map<string, Subtopic[]>();
          for (const r of results) sMap.set(r.keywordId, r.subtopics);
          setSubtopicsMap(sMap);
          setDataReady(true);
        }
      } catch {
        if (!cancelled) {
          setBktMap(new Map());
          setDataReady(true);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [keywords]);

  // ── Compute mastery per keyword ─────────────────────────
  const keywordMasteryMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const kw of keywords) {
      const subs = subtopicsMap.get(kw.id) || [];
      const bkts = subs
        .map((s) => bktMap.get(s.id))
        .filter((b): b is BktState => b != null);
      map.set(kw.id, getKeywordMastery(bkts));
    }
    return map;
  }, [keywords, subtopicsMap, bktMap]);

  // ── Handle keyword click ────────────────────────────────
  const handleKeywordClick = useCallback(
    (kwId: string, spanEl: HTMLElement) => {
      const rect = spanEl.getBoundingClientRect();
      setAnchorRect(rect);
      setActiveKeywordId(kwId);
    },
    []
  );

  const handleClosePopup = useCallback(() => {
    setActiveKeywordId(null);
    setAnchorRect(null);
  }, []);

  // ── Active keyword data ─────────────────────────────────
  const activeKeyword = useMemo(
    () => keywords.find((k) => k.id === activeKeywordId) || null,
    [keywords, activeKeywordId]
  );

  // ── HTML mode: inject highlights via DOM TreeWalker ─────
  useEffect(() => {
    if (plainText || !containerRef.current || keywords.length === 0) return;

    const container = containerRef.current;

    // Build regex from keyword names
    const sorted = [...keywords].sort((a, b) => b.name.length - a.name.length);
    const pattern = sorted.map((k) => escapeRegex(k.name)).join('|');
    const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');

    // Walk text nodes and wrap matches
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    for (const textNode of textNodes) {
      const nodeText = textNode.textContent || '';
      if (!regex.test(nodeText)) continue;
      regex.lastIndex = 0; // reset

      const fragment = document.createDocumentFragment();
      let lastIdx = 0;
      let m: RegExpExecArray | null;

      while ((m = regex.exec(nodeText)) !== null) {
        // Text before
        if (m.index > lastIdx) {
          fragment.appendChild(
            document.createTextNode(nodeText.slice(lastIdx, m.index))
          );
        }

        // Find keyword
        const matchedText = m[1];
        const kw = sorted.find(
          (k) => k.name.toLowerCase() === matchedText.toLowerCase()
        );

        if (kw) {
          const mastery = keywordMasteryMap.get(kw.id) ?? -1;
          const classes = getHighlightClasses(mastery);
          const span = document.createElement('span');
          span.textContent = matchedText;
          span.className = `axon-kw-highlight cursor-pointer rounded-sm px-0.5 -mx-0.5 transition-all ${classes.bg} ${classes.hoverBg} ${classes.border} ${classes.text}`;
          span.dataset.keywordId = kw.id;
          span.setAttribute('role', 'button');
          span.setAttribute('tabindex', '0');
          span.setAttribute('title', kw.definition || kw.name);

          span.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleKeywordClick(kw.id, span);
          });
          span.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleKeywordClick(kw.id, span);
            }
          });

          fragment.appendChild(span);
        } else {
          fragment.appendChild(document.createTextNode(matchedText));
        }

        lastIdx = regex.lastIndex;
      }

      // Remaining text
      if (lastIdx < nodeText.length) {
        fragment.appendChild(
          document.createTextNode(nodeText.slice(lastIdx))
        );
      }

      textNode.parentNode?.replaceChild(fragment, textNode);
    }

    // Cleanup: restore original text nodes on unmount
    return () => {
      // We don't restore — the component re-renders from scratch via React
    };
  }, [keywords, keywordMasteryMap, plainText, handleKeywordClick, dataReady]);

  // ── Plain text mode: React-rendered segments ────────────
  const segments = useMemo(() => {
    if (!plainText || keywords.length === 0) return null;
    return splitTextByKeywords(plainText, keywords);
  }, [plainText, keywords]);

  // ── Render ──────────────────────────────────────────────

  return (
    <>
      {plainText && segments ? (
        <span>
          {segments.map((seg, idx) => {
            if (!seg.keyword) {
              return <span key={idx}>{seg.text}</span>;
            }

            const kw = seg.keyword;
            const mastery = keywordMasteryMap.get(kw.id) ?? -1;
            const classes = getHighlightClasses(mastery);

            return (
              <span
                key={`kw-${kw.id}-${idx}`}
                className={`axon-kw-highlight cursor-pointer rounded-sm px-0.5 -mx-0.5 transition-all ${classes.bg} ${classes.hoverBg} ${classes.border} ${classes.text}`}
                role="button"
                tabIndex={0}
                title={kw.definition || kw.name}
                data-keyword-id={kw.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleKeywordClick(kw.id, e.currentTarget);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleKeywordClick(kw.id, e.currentTarget);
                  }
                }}
              >
                {seg.text}
              </span>
            );
          })}
        </span>
      ) : children ? (
        <div ref={containerRef}>{children}</div>
      ) : null}

      {/* Popover */}
      {activeKeyword && anchorRect && (
        <InlineKeywordPopover
          keyword={activeKeyword}
          allKeywords={keywords}
          bktMap={bktMap}
          subtopicsCache={subtopicsMap}
          anchorRect={anchorRect}
          onClose={handleClosePopup}
          onNavigateKeyword={onNavigateKeyword}
        />
      )}
    </>
  );
}