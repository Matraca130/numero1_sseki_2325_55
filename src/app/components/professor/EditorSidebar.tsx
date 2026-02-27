// ============================================================
// Axon — EditorSidebar (Professor: collapsible navigation)
//
// Collapsible sidebar for the full-page editor experience.
// Shows: Course/Semester dropdowns → Section → Topic → Summary tree.
// Click a summary to load it in the editor (no navigation).
//
// Width: ~220px open / ~40px collapsed.
// ============================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronRight, ChevronDown, ChevronLeft,
  FolderOpen, FileText, BookOpen,
  Loader2, PanelLeftClose, PanelLeftOpen,
  GraduationCap,
} from 'lucide-react';
import clsx from 'clsx';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import * as summariesApi from '@/app/services/summariesApi';
import type { Summary } from '@/app/services/summariesApi';
import type { ContentTree, TreeCourse, TreeSemester, TreeSection, TreeTopic } from '@/app/services/contentTreeApi';

// ── Helper ────────────────────────────────────────────────
function extractItems<T>(result: any): T[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

// ── Types ─────────────────────────────────────────────────
interface EditorSidebarProps {
  tree: ContentTree | null;
  loading: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** Currently active summary in the editor */
  activeSummaryId: string | null;
  /** Called when user clicks a summary in the tree */
  onSelectSummary: (summary: Summary, topicName: string) => void;
  /** Called when user wants to go back to curriculum view */
  onBackToCurriculum: () => void;
}

// ── Component ─────────────────────────────────────────────
export function EditorSidebar({
  tree,
  loading,
  collapsed,
  onToggleCollapse,
  activeSummaryId,
  onSelectSummary,
  onBackToCurriculum,
}: EditorSidebarProps) {
  // ── Course/Semester selection ────────────────────────────
  const courses = useMemo(() => tree?.courses || [], [tree]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');

  // Auto-select first course/semester
  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const semesters = selectedCourse?.semesters || [];

  useEffect(() => {
    if (semesters.length > 0 && !selectedSemesterId) {
      setSelectedSemesterId(semesters[0].id);
    }
  }, [semesters, selectedSemesterId]);

  // Reset semester when course changes
  useEffect(() => {
    if (selectedCourse) {
      const sems = selectedCourse.semesters || [];
      if (sems.length > 0 && !sems.find(s => s.id === selectedSemesterId)) {
        setSelectedSemesterId(sems[0].id);
      }
    }
  }, [selectedCourseId, selectedCourse, selectedSemesterId]);

  const selectedSemester = semesters.find(s => s.id === selectedSemesterId);
  const sections = selectedSemester?.sections || [];

  // ── Expanded state for tree nodes ───────────────────────
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // ── Summaries cache per topic ───────────────────────────
  const [summariesByTopic, setSummariesByTopic] = useState<Record<string, Summary[]>>({});
  const [loadingTopics, setLoadingTopics] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
        // Fetch summaries if not cached
        if (!summariesByTopic[topicId]) {
          fetchSummariesForTopic(topicId);
        }
      }
      return next;
    });
  };

  const fetchSummariesForTopic = useCallback(async (topicId: string) => {
    setLoadingTopics(prev => new Set(prev).add(topicId));
    try {
      const result = await summariesApi.getSummaries(topicId);
      const items = extractItems<Summary>(result)
        .filter(s => s.is_active)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      setSummariesByTopic(prev => ({ ...prev, [topicId]: items }));
    } catch {
      setSummariesByTopic(prev => ({ ...prev, [topicId]: [] }));
    } finally {
      setLoadingTopics(prev => {
        const next = new Set(prev);
        next.delete(topicId);
        return next;
      });
    }
  }, []);

  // Auto-expand to show the active summary
  useEffect(() => {
    if (!activeSummaryId) return;
    // Find which topic contains this summary
    for (const [topicId, sums] of Object.entries(summariesByTopic)) {
      if (sums.find(s => s.id === activeSummaryId)) {
        setExpandedTopics(prev => new Set(prev).add(topicId));
        // Find which section contains this topic
        for (const sec of sections) {
          if (sec.topics.find(t => t.id === topicId)) {
            setExpandedSections(prev => new Set(prev).add(sec.id));
            break;
          }
        }
        break;
      }
    }
  }, [activeSummaryId, summariesByTopic, sections]);

  // ── Collapsed view ──────────────────────────────────────
  if (collapsed) {
    return (
      <div className="w-[40px] bg-zinc-950 border-r border-white/[0.06] flex flex-col items-center py-2 shrink-0">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors mb-3"
          title="Expandir sidebar"
        >
          <PanelLeftOpen size={16} />
        </button>
        <button
          onClick={onBackToCurriculum}
          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors mb-3"
          title="Volver a Curriculum"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="w-px h-4 bg-white/[0.06] my-1" />
        {/* Mini section indicators */}
        {sections.map(sec => (
          <div
            key={sec.id}
            className="w-6 h-6 rounded flex items-center justify-center text-[9px] text-zinc-500 hover:bg-white/[0.06] cursor-default mt-1"
            title={sec.name}
          >
            {sec.name.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
    );
  }

  // ── Expanded view ───────────────────────────────────────
  return (
    <div className="w-[220px] bg-zinc-950 border-r border-white/[0.06] flex flex-col shrink-0 overflow-hidden">
      {/* Header: collapse + back */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/[0.06]">
        <button
          onClick={onBackToCurriculum}
          className="flex items-center gap-1 px-1.5 py-1 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          title="Volver a Curriculum"
        >
          <ChevronLeft size={12} />
          <span>Curriculum</span>
        </button>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors"
          title="Colapsar sidebar"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      {/* Course dropdown */}
      <div className="px-2 pt-2 pb-1">
        <Select value={selectedCourseId} onValueChange={(v) => { setSelectedCourseId(v); setSelectedSemesterId(''); }}>
          <SelectTrigger className="h-7 text-[11px] bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700">
            <SelectValue placeholder="Curso..." />
          </SelectTrigger>
          <SelectContent>
            {courses.map(c => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Semester dropdown */}
      <div className="px-2 pb-2">
        <Select value={selectedSemesterId} onValueChange={setSelectedSemesterId}>
          <SelectTrigger className="h-7 text-[11px] bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700">
            <SelectValue placeholder="Semestre..." />
          </SelectTrigger>
          <SelectContent>
            {semesters.map(s => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full h-px bg-white/[0.06]" />

      {/* Tree: Section → Topic → Summary */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-zinc-600" />
          </div>
        ) : sections.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <GraduationCap size={20} className="text-zinc-700 mx-auto mb-2" />
            <p className="text-[10px] text-zinc-600">
              {!selectedCourseId ? 'Selecciona un curso' :
               !selectedSemesterId ? 'Selecciona un semestre' :
               'Sin secciones'}
            </p>
          </div>
        ) : (
          sections.map(section => (
            <SectionNode
              key={section.id}
              section={section}
              expanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              expandedTopics={expandedTopics}
              onToggleTopic={toggleTopic}
              summariesByTopic={summariesByTopic}
              loadingTopics={loadingTopics}
              activeSummaryId={activeSummaryId}
              onSelectSummary={onSelectSummary}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Section Node ──────────────────────────────────────────
function SectionNode({
  section,
  expanded,
  onToggle,
  expandedTopics,
  onToggleTopic,
  summariesByTopic,
  loadingTopics,
  activeSummaryId,
  onSelectSummary,
}: {
  section: TreeSection;
  expanded: boolean;
  onToggle: () => void;
  expandedTopics: Set<string>;
  onToggleTopic: (id: string) => void;
  summariesByTopic: Record<string, Summary[]>;
  loadingTopics: Set<string>;
  activeSummaryId: string | null;
  onSelectSummary: (summary: Summary, topicName: string) => void;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left hover:bg-white/[0.04] transition-colors group"
      >
        {expanded ? (
          <ChevronDown size={11} className="text-zinc-600 shrink-0" />
        ) : (
          <ChevronRight size={11} className="text-zinc-600 shrink-0" />
        )}
        <FolderOpen size={12} className="text-amber-500/70 shrink-0" />
        <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 truncate">
          {section.name}
        </span>
        <span className="text-[9px] text-zinc-700 ml-auto shrink-0">
          {section.topics.length}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {section.topics.length === 0 ? (
              <div className="pl-8 pr-2 py-1">
                <span className="text-[10px] text-zinc-700">Sin temas</span>
              </div>
            ) : (
              section.topics.map(topic => (
                <TopicNode
                  key={topic.id}
                  topic={topic}
                  expanded={expandedTopics.has(topic.id)}
                  onToggle={() => onToggleTopic(topic.id)}
                  summaries={summariesByTopic[topic.id]}
                  isLoading={loadingTopics.has(topic.id)}
                  activeSummaryId={activeSummaryId}
                  onSelectSummary={onSelectSummary}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Topic Node ────────────────────────────────────────────
function TopicNode({
  topic,
  expanded,
  onToggle,
  summaries,
  isLoading,
  activeSummaryId,
  onSelectSummary,
}: {
  topic: TreeTopic;
  expanded: boolean;
  onToggle: () => void;
  summaries?: Summary[];
  isLoading: boolean;
  activeSummaryId: string | null;
  onSelectSummary: (summary: Summary, topicName: string) => void;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 pl-6 pr-2.5 py-1.5 text-left hover:bg-white/[0.04] transition-colors group"
      >
        {expanded ? (
          <ChevronDown size={10} className="text-zinc-600 shrink-0" />
        ) : (
          <ChevronRight size={10} className="text-zinc-600 shrink-0" />
        )}
        <BookOpen size={11} className="text-teal-500/70 shrink-0" />
        <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 truncate">
          {topic.name}
        </span>
        {isLoading && (
          <Loader2 size={9} className="animate-spin text-zinc-600 ml-auto shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="overflow-hidden"
          >
            {isLoading ? (
              <div className="pl-10 pr-2 py-1.5">
                <span className="text-[10px] text-zinc-700">Cargando...</span>
              </div>
            ) : !summaries || summaries.length === 0 ? (
              <div className="pl-10 pr-2 py-1.5">
                <span className="text-[10px] text-zinc-700">Sin resumenes</span>
              </div>
            ) : (
              summaries.map(s => (
                <button
                  key={s.id}
                  onClick={() => onSelectSummary(s, topic.name)}
                  className={clsx(
                    'w-full flex items-center gap-1.5 pl-10 pr-2.5 py-1.5 text-left transition-colors group/summary',
                    s.id === activeSummaryId
                      ? 'bg-violet-500/15 text-violet-300'
                      : 'hover:bg-white/[0.04] text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  <FileText size={10} className={clsx(
                    'shrink-0',
                    s.id === activeSummaryId ? 'text-violet-400' : 'text-zinc-600'
                  )} />
                  <span className="text-[10px] truncate">
                    {s.title || 'Sin titulo'}
                  </span>
                  <span className={clsx(
                    'text-[8px] px-1 py-0.5 rounded ml-auto shrink-0',
                    s.status === 'published'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-400'
                  )}>
                    {s.status === 'published' ? 'P' : 'B'}
                  </span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
