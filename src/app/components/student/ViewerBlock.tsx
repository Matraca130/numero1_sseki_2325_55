// ============================================================
// Axon — ViewerBlock (Student: read-only block renderer)
//
// Renders a single SummaryBlock by type. No drag/resize/edit.
// Interactable: images (lightbox), videos (play), PDFs (view),
// keyword-refs (SmartPopup).
// ============================================================
import React from 'react';
import {
  FileText, AlertTriangle, Info, CheckCircle, Lightbulb,
  Play, Download, ExternalLink, Tag, StickyNote, Brain,
} from 'lucide-react';
import BookmarkButton from './BookmarkButton';
import clsx from 'clsx';
import type { SummaryBlock, SummaryKeyword } from '@/app/services/summariesApi';
import { sanitizeHtml } from '@/app/lib/sanitize';
import {
  ProseBlock, KeyPointBlock, StagesBlock, ComparisonBlock,
  ListDetailBlock, GridBlock, TwoColumnBlock, CalloutBlock as EduCalloutBlock,
  ImageReferenceBlock, SectionDividerBlock,
} from './blocks';
import { MasteryBar } from '@/app/components/student/MasteryBar';

// ── Props ─────────────────────────────────────────────────

interface ViewerBlockProps {
  block: SummaryBlock;
  isMobile: boolean;
  keywords?: SummaryKeyword[];
  masteryLevel?: number;
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

// ── Component ─────────────────────────────────────────────

export const ViewerBlock = React.memo(function ViewerBlock({
  block,
  isMobile,
  keywords,
  masteryLevel,
  onImageClick,
  onKeywordClick,
  onVideoPlay,
  onBookmarkToggle,
  isBookmarked,
  onNotesToggle,
  onQuizTrigger,
}: ViewerBlockProps) {
  const c = block.content || {};

  const hasActions = onBookmarkToggle || onNotesToggle || onQuizTrigger;

  const blockContent = (() => { switch (block.type) {
    // ── Text ────────────────────────────────────────────
    case 'text': {
      const html = c.html || c.text || '';
      if (!html) return null;
      return (
        <div
          className="axon-prose max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
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
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onClick={() => onImageClick?.(src, alt, caption)}
            className={clsx(
              'rounded-xl border border-gray-200 shadow-sm cursor-zoom-in transition-shadow hover:shadow-md',
              isMobile ? 'w-full h-auto' : 'max-w-full h-auto',
            )}
            style={!isMobile && c.objectFit ? { objectFit: c.objectFit } : undefined}
          />
          {caption && (
            <figcaption className="mt-2 text-center text-xs text-gray-400 italic">
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
              <p className="text-[10px] text-gray-400">Toca para abrir PDF</p>
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
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }}
              />
            ) : (
              <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
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
      return <GridBlock block={block} />;
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

  return (
    <>
      {blockContent}
      {masteryLevel !== undefined && (
        <div className="mt-1">
          <MasteryBar level={masteryLevel} size="sm" />
        </div>
      )}
      {hasActions && (
        <div className="flex items-center gap-1 mt-1">
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
              className="flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-teal-500 transition-colors"
            >
              <StickyNote size={15} />
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
    </>
  );
});

ViewerBlock.displayName = 'ViewerBlock';