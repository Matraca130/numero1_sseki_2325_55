// ============================================================
// Axon — KeywordHighlighterInline
//
// Scans summary text (plain or HTML) for keyword names and wraps
// matches in highlighted clickable <span>s. Clicking a keyword
// opens InlineKeywordPopover (positioned with @floating-ui/react).
//
// S1 migration: keyword + BKT + subtopics data now comes from
// useKeywordMasteryQuery (React Query). This eliminates 4
// useState + 2 useEffect of manual fetching and shares cache
// with KeywordBadges.
//
// S2 positioning: passes live HTMLElement ref (anchorEl) to
// InlineKeywordPopover, which uses @floating-ui/react for
// dynamic positioning. Replaces frozen DOMRect snapshot.
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
import type { SummaryKeyword } from '@/app/services/summariesApi';
import { getMasteryColor } from '@/app/lib/mastery-helpers';
import { InlineKeywordPopover } from './InlineKeywordPopover';
import { useKeywordMasteryQuery } from '@/app/hooks/queries/useKeywordMasteryQuery';

// ── Helpers ─────────────────────────────────────────────

/** Escape regex special chars */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strip all .axon-kw-highlight spans from a container, replacing each
 * with its text content, then normalize() to merge adjacent text nodes.
 */
function stripHighlights(container: HTMLElement): void {
  const highlights = container.querySelectorAll('.axon-kw-highlight');
  highlights.forEach((span) => {
    const text = document.createTextNode(span.textContent || '');
    span.parentNode?.replaceChild(text, span);
  });
  container.normalize();
}

// ── Mastery color -> Tailwind classes for highlight ────────────

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

// ── Main Component ──────────────────────────────────────

export function KeywordHighlighterInline({
  summaryId,
  plainText,
  children,
  onNavigateKeyword,
}: KeywordHighlighterInlineProps) {
  // ── React Query: keywords + mastery data (shared cache) ──
  const {
    keywords,
    bktMap,
    keywordMasteryMap,
    dataReady,
  } = useKeywordMasteryQuery(summaryId);

  // ── Popup state ─────────────────────────────────────────
  const [activeKeywordId, setActiveKeywordId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const isPopupOpenRef = useRef(false);
  isPopupOpenRef.current = !!activeKeywordId;

  // ── Container ref for HTML mode ─────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Handle keyword click ────────────────────────────────
  const handleKeywordClick = useCallback(
    (kwId: string, spanEl: HTMLElement) => {
      setAnchorEl(spanEl);
      setActiveKeywordId(kwId);
    },
    []
  );

  const handleClosePopup = useCallback(() => {
    setActiveKeywordId(null);
    setAnchorEl(null);
  }, []);

  // ── Active keyword data ─────────────────────────────────
  const activeKeyword = useMemo(
    () => keywords.find((k) => k.id === activeKeywordId) || null,
    [keywords, activeKeywordId]
  );

  // ── HTML mode: inject highlights via DOM TreeWalker ─────
  useEffect(() => {
    if (plainText || !containerRef.current || keywords.length === 0) return;

    // FIX-I1: Don't strip/re-walk while popup is open
    if (activeKeywordId) return;
    if (!dataReady) return;

    const container = containerRef.current;

    stripHighlights(container);

    const sorted = [...keywords].sort((a, b) => b.name.length - a.name.length);
    const pattern = sorted.map((k) => escapeRegex(k.name)).join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');

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
      regex.lastIndex = 0;

      const fragment = document.createDocumentFragment();
      let lastIdx = 0;
      let m: RegExpExecArray | null;

      while ((m = regex.exec(nodeText)) !== null) {
        if (m.index > lastIdx) {
          fragment.appendChild(
            document.createTextNode(nodeText.slice(lastIdx, m.index))
          );
        }

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

      if (lastIdx < nodeText.length) {
        fragment.appendChild(
          document.createTextNode(nodeText.slice(lastIdx))
        );
      }

      textNode.parentNode?.replaceChild(fragment, textNode);
    }

    return () => {
      if (containerRef.current && !isPopupOpenRef.current) {
        stripHighlights(containerRef.current);
      }
    };
  }, [keywords, keywordMasteryMap, plainText, handleKeywordClick, dataReady, activeKeywordId]);

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
      {activeKeyword && anchorEl && (
        <InlineKeywordPopover
          keyword={activeKeyword}
          allKeywords={keywords}
          bktMap={bktMap}
          anchorEl={anchorEl}
          onClose={handleClosePopup}
          onNavigateKeyword={onNavigateKeyword}
        />
      )}
    </>
  );
}
