// ============================================================
// SidebarTree — Section → Topic tree with expand/collapse
//
// Renders a flat list of sections, each with expandable topics.
// Uses SidebarNode internally for consistent node rendering.
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { StatusIcon } from './StatusIcon';
import { NodeBadge } from './NodeBadge';
import type { SidebarSection, SidebarTopic } from './types';
import type { TopicProgress } from '@/app/hooks/useTopicProgress';
import { sectionProgressPct } from './utils';

// ── Section Node ─────────────────────────────────────────

interface SectionNodeProps {
  section: SidebarSection;
  isExpanded: boolean;
  activeTopicId: string | null;
  progressPct: number;
  onToggle: (id: string) => void;
  onSelectTopic: (topicId: string, topicName: string) => void;
}

function SectionNode({
  section,
  isExpanded,
  activeTopicId,
  progressPct,
  onToggle,
  onSelectTopic,
}: SectionNodeProps) {
  return (
    <div className="mb-0.5">
      {/* Section row */}
      <button
        onClick={() => onToggle(section.id)}
        className={clsx(
          'w-full flex items-center gap-1.5 px-2 py-2 rounded-lg text-left transition-colors',
          'hover:bg-zinc-50 text-zinc-700',
        )}
        role="treeitem"
        aria-expanded={isExpanded}
      >
        <motion.span
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="shrink-0"
        >
          <ChevronRight size={14} className="text-zinc-400" />
        </motion.span>
        <span className="flex-1 text-[13px] font-medium truncate">
          {section.name}
        </span>
        <span className="text-[11px] font-semibold text-zinc-500 shrink-0 tabular-nums">
          {progressPct}%
        </span>
      </button>

      {/* Topics */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
            role="group"
          >
            <div className="ml-3 pl-3 border-l border-zinc-100">
              {section.topics.map(topic => (
                <TopicNode
                  key={topic.id}
                  topic={topic}
                  isActive={activeTopicId === topic.id}
                  onSelect={onSelectTopic}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Topic Node ───────────────────────────────────────────

interface TopicNodeProps {
  topic: SidebarTopic;
  isActive: boolean;
  onSelect: (topicId: string, topicName: string) => void;
}

function TopicNode({ topic, isActive, onSelect }: TopicNodeProps) {
  const ref = useRef<HTMLButtonElement>(null);

  // Scroll into view when active
  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isActive]);

  return (
    <button
      ref={ref}
      onClick={() => onSelect(topic.id, topic.name)}
      className={clsx(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors my-0.5',
        isActive
          ? 'bg-teal-100 text-teal-800 border border-teal-300'
          : 'hover:bg-zinc-50 text-zinc-600',
      )}
      role="treeitem"
      aria-selected={isActive}
    >
      <StatusIcon
        status={topic.status}
        size={15}
      />
      <span
        className={clsx(
          'flex-1 text-[12px] truncate',
          isActive && 'font-medium',
          topic.status === 'mastered' && 'line-through text-zinc-500',
        )}
      >
        {topic.name}
      </span>
      <NodeBadge status={topic.status} isNext={topic.isNext} />
    </button>
  );
}

// ── Main Tree ────────────────────────────────────────────

interface SidebarTreeProps {
  sections: SidebarSection[];
  activeTopicId: string | null;
  progressMap: Map<string, TopicProgress>;
  onSelectTopic: (topicId: string, topicName: string) => void;
}

export function SidebarTree({ sections, activeTopicId, progressMap, onSelectTopic }: SidebarTreeProps) {
  // Expand state: start with the section containing the active topic expanded,
  // or the first section if none is active
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (activeTopicId) {
      const sec = sections.find(s => s.topics.some(t => t.id === activeTopicId));
      if (sec) initial.add(sec.id);
    } else if (sections.length > 0) {
      initial.add(sections[0].id);
    }
    return initial;
  });

  // Auto-expand when active topic changes to a section that's collapsed
  useEffect(() => {
    if (!activeTopicId) return;
    const sec = sections.find(s => s.topics.some(t => t.id === activeTopicId));
    if (sec && !expandedIds.has(sec.id)) {
      setExpandedIds(prev => new Set(prev).add(sec.id));
    }
  }, [activeTopicId, sections]); // intentionally excluding expandedIds to avoid loop

  const toggleSection = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (sections.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-8 text-zinc-400">
        <Sparkles size={24} className="mb-2" />
        <p className="text-xs">Sin secciones disponibles</p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto py-2 px-2 scrollbar-thin"
      role="tree"
      aria-label="Contenido del curso"
    >
      {sections.map(section => (
        <SectionNode
          key={section.id}
          section={section}
          isExpanded={expandedIds.has(section.id)}
          activeTopicId={activeTopicId}
          progressPct={sectionProgressPct(section.topics, progressMap)}
          onToggle={toggleSection}
          onSelectTopic={onSelectTopic}
        />
      ))}
    </div>
  );
}