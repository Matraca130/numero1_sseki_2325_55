// ============================================================
// Axon — ViewerBlock (Student: read-only block renderer)
//
// Renders a single SummaryBlock by type. No drag/resize/edit.
// Interactable: images (lightbox), videos (play), PDFs (view),
// keyword-refs (SmartPopup).
// ============================================================
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  FileText, AlertTriangle, Info, CheckCircle, Lightbulb,
  Play, Download, ExternalLink, Tag, StickyNote, Brain,
} from 'lucide-react';
import { HighlightToolbar } from './HighlightToolbar';
import type { HighlightColor } from './HighlightToolbar';
import BookmarkButton from './BookmarkButton';
import clsx from 'clsx';
import type { SummaryBlock, SummaryKeyword } from '@/app/services/summariesApi';
import type { TextAnnotation } from '@/app/services/studentSummariesApi';
import { sanitizeHtml } from '@/app/lib/sanitize';
import { replaceKeywordPlaceholders } from './blocks/renderTextWithKeywords';
import {
  ProseBlock, KeyPointBlock, StagesBlock, ComparisonBlock,
  ListDetailBlock, GridBlock, TwoColumnBlock, CalloutBlock as EduCalloutBlock,
  ImageReferenceBlock, SectionDividerBlock,
} from './blocks';
import TTSButton from './TTSButton';
import { getMasteryStyle } from '@/app/design-system';

// ── Props ─────────────────────────────────────────────────

interface ViewerBlockProps {
  block: SummaryBlock;
  isMobile: boolean;
  keywords?: SummaryKeyword[];
  masteryLevel?: number;
  /** Dark mode flag — drives mastery color palette */
  dark?: boolean;
  onImageClick?: (src: string, alt?: string, caption?: string) => void;
  onKeywordClick?: (keywordId: string) => void;
  onVideoPlay?: (videoId: string) => void;
  /** Bookmark integration */
  onBookmarkToggle?: () => void;
  isBookmarked?: boolean;
  /** Toggle annotations panel for this block */
  onNotesToggle?: () => void;
  /** Trigger quiz modal for this block */
  onQuizTrigger?: () => void;
  /** Summary ID for text annotation persistence (highlighting) */
  summaryId?: string;
  /** Shared annotation mutation (lifted from parent to avoid N instances) */
  createAnnotationMutation?: { mutate: Function; isPending?: boolean };
  /** Text annotations for rendering highlights on this block */
  annotations?: TextAnnotation[];
}

// ── Callout icon map ──────────────────────────────────────

const calloutIcons: Record<string, React.ReactNode> = {
  info: <Info size={16} className="text-blue-500 shrink-0" />,
  warning: <AlertTriangle size={16} className="text-amber-500 shrink-0" />,
  success: <CheckCircle size={16} className="text-emerald-500 shrink-0" />,
  tip: <Lightbulb size={16} className="text-teal-500 shrink-0" />,
};

const calloutBg: Record<string, string> = {
  info: 'bg-blue-50 border-blue-200',
  warning: 'bg-amber-50 border-amber-200',
  success: 'bg-emerald-50 border-emerald-200',
  tip: 'bg-teal-50 border-teal-200',
};

// ── Highlight color map (shared by optimistic + useEffect) ──

const HIGHLIGHT_COLOR_MAP: Record<string, string> = {
  yellow: 'rgba(253,224,71,0.4)',
  green: 'rgba(110,231,183,0.4)',
  blue: 'rgba(147,197,253,0.4)',
  pink: 'rgba(249,168,212,0.4)',
  orange: 'rgba(253,186,116,0.4)',
};

/** Strip all data-axon-hl marks from a container and normalize text nodes. */
function stripHighlightMarks(container: HTMLElement): void {
  const marks = container.querySelectorAll('mark[data-axon-hl]');
  marks.forEach(mark => {
    const text = document.createTextNode(mark.textContent || '');
    mark.parentNode?.replaceChild(text, mark);
  });
  container.normalize();
}

