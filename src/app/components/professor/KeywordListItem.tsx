// ============================================================
// Axon — KeywordListItem (Professor: single keyword row)
//
// Extracted from KeywordsManager.tsx (Issue #29).
// Renders one keyword row with priority badge, 3 toggle buttons
// (subtopics, connections, notes), edit/delete actions (hover),
// and 3 AnimatePresence expandable panels.
//
// Sub-panels (SubtopicsPanel, KeywordConnectionsPanel,
// ProfessorNotesPanel) are NOT changed — imported as-is.
// ============================================================
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Edit3, Trash2, Tag,
  ChevronDown, ChevronUp, Link2, Layers, MessageSquare,
} from 'lucide-react';
import clsx from 'clsx';
import { SubtopicsPanel } from './SubtopicsPanel';
import { KeywordConnectionsPanel } from './KeywordConnectionsPanel';
import { ProfessorNotesPanel, ProfessorNotesBadge } from './ProfessorNotesPanel';
import { priorityLabels, type ExpandablePanel } from './keyword-manager-helpers';
import type { SummaryKeyword } from '@/app/services/summariesApi';

// ── Props ─────────────────────────────────────────────────
interface KeywordListItemProps {
  keyword: SummaryKeyword;
  summaryId: string;
  allKeywords: SummaryKeyword[];
  subtopicCount: number;
  noteCount: number;
  expandedPanel: ExpandablePanel | null;
  onTogglePanel: (panel: ExpandablePanel) => void;
  onEdit: () => void;
  onDelete: () => void;
}

// ── Component ─────────────────────────────────────────────
export function KeywordListItem({
  keyword: kw,
  summaryId,
  allKeywords,
  subtopicCount,
  noteCount,
  expandedPanel,
  onTogglePanel,
  onEdit,
  onDelete,
}: KeywordListItemProps) {
  const prio = priorityLabels[kw.priority] || priorityLabels[2];
  const isSubExpanded = expandedPanel === 'subtopics';
  const isConnExpanded = expandedPanel === 'connections';
  const isNotesExpanded = expandedPanel === 'notes';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border border-gray-100 rounded-lg overflow-hidden"
    >
      {/* Row */}
      <div className="flex items-center gap-3 px-4 py-2.5 group hover:bg-gray-50/50 transition-colors">
        <Tag size={13} className="text-violet-400 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-gray-800 truncate">{kw.name}</p>
            <ProfessorNotesBadge count={noteCount} />
          </div>
          {kw.definition && (
            <p className="text-[10px] text-gray-400 truncate mt-0.5">{kw.definition}</p>
          )}
        </div>

        {/* Priority badge */}
        <span className={clsx(
          "text-[10px] px-1.5 py-0.5 rounded-full shrink-0",
          prio.bg, prio.color
        )}>
          P{kw.priority} {prio.label}
        </span>

        {/* Subtopic count */}
        <button
          onClick={() => onTogglePanel('subtopics')}
          className={clsx(
            "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors shrink-0",
            isSubExpanded
              ? "bg-violet-100 text-violet-700"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          )}
          title="Subtemas"
        >
          <Layers size={10} />
          {subtopicCount}
          {isSubExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>

        {/* Connections toggle */}
        <button
          onClick={() => onTogglePanel('connections')}
          className={clsx(
            "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors shrink-0",
            isConnExpanded
              ? "bg-violet-100 text-violet-700"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          )}
          title="Conexiones"
        >
          <Link2 size={10} />
        </button>

        {/* Notes toggle */}
        <button
          onClick={() => onTogglePanel('notes')}
          className={clsx(
            "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors shrink-0",
            isNotesExpanded
              ? "bg-violet-100 text-violet-700"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          )}
          title="Notas"
        >
          <MessageSquare size={10} />
          {noteCount}
          {isNotesExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>

        {/* Edit */}
        <button
          onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          title="Editar"
        >
          <Edit3 size={13} className="text-gray-400 hover:text-violet-600" />
        </button>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          title="Eliminar"
        >
          <Trash2 size={13} className="text-gray-400 hover:text-red-600" />
        </button>
      </div>

      {/* Expanded: Subtopics */}
      <AnimatePresence>
        {isSubExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-50 bg-gray-50/30"
          >
            <SubtopicsPanel keywordId={kw.id} summaryId={summaryId} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded: Connections */}
      <AnimatePresence>
        {isConnExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-50 bg-gray-50/30"
          >
            <KeywordConnectionsPanel
              keywordId={kw.id}
              keywordName={kw.name}
              allKeywords={allKeywords}
              summaryId={summaryId}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded: Notes */}
      <AnimatePresence>
        {isNotesExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-50 bg-gray-50/30"
          >
            <ProfessorNotesPanel keywordId={kw.id} summaryId={summaryId} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
