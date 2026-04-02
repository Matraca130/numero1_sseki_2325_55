// ============================================================
// Axon — SummaryViewer (Student: read-only visual block layout)
//
// Uses useSummaryBlocksQuery (React Query) which shares cache
// with useSummaryReaderQueries' blocks-detection query. This
// means when StudentSummaryReader already fetched the blocks,
// SummaryViewer gets an instant cache hit — zero double-fetch.
//
// Desktop (>=768px): absolute positioning (same as editor)
// Mobile  (<768px):  vertical stack by order_index
//
// Interactions: image→lightbox, video→play, pdf→view, keyword→popup
// ============================================================
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Layers, Bookmark } from 'lucide-react';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { SummaryBlock, SummaryKeyword } from '@/app/services/summariesApi';
import { ViewerBlock } from './ViewerBlock';
import { ImageLightbox, type LightboxImage } from './ImageLightbox';
import { useAuth } from '@/app/context/AuthContext';
import { MuxVideoPlayer } from '@/app/components/video/MuxVideoPlayer';
import { useSummaryBlocksQuery } from '@/app/hooks/queries/useSummaryBlocksQuery';
import type { ReadingSettings } from './ReadingSettingsPanel';
import { useBlockBookmarks } from '@/app/hooks/queries/useBlockBookmarks';
import BookmarksPanel from './BookmarksPanel';
import { BlockAnnotationsPanel } from './BlockAnnotationsPanel';
import { BlockQuizModal } from './BlockQuizModal';
import { useSummaryBlockMastery } from '@/app/hooks/queries/useSummaryBlockMastery';
import { useCreateAnnotationMutation } from '@/app/hooks/queries/useAnnotationMutations';

// ── Props ─────────────────────────────────────────────────

interface SummaryViewerProps {
  summaryId: string;
  /** Pre-fetched blocks (seeds React Query cache, avoids fetch) */
  blocks?: SummaryBlock[];
  onKeywordClick?: (keywordId: string) => void;
  /** Reading settings from ReadingSettingsPanel */
  readingSettings?: ReadingSettings;
  /** Keywords for edu sub-components (ProseBlock, KeyPointBlock, etc.) */
  keywords?: SummaryKeyword[];
  /** Layout mode: 'canvas' = absolute positioning (default), 'flow' = vertical stack */
  layout?: 'canvas' | 'flow';
}

