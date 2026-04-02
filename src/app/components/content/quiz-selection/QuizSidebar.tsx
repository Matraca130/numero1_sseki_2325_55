/**
 * QuizSidebar — Tree navigation for quiz selection.
 * Course/semester tabs, sections, topics, and summary items.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  ChevronLeft, ChevronRight,
  Loader2, FileText, Layers,
} from 'lucide-react';
import type { Summary } from '@/app/types/platform';

// ── Sidebar summary item (memoized) ─────────────────────

export const SidebarSummaryItem = React.memo(function SidebarSummaryItem({
  summary, isActive, onSelect,
}: {
  summary: Summary;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={clsx(
        'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all',
        isActive ? 'bg-teal-500 text-white shadow-sm' : 'hover:bg-teal-50 text-zinc-600'
      )}
    >
      <FileText size={12} className={clsx('shrink-0', isActive ? 'text-teal-100' : 'text-zinc-400')} />
      <span className="text-[12px] truncate flex-1" style={{ fontWeight: isActive ? 600 : 400 }}>
        {summary.title || `Resumen ${summary.id.substring(0, 8)}`}
      </span>
      {isActive && <ChevronRight size={12} className="text-teal-200 shrink-0" />}
    </button>
  );
});

// ── Main Sidebar ─────────────────────────────────────────

interface QuizSidebarProps {
  tree: any;
  activeCourseIdx: number;
  activeSemesterIdx: number;
  expandedSections: Set<string>;
  expandedTopics: Set<string>;
  topicSummaries: Record<string, Summary[]>;
  loadingTopics: Set<string>;
  selectedSummary: Summary | null;
  onBack: () => void;
  onCourseChange: (idx: number) => void;
  onSemesterChange: (idx: number) => void;
  onToggleSection: (id: string) => void;
  onToggleTopic: (id: string) => void;
  onSelectSummary: (summary: Summary) => void;
}

export function QuizSidebar({
  tree, activeCourseIdx, activeSemesterIdx,
  expandedSections, expandedTopics, topicSummaries, loadingTopics,
  selectedSummary, onBack, onCourseChange, onSemesterChange,
  onToggleSection, onToggleTopic, onSelectSummary,
}: QuizSidebarProps) {
  const activeCourse = tree?.courses[activeCourseIdx] || null;
  const semesters = activeCourse?.semesters || [];
  const activeSemester = semesters[activeSemesterIdx] || null;

  return (
    <div className="w-[340px] shrink-0 bg-white border-r border-zinc-200 flex flex-col overflow-hidden">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-colors border-b border-zinc-100 shrink-0"
        style={{ fontWeight: 500 }}
      >
        <ChevronLeft size={14} />
        Volver al hub
      </button>

      {/* Sidebar Header */}
      <div className="px-4 pt-3 pb-2 border-b border-zinc-100 shrink-0">
        {tree.courses.length > 1 ? (
          <div className="mb-2">
            <select
              value={activeCourseIdx}
              onChange={(e) => onCourseChange(Number(e.target.value))}
              className="w-full text-[13px] text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all cursor-pointer"
              style={{ fontWeight: 600 }}
            >
              {tree.courses.map((c: any, idx: number) => (
                <option key={c.id} value={idx}>{c.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-[14px] text-zinc-900 truncate mb-2" style={{ fontWeight: 700 }}>
            {activeCourse?.name}
          </p>
        )}

        {/* Semester pills */}
        {semesters.length > 0 ? (
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {semesters.map((sem: any, idx: number) => {
              const isActive = activeSemesterIdx === idx;
              return (
                <button
                  key={sem.id}
                  onClick={() => onSemesterChange(idx)}
                  className={clsx(
                    'px-3 py-1 rounded-full text-[11px] whitespace-nowrap transition-all shrink-0',
                    isActive
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700'
                  )}
                  style={{ fontWeight: isActive ? 600 : 500 }}
                >
                  {sem.name}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-zinc-400 italic">Sin semestres</p>
        )}

        {activeSemester && (
          <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <Layers size={11} className="text-zinc-400" />
              {activeSemester.sections.length} secciones
            </span>
            <span className="flex items-center gap-1">
              <FileText size={11} className="text-zinc-400" />
              {activeSemester.sections.reduce((a: number, s: any) => a + s.topics.length, 0)} temas
            </span>
          </div>
        )}
      </div>

      {/* Tree navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-light">
        {activeSemester ? (
          <div className="py-2">
            {activeSemester.sections.map((section: any, secIdx: number) => {
              const isSectionExpanded = expandedSections.has(section.id);

              return (
                <div key={section.id} className={clsx(secIdx > 0 && 'mt-0.5')}>
                  <button
                    onClick={() => onToggleSection(section.id)}
                    className="w-full sticky top-0 z-10 bg-white/95 backdrop-blur-sm px-4 py-2 flex items-center gap-2 hover:bg-zinc-50/80 transition-colors text-left"
                  >
                    <ChevronRight size={13} className={clsx('shrink-0 transition-transform text-zinc-400', isSectionExpanded && 'rotate-90')} />
                    <Layers size={13} className="text-teal-500 shrink-0" />
                    <span className="text-[12px] text-zinc-700 truncate flex-1" style={{ fontWeight: 600 }}>{section.name}</span>
                    <span className="text-[10px] text-zinc-400 shrink-0 bg-zinc-100 px-1.5 py-0.5 rounded" style={{ fontWeight: 500 }}>{section.topics.length}</span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isSectionExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-2 pb-1.5">
                          {section.topics.length === 0 ? (
                            <p className="text-[11px] text-zinc-300 px-4 py-2 italic">Sin temas</p>
                          ) : (
                            section.topics.map((topic: any) => {
                              const isTopicExpanded = expandedTopics.has(topic.id);
                              const summaries = topicSummaries[topic.id] || [];
                              const isLoadingSummaries = loadingTopics.has(topic.id);
                              const hasSelectedChild = summaries.some(s => selectedSummary?.id === s.id);

                              return (
                                <div key={topic.id} className="mb-0.5">
                                  <button
                                    onClick={() => onToggleTopic(topic.id)}
                                    className={clsx(
                                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left',
                                      hasSelectedChild ? 'bg-teal-50/60' : isTopicExpanded ? 'bg-zinc-50' : 'hover:bg-zinc-50/80'
                                    )}
                                  >
                                    <ChevronRight size={11} className={clsx('shrink-0 transition-transform', isTopicExpanded ? 'rotate-90 text-teal-500' : 'text-zinc-300')} />
                                    <span className={clsx('text-[12px] truncate flex-1', hasSelectedChild ? 'text-teal-700' : 'text-zinc-600')} style={{ fontWeight: hasSelectedChild ? 600 : 500 }}>
                                      {topic.name}
                                    </span>
                                    {isLoadingSummaries && <Loader2 size={11} className="animate-spin text-zinc-300 shrink-0" />}
                                    {!isLoadingSummaries && summaries.length > 0 && (
                                      <span className={clsx('text-[10px] px-1.5 py-0.5 rounded shrink-0', hasSelectedChild ? 'bg-teal-100 text-teal-600' : 'bg-zinc-100 text-zinc-400')} style={{ fontWeight: 500 }}>
                                        {summaries.length}
                                      </span>
                                    )}
                                  </button>

                                  <AnimatePresence initial={false}>
                                    {isTopicExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.12, ease: 'easeInOut' }}
                                        className="overflow-hidden"
                                      >
                                        <div className="ml-5 mr-1 mt-0.5 mb-1 border-l-2 border-teal-100 pl-2.5">
                                          {isLoadingSummaries ? (
                                            <div className="flex items-center gap-1.5 py-2 px-1">
                                              <Loader2 size={11} className="animate-spin text-zinc-400" />
                                              <span className="text-[11px] text-zinc-400">Cargando resumenes...</span>
                                            </div>
                                          ) : summaries.length === 0 ? (
                                            <p className="text-[11px] text-zinc-300 py-2 px-1 italic">Sin resumenes disponibles</p>
                                          ) : (
                                            summaries.map((summary) => (
                                              <SidebarSummaryItem
                                                key={summary.id}
                                                summary={summary}
                                                isActive={selectedSummary?.id === summary.id}
                                                onSelect={() => onSelectSummary(summary)}
                                              />
                                            ))
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-300">
            <Layers size={24} className="mb-2 opacity-40" />
            <p className="text-[11px]">Sin semestres en este curso</p>
          </div>
        )}
      </div>
    </div>
  );
}