// ── Plain text extraction for TTS ─────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractBlockText(block: SummaryBlock): string {
  const c = block.content || {};
  const parts: string[] = [];
  if (c.title) parts.push(c.title);
  if (c.text) parts.push(c.text);
  if (c.description) parts.push(c.description);
  if (c.html) parts.push(stripHtml(c.html));
  return parts.join('. ').trim();
}

// ── Component ─────────────────────────────────────────────

export const ViewerBlock = React.memo(function ViewerBlock({
  block,
  isMobile,
  keywords,
  masteryLevel,
  dark = false,
  onImageClick,
  onKeywordClick,
  onVideoPlay,
  onBookmarkToggle,
  isBookmarked,
  onNotesToggle,
  onQuizTrigger,
  summaryId,
  createAnnotationMutation,
  annotations = [],
}: ViewerBlockProps) {
  const c = block.content || {};

  // Extract text for TTS (only for text-bearing blocks)
  const ttsText = extractBlockText(block);

  const hasActions = onBookmarkToggle || onNotesToggle || onQuizTrigger;

  // Count of annotations on this block (for indicator badge)
  const annotationCount = useMemo(
    () => annotations.filter(a => !a.deleted_at && a.block_id === block.id).length,
    [annotations, block.id],
  );

  // ── Text highlighting (block-scoped) ───────────────────
  const blockRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<{ top: number; left: number } | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);

  // Use shared mutation from parent (avoids N instances per block)
  const createMutation = createAnnotationMutation;

  // Text-bearing block types that support highlighting
  const isHighlightable = ['prose', 'key_point', 'callout', 'list_detail', 'two_column', 'stages', 'text'].includes(block.type);
  const highlightEnabled = !!summaryId && isHighlightable;

  const handleMouseUp = useCallback(() => {
    if (!highlightEnabled) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !blockRef.current) {
      setToolbar(null);
      setSelectionRange(null);
      return;
    }
    const selectedText = sel.toString().trim();
    if (!selectedText || selectedText.length < 3) {
      setToolbar(null);
      setSelectionRange(null);
      return;
    }
    const range = sel.getRangeAt(0);
    // Check selection is within the content area (not UI chrome)
    if (!contentRef.current?.contains(range.commonAncestorContainer)) {
      setToolbar(null);
      setSelectionRange(null);
      return;
    }
    const preRange = document.createRange();
    preRange.setStart(contentRef.current, 0);
    preRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preRange.toString().length;
    const endOffset = startOffset + sel.toString().length;
    setSelectionRange({ start: startOffset, end: endOffset });
    const rect = range.getBoundingClientRect();
    const containerRect = blockRef.current.getBoundingClientRect();
    setToolbar({
      top: rect.top - containerRect.top - 42,
      left: rect.left - containerRect.left + rect.width / 2 - 90,
    });
  }, [highlightEnabled]);

  // Apply visual highlight to current selection immediately (optimistic)
  const applySelectionHighlight = useCallback((color: string) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !contentRef.current) return;
    try {
      const range = sel.getRangeAt(0);
      if (!contentRef.current.contains(range.commonAncestorContainer)) return;
      const mark = document.createElement('mark');
      mark.setAttribute('data-axon-hl', 'pending');
      mark.style.backgroundColor = HIGHLIGHT_COLOR_MAP[color] || HIGHLIGHT_COLOR_MAP.yellow;
      mark.style.borderRadius = '2px';
      mark.style.padding = '0 1px';
      range.surroundContents(mark);
    } catch {
      // surroundContents may fail crossing element boundaries
    }
  }, []);

  const handleSelectColor = useCallback((color: HighlightColor) => {
    if (!selectionRange || !summaryId || !createMutation) return;
    applySelectionHighlight(color);
    createMutation.mutate(
      {
        summary_id: summaryId,
        start_offset: selectionRange.start,
        end_offset: selectionRange.end,
        color,
        block_id: block.id,
      },
      {
        onSuccess: () => {
          window.getSelection()?.removeAllRanges();
          setToolbar(null);
          setSelectionRange(null);
        },
      },
    );
  }, [selectionRange, createMutation, summaryId, applySelectionHighlight, block.id]);

  const handleAnnotate = useCallback(() => {
    if (!selectionRange || !summaryId || !createMutation) return;
    applySelectionHighlight('yellow');
    createMutation.mutate(
      {
        summary_id: summaryId,
        start_offset: selectionRange.start,
        end_offset: selectionRange.end,
        color: 'yellow',
        note: '',
        block_id: block.id,
      },
      {
        onSuccess: () => {
          window.getSelection()?.removeAllRanges();
          setToolbar(null);
          setSelectionRange(null);
        },
      },
    );
  }, [selectionRange, createMutation, summaryId, applySelectionHighlight, block.id]);

  // Listen for mouseup on block content
  useEffect(() => {
    const el = blockRef.current;
    if (!el || !highlightEnabled) return;
    el.addEventListener('mouseup', handleMouseUp);
    return () => el.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp, highlightEnabled]);

  // Hide toolbar on click outside
  useEffect(() => {
    if (!toolbar) return;
    const handler = (e: MouseEvent) => {
      if (blockRef.current && !blockRef.current.contains(e.target as Node)) {
        setToolbar(null);
        setSelectionRange(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [toolbar]);

  // ── Render existing highlights on block text via DOM ─────
  // Walk text nodes and wrap ranges that match stored annotations
  // with <mark> elements. Annotations use block-local offsets
  // (calculated relative to blockRef.current's text content).
  // Show annotations that belong to this block (block_id match).
  // Annotations without block_id (from TextHighlighter / Modo subrayado) are excluded
  // since their offsets are global, not block-local.
  const liveAnnotations = useMemo(
    () => annotations.filter(a => !a.deleted_at && a.block_id === block.id),
    [annotations, block.id],
  );

  useEffect(() => {
    const el = contentRef.current;
    if (!el || !highlightEnabled || liveAnnotations.length === 0) return;

    // Strip previous highlight marks before re-applying
    stripHighlightMarks(el);

    // Collect all text nodes
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes: { node: Text; start: number; end: number }[] = [];
    let charOffset = 0;
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const len = node.textContent?.length || 0;
      textNodes.push({ node, start: charOffset, end: charOffset + len });
      charOffset += len;
    }

    // Sort annotations by start_offset ascending
    const sorted = [...liveAnnotations].sort((a, b) => a.start_offset - b.start_offset);

    // Apply each annotation by finding and wrapping text node ranges
    // Process in reverse so DOM mutations don't shift later offsets
    for (let ai = sorted.length - 1; ai >= 0; ai--) {
      const ann = sorted[ai];
      const annStart = ann.start_offset;
      const annEnd = Math.min(ann.end_offset, charOffset);
      if (annStart >= annEnd) continue;

      // Find text nodes that overlap with this annotation
      for (let ti = textNodes.length - 1; ti >= 0; ti--) {
        const tn = textNodes[ti];
        const overlapStart = Math.max(annStart, tn.start);
        const overlapEnd = Math.min(annEnd, tn.end);
        if (overlapStart >= overlapEnd) continue;

        const localStart = overlapStart - tn.start;
        const localEnd = overlapEnd - tn.start;

        try {
          const range = document.createRange();
          range.setStart(tn.node, localStart);
          range.setEnd(tn.node, localEnd);

          const mark = document.createElement('mark');
          mark.setAttribute('data-axon-hl', ann.id);
          mark.style.backgroundColor = HIGHLIGHT_COLOR_MAP[ann.color || 'yellow'] || HIGHLIGHT_COLOR_MAP.yellow;
          mark.style.borderRadius = '2px';
          mark.style.padding = '0 1px';
          range.surroundContents(mark);
        } catch {
          // surroundContents may fail if range crosses element boundaries
        }
      }
    }

    // Cleanup on unmount or re-render
    return () => {
      if (!el) return;
      stripHighlightMarks(el);
    };
  }, [liveAnnotations, highlightEnabled]);

  const blockContent = (() => { switch (block.type) {
    // ── Text ────────────────────────────────────────────
    case 'text': {
      const html = c.html || c.text || '';
      if (!html) return null;
      return (
        <div
          className="axon-prose max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(replaceKeywordPlaceholders(html, keywords)) }}
          role="article"
        />
      );
    }

    // ── Heading ─────────────────────────────────────────
    case 'heading': {
      const level = c.level || 2;
      const text = c.text || '';
      const Tag = (`h${Math.min(Math.max(level, 1), 4)}`) as keyof JSX.IntrinsicElements;
      const headingStyles: Record<number, string> = {
        1: 'text-2xl font-bold text-teal-900 border-b-2 border-teal-600 pb-2 mb-4',
        2: 'text-xl font-semibold text-teal-800 border-l-3 border-teal-500 pl-3 mb-3',
        3: 'text-lg font-semibold text-teal-700 mb-2',
        4: 'text-base font-semibold italic text-gray-600 mb-2',
      };
      return (
        <Tag className={headingStyles[level] || headingStyles[2]}>
          {text}
        </Tag>
      );
    }

    // ── Image ───────────────────────────────────────────
    case 'image': {
      const src = c.src || c.url || '';
      const alt = c.alt || '';
      const caption = c.caption || '';
      if (!src) return null;
      return (
        <figure className="my-2">
          <button
            type="button"
            onClick={() => onImageClick?.(src, alt, caption)}
            onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); onImageClick?.(src, alt, caption); } }}
            className={clsx(
              'cursor-zoom-in transition-shadow hover:shadow-md rounded-xl',
              'focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none',
            )}
            aria-label={`Ver imagen: ${alt || caption || 'sin descripción'}`}
            style={{ background: 'none', border: 'none', padding: 0, display: 'block' }}
          >
            <img
              src={src}
              alt={alt}
              loading="lazy"
              className={clsx(
                'rounded-xl border border-gray-200 shadow-sm',
                isMobile ? 'w-full h-auto' : 'max-w-full h-auto',
              )}
              style={!isMobile && c.objectFit ? { objectFit: c.objectFit } : undefined}
            />
          </button>
          {caption && (
            <figcaption className="mt-2 text-center text-xs text-gray-500 italic">
              {caption}
            </figcaption>
          )}
        </figure>
      );
    }

    // ── Video ───────────────────────────────────────────
    case 'video': {
      const videoId = c.video_id || c.videoId || '';
      const title = c.title || 'Video';
      const thumbnailUrl = c.thumbnail_url || c.thumbnailUrl || '';
      const playbackId = c.mux_playback_id || c.playbackId || '';
      const thumbSrc = playbackId
        ? `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&height=360&fit_mode=smartcrop`
        : thumbnailUrl;

      return (
        <div
          className={clsx(
            'relative rounded-xl overflow-hidden border border-gray-200 bg-gray-900 group cursor-pointer',
            isMobile && 'aspect-video w-full',
          )}
          style={!isMobile ? { aspectRatio: '16/9' } : undefined}
          onClick={() => onVideoPlay?.(videoId)}
          role="button"
          tabIndex={0}
          aria-label={`Reproducir: ${title}`}
          onKeyDown={(e) => { if (e.key === 'Enter') onVideoPlay?.(videoId); }}
        >
          {thumbSrc ? (
            <img
              src={thumbSrc}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <Play size={48} className="text-white/30" />
            </div>
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play size={24} className="text-gray-900 ml-1" />
            </div>
          </div>
          {/* Title bar */}
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent">
            <p className="text-white text-xs truncate">{title}</p>
          </div>
        </div>
      );
    }

    // ── PDF ──────────────────────────────────────────────
    case 'pdf': {
      const pdfUrl = c.url || c.src || '';
      const title = c.title || 'Documento PDF';

      if (isMobile) {
        return (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
              <FileText size={20} className="text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 truncate">{title}</p>
              <p className="text-gray-500" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)' }}>Toca para abrir PDF</p>
            </div>
            <ExternalLink size={14} className="text-gray-400 shrink-0" />
          </a>
        );
      }

      return (
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-[#F0F2F5]">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-red-500" />
              <span className="text-xs text-gray-600">{title}</span>
            </div>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-700"
            >
              <Download size={10} />
              Descargar
            </a>
          </div>
          <iframe
            src={pdfUrl}
            title={title}
            className="w-full border-0"
            style={{ height: '500px' }}
          />
        </div>
      );
    }

    // ── Callout ─────────────────────────────────────────
    case 'callout': {
      // Edu callout variants use the new renderer
      const eduVariants = ['tip', 'warning', 'clinical', 'mnemonic', 'exam'];
      if (c.variant && eduVariants.includes(c.variant)) {
        return <EduCalloutBlock block={block} keywords={keywords} />;
      }
      // Legacy callout fallback
      const variant = c.variant || c.type || 'info';
      const text = c.text || c.html || '';
      const icon = calloutIcons[variant] || calloutIcons.info;
      const bg = calloutBg[variant] || calloutBg.info;

      return (
        <div className={clsx('flex gap-3 px-4 py-3 rounded-xl border', bg)}>
          {icon}
          <div className="flex-1 min-w-0">
            {/<[a-z][\s\S]*>/i.test(text) ? (
              <div
                className="text-sm text-gray-700 leading-relaxed [&_p]:mb-1 [&_p:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(replaceKeywordPlaceholders(text, keywords)) }}
              />
            ) : (
              <p className="text-sm text-gray-700 leading-relaxed">{replaceKeywordPlaceholders(text, keywords)}</p>
            )}
          </div>
        </div>
      );
    }

    // ── Divider ─────────────────────────────────────────
    case 'divider': {
      const style = c.style || 'default';
      if (style === 'dots') {
        return (
          <div className="flex items-center justify-center gap-2 py-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            ))}
          </div>
        );
      }
      if (style === 'ornament') {
        return (
          <div className="flex items-center gap-4 py-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-300" />
            <div className="w-2 h-2 rotate-45 border border-gray-300" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-300" />
          </div>
        );
      }
      return (
        <hr className="my-6 border-none h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
      );
    }

    // ── Keyword Ref ─────────────────────────────────────
    case 'keyword-ref': {
      const keywordId = c.keyword_id || c.keywordId || '';
      const name = c.name || c.label || 'Keyword';

      return (
        <button
          onClick={() => onKeywordClick?.(keywordId)}
          className={clsx(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs',
            'bg-teal-50 text-teal-700 border border-teal-200',
            'hover:bg-teal-100 hover:border-teal-300 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-1',
          )}
        >
          <Tag size={11} className="shrink-0" />
          {name}
        </button>
      );
    }

    // ── Edu Block Renderers (Fase 2) ────────────────────
    case 'prose':
      return <ProseBlock block={block} keywords={keywords} />;
    case 'key_point':
      return <KeyPointBlock block={block} keywords={keywords} />;
    case 'stages':
      return <StagesBlock block={block} keywords={keywords} />;
    case 'comparison':
      return <ComparisonBlock block={block} />;
    case 'list_detail':
      return <ListDetailBlock block={block} keywords={keywords} />;
    case 'grid':
      return <GridBlock block={block} keywords={keywords} />;
    case 'two_column':
      return <TwoColumnBlock block={block} keywords={keywords} />;
    case 'image_reference':
      return <ImageReferenceBlock block={block} />;
    case 'section_divider':
      return <SectionDividerBlock block={block} />;

    // ── Fallback ────────────────────────────────────────
    default:
      return (
        <div className="px-4 py-3 rounded-lg bg-[#F0F2F5] border border-gray-200">
          <p className="text-xs text-gray-400 italic">
            Bloque no soportado: {block.type}
          </p>
        </div>
      );
  } })();

  if (!blockContent) return null;

  // ── Mastery: left-border + badge (prototype parity) ──────
  // Self-styled blocks (key_point, callout, comparison, etc.) keep their own
  // background/border and skip the mastery wrapper, matching PROTOTYPE.jsx:622-648.
  const isSelfStyled = ['key_point', 'callout', 'comparison', 'image_reference', 'section_divider'].includes(block.type);
  const mastery = masteryLevel !== undefined ? getMasteryStyle(masteryLevel, dark) : null;
  const applyMasteryWrapper = mastery && !isSelfStyled;

  return (
    <div
      ref={blockRef}
      className={highlightEnabled ? 'select-text' : undefined}
      onContextMenu={highlightEnabled ? (e) => e.preventDefault() : undefined}
      style={{
        position: 'relative',
        transition: 'background 0.3s, border-color 0.3s',
        ...(applyMasteryWrapper
          ? {
              background: dark ? mastery.bg : `${mastery.bg}99`,
              borderLeft: `3px solid ${mastery.border}50`,
              paddingLeft: 16,
              borderRadius: 4,
            }
          : annotationCount > 0
            ? {
                borderLeft: '2px solid rgba(245,158,11,0.4)',
                paddingLeft: 12,
                borderRadius: 4,
              }
            : {}),
      }}
    >
      {/* Floating highlight toolbar on text selection */}
      <AnimatePresence>
        {toolbar && selectionRange && highlightEnabled && (
          <HighlightToolbar
            top={toolbar.top}
            left={Math.max(0, toolbar.left)}
            onSelectColor={handleSelectColor}
            onAnnotate={handleAnnotate}
          />
        )}
      </AnimatePresence>

      {/* Mastery percentage badge — top right */}
      {mastery && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 28,
            height: 28,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: mastery.border,
            color: '#fff',
            fontSize: 9,
            fontWeight: 700,
            lineHeight: 1,
            zIndex: 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }}
          title={mastery.label}
          aria-label={`Dominio: ${Math.round((masteryLevel ?? 0) * 100)}%`}
        >
          {Math.round((masteryLevel ?? 0) * 100)}%
        </div>
      )}

      <div ref={contentRef}>{blockContent}</div>

      {(hasActions || ttsText) && (
        <div className="flex items-center gap-1 mt-1" data-testid="viewer-block-actions">
          {ttsText && <TTSButton text={ttsText} />}
          {onBookmarkToggle && (
            <BookmarkButton
              blockId={block.id}
              isBookmarked={!!isBookmarked}
              onToggle={onBookmarkToggle}
            />
          )}
          {onNotesToggle && (
            <button
              onClick={onNotesToggle}
              title="Notas del bloque"
              aria-label="Alternar notas del bloque"
              className={clsx(
                'relative flex items-center justify-center w-7 h-7 rounded transition-colors',
                annotationCount > 0
                  ? 'text-amber-500 hover:text-amber-600'
                  : 'text-gray-400 hover:text-teal-500',
              )}
            >
              <StickyNote size={15} />
              {annotationCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex items-center justify-center min-w-[14px] h-[14px] rounded-full bg-amber-500 text-white text-[9px] font-semibold leading-none px-0.5"
                  aria-label={`${annotationCount} anotaciones`}
                >
                  {annotationCount}
                </span>
              )}
            </button>
          )}
          {onQuizTrigger && (
            <button
              onClick={onQuizTrigger}
              title="Quiz del bloque"
              aria-label="Abrir quiz del bloque"
              className="flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-teal-500 transition-colors"
            >
              <Brain size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
});

ViewerBlock.displayName = 'ViewerBlock';
