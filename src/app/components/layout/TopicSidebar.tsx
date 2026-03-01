// ============================================================
// Axon — Topic Sidebar (Student area)
//
// Shows the content tree in read-only mode for navigation.
// Loads from ContentTreeContext (backend real data).
// Falls back to static courses.ts if backend tree is empty.
// ============================================================

import React, { useState, useEffect } from 'react';
import { useApp } from '@/app/context/AppContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronUp, ChevronDown, ArrowLeft, Loader2,
  BookOpen, GraduationCap, FolderOpen, FileText,
  PanelLeftClose, PanelLeftOpen,
  CheckCircle2, Clock, Circle, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { headingStyle } from '@/app/design-system';

export function TopicSidebar() {
  const { currentTopic, setCurrentTopic, setSidebarOpen } = useApp();
  const { navigateTo } = useStudentNav();
  const { tree, loading, selectedTopicId, selectTopic } = useContentTree();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [treeCollapsed, setTreeCollapsed] = useState(false);

  // Auto-expand everything when tree loads
  useEffect(() => {
    const courses = tree?.courses || [];
    if (!tree || courses.length === 0) return;
    const allIds = new Set<string>();
    for (const course of courses) {
      allIds.add(course.id);
      for (const semester of (course.semesters || [])) {
        allIds.add(semester.id);
        for (const section of (semester.sections || [])) {
          allIds.add(section.id);
        }
      }
    }
    setExpandedSections(allIds);
  }, [tree]);

  const toggleNode = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleTopicClick = (topicId: string, topicName: string) => {
    selectTopic(topicId);
    // Also set in AppContext for backward compat with StudyView
    setCurrentTopic({ id: topicId, title: topicName } as any);
    navigateTo('summaries');
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-[240px] shrink-0 h-full bg-white border-r border-gray-200 flex flex-col items-center justify-center">
        <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
        <p className="text-xs text-gray-400 mt-2">Cargando...</p>
      </div>
    );
  }

  // Empty or no tree — show minimal sidebar
  if (!tree || (tree?.courses || []).length === 0) {
    return (
      <div className="w-[240px] shrink-0 h-full bg-white border-r border-gray-200 flex flex-col">
        <div className="px-3 pt-3 pb-1 border-b border-gray-100">
          <button
            onClick={() => { setSidebarOpen(false); navigateTo('study-hub'); }}
            className="flex items-center gap-2 px-2 py-2 w-full rounded-lg text-teal-700 hover:text-teal-800 hover:bg-teal-50 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 text-teal-500 group-hover:text-teal-700 transition-colors" />
            <span className="text-sm" style={headingStyle}>Volver a los temas</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-xs text-gray-400 text-center">No hay contenido disponible</p>
        </div>
      </div>
    );
  }

  const activeTopicId = selectedTopicId || currentTopic?.id;

  // ── Collapsed state: thin strip with expand button ──
  if (treeCollapsed) {
    return (
      <motion.div
        initial={{ width: 240 }}
        animate={{ width: 48 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="shrink-0 h-full bg-white border-r border-gray-200 flex flex-col items-center py-3 gap-3 overflow-hidden"
      >
        <button
          onClick={() => setTreeCollapsed(false)}
          className="p-2 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
          title="Expandir navegacion"
        >
          <PanelLeftOpen size={18} />
        </button>
        <button
          onClick={() => { setSidebarOpen(false); navigateTo('study-hub'); }}
          className="p-2 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
          title="Volver a los temas"
        >
          <ArrowLeft size={18} />
        </button>
      </motion.div>
    );
  }

  // ── Expanded state: full sidebar ──
  return (
    <motion.div
      initial={{ width: 48 }}
      animate={{ width: 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="shrink-0 h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden"
    >
      {/* Back button + collapse toggle */}
      <div className="px-3 pt-3 pb-1 border-b border-gray-100 flex items-center justify-between">
        <button
          onClick={() => { setSidebarOpen(false); navigateTo('study-hub'); }}
          className="flex items-center gap-2 px-2 py-2 rounded-lg text-teal-700 hover:text-teal-800 hover:bg-teal-50 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 text-teal-500 group-hover:text-teal-700 transition-colors" />
          <span className="text-sm whitespace-nowrap" style={headingStyle}>Volver a los temas</span>
        </button>
        <button
          onClick={() => setTreeCollapsed(true)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
          title="Colapsar navegacion"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Scrollable tree */}
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {(tree?.courses || []).map(course => {
          const firstSemester = (course.semesters || [])[0];
          const allSections = (course.semesters || []).flatMap(s => s.sections || []);
          const allTopics = allSections.flatMap(s => s.topics || []);

          // Flat ordered topic IDs to derive status
          const allTopicIds = allTopics.map(t => t.id);
          const activeIndex = activeTopicId ? allTopicIds.indexOf(activeTopicId) : -1;

          const getTopicStatus = (topicId: string): 'completed' | 'current' | 'next' | 'new' | 'default' => {
            const idx = allTopicIds.indexOf(topicId);
            if (idx === -1) return 'default';
            if (activeIndex === -1) return idx === 0 ? 'next' : 'new';
            if (idx < activeIndex) return 'completed';
            if (idx === activeIndex) return 'current';
            if (idx === activeIndex + 1) return 'next';
            return 'new';
          };

          const getSectionProgress = (section: typeof allSections[0]): number => {
            if (activeIndex === -1) return 0;
            const sTopicIds = (section.topics || []).map(t => t.id);
            const completed = sTopicIds.filter(id => {
              const idx = allTopicIds.indexOf(id);
              return idx !== -1 && idx < activeIndex;
            }).length;
            const isCurrent = sTopicIds.some(id => allTopicIds.indexOf(id) === activeIndex);
            const total = sTopicIds.length;
            if (total === 0) return 0;
            return (completed + (isCurrent ? 0.5 : 0)) / total;
          };

          const completedTopics = activeIndex >= 0 ? activeIndex : 0;
          const courseProgress = allTopics.length > 0 ? completedTopics / allTopics.length : 0;
          const completedSections = allSections.filter(s => {
            const sTopicIds = (s.topics || []).map(t => t.id);
            return sTopicIds.length > 0 && sTopicIds.every(id => {
              const idx = allTopicIds.indexOf(id);
              return idx !== -1 && idx < activeIndex;
            });
          }).length;

          return (
            <div key={course.id} className="px-4">
              {/* ── Course card header ── */}
              <div className="pt-4 pb-4 border-b border-gray-100 mb-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <BookOpen size={18} className="text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] text-gray-900 truncate" style={{ fontWeight: 700 }}>
                      {course.name}
                    </p>
                    {firstSemester && (
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {firstSemester.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2.5">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(courseProgress * 100)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>

                {/* Stats line */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">
                    {completedSections}/{allSections.length} secciones
                  </span>
                  <span className="text-xs text-emerald-600" style={{ fontWeight: 800 }}>
                    {Math.round(courseProgress * 100)}%
                  </span>
                </div>
              </div>

              {/* ── Sections ── */}
              <div className="space-y-1">
                {allSections.map(section => {
                  const isExpanded = expandedSections.has(section.id);
                  const sectionProgress = getSectionProgress(section);
                  const hasActiveTopic = (section.topics || []).some(t => t.id === activeTopicId);

                  return (
                    <div key={section.id} className="mb-1">
                      {/* Section header */}
                      <button
                        onClick={() => toggleNode(section.id)}
                        className="w-full flex items-center gap-2 pr-1 py-3 text-left hover:bg-gray-50/60 rounded-md transition-colors"
                      >
                        <ChevronDown
                          size={14}
                          className={clsx(
                            "shrink-0 text-gray-400 transition-transform duration-150",
                            !isExpanded && "-rotate-90"
                          )}
                        />
                        <span className={clsx(
                          "text-[13px] truncate flex-1",
                          hasActiveTopic ? "text-gray-900" : "text-gray-700"
                        )} style={{ fontWeight: hasActiveTopic ? 700 : 500 }}>
                          {section.name}
                        </span>
                        <span className={clsx(
                          "text-xs shrink-0 tabular-nums ml-2",
                          sectionProgress >= 0.5 ? "text-emerald-600" : "text-gray-400"
                        )} style={{ fontWeight: 600 }}>
                          {Math.round(sectionProgress * 100)}%
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
                          >
                            <div className="pb-2 space-y-1">
                              {(section.topics || []).map(topic => {
                                const isActive = activeTopicId === topic.id;
                                const status = getTopicStatus(topic.id);

                                return (
                                  <button
                                    key={topic.id}
                                    onClick={() => handleTopicClick(topic.id, topic.name)}
                                    className={clsx(
                                      "w-full text-left pl-3 pr-2 py-2.5 text-xs transition-all flex items-center gap-2 rounded-lg",
                                      isActive
                                        ? "bg-emerald-50/80 text-emerald-800 shadow-sm"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                  >
                                    {/* Chevron prefix: ∨ if active, > otherwise */}
                                    <ChevronDown
                                      size={12}
                                      className={clsx(
                                        "shrink-0 transition-transform",
                                        isActive ? "text-emerald-500" : "text-gray-300 -rotate-90"
                                      )}
                                    />

                                    {/* Status icon */}
                                    {status === 'completed' ? (
                                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                    ) : status === 'current' || status === 'next' ? (
                                      <Clock size={16} className={clsx("shrink-0", isActive ? "text-emerald-600" : "text-teal-500")} />
                                    ) : (
                                      <Circle size={16} className="text-gray-300 shrink-0" />
                                    )}

                                    {/* Name */}
                                    <span
                                      className="truncate flex-1"
                                      style={{ fontWeight: isActive ? 700 : status === 'next' ? 600 : 400 }}
                                    >
                                      {topic.name}
                                    </span>

                                    {/* Badges */}
                                    {(isActive || (status === 'next' && !isActive)) && (
                                      <span
                                        className="text-[10px] bg-emerald-500 text-white px-2.5 py-0.5 rounded-md shrink-0"
                                        style={{ fontWeight: 700 }}
                                      >
                                        Siguiente
                                      </span>
                                    )}
                                    {status === 'new' && (
                                      <span
                                        className="text-[10px] bg-gray-200 text-gray-500 px-2.5 py-0.5 rounded-md shrink-0"
                                        style={{ fontWeight: 600 }}
                                      >
                                        Nuevo
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}