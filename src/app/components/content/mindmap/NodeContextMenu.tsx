// ============================================================
// Axon — Node Context Menu
//
// Floating menu that appears on node click/right-click.
// Actions: Flashcards, Quiz, Ver resumen, Anotación, Detalles
// macOS-inspired: clean, minimal, premium feel.
// ============================================================

import { useEffect, useMemo, useRef, useState, memo, type ElementType } from 'react';
import { Layers, HelpCircle, FileText, Edit3, Info, X, ChevronRight, ChevronDown, Palette, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { MapNode, NodeAction } from '@/app/types/mindmap';
import { MASTERY_HEX } from '@/app/types/mindmap';
import { getSafeMasteryColor, getMasteryLabel } from '@/app/lib/mastery-helpers';
import { NODE_COLOR_PALETTE } from './useNodeColors';
import { useSwipeDismiss } from './useSwipeDismiss';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ── Icon map ────────────────────────────────────────────────

const ICONS: Record<NodeAction, ElementType> = {
  flashcard: Layers,
  quiz: HelpCircle,
  summary: FileText,
  connect: Link2,
  annotate: Edit3,
  details: Info,
};

const LABELS: Record<NodeAction, string> = {
  flashcard: 'Flashcards',
  quiz: 'Quiz',
  summary: 'Ver resumen',
  connect: 'Conectar',
  annotate: 'Anotación',
  details: 'Detalles',
};

// ── Props ───────────────────────────────────────────────────

interface NodeContextMenuProps {
  node: MapNode | null;
  position: { x: number; y: number } | null;
  onAction: (action: NodeAction, node: MapNode) => void;
  onClose: () => void;
  /** Whether this node has children (enables collapse/expand action) */
  hasChildren?: boolean;
  /** Whether this node is currently collapsed */
  isCollapsed?: boolean;
  /** Toggle collapse for this node */
  onToggleCollapse?: () => void;
  /** Callback when user selects a custom color (user-created nodes only) */
  onColorChange?: (nodeId: string, color: string) => void;
  /** Current custom color of the node (if any) */
  currentCustomColor?: string;
  /** Whether to hide the "connect" action (e.g. professor view) */
  hideConnect?: boolean;
}

// ── Shared styles ───────────────────────────────────────────

const menuItemFontSize = 'clamp(0.8rem, 1.5vw, 0.8125rem)';
const captionFontSize = 'clamp(0.7rem, 1.3vw, 0.75rem)';

// ── Component ───────────────────────────────────────────────

export const NodeContextMenu = memo(function NodeContextMenu({ node, position, onAction, onClose, hasChildren, isCollapsed, onToggleCollapse, onColorChange, currentCustomColor, hideConnect }: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Close on outside click + keyboard navigation
  useEffect(() => {
    if (!node) return;

    // Save focused element to restore on close
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCloseRef.current();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      // Arrow key navigation within menu
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
        if (!items || items.length === 0) return;
        const current = document.activeElement as HTMLElement;
        const idx = Array.from(items).indexOf(current as HTMLButtonElement);
        if (e.key === 'ArrowDown') {
          const next = idx < items.length - 1 ? idx + 1 : 0;
          items[next].focus();
        } else {
          const prev = idx > 0 ? idx - 1 : items.length - 1;
          items[prev].focus();
        }
      }
      // Focus trap — prevent Tab from escaping the context menu
      if (e.key === 'Tab' && menuRef.current) {
        const focusable = menuRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) { e.preventDefault(); return; }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    // Auto-focus first menu item on open
    const rafId = requestAnimationFrame(() => {
      const firstItem = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
      firstItem?.focus();
    });

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previously focused element
      previouslyFocused?.focus();
    };
  }, [node]);

  // Reactive small-screen detection (bottom sheet on mobile)
  const [isSmallScreen, setIsSmallScreen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = (e: MediaQueryListEvent) => setIsSmallScreen(e.matches);
    setIsSmallScreen(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const adjustedPosition = useMemo(() => position ? {
    x: isSmallScreen ? 0 : Math.max(4, Math.min(position.x, window.innerWidth - 220)),
    y: isSmallScreen ? 0 : Math.max(4, Math.min(position.y, window.innerHeight - 320)),
  } : null, [position, isSmallScreen]);

  const masteryColor = node ? getSafeMasteryColor(node.mastery) : 'gray';
  const masteryPct = node && node.mastery >= 0 ? Math.round(node.mastery * 100) : null;

  const actions: NodeAction[] = [
    'flashcard',
    'quiz',
    ...(node?.summaryId ? ['summary' as const] : []),
    ...(!hideConnect ? ['connect' as const] : []),
    'annotate',
    'details',
  ];

  const { onTouchStart: swipeStart, onTouchMove: swipeMove, onTouchEnd: swipeEnd } = useSwipeDismiss(onClose);

  // Prevent body scroll when bottom sheet is open on mobile (lock both html + body for iOS Safari)
  useEffect(() => {
    if (!node || !isSmallScreen) return;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [node, isSmallScreen]);

  return (
    <AnimatePresence>
      {node && position && (
        <>
          {/* Backdrop (mobile only) */}
          {isSmallScreen && (
            <motion.div
              className="fixed inset-0 bg-black/20 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onClose}
              aria-hidden="true"
            />
          )}
          <motion.div
            ref={menuRef}
            initial={isSmallScreen ? { opacity: 0, y: 100 } : { opacity: 0, scale: 0.95, y: -2 }}
            animate={isSmallScreen ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isSmallScreen ? { opacity: 0, y: 100 } : { opacity: 0, scale: 0.95, y: -2 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className={`fixed z-50 bg-white/[0.98] backdrop-blur-sm border ${
              isSmallScreen
                ? 'bottom-0 left-0 right-0 rounded-t-2xl w-full max-h-[75dvh] overflow-y-auto border-gray-200 shadow-xl'
                : 'min-w-[200px] w-auto rounded-xl border-gray-200/60 shadow-lg'
            }`}
            style={isSmallScreen ? undefined : {
              left: adjustedPosition!.x,
              top: adjustedPosition!.y,
              boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            }}
            role="menu"
            aria-label={`Acciones para ${node.label}`}
            onTouchStart={isSmallScreen ? swipeStart : undefined}
            onTouchMove={isSmallScreen ? swipeMove : undefined}
            onTouchEnd={isSmallScreen ? swipeEnd : undefined}
          >
          {/* Mobile drag handle */}
          {isSmallScreen && (
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-9 h-1 rounded-full bg-gray-300/80" />
            </div>
          )}
          {/* Header with keyword name + mastery */}
          <div className={`border-b border-gray-100 ${isSmallScreen ? 'px-4 py-3' : 'px-3 py-2.5'}`} role="presentation">
            <div className="flex items-center justify-between gap-2">
              <p
                className="font-semibold text-gray-900 truncate flex-1"
                style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(0.8rem, 1.5vw, 0.875rem)' }}
              >
                {node.label}
              </p>
              <button
                onClick={onClose}
                className="p-2.5 -mr-1 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                aria-label="Cerrar"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
            {masteryPct !== null && (
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: MASTERY_HEX[masteryColor] }}
                  aria-hidden="true"
                />
                <span className="text-gray-500" style={{ fontSize: captionFontSize }}>
                  {getMasteryLabel(masteryColor, 'es')} — {masteryPct}%
                </span>
              </div>
            )}
            {node.definition && (
              <p className="text-gray-500 mt-1 line-clamp-2" style={{ fontSize: captionFontSize }}>
                {node.definition}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div
            className={isSmallScreen ? 'py-1.5' : 'py-1'}
            style={isSmallScreen ? { paddingBottom: !(hasChildren && onToggleCollapse) ? 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' : undefined } : undefined}
          >
            {actions.map((action) => {
              const Icon = ICONS[action];
              return (
                <button
                  key={action}
                  onClick={() => onAction(action, node)}
                  className={`group w-full flex items-center gap-2.5 text-gray-700 hover:bg-ax-primary-50 hover:text-ax-primary-500 transition-colors focus:bg-ax-primary-50 focus:text-ax-primary-500 focus:outline-none ${
                    isSmallScreen ? 'px-4 py-3' : 'px-3 py-1.5'
                  }`}
                  style={{ fontSize: isSmallScreen ? 'clamp(0.85rem, 1.6vw, 0.9375rem)' : menuItemFontSize }}
                  role="menuitem"
                >
                  <Icon className="w-4 h-4 text-gray-400 group-hover:text-ax-primary-500 group-focus:text-ax-primary-500 flex-shrink-0" />
                  {LABELS[action]}
                </button>
              );
            })}
          </div>
          {/* Custom color swatches (user-created nodes only) */}
          {node.isUserCreated && onColorChange && (
            <div
              className="border-t border-gray-100 py-1.5"
            >
              <div className={`flex items-center gap-2 ${isSmallScreen ? 'px-4' : 'px-3'}`}>
                <Palette className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" aria-hidden="true" />
                <span
                  className="text-gray-500 font-sans"
                  style={{ fontSize: captionFontSize }}
                >
                  Color
                </span>
                <div className="flex items-center gap-1.5 ml-auto" role="group" aria-label="Color del nodo">
                  {NODE_COLOR_PALETTE.map(({ hex, label }) => (
                    <button
                      key={hex}
                      onClick={() => { onColorChange(node.id, hex); }}
                      className="rounded-full transition-all duration-100 flex-shrink-0 p-2.5 sm:p-1.5"
                      role="menuitemradio"
                      aria-checked={currentCustomColor === hex}
                      aria-label={`Color ${label}`}
                      title={label}
                    >
                      <span
                        className="block rounded-full"
                        style={{
                          width: 18,
                          height: 18,
                          backgroundColor: hex,
                          outline: currentCustomColor === hex ? `2px solid ${hex}` : '2px solid transparent',
                          outlineOffset: 1,
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* Collapse/expand branch action (only for non-leaf nodes) */}
          {hasChildren && onToggleCollapse && (
            <div
              className="border-t border-gray-100 py-1"
              style={isSmallScreen ? { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' } : undefined}
            >
              <button
                onClick={() => { onToggleCollapse(); onClose(); }}
                className={`group w-full flex items-center gap-2.5 text-gray-700 hover:bg-ax-primary-50 hover:text-ax-primary-500 transition-colors focus:bg-ax-primary-50 focus:text-ax-primary-500 focus:outline-none ${
                  isSmallScreen ? 'px-4 py-3' : 'px-3 py-1.5'
                }`}
                style={{ fontSize: isSmallScreen ? 'clamp(0.85rem, 1.6vw, 0.9375rem)' : menuItemFontSize }}
                role="menuitem"
              >
                {isCollapsed
                  ? <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-ax-primary-500 group-focus:text-ax-primary-500 flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-ax-primary-500 group-focus:text-ax-primary-500 flex-shrink-0" />
                }
                {isCollapsed ? 'Expandir rama' : 'Colapsar rama'}
              </button>
            </div>
          )}
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
