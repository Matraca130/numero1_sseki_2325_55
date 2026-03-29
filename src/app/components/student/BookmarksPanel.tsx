import { useState, useCallback, useEffect } from 'react';
import { Bookmark, BookmarkCheck, X } from 'lucide-react';

// ─────────────────────────────────────────────
// useBookmarks hook — localStorage persistence
// ─────────────────────────────────────────────

function getStorageKey(summaryId: string) {
  return `axon-bookmarks-${summaryId}`;
}

export function useBookmarks(summaryId: string) {
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(getStorageKey(summaryId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Sync to localStorage on change
  useEffect(() => {
    localStorage.setItem(getStorageKey(summaryId), JSON.stringify(bookmarks));
  }, [summaryId, bookmarks]);

  const toggle = useCallback((blockId: string) => {
    setBookmarks(prev =>
      prev.includes(blockId)
        ? prev.filter(id => id !== blockId)
        : [...prev, blockId]
    );
  }, []);

  const remove = useCallback((blockId: string) => {
    setBookmarks(prev => prev.filter(id => id !== blockId));
  }, []);

  const isBookmarked = useCallback(
    (blockId: string) => bookmarks.includes(blockId),
    [bookmarks]
  );

  return { bookmarks, toggle, remove, isBookmarked };
}

// ─────────────────────────────────────────────
// BookmarksPanel component
// ─────────────────────────────────────────────

interface BookmarkItem {
  blockId: string;
  blockType: string;
  title: string;
}

interface BookmarksPanelProps {
  bookmarks: BookmarkItem[];
  onBlockClick: (blockId: string) => void;
  onRemove: (blockId: string) => void;
  onClose: () => void;
}

export default function BookmarksPanel({
  bookmarks,
  onBlockClick,
  onRemove,
  onClose,
}: BookmarksPanelProps) {
  return (
    <div
      role="dialog"
      aria-label="Bloques guardados"
      className="absolute bottom-full right-0 mb-1.5 w-72 bg-white dark:bg-[var(--reader-card-bg,#1e1f25)] border border-gray-200 dark:border-[var(--reader-border,#2d2e34)] rounded-2xl p-3 shadow-lg z-50 max-h-[350px] overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-bold text-gray-900 dark:text-[var(--reader-text-primary,#e6e7eb)]" style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.75rem)' }}>
          Marcadores ({bookmarks.length})
        </span>
        <button
          onClick={onClose}
          aria-label="Cerrar marcadores"
          className="flex text-gray-400 dark:text-[var(--reader-text-muted,#8b8d94)] hover:text-gray-600 dark:hover:text-[var(--reader-text-primary,#e6e7eb)] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Empty state */}
      {bookmarks.length === 0 ? (
        <div className="text-center py-4 text-gray-400 dark:text-[var(--reader-text-muted,#8b8d94)]" style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.75rem)' }}>
          <Bookmark size={24} className="mx-auto mb-2 text-gray-300 dark:text-[var(--reader-text-muted,#8b8d94)]" />
          <p>No hay marcadores</p>
          <p className="mt-1" style={{ fontSize: 'clamp(0.6rem, 1vw, 0.65rem)' }}>
            Usa el icono <Bookmark size={10} className="inline align-middle" /> en cada bloque para guardar.
          </p>
        </div>
      ) : (
        /* Bookmark list */
        <div className="flex flex-col gap-0.5">
          {bookmarks.map(item => (
            <button
              key={item.blockId}
              onClick={() => {
                onBlockClick(item.blockId);
                onClose();
              }}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-teal-50 dark:hover:bg-[var(--reader-teal-50,#1a2e2a)] group"
            >
              <BookmarkCheck size={14} className="text-teal-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div
                  className="font-semibold text-gray-900 dark:text-[var(--reader-text-primary,#e6e7eb)] truncate"
                  style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.75rem)' }}
                >
                  {item.title || item.blockType}
                </div>
                <div className="text-gray-400 dark:text-[var(--reader-text-muted,#8b8d94)]" style={{ fontSize: 'clamp(0.6rem, 1vw, 0.625rem)' }}>
                  {item.blockType.replace('_', ' ')}
                </div>
              </div>
              <button
                onClick={e => {
                  e.stopPropagation();
                  onRemove(item.blockId);
                }}
                title="Quitar"
                className="flex p-0.5 text-gray-300 dark:text-[var(--reader-text-muted,#8b8d94)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={12} />
              </button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
