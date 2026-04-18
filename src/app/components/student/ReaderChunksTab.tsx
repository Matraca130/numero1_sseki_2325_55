// ============================================================
// Axon — ReaderChunksTab (summary chunks + block viewer)
//
// Extracted from StudentSummaryReader.tsx (Phase 2, Step 4a).
// Pure presentational — all data and handlers via props.
//
// Renders either:
//   - SummaryViewer (if blocks exist — enriched view)
//   - Chunk list with KeywordHighlighterInline (fallback)
//
// P1 FIX: Images in chunk HTML now open ImageLightbox on click.
// Uses useChunkImageLightbox hook (event delegation + MutationObserver).
// P-05 FIX: React.memo to prevent unnecessary re-renders.
// ============================================================
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Highlighter } from 'lucide-react';
import type { Chunk } from '@/app/services/summariesApi';
import { SummaryViewer } from '@/app/components/student/SummaryViewer';
import { KeywordHighlighterInline } from '@/app/components/student/KeywordHighlighterInline';
import { enrichHtmlWithImages, renderPlainLine } from '@/app/lib/summary-content-helpers';
import { sanitizeHtml } from '@/app/lib/sanitize';
import { proseClasses } from '@/app/components/design-kit';
import { ListSkeleton } from '@/app/components/student/reader-atoms';
import { ImageLightbox } from '@/app/components/student/ImageLightbox';
import { useChunkImageLightbox } from '@/app/hooks/useChunkImageLightbox';
import type { ReadingSettings } from '@/app/components/student/ReadingSettingsPanel';
import type { SummaryKeyword } from '@/app/services/summariesApi';
import type { TextAnnotation } from '@/app/services/studentSummariesApi';
import { TextHighlighter } from '@/app/components/student/TextHighlighter';
import { replaceKeywordPlaceholders } from '@/app/components/student/blocks/renderTextWithKeywords';

// ── Props ─────────────────────────────────────────────────

export interface ReaderChunksTabProps {
  summaryId: string;
  chunks: Chunk[];
  chunksLoading: boolean;
  hasBlocks: boolean;
  blocksLoading: boolean;
  onNavigateKeyword: (keywordId: string, summaryId: string) => void;
  readingSettings?: ReadingSettings;
  keywords?: SummaryKeyword[];
  /** Text annotations for highlighting (from useSummaryReaderQueries) */
  annotations?: TextAnnotation[];
  /** Controlled bookmarks panel visibility (forwarded to SummaryViewer). */
  bookmarksOpen?: boolean;
  onBookmarksOpenChange?: (next: boolean) => void;
}

// ── Component (P-05 FIX: React.memo) ─────────────────────

export const ReaderChunksTab = React.memo(function ReaderChunksTab({
  summaryId,
  chunks,
  chunksLoading,
  hasBlocks,
  blocksLoading,
  onNavigateKeyword,
  readingSettings,
  keywords,
  annotations = [],
  bookmarksOpen,
  onBookmarksOpenChange,
}: ReaderChunksTabProps) {
  // ── Lightbox for chunk images (P1 fix) ──────────────────
  const chunksContainerRef = useRef<HTMLDivElement>(null);
  const {
    images: chunkImages,
    lightboxOpen,
    lightboxIndex,
    closeLightbox,
  } = useChunkImageLightbox(chunks, chunksContainerRef);

  // Toggle for text highlighting mode alongside blocks view
  const [showHighlighter, setShowHighlighter] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
        <h3 className="text-sm text-zinc-700" style={{ fontWeight: 600 }}>Contenido del resumen</h3>
        <div className="flex items-center gap-2">
          {!blocksLoading && hasBlocks && (
            <>
              {chunks.length > 0 && (
                <button
                  onClick={() => setShowHighlighter(prev => !prev)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] border transition-colors cursor-pointer ${
                    showHighlighter
                      ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                      : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100'
                  }`}
                  style={{ fontWeight: 600 }}
                  title={showHighlighter ? 'Volver a vista enriquecida' : 'Modo subrayado: selecciona texto para crear highlights'}
                >
                  <Highlighter size={10} />
                  {showHighlighter ? 'Vista enriquecida' : 'Subrayar'}
                </button>
              )}
              {!showHighlighter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-violet-50 text-violet-600 border border-violet-200" style={{ fontWeight: 600 }}>
                  Vista enriquecida
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="p-6">
        {!blocksLoading && hasBlocks ? (
          showHighlighter ? (
            <div ref={chunksContainerRef}>
              <TextHighlighter
                chunks={chunks}
                keywords={keywords}
                summaryId={summaryId}
                annotations={annotations}
              />
            </div>
          ) : (
            <SummaryViewer summaryId={summaryId} layout="flow" readingSettings={readingSettings} keywords={keywords} annotations={annotations} bookmarksOpen={bookmarksOpen} onBookmarksOpenChange={onBookmarksOpenChange} />
          )
        ) : chunksLoading ? (
          <ListSkeleton />
        ) : chunks.length === 0 ? (
          <div className="text-center py-8">
            <Layers className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
            <p className="text-xs text-zinc-400">Este resumen aun no tiene contenido</p>
          </div>
        ) : (
          <div ref={chunksContainerRef} className="space-y-4">
            {chunks.map((chunk, idx) => (
              <motion.div
                key={chunk.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
              >
                {/<[a-z][\s\S]*>/i.test(chunk.content) ? (
                  <KeywordHighlighterInline summaryId={summaryId} onNavigateKeyword={onNavigateKeyword}>
                    <div className={proseClasses} dangerouslySetInnerHTML={{ __html: sanitizeHtml(enrichHtmlWithImages(replaceKeywordPlaceholders(chunk.content, keywords, { escapeHtml: true }))) }} />
                  </KeywordHighlighterInline>
                ) : (
                  <KeywordHighlighterInline summaryId={summaryId} onNavigateKeyword={onNavigateKeyword}>
                    <div className="axon-prose max-w-none">
                      {replaceKeywordPlaceholders(chunk.content, keywords).split('\n').map((line, i) => renderPlainLine(line, i))}
                    </div>
                  </KeywordHighlighterInline>
                )}
                {idx < chunks.length - 1 && <div className="border-b border-zinc-100 mt-4" />}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Image Lightbox for chunk content (P1 fix) ────── */}
      <ImageLightbox
        images={chunkImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={closeLightbox}
      />
    </div>
  );
});
