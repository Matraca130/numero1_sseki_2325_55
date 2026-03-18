// ============================================================
// Axon — MapToolsPanel (XMind-like Floating Tool Palette)
//
// Floating toolbar for interactive map editing tools:
//   - Pointer (default selection mode)
//   - Create node (click canvas → new custom node)
//   - Create connection (drag from node A to B → new edge)
//   - Delete (click to remove node/edge)
//   - Annotate (click to open annotation modal)
//
// LANG: Spanish
// ============================================================

import { useEffect, useRef } from 'react';
import { MousePointer2, Plus, Link2, Trash2, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── Types ───────────────────────────────────────────────────

export type MapTool = 'pointer' | 'add-node' | 'connect' | 'delete' | 'annotate';

interface MapToolsPanelProps {
  activeTool: MapTool;
  onToolChange: (tool: MapTool) => void;
  /** Hide when graph is empty or loading */
  visible?: boolean;
}

// ── Tool definitions ────────────────────────────────────────

const TOOLS: { id: MapTool; icon: typeof MousePointer2; label: string; shortcut?: string }[] = [
  { id: 'pointer',  icon: MousePointer2, label: 'Seleccionar',  shortcut: 'V' },
  { id: 'add-node', icon: Plus,          label: 'Nuevo concepto', shortcut: 'N' },
  { id: 'connect',  icon: Link2,         label: 'Crear conexión', shortcut: 'C' },
  { id: 'delete',   icon: Trash2,        label: 'Eliminar',       shortcut: 'D' },
  { id: 'annotate', icon: Edit3,         label: 'Anotar',         shortcut: 'A' },
];

// ── Component ───────────────────────────────────────────────

export function MapToolsPanel({ activeTool, onToolChange, visible = true }: MapToolsPanelProps) {
  // Wire up keyboard shortcuts (V/N/C/D/A) when visible
  const onToolChangeRef = useRef(onToolChange);
  onToolChangeRef.current = onToolChange;

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement).isContentEditable) return;
      const tool = TOOLS.find(t => t.shortcut?.toLowerCase() === e.key.toLowerCase());
      if (tool) {
        e.preventDefault();
        onToolChangeRef.current(tool.id);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute z-10 flex gap-1 bg-white rounded-2xl shadow-lg border border-gray-200 p-1.5 bottom-3 left-1/2 -translate-x-1/2 flex-row sm:bottom-auto sm:left-3 sm:top-1/2 sm:-translate-x-0 sm:-translate-y-1/2 sm:flex-col"
          role="toolbar"
          aria-label="Herramientas del mapa"
          onKeyDown={(e) => {
            const isNav = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key);
            if (!isNav) return;
            e.preventDefault();
            const buttons = e.currentTarget.querySelectorAll('button');
            const current = document.activeElement as HTMLElement;
            const idx = Array.from(buttons).indexOf(current as HTMLButtonElement);
            if (idx < 0) return;
            const forward = e.key === 'ArrowDown' || e.key === 'ArrowRight';
            const next = forward ? (idx + 1) % buttons.length : (idx - 1 + buttons.length) % buttons.length;
            (buttons[next] as HTMLButtonElement).focus();
          }}
        >
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                className={`relative p-3 sm:p-2.5 rounded-xl transition-colors group ${
                  isActive
                    ? 'bg-ax-primary-50 text-ax-primary-500'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                aria-label={tool.label}
                aria-pressed={isActive}
                title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
              >
                <Icon className="w-4 h-4" />
                {isActive && (
                  <span className="absolute rounded-full bg-ax-primary-500 bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4 sm:bottom-auto sm:left-0 sm:top-1/2 sm:-translate-x-0 sm:-translate-y-1/2 sm:h-4 sm:w-0.5" />
                )}
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
