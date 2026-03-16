// ============================================================
// Axon — Node Context Menu
//
// Floating menu that appears on node click/right-click.
// Actions: Flashcards, Quiz, Ver resumo, Anotacao, Detalhes
// XMind-inspired: clean, minimal, premium feel.
// ============================================================

import { useEffect, useRef, useState, type ElementType } from 'react';
import { Layers, HelpCircle, FileText, Edit3, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { MapNode, NodeAction } from '@/app/types/mindmap';
import { MASTERY_HEX } from '@/app/types/mindmap';
import { getSafeMasteryColor, getMasteryLabel } from '@/app/lib/mastery-helpers';

// ── Icon map ────────────────────────────────────────────────

const ICONS: Record<NodeAction, ElementType> = {
  flashcard: Layers,
  quiz: HelpCircle,
  summary: FileText,
  annotate: Edit3,
  details: Info,
};

const LABELS: Record<NodeAction, string> = {
  flashcard: 'Flashcards',
  quiz: 'Quiz',
  summary: 'Ver resumo',
  annotate: 'Anotação',
  details: 'Detalhes',
};

// ── Props ───────────────────────────────────────────────────

interface NodeContextMenuProps {
  node: MapNode | null;
  position: { x: number; y: number } | null;
  onAction: (action: NodeAction, node: MapNode) => void;
  onClose: () => void;
}

// ── Component ───────────────────────────────────────────────

export function NodeContextMenu({ node, position, onAction, onClose }: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click + keyboard navigation
  useEffect(() => {
    if (!node) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
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
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    // Auto-focus first menu item on open
    requestAnimationFrame(() => {
      const firstItem = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
      firstItem?.focus();
    });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [node, onClose]);

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
  const adjustedPosition = position ? {
    x: isSmallScreen ? 0 : Math.min(position.x, window.innerWidth - 220),
    y: isSmallScreen ? 0 : Math.min(position.y, window.innerHeight - 320),
  } : { x: 0, y: 0 };

  const masteryColor = node ? getSafeMasteryColor(node.mastery) : 'gray';
  const masteryPct = node && node.mastery >= 0 ? Math.round(node.mastery * 100) : null;

  const actions: NodeAction[] = [
    'flashcard',
    'quiz',
    ...(node?.summaryId ? ['summary' as const] : []),
    'annotate',
    'details',
  ];

  // Prevent body scroll when bottom sheet is open on mobile
  useEffect(() => {
    if (!node || !isSmallScreen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
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
              onClick={onClose}
              aria-hidden="true"
            />
          )}
          <motion.div
            ref={menuRef}
            initial={isSmallScreen ? { opacity: 0, y: 100 } : { opacity: 0, scale: 0.9, y: -4 }}
            animate={isSmallScreen ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isSmallScreen ? { opacity: 0, y: 100 } : { opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.15 }}
            className={`fixed z-50 bg-white shadow-lg border border-gray-200 overflow-hidden ${
              isSmallScreen
                ? 'bottom-0 left-0 right-0 rounded-t-2xl w-full'
                : 'w-52 rounded-xl'
            }`}
            style={isSmallScreen ? undefined : { left: adjustedPosition.x, top: adjustedPosition.y }}
            role="menu"
            aria-label={`Ações para ${node.label}`}
          >
          {/* Mobile drag handle */}
          {isSmallScreen && (
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-8 h-1 rounded-full bg-gray-300" />
            </div>
          )}
          {/* Header with keyword name + mastery */}
          <div className={`px-3 py-2.5 border-b border-gray-100 ${isSmallScreen ? 'px-4' : ''}`}>
            <div className="flex items-center justify-between">
              <p
                className="font-medium text-gray-900 truncate flex-1 mr-2"
                style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(0.8rem, 1.5vw, 0.875rem)' }}
              >
                {node.label}
              </p>
              <button
                onClick={onClose}
                className="p-0.5 rounded hover:bg-gray-100 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
            {masteryPct !== null && (
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: MASTERY_HEX[masteryColor] }}
                />
                <span className="text-xs text-gray-500">
                  {getMasteryLabel(masteryColor)} — {masteryPct}%
                </span>
              </div>
            )}
            {node.definition && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                {node.definition}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className={`py-1 ${isSmallScreen ? 'pb-[env(safe-area-inset-bottom,0.5rem)]' : ''}`}>
            {actions.map((action) => {
              const Icon = ICONS[action];
              return (
                <button
                  key={action}
                  onClick={() => onAction(action, node)}
                  className={`group w-full flex items-center gap-2.5 text-sm text-gray-700 hover:bg-[#e8f5f1] hover:text-[#2a8c7a] transition-colors focus:bg-[#e8f5f1] focus:text-[#2a8c7a] focus:outline-none ${
                    isSmallScreen ? 'px-4 py-3' : 'px-3 py-2'
                  }`}
                  role="menuitem"
                >
                  <Icon className="w-4 h-4 text-gray-400 group-hover:text-[#2a8c7a] group-focus:text-[#2a8c7a]" />
                  {LABELS[action]}
                </button>
              );
            })}
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
