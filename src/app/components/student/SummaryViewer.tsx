// ============================================================
// Axon — SummaryViewer (Student: read-only visual block layout)
//
// Fetches GET /summary-blocks?summary_id=xxx and renders blocks
// in the same layout the professor composed.
//
// Desktop (>=768px): absolute positioning (same as editor)
// Mobile  (<768px):  vertical stack by order_index
//
// Interactions: image→lightbox, video→play, pdf→view, keyword→popup
// ============================================================
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Loader2, Layers } from 'lucide-react';
import { Skeleton } from '@/app/components/ui/skeleton';
import * as summariesApi from '@/app/services/summariesApi';
import type { SummaryBlock } from '@/app/services/summariesApi';
import { ViewerBlock } from './ViewerBlock';
import { ImageLightbox, type LightboxImage } from './ImageLightbox';
import { useAuth } from '@/app/context/AuthContext';
import { MuxVideoPlayer } from '@/app/components/video/MuxVideoPlayer';

// ── Helper ────────────────────────────────────────────────
function extractItems<T>(result: any): T[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

// ── Props ─────────────────────────────────────────────────

interface SummaryViewerProps {
  summaryId: string;
  /** Pre-fetched blocks (avoids double fetch) */
  blocks?: SummaryBlock[];
  onKeywordClick?: (keywordId: string) => void;
}

export function SummaryViewer({ summaryId, blocks: prefetchedBlocks, onKeywordClick }: SummaryViewerProps) {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<SummaryBlock[]>(prefetchedBlocks || []);
  const [loading, setLoading] = useState(!prefetchedBlocks);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Lightbox state ──────────────────────────────────────
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // ── Video modal state ───────────────────────────────────
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  // ── Detect mobile ───────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Fetch blocks ────────────────────────────────────────
  const fetchBlocks = useCallback(async () => {
    if (prefetchedBlocks) return;
    setLoading(true);
    try {
      const result = await summariesApi.getSummaryBlocks(summaryId);
      setBlocks(
        extractItems<SummaryBlock>(result)
          .filter(b => b.is_active !== false)
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      );
    } catch (err) {
      console.error('[SummaryViewer] blocks load error:', err);
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, [summaryId, prefetchedBlocks]);

  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

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
  if (loading) {
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
      <div className="text-center py-12">
        <Layers size={28} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Este resumen no tiene bloques visuales</p>
      </div>
    );
  }

  // ── Sorted blocks for mobile ────────────────────────────
  const sorted = [...blocks].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  return (
    <>
      <div
        ref={containerRef}
        className={isMobile ? 'space-y-4 px-4 py-6' : 'relative'}
        style={!isMobile ? { height: `${canvasHeight}px`, minHeight: '400px' } : undefined}
        role="region"
        aria-label="Contenido del resumen"
      >
        {sorted.map((block, idx) => {
          const content = (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              aria-label={`Bloque ${block.type}`}
            >
              <ViewerBlock
                block={block}
                isMobile={isMobile}
                onImageClick={handleImageClick}
                onKeywordClick={onKeywordClick}
                onVideoPlay={(videoId) => setActiveVideoId(videoId)}
              />
            </motion.div>
          );

          if (isMobile) {
            return content;
          }

          // Desktop: absolute positioned
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
    </>
  );
}
