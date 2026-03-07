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

// Detect markdown image: ![alt](url)
const MD_IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;

// Detect raw image URL (common extensions)
const RAW_IMAGE_URL_RE = /^https?:\/\/\S+\.(jpe?g|png|gif|webp|svg|avif|bmp)(\?\S*)?$/i;

// Post-process HTML: convert bare image URLs inside <p> tags into <img> tags
function enrichHtmlWithImages(html: string): string {
  // 1) <p> containing only a bare image URL → <figure><img></figure>
  let result = html.replace(
    /<p[^>]*>\s*(https?:\/\/[^\s<]+\.(?:jpe?g|png|gif|webp|svg|avif|bmp)(?:\?[^\s<]*)?)\s*<\/p>/gi,
    (_match, url) =>
      `<figure class="my-4"><img src="${url}" alt="" loading="lazy" class="rounded-xl border border-gray-200 shadow-sm max-w-full h-auto mx-auto block" /></figure>`
  );

  // 2) <p> containing only markdown image ![alt](url) → <figure><img></figure>
  result = result.replace(
    /<p[^>]*>\s*!\[([^\]]*)\]\((https?:\/\/[^)]+)\)\s*<\/p>/gi,
    (_match, alt, url) =>
      `<figure class="my-4"><img src="${url}" alt="${alt || ''}" loading="lazy" class="rounded-xl border border-gray-200 shadow-sm max-w-full h-auto mx-auto block" />${alt ? `<figcaption class="mt-2 text-center text-xs text-gray-400 italic">${alt}</figcaption>` : ''}</figure>`
  );

  // 3) Inline bare image URL (not already in <img> src or <a> href) → <img>
  result = result.replace(
    /(?<!["'=])(https?:\/\/[^\s<>"']+\.(?:jpe?g|png|gif|webp|svg|avif|bmp)(?:\?[^\s<>"']*)?)(?![^<]*<\/a>)/gi,
    (url) =>
      `<img src="${url}" alt="" loading="lazy" class="rounded-xl border border-gray-200 shadow-sm max-w-full h-auto mx-auto block my-4" />`
  );

  return result;
}

// Render a single line of plain text / simple markdown
function renderLine(line: string, key: number): React.ReactNode {
  if (!line.trim()) return <br key={key} />;

  // Markdown image: ![alt](url)
  const mdMatch = line.match(MD_IMAGE_RE);
  if (mdMatch) {
    const [, alt, src] = mdMatch;
    return (
      <figure key={key} className="my-4">
        <img
          src={src}
          alt={alt || ''}
          loading="lazy"
          className="rounded-xl border border-gray-200 shadow-sm max-w-full h-auto mx-auto block"
        />
        {alt && (
          <figcaption className="mt-2 text-center text-xs text-gray-400 italic">
            {alt}
          </figcaption>
        )}
      </figure>
    );
  }

  // Raw image URL
  if (RAW_IMAGE_URL_RE.test(line.trim())) {
    return (
      <figure key={key} className="my-4">
        <img
          src={line.trim()}
          alt=""
          loading="lazy"
          className="rounded-xl border border-gray-200 shadow-sm max-w-full h-auto mx-auto block"
        />
      </figure>
    );
  }

  if (line.startsWith('## ')) {
    return (
      <h3 key={key} className="text-gray-800 mt-6 mb-2">
        {line.replace('## ', '')}
      </h3>
    );
  }
  if (line.startsWith('### ')) {
    return (
      <h4 key={key} className="text-gray-800 mt-4 mb-1.5">
        {line.replace('### ', '')}
      </h4>
    );
  }
  if (line.startsWith('- ') || line.startsWith('* ')) {
    return (
      <li key={key} className="ml-4 text-gray-600">
        {line.replace(/^[-*]\s/, '')}
      </li>
    );
  }
  return (
    <p key={key} className="mb-2 text-gray-600 text-justify">
      {line}
    </p>
  );
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
              className="axon-prose max-w-none"
              dangerouslySetInnerHTML={{ __html: enrichHtmlWithImages(chunk.content) }}
            />
          ) : (
            <div className="text-gray-600 leading-relaxed">
              {chunk.content.split('\n').map((line, lineIdx) =>
                renderLine(line, lineIdx)
              )}
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