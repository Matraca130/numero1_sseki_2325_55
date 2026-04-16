// Axon — SummaryReaderBody
// Extracted from StudentSummaryReader.tsx (Phase C.3).
// Renders the white content card: reading mode (paginated plain/HTML),
// enriched mode (structured blocks) and the completion card.
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers } from 'lucide-react';
import type { Summary } from '@/app/services/summariesApi';
import {
  PageNavigation,
  CompletionCard,
  proseClasses,
} from '@/app/components/design-kit';
import { KeywordHighlighterInline } from '@/app/components/student/KeywordHighlighterInline';
import { ReaderChunksTab } from '@/app/components/student/ReaderChunksTab';
import { renderPlainLine } from '@/app/lib/summary-content-helpers';
import { sanitizeHtml } from '@/app/lib/sanitize';
import type { ReadingSettings } from '@/app/components/student/ReadingSettingsPanel';

interface SummaryReaderBodyProps {
  summary: Summary;
  viewMode: 'enriched' | 'reading';
  readingSettings: ReadingSettings;
  // Reading-mode pagination
  isHtmlContent: boolean;
  htmlPages: string[];
  textPages: string[][];
  safePage: number;
  totalPages: number;
  setContentPage: (page: number) => void;
  onNavigateKeyword: (keywordId: string, summaryId: string) => void;
  // Enriched-mode data
  chunks: React.ComponentProps<typeof ReaderChunksTab>['chunks'];
  chunksLoading: boolean;
  hasBlocks: boolean;
  blocksLoading: boolean;
  keywords: React.ComponentProps<typeof ReaderChunksTab>['keywords'];
  annotations: React.ComponentProps<typeof ReaderChunksTab>['annotations'];
  // Completion
  isCompleted: boolean;
  onGoToKeywordsTab: () => void;
  // Bookmarks (controlled by toolbar toggle)
  bookmarksOpen?: boolean;
  onBookmarksOpenChange?: (next: boolean) => void;
}

export function SummaryReaderBody({
  summary,
  viewMode,
  readingSettings,
  isHtmlContent,
  htmlPages,
  textPages,
  safePage,
  totalPages,
  setContentPage,
  onNavigateKeyword,
  chunks,
  chunksLoading,
  hasBlocks,
  blocksLoading,
  keywords,
  annotations,
  isCompleted,
  onGoToKeywordsTab,
  bookmarksOpen,
  onBookmarksOpenChange,
}: SummaryReaderBodyProps) {
  return (
    <div className="reader-card bg-white dark:bg-[#1e1f25] rounded-b-[20px] border-2 border-t-0 border-zinc-200 dark:border-[#2d2e34] shadow-sm overflow-hidden">
      {/* ── Reading mode fallback when no content_markdown ── */}
      {viewMode === 'reading' && !summary?.content_markdown && (
        <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
          Este resumen no tiene contenido en formato texto. Cambiando a modo enriquecido...
        </p>
      )}

      {/* ── Reading mode: plain markdown ── */}
      {viewMode === 'reading' && summary.content_markdown && (
        <div
          className="px-6 sm:px-10 py-8"
          style={{
            fontSize: `${readingSettings.fontSize}px`,
            lineHeight: readingSettings.lineHeight,
            fontFamily: readingSettings.fontFamily,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={safePage}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              {isHtmlContent ? (
                <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={onNavigateKeyword}>
                  <div className={proseClasses} dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlPages[safePage] || '') }} />
                </KeywordHighlighterInline>
              ) : (
                <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={onNavigateKeyword}>
                  <div className="axon-prose max-w-none">
                    {textPages[safePage]?.map((line, i) => renderPlainLine(line, i))}
                  </div>
                </KeywordHighlighterInline>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Pagination */}
          {totalPages > 1 && (
            <PageNavigation
              currentPage={safePage}
              totalPages={totalPages}
              onPrev={() => setContentPage(Math.max(0, safePage - 1))}
              onNext={() => setContentPage(Math.min(totalPages - 1, safePage + 1))}
              onPageClick={(i) => setContentPage(i)}
            />
          )}
        </div>
      )}

      {/* ── Enriched mode: structured blocks ── */}
      {viewMode === 'enriched' && (
        <div className="py-4">
          <ReaderChunksTab
            summaryId={summary.id}
            chunks={chunks}
            chunksLoading={chunksLoading}
            hasBlocks={hasBlocks}
            blocksLoading={blocksLoading}
            onNavigateKeyword={onNavigateKeyword}
            readingSettings={readingSettings}
            keywords={keywords}
            annotations={annotations}
            bookmarksOpen={bookmarksOpen}
            onBookmarksOpenChange={onBookmarksOpenChange}
          />
        </div>
      )}

      {/* Completion card when read */}
      {isCompleted && (
        <div className="px-6 sm:px-8 pb-6">
          <CompletionCard
            title="Resumen completado!"
            subtitle={`Has leido "${summary.title || 'este resumen'}"`}
            xpEarned={15}
            actions={[
              { label: `Flashcards`, icon: Layers, onClick: onGoToKeywordsTab, variant: 'secondary' },
            ]}
          />
        </div>
      )}
    </div>
  );
}