export function SummaryViewer({ summaryId, blocks: prefetchedBlocks, onKeywordClick, readingSettings, keywords, layout = 'canvas' }: SummaryViewerProps) {
  const { user } = useAuth();

  // ── Data (React Query — shared cache with useSummaryReaderQueries) ──
  const { data: blocks = [], isLoading } = useSummaryBlocksQuery(summaryId, prefetchedBlocks);
  const { data: masteryLevels = {} } = useSummaryBlockMastery(summaryId);

  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Lightbox state ──────────────────────────────────────
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // ── Video modal state ───────────────────────────────────
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  // ── Bookmarks state ───────────────────────────────────
  const { bookmarks: bookmarkIds, toggle: toggleBookmark, remove: removeBookmark, isBookmarked } = useBlockBookmarks(summaryId);
  const [showBookmarks, setShowBookmarks] = useState(false);

  // ── Text annotation mutation (single instance for all blocks) ──
  const createAnnotationMutation = useCreateAnnotationMutation(summaryId);

  // ── Annotations state (per-block toggle) ──────────────
  const [annotationsOpen, setAnnotationsOpen] = useState<Record<string, boolean>>({});
  const toggleAnnotations = useCallback((blockId: string) => {
    setAnnotationsOpen(prev => ({ ...prev, [blockId]: !prev[blockId] }));
  }, []);

  // ── Quiz modal state ──────────────────────────────────
  const [quizBlockId, setQuizBlockId] = useState<string | null>(null);

  // ── Detect mobile ───────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Collect all images for lightbox navigation ──────────
  const allImages: LightboxImage[] = useMemo(() => {
    return blocks
      .filter(b => b.type === 'image')
      .map(b => ({
        src: b.content?.src || b.content?.url || '',
        alt: b.content?.alt || '',
        caption: b.content?.caption || '',
      }))
      .filter(img => img.src);
  }, [blocks]);

  // ── Bookmark items for panel ────────────────────────────
  const bookmarkItems = useMemo(() => {
    return bookmarkIds
      .map(id => {
        const block = blocks.find(b => b.id === id);
        if (!block) return null;
        return {
          blockId: block.id,
          blockType: block.type,
          title: block.content?.title || block.content?.text?.slice(0, 40) || block.type,
        };
      })
      .filter(Boolean) as { blockId: string; blockType: string; title: string }[];
  }, [bookmarkIds, blocks]);

  const handleBookmarkBlockClick = useCallback((blockId: string) => {
    const el = containerRef.current?.querySelector(`[data-block-id="${blockId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // ── Image click → open lightbox at correct index ────────
  const handleImageClick = useCallback((src: string) => {
    const idx = allImages.findIndex(img => img.src === src);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxOpen(true);
  }, [allImages]);

  // ── Compute canvas height for desktop mode ──────────────
  const canvasHeight = useMemo(() => {
    if (isMobile || blocks.length === 0) return 0;
    let maxBottom = 0;
    for (const b of blocks) {
      const bottom = (b.position_y || 0) + (b.height || 200);
      if (bottom > maxBottom) maxBottom = bottom;
    }
    return maxBottom + 40; // padding
  }, [blocks, isMobile]);

  const institutionId = user?.user_metadata?.institution_id || '';

  // ── Loading state ───────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <Skeleton className="h-4 w-3/4 mb-3" />
            <Skeleton className="h-32 w-full rounded-xl mb-3" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────
  if (blocks.length === 0) {
    return (
      <div className="text-center py-12 dark:bg-[#111215]">
        <Layers size={28} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-400 dark:text-gray-500">Este resumen no tiene bloques visuales</p>
      </div>
    );
  }

  // ── Sorted blocks for mobile ────────────────────────────
  const sorted = [...blocks].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  return (
    <>
      <div
        ref={containerRef}
        className={`dark:bg-[#111215] ${(isMobile || layout === 'flow') ? 'space-y-4 px-4 py-6' : 'relative'}`}
        style={{
          ...(!(isMobile || layout === 'flow') ? { height: `${canvasHeight}px`, minHeight: '400px' } : {}),
          ...(readingSettings ? {
            fontSize: `${readingSettings.fontSize}px`,
            lineHeight: readingSettings.lineHeight,
            fontFamily: readingSettings.fontFamily,
          } : {}),
        }}
        role="region"
        aria-label="Contenido del resumen"
      >
        {sorted.map((block, idx) => {
          const content = (
            <motion.div
              key={block.id}
              data-block-id={block.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              aria-label={`Bloque ${block.type}`}
              {...(layout === 'flow' ? { style: { marginBottom: 16 } } : {})}
            >
              <ViewerBlock
                block={block}
                isMobile={isMobile}
                keywords={keywords}
                masteryLevel={masteryLevels[block.id]}
                summaryId={summaryId}
                createAnnotationMutation={createAnnotationMutation}
                onImageClick={handleImageClick}
                onKeywordClick={onKeywordClick}
                onVideoPlay={(videoId) => setActiveVideoId(videoId)}
                onBookmarkToggle={() => toggleBookmark(block.id)}
                isBookmarked={isBookmarked(block.id)}
                onNotesToggle={() => toggleAnnotations(block.id)}
                onQuizTrigger={() => setQuizBlockId(block.id)}
              />
              {annotationsOpen[block.id] && (
                <div className="mt-2">
                  <BlockAnnotationsPanel blockId={block.id} summaryId={summaryId} />
                </div>
              )}
            </motion.div>
          );

          if (isMobile || layout === 'flow') {
            return content;
          }

          // Desktop: absolute positioned (canvas mode)
          return (
            <div
              key={block.id}
              className="absolute"
              style={{
                left: `${block.position_x || 0}px`,
                top: `${block.position_y || 0}px`,
                width: `${block.width || 300}px`,
                // height auto for content blocks, fixed for images/videos
                ...(block.type === 'divider' ? {} : {}),
              }}
            >
              {content}
            </div>
          );
        })}
      </div>

      {/* ── Image Lightbox ───────────────────────────────── */}
      <ImageLightbox
        images={allImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* ── Video Modal ──────────────────────────────────── */}
      {activeVideoId && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setActiveVideoId(null)}
        >
          <div
            className="w-full max-w-4xl mx-4 rounded-2xl overflow-hidden bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-end px-3 py-2 bg-gray-900">
              <button
                onClick={() => setActiveVideoId(null)}
                className="text-white/60 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
              >
                Cerrar
              </button>
            </div>
            <div className="aspect-video">
              <MuxVideoPlayer
                videoId={activeVideoId}
                institutionId={institutionId}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Block Quiz Modal ───────────────────────────── */}
      <BlockQuizModal
        blockId={quizBlockId || ''}
        summaryId={summaryId}
        isOpen={!!quizBlockId}
        onClose={() => setQuizBlockId(null)}
      />

      {/* ── Bookmarks toggle + panel ──────────────────── */}
      <div className="fixed bottom-6 right-24 z-50">
        <div className="relative">
          <button
            onClick={() => setShowBookmarks(prev => !prev)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-teal-500 text-white shadow-lg hover:bg-teal-600 transition-colors"
            aria-label="Marcadores"
          >
            <Bookmark size={18} />
          </button>
          {showBookmarks && (
            <BookmarksPanel
              bookmarks={bookmarkItems}
              onBlockClick={handleBookmarkBlockClick}
              onRemove={removeBookmark}
              onClose={() => setShowBookmarks(false)}
            />
          )}
        </div>
      </div>
    </>
  );
}