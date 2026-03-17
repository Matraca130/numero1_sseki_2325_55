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
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 hidden sm:flex flex-col gap-1 bg-white rounded-2xl shadow-lg border border-gray-200 p-1.5"
          role="toolbar"
          aria-label="Herramientas del mapa"
          aria-orientation="vertical"
        >
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                className={`relative p-2.5 rounded-xl transition-colors group ${
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-ax-primary-500 rounded-full" />
                )}
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
