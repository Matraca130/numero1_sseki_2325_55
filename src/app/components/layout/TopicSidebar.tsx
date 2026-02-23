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
} from 'lucide-react';
import clsx from 'clsx';
import { headingStyle } from '@/app/design-system';

export function TopicSidebar() {
  const { currentTopic, setCurrentTopic, setSidebarOpen } = useApp();
  const { navigateTo } = useStudentNav();
  const { tree, loading, selectedTopicId, selectTopic } = useContentTree();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

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
    navigateTo('study');
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
            <span className="text-sm" style={headingStyle}>Voltar aos temas</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-xs text-gray-400 text-center">Nenhum conteudo disponivel</p>
        </div>
      </div>
    );
  }

  const activeTopicId = selectedTopicId || currentTopic?.id;

  return (
    <div className="w-[240px] shrink-0 h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Back button */}
      <div className="px-3 pt-3 pb-1 border-b border-gray-100">
        <button
          onClick={() => { setSidebarOpen(false); navigateTo('study-hub'); }}
          className="flex items-center gap-2 px-2 py-2 w-full rounded-lg text-teal-700 hover:text-teal-800 hover:bg-teal-50 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 text-teal-500 group-hover:text-teal-700 transition-colors" />
          <span className="text-sm" style={headingStyle}>Voltar aos temas</span>
        </button>
      </div>

      {/* Scrollable tree */}
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {(tree?.courses || []).map(course => (
          <div key={course.id}>
            {/* Course header */}
            <button
              onClick={() => toggleNode(course.id)}
              className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
            >
              <BookOpen size={13} className="text-teal-500 shrink-0" />
              <span className="text-xs text-gray-700 truncate flex-1">{course.name}</span>
              {expandedSections.has(course.id) ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
            </button>

            <AnimatePresence initial={false}>
              {expandedSections.has(course.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  {(course.semesters || []).map(semester => (
                    <div key={semester.id}>
                      {/* Semester header */}
                      <button
                        onClick={() => toggleNode(semester.id)}
                        className="w-full flex items-center gap-2 pl-7 pr-4 py-1.5 text-left hover:bg-gray-50 transition-colors"
                      >
                        <GraduationCap size={12} className="text-blue-400 shrink-0" />
                        <span className="text-xs text-gray-600 truncate flex-1">{semester.name}</span>
                        {expandedSections.has(semester.id) ? <ChevronUp size={11} className="text-gray-400" /> : <ChevronDown size={11} className="text-gray-400" />}
                      </button>

                      <AnimatePresence initial={false}>
                        {expandedSections.has(semester.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                          >
                            {(semester.sections || []).map(section => {
                              const hasActiveTopic = (section.topics || []).some(t => t.id === activeTopicId);
                              return (
                                <div key={section.id}>
                                  {/* Section header */}
                                  <button
                                    onClick={() => toggleNode(section.id)}
                                    className="w-full flex items-center gap-2 pl-10 pr-4 py-1.5 text-left hover:bg-gray-50 transition-colors"
                                  >
                                    <FolderOpen size={12} className="text-emerald-400 shrink-0" />
                                    <span className={clsx(
                                      "text-xs truncate flex-1",
                                      hasActiveTopic ? "text-gray-900" : "text-gray-600"
                                    )}>
                                      {section.name}
                                    </span>
                                    {expandedSections.has(section.id) ? <ChevronUp size={11} className="text-gray-400" /> : <ChevronDown size={11} className="text-gray-400" />}
                                  </button>

                                  <AnimatePresence initial={false}>
                                    {expandedSections.has(section.id) && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="relative ml-10 border-l-2 border-blue-400/30">
                                          {(section.topics || []).map(topic => {
                                            const isActive = activeTopicId === topic.id;
                                            return (
                                              <button
                                                key={topic.id}
                                                onClick={() => handleTopicClick(topic.id, topic.name)}
                                                className={clsx(
                                                  "w-full text-left pl-4 pr-3 py-1.5 text-xs transition-colors flex items-center gap-1.5",
                                                  isActive
                                                    ? "text-blue-600 bg-blue-50/60"
                                                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                                                )}
                                              >
                                                <FileText size={11} className={isActive ? "text-blue-500" : "text-gray-400"} />
                                                <span className="line-clamp-2">{topic.name}</span>
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
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}