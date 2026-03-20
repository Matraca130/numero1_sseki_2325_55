// ============================================================
// Axon — MoreActionsDropdown
//
// Groups secondary Knowledge Map actions behind a single "..."
// button. Reduces header chrome for better graph visibility.
// ============================================================

import { useState, useRef, useEffect, memo } from 'react';
import {
  MoreHorizontal, Clock, Presentation, Share2,
  GitCompareArrows, Maximize2, Minimize2, RefreshCw,
  StickyNote as StickyNoteIcon,
} from 'lucide-react';

interface MoreActionsDropdownProps {
  onToggleHistory: () => void;
  onTogglePresentation: () => void;
  onToggleShare: () => void;
  onToggleComparison: () => void;
  onToggleFullscreen: () => void;
  onRefresh: () => void;
  onAddStickyNote: () => void;
  historyActive: boolean;
  comparisonActive: boolean;
  canPresent: boolean;
  canShare: boolean;
  canAddNote: boolean;
  isFullscreen: boolean;
  stickyNoteCount: number;
}

const fontSize = {
  xs: 'clamp(0.6875rem, 0.65rem + 0.15vw, 0.75rem)',
} as const;

export const MoreActionsDropdown = memo(function MoreActionsDropdown(props: MoreActionsDropdownProps) {
  const {
    onToggleHistory, onTogglePresentation, onToggleShare,
    onToggleComparison, onToggleFullscreen, onRefresh,
    onAddStickyNote, historyActive, comparisonActive,
    canPresent, canShare, canAddNote, isFullscreen,
    stickyNoteCount,
  } = props;

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const fire = (fn: () => void) => { setOpen(false); fn(); };

  const items: { icon: React.ElementType; label: string; onClick: () => void; active?: boolean; disabled?: boolean; badge?: number }[] = [];

  if (canAddNote) {
    items.push({ icon: StickyNoteIcon, label: 'Nota adhesiva', onClick: () => fire(onAddStickyNote), badge: stickyNoteCount || undefined });
  }
  items.push({ icon: RefreshCw, label: 'Actualizar', onClick: () => fire(onRefresh) });
  items.push({ icon: Clock, label: 'Historial', onClick: () => fire(onToggleHistory), active: historyActive });
  if (canPresent) {
    items.push({ icon: Presentation, label: 'Presentar', onClick: () => fire(onTogglePresentation) });
  }
  if (canShare) {
    items.push({ icon: Share2, label: 'Compartir', onClick: () => fire(onToggleShare) });
  }
  items.push({ icon: GitCompareArrows, label: 'Comparar', onClick: () => fire(onToggleComparison), active: comparisonActive });
  items.push({
    icon: isFullscreen ? Minimize2 : Maximize2,
    label: isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa',
    onClick: () => fire(onToggleFullscreen),
  });

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:w-8 sm:h-8 rounded-full transition-colors ${
          open
            ? 'bg-[#e8f5f1] text-[#2a8c7a]'
            : 'text-gray-500 hover:text-[#2a8c7a] hover:bg-gray-50'
        }`}
        aria-label="Más opciones"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-30 bg-white rounded-2xl shadow-lg border border-gray-200 py-1.5 w-52 max-w-[calc(100vw-2rem)]"
          role="menu"
          aria-label="Opciones adicionales"
          onKeyDown={(e) => {
            const btns = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
            if (!btns.length) return;
            const idx = Array.from(btns).indexOf(document.activeElement as HTMLButtonElement);
            if (e.key === 'ArrowDown') { e.preventDefault(); btns[(idx + 1) % btns.length].focus(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); btns[(idx - 1 + btns.length) % btns.length].focus(); }
            else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
            else if (e.key === 'Home') { e.preventDefault(); btns[0].focus(); }
            else if (e.key === 'End') { e.preventDefault(); btns[btns.length - 1].focus(); }
          }}
          ref={(el) => { if (el) el.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus(); }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                role="menuitem"
                tabIndex={-1}
                onClick={item.onClick}
                disabled={item.disabled}
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-gray-700 hover:bg-[#e8f5f1] hover:text-[#2a8c7a] focus:bg-[#e8f5f1] focus:text-[#2a8c7a] focus:outline-none transition-all duration-150 text-left font-sans disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontSize: fontSize.xs }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.active && (
                  <span className="w-2 h-2 rounded-full bg-[#2a8c7a] flex-shrink-0" aria-label="activo" />
                )}
                {item.badge != null && item.badge > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full font-medium bg-[#e8f5f1] text-[#2a8c7a]"
                    style={{ fontSize: 'clamp(0.5625rem, 0.9vw, 0.625rem)' }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
