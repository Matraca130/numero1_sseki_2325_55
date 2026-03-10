// ============================================================
// Axon — Reusable CascadeSelector Component
//
// Renders N collapsible selector levels with AnimatePresence.
// Extracted from ProfessorQuizzesPage to DRY repeated blocks.
// ============================================================

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronDown, Loader2 } from 'lucide-react';

const DEFAULT_SELECT_CLS =
  'w-full text-[12px] border border-gray-200 rounded-lg px-2.5 py-2 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all';

export interface CascadeLevelConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  items: ReadonlyArray<{ id: string; name: string }>;
  selectedId: string;
  onChange: (id: string) => void;
  placeholder: string;
  emptyMessage: string;
  loading?: boolean;
  loadingMessage?: string;
  visible?: boolean;
  selectedDisplayName?: string;
}

interface CascadeSelectorProps {
  levels: CascadeLevelConfig[];
  selectClassName?: string;
}

export const CascadeSelector = React.memo(function CascadeSelector({
  levels, selectClassName,
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
            <button onClick={() => toggle(level.key)} className="flex items-center gap-1.5 w-full py-2.5 px-1 text-left hover:bg-gray-50/50 transition-colors cursor-pointer">
              {level.icon}
              <span className="text-[11px] text-gray-500 shrink-0" style={{ fontWeight: 600 }}>{level.label}</span>
              {level.selectedDisplayName && isCollapsed && (
                <span className="text-[10px] text-purple-600 truncate ml-1 max-w-[130px]" style={{ fontWeight: 500 }}>— {level.selectedDisplayName}</span>
              )}
              <div className="flex-1" />
              {isCollapsed ? <ChevronRight size={12} className="text-gray-400 shrink-0" /> : <ChevronDown size={12} className="text-gray-400 shrink-0" />}
            </button>
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }} className="overflow-hidden">
                  <div className="pb-2.5 px-1">
                    {level.loading ? (
                      <div className="flex items-center gap-2 px-2 py-2"><Loader2 size={13} className="animate-spin text-gray-400" /><span className="text-[11px] text-gray-400">{level.loadingMessage || 'Cargando...'}</span></div>
                    ) : level.items.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic px-1">{level.emptyMessage}</p>
                    ) : (
                      <select value={level.selectedId} onChange={e => level.onChange(e.target.value)} className={selectCls}>
                        <option value="">{level.placeholder}</option>
                        {level.items.map(item => (<option key={item.id} value={item.id}>{item.name}</option>))}
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
