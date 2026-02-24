// ============================================================
// Axon — ChunkRenderer (shared summary content renderer)
//
// Renders chunks ordered by order_index. Supports both:
//   - HTML content via dangerouslySetInnerHTML
//   - Plain text / simple markdown fallback
//
// Dark-mode-ready prose styles.
// ============================================================
import React from 'react';
import { motion } from 'motion/react';
import { Layers } from 'lucide-react';
import type { Chunk } from '@/app/services/summariesApi';

interface ChunkRendererProps {
  chunks: Chunk[];
  loading?: boolean;
}

// Simple check: does content look like HTML?
function isHtml(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

export function ChunkRenderer({ chunks, loading }: ChunkRendererProps) {
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

  if (chunks.length === 0) {
    return (
      <div className="text-center py-12">
        <Layers size={28} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Este resumen aun no tiene contenido</p>
      </div>
    );
  }

  const sorted = [...chunks].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  return (
    <div className="space-y-4 p-6">
      {sorted.map((chunk, idx) => (
        <motion.div
          key={chunk.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.02 }}
          className="group"
        >
          {isHtml(chunk.content) ? (
            <div
              className="axon-prose prose prose-sm max-w-none text-gray-600 leading-relaxed
                prose-headings:text-gray-800 prose-headings:mt-6 prose-headings:mb-2
                prose-a:text-violet-600 prose-a:underline prose-a:decoration-violet-300
                prose-strong:text-gray-700
                prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-violet-700
                prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4
                prose-li:text-gray-600
                prose-blockquote:border-l-violet-400 prose-blockquote:text-gray-500"
              dangerouslySetInnerHTML={{ __html: chunk.content }}
            />
          ) : (
            <div className="text-gray-600 leading-relaxed">
              {chunk.content.split('\n').map((line, lineIdx) => {
                if (!line.trim()) return <br key={lineIdx} />;
                if (line.startsWith('## ')) {
                  return (
                    <h3 key={lineIdx} className="text-gray-800 mt-6 mb-2">
                      {line.replace('## ', '')}
                    </h3>
                  );
                }
                if (line.startsWith('### ')) {
                  return (
                    <h4 key={lineIdx} className="text-gray-800 mt-4 mb-1.5">
                      {line.replace('### ', '')}
                    </h4>
                  );
                }
                if (line.startsWith('- ') || line.startsWith('* ')) {
                  return (
                    <li key={lineIdx} className="ml-4 text-gray-600">
                      {line.replace(/^[-*]\s/, '')}
                    </li>
                  );
                }
                return (
                  <p key={lineIdx} className="mb-2 text-gray-600 text-justify">
                    {line}
                  </p>
                );
              })}
            </div>
          )}
          {idx < sorted.length - 1 && (
            <div className="border-b border-gray-50 mt-4" />
          )}
        </motion.div>
      ))}
    </div>
  );
}
