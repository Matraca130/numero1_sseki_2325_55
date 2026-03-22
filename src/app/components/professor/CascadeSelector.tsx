// ============================================================
// Axon — Reusable CascadeSelector Component
//
// Renders N collapsible selector levels (Course → Semester →
// Section → Topic → Summary, etc.) with AnimatePresence.
//
// Extracted from ProfessorQuizzesPage to DRY repeated blocks.
// Manages its own collapse state internally.
// ============================================================

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronDown, Loader2 } from 'lucide-react';

// ── Default select styles ─────────────────────────────────

const DEFAULT_SELECT_CLS =
  'w-full text-[12px] border border-gray-200 rounded-lg px-2.5 py-2 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all';

// ── Types ─────────────────────────────────────────────────

export interface CascadeLevelConfig {
  /** Unique key for collapse state (e.g. 'course', 'semester') */
  key: string;
  /** Display label (e.g. 'Curso', 'Semestre') */
  label: string;
  /** Icon element (e.g. <BookOpen size={12} />) */
  icon: React.ReactNode;
  /** Selectable items — must have id + name */
  items: ReadonlyArray<{ id: string; name: string }>;
  /** Currently selected value */
  selectedId: string;
  /** Change handler */
  onChange: (id: string) => void;
  /** Placeholder text for the select */
  placeholder: string;
  /** Text shown when items array is empty */
  emptyMessage: string;
  /** If true, shows a spinner instead of the select */
  loading?: boolean;
  /** Loading spinner text */
  loadingMessage?: string;
  /** Whether this level is visible (default: true) */
  visible?: boolean;
  /** Name displayed next to label when section is collapsed */
  selectedDisplayName?: string;
}

interface CascadeSelectorProps {
  levels: CascadeLevelConfig[];
  /** Override default select class */
  selectClassName?: string;
}

// ── Component ─────────────────────────────────────────────

export const CascadeSelector = React.memo(function CascadeSelector({
  levels,
  selectClassName,
}: CascadeSelectorProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const selectCls = selectClassName || DEFAULT_SELECT_CLS;

  const toggle = useCallback((key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <>
      {levels.map(level => {
        if (level.visible === false) return null;

        const isCollapsed = !!collapsed[level.key];

        return (
          <div key={level.key} className="border-b border-gray-100">
            {/* ── Toggle header ── */}
            <button
              onClick={() => toggle(level.key)}
              className="flex items-center gap-1.5 w-full py-2.5 px-1 text-left hover:bg-gray-50/50 transition-colors cursor-pointer"
            >
              {level.icon}
              <span className="text-[11px] text-gray-500 shrink-0" style={{ fontWeight: 600 }}>
                {level.label}
              </span>
              {level.selectedDisplayName && isCollapsed && (
                <span
                  className="text-[10px] text-teal-600 truncate ml-1 max-w-[130px]"
                  style={{ fontWeight: 500 }}
                >
                  — {level.selectedDisplayName}
                </span>
              )}
              <div className="flex-1" />
              {isCollapsed
                ? <ChevronRight size={12} className="text-gray-400 shrink-0" />
                : <ChevronDown size={12} className="text-gray-400 shrink-0" />
              }
            </button>

            {/* ── Collapsible content ── */}
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="pb-2.5 px-1">
                    {level.loading ? (
                      <div className="flex items-center gap-2 px-2 py-2">
                        <Loader2 size={13} className="animate-spin text-gray-400" />
                        <span className="text-[11px] text-gray-400">
                          {level.loadingMessage || 'Cargando...'}
                        </span>
                      </div>
                    ) : level.items.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic px-1">
                        {level.emptyMessage}
                      </p>
                    ) : (
                      <select
                        value={level.selectedId}
                        onChange={e => level.onChange(e.target.value)}
                        className={selectCls}
                      >
                        <option value="">{level.placeholder}</option>
                        {level.items.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </>
  );
});
