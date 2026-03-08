// ============================================================
// Axon — QuickKeywordCreator (Professor: create keyword from selection)
//
// Floating toolbar that appears when professor selects text.
// Shows a "Create Keyword" button → opens inline popover with:
//   - Name (pre-filled from selection)
//   - Definition (optional)
//   - Priority (1/2/3)
//   - Create button → POST /keywords
//
// Works in two modes:
//   1. Wrapping children (ChunkRenderer, any read-only container)
//   2. Controlled mode (TipTap editor provides selectedText externally)
//
// Routes: POST /keywords { summary_id, name, definition?, priority }
//
// S-1: After creating a keyword, invalidates the shared
// queryKeys.summaryKeywords cache → KeywordsManager (React Query)
// auto-refreshes without needing an onKeywordCreated callback.
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Tag, Loader2, X,
} from 'lucide-react';
import clsx from 'clsx';
import { useCreateKeywordMutation } from '@/app/hooks/queries/useKeywordsManagerQueries';

// ── Priority config ───────────────────────────────────────
const priorities: { value: number; label: string; color: string; bg: string }[] = [
  { value: 1, label: 'Baja',  color: 'text-gray-600',  bg: 'bg-gray-100 border-gray-200' },
  { value: 2, label: 'Media', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  { value: 3, label: 'Alta',  color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
];

// ── Inline Create Form ───────────────────────────────────
interface CreateFormProps {
  initialName: string;
  summaryId: string;
  position: { top: number; left: number };
  onClose: () => void;
  onCreated: (name: string) => void;
  existingKeywordNames?: string[];
}

function CreateForm({ initialName, summaryId, position, onClose, onCreated, existingKeywordNames }: CreateFormProps) {
  const [name, setName] = useState(initialName);
  const [definition, setDefinition] = useState('');
  const [priority, setPriority] = useState(2);
  const createMutation = useCreateKeywordMutation(summaryId);
  const formRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid immediate close from the same click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCreate = () => {
    if (!name.trim()) {
      return;
    }
    if (existingKeywordNames && existingKeywordNames.some(
      kn => kn.toLowerCase() === name.trim().toLowerCase()
    )) {
      toast.error(`La keyword "${name.trim()}" ya existe`);
      return;
    }
    createMutation.mutate(
      { name: name.trim(), definition: definition.trim() || undefined, priority },
      {
        onSuccess: () => {
          onCreated(name.trim());
          onClose();
        },
      },
    );
  };

  // Clamp position to viewport
  const clampedLeft = Math.max(16, Math.min(position.left, window.innerWidth - 320));
  const clampedTop = Math.max(16, position.top);

  return createPortal(
    <motion.div
      ref={formRef}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.12 }}
      className="fixed z-[60] bg-white rounded-xl border border-gray-200 shadow-xl w-[300px]"
      style={{ top: `${clampedTop}px`, left: `${clampedLeft}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
            <Tag size={12} className="text-violet-600" />
          </div>
          <span className="text-sm text-gray-800" style={{ fontWeight: 600 }}>Crear Keyword</span>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100">
          <X size={14} />
        </button>
      </div>

      {/* Form */}
      <div className="px-4 py-3 space-y-3">
        {/* Name */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block" style={{ fontWeight: 600 }}>
            Nombre
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nombre del keyword..."
            className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 placeholder:text-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreate(); }
            }}
          />
        </div>

        {/* Definition */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block" style={{ fontWeight: 600 }}>
            Definicion <span className="text-gray-400">(opcional)</span>
          </label>
          <textarea
            value={definition}
            onChange={e => setDefinition(e.target.value)}
            placeholder="Breve definicion..."
            rows={2}
            maxLength={500}
            className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 resize-none placeholder:text-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block" style={{ fontWeight: 600 }}>
            Prioridad
          </label>
          <div className="flex gap-1.5">
            {priorities.map(p => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={clsx(
                  'flex-1 py-1.5 rounded-lg text-xs border transition-all',
                  priority === p.value
                    ? `${p.bg} ${p.color} ring-2 ring-offset-1 ring-violet-400/30`
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                )}
                style={{ fontWeight: priority === p.value ? 600 : 400 }}
              >
                P{p.value} {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">
          {name.trim().length > 0 ? `"${name.trim()}"` : 'Selecciona texto'}
        </span>
        <button
          onClick={handleCreate}
          disabled={createMutation.isPending || !name.trim()}
          className={clsx(
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs transition-all',
            createMutation.isPending || !name.trim()
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm active:scale-[0.97]'
          )}
          style={{ fontWeight: 600 }}
        >
          {createMutation.isPending ? (
            <><Loader2 size={12} className="animate-spin" /> Creando...</>
          ) : (
            <><Tag size={12} /> Crear</>
          )}
        </button>
      </div>
    </motion.div>,
    document.body
  );
}

// ── Floating Selection Button ─────────────────────────────
interface FloatingButtonProps {
  position: { top: number; left: number };
  onClick: () => void;
}

function FloatingButton({ position, onClick }: FloatingButtonProps) {
  return createPortal(
    <motion.button
      initial={{ opacity: 0, scale: 0.9, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 4 }}
      transition={{ duration: 0.1 }}
      onClick={onClick}
      className="fixed z-[55] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white shadow-lg shadow-violet-600/25 text-xs hover:bg-violet-700 active:scale-95 transition-all cursor-pointer"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        fontWeight: 600,
      }}
      title="Crear keyword desde seleccion"
    >
      <Tag size={12} />
      Keyword
    </motion.button>,
    document.body
  );
}

// ── Main Component (wrapper mode) ─────────────────────────

interface QuickKeywordCreatorProps {
  summaryId: string;
  children: React.ReactNode;
  /** Called after a keyword is created (to refresh KeywordsManager) */
  onKeywordCreated?: () => void;
}

export function QuickKeywordCreator({
  summaryId,
  children,
  onKeywordCreated,
}: QuickKeywordCreatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState('');
  const [buttonPos, setButtonPos] = useState<{ top: number; left: number } | null>(null);
  const [formPos, setFormPos] = useState<{ top: number; left: number } | null>(null);
  const [showForm, setShowForm] = useState(false);

  // ── Detect text selection ───────────────────────────────
  const handleMouseUp = useCallback(() => {
    // Small delay to let browser finish selection
    requestAnimationFrame(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !containerRef.current) {
        setButtonPos(null);
        setSelectedText('');
        return;
      }

      // Check selection is within our container
      const range = sel.getRangeAt(0);
      if (!containerRef.current.contains(range.commonAncestorContainer)) {
        setButtonPos(null);
        setSelectedText('');
        return;
      }

      const text = sel.toString().trim();
      if (!text || text.length < 2 || text.length > 100) {
        setButtonPos(null);
        setSelectedText('');
        return;
      }

      // Position button above selection
      const rect = range.getBoundingClientRect();
      setSelectedText(text);
      setButtonPos({
        top: rect.top - 40 + window.scrollY,
        left: rect.left + rect.width / 2 - 45,
      });
    });
  }, []);

  // ── Listen for selection changes ────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mouseup', handleMouseUp);

    // Also handle keyboard selection
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.shiftKey) handleMouseUp();
    };
    container.addEventListener('keyup', handleKeyUp);

    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleMouseUp]);

  // ── Hide button on click outside ────────────────────────
  useEffect(() => {
    if (!buttonPos) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setButtonPos(null);
        setSelectedText('');
      }
    };
    // Delay to not interfere with button click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [buttonPos]);

  // ── Open form from button ───────────────────────────────
  const handleOpenForm = () => {
    if (!buttonPos) return;
    setFormPos({
      top: buttonPos.top + 44,
      left: buttonPos.left - 100,
    });
    setShowForm(true);
    setButtonPos(null);
    // Clear selection
    window.getSelection()?.removeAllRanges();
  };

  const handleFormClose = () => {
    setShowForm(false);
    setFormPos(null);
    setSelectedText('');
  };

  const handleCreated = (_name: string) => {
    // S-1: CreateForm uses useCreateKeywordMutation which auto-invalidates
    // the shared keyword cache. Legacy callback kept for parent coordination.
    onKeywordCreated?.();
  };

  return (
    <div ref={containerRef} className="relative">
      {children}

      <AnimatePresence>
        {buttonPos && selectedText && !showForm && (
          <FloatingButton
            key="float-btn"
            position={buttonPos}
            onClick={handleOpenForm}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && formPos && (
          <CreateForm
            key="create-form"
            initialName={selectedText}
            summaryId={summaryId}
            position={formPos}
            onClose={handleFormClose}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Controlled mode hook (for TipTap integration) ─────────

export interface QuickKeywordState {
  selectedText: string;
  formPosition: { top: number; left: number } | null;
  showForm: boolean;
}

/**
 * Hook for TipTap integration. Call triggerFromEditor() when the
 * toolbar keyword button is clicked with text selected.
 */
export function useQuickKeywordCreator() {
  const [state, setState] = useState<QuickKeywordState>({
    selectedText: '',
    formPosition: null,
    showForm: false,
  });

  const triggerFromEditor = useCallback((text: string, rect: DOMRect) => {
    setState({
      selectedText: text,
      formPosition: {
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + rect.width / 2 - 150,
      },
      showForm: true,
    });
  }, []);

  const close = useCallback(() => {
    setState({ selectedText: '', formPosition: null, showForm: false });
  }, []);

  return { state, triggerFromEditor, close };
}

/**
 * Standalone form portal for controlled mode (TipTap toolbar).
 */
export function QuickKeywordFormPortal({
  state,
  summaryId,
  onClose,
  onCreated,
  existingKeywordNames,
}: {
  state: QuickKeywordState;
  summaryId: string;
  onClose: () => void;
  onCreated?: () => void;
  existingKeywordNames?: string[];
}) {
  if (!state.showForm || !state.formPosition) return null;

  return (
    <AnimatePresence>
      <CreateForm
        initialName={state.selectedText}
        summaryId={summaryId}
        position={state.formPosition}
        onClose={onClose}
        onCreated={(name) => {
          onCreated?.();
        }}
        existingKeywordNames={existingKeywordNames}
      />
    </AnimatePresence>
  );
}