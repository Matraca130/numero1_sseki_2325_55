// ============================================================
// Axon — ChunkRenderer (shared summary content renderer)
//
// Renders chunks ordered by order_index. Supports both:
//   - HTML content via dangerouslySetInnerHTML
//   - Plain text / simple markdown fallback
//
// Dark-mode-ready prose styles.
// ============================================================
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Layers } from 'lucide-react';
import type { Chunk, SummaryKeyword } from '@/app/services/summariesApi';
import { enrichHtmlWithImages, renderPlainLine } from '@/app/lib/summary-content-helpers';
import { sanitizeHtml } from '@/app/lib/sanitize';
import { replaceKeywordPlaceholders } from '@/app/components/student/blocks/renderTextWithKeywords';

interface ChunkRendererProps {
  chunks: Chunk[];
  keywords?: SummaryKeyword[];
  loading?: boolean;
}

// Simple check: does content look like HTML?
function isHtml(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

interface ProcessedChunk {
  id: string;
  isHtml: boolean;
  html?: string;
  plainLines?: string[];
}

export const ChunkRenderer = React.memo(function ChunkRenderer({ chunks, keywords = [], loading }: ChunkRendererProps) {
  // Memoize the expensive sanitize/replace/enrich pipeline.
  // Re-runs only when chunks or keywords references change.
  const processed = useMemo<ProcessedChunk[]>(() => {
    if (!chunks || chunks.length === 0) return [];
    const sorted = [...chunks].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    return sorted.map(chunk => {
      if (isHtml(chunk.content)) {
        return {
          id: chunk.id,
          isHtml: true,
          html: sanitizeHtml(enrichHtmlWithImages(replaceKeywordPlaceholders(chunk.content, keywords, { escapeHtml: true }), 'light')),
        };
      }
      return {
        id: chunk.id,
        isHtml: false,
        plainLines: replaceKeywordPlaceholders(chunk.content, keywords).split('\n'),
      };
    });
  }, [chunks, keywords]);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-full mb-2" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  if (processed.length === 0) {
    return (
      <div className="text-center py-12">
        <Layers size={28} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Este resumen aun no tiene contenido</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {processed.map((chunk, idx) => (
        <motion.div
          key={chunk.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.02 }}
          className="group"
        >
          {chunk.isHtml ? (
            <div
              className="axon-prose max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(chunk.html ?? '') }}
            />
          ) : (
            <div className="text-gray-600 leading-relaxed">
              {chunk.plainLines!.map((line, lineIdx) =>
                renderPlainLine(line, lineIdx, 'light')
              )}
            </div>
          )}
          {idx < processed.length - 1 && (
            <div className="border-b border-gray-50 mt-4" />
          )}
        </motion.div>
      ))}
    </div>
  );
});

ChunkRenderer.displayName = 'ChunkRenderer';
