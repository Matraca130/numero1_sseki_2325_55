// ============================================================
// Axon — Professor 3D Management Page
//
// Two-panel layout:
//   Left:  Content tree (courses > semesters > sections > topics)
//   Right: ModelManager for selected topic, or empty state
//
// Route: /professor/3d
// ============================================================

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useContentTree } from '@/app/context/ContentTreeContext';
import {
  Box, ChevronRight, ChevronDown, FolderOpen, FileText,
  Loader2, AlertTriangle, Plus,
} from 'lucide-react';
import { ModelManager } from '@/app/components/professor/ModelManager';
import { motion, AnimatePresence } from 'motion/react';

// ── Types ──
interface SelectedTopic {
  id: string;
  name: string;
}

// ══════════════════════════════════════════════
// ── Professor3DPage ──
// ══════════════════════════════════════════════

export function Professor3DPage() {
  const { tree, loading, error } = useContentTree();
  const [selectedTopic, setSelectedTopic] = useState<SelectedTopic | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedSemesters, setExpandedSemesters] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSet = (set: Set<string>, id: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#2a8c7a] animate-spin" />
          <span className="text-gray-400 text-sm">Cargando árbol de contenido...</span>
        </div>
      </div>
    );
  }

  const courses = tree?.courses || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#e6f5f1] flex items-center justify-center">
            <Box className="w-5 h-5 text-[#2a8c7a]" />
          </div>
          <div>
            <h1 className="text-xl text-gray-900">Gestión de Modelos 3D</h1>
            <p className="text-sm text-gray-500">Selecciona un tema para administrar sus modelos anatómicos</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — Content Tree */}
        <div className="w-80 bg-white border-r border-slate-200 overflow-y-auto flex-shrink-0">
          <div className="p-4">
            <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-3">Árbol de Contenido</h3>

            {courses.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No hay cursos disponibles</p>
                {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
              </div>
            ) : (
              <div className="space-y-1">
                {courses.map(course => (
                  <div key={course.id}>
                    {/* Course */}
                    <button
                      onClick={() => toggleSet(expandedCourses, course.id, setExpandedCourses)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors"
                    >
                      {expandedCourses.has(course.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="text-sm text-gray-700 truncate">{course.name}</span>
                    </button>

                    {/* Semesters */}
                    {expandedCourses.has(course.id) && course.semesters?.map(semester => (
                      <div key={semester.id} className="ml-4">
                        <button
                          onClick={() => toggleSet(expandedSemesters, semester.id, setExpandedSemesters)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-left transition-colors"
                        >
                          {expandedSemesters.has(semester.id) ? (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          )}
                          <span className="text-xs text-gray-500 truncate">{semester.name}</span>
                        </button>

                        {/* Sections */}
                        {expandedSemesters.has(semester.id) && semester.sections?.map(section => (
                          <div key={section.id} className="ml-4">
                            <button
                              onClick={() => toggleSet(expandedSections, section.id, setExpandedSections)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-left transition-colors"
                            >
                              {expandedSections.has(section.id) ? (
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              )}
                              <span className="text-xs text-gray-600 truncate">{section.name}</span>
                            </button>

                            {/* Topics */}
                            {expandedSections.has(section.id) && section.topics?.map(topic => (
                              <button
                                key={topic.id}
                                onClick={() => setSelectedTopic({ id: topic.id, name: topic.name })}
                                className={`w-full ml-4 flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors ${
                                  selectedTopic?.id === topic.id
                                    ? 'bg-[#e6f5f1] text-[#2a8c7a]'
                                    : 'hover:bg-gray-50 text-gray-500'
                                }`}
                              >
                                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="text-xs truncate">{topic.name}</span>
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — Model Manager or Empty */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {selectedTopic ? (
              <motion.div
                key={selectedTopic.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="p-6"
              >
                <ModelManager topicId={selectedTopic.id} topicName={selectedTopic.name} />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex items-center justify-center min-h-[60vh]"
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Box className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg text-gray-600 mb-1">Selecciona un tema</h3>
                  <p className="text-sm text-gray-400 max-w-xs">
                    Usa el árbol de contenido a la izquierda para elegir un tema y gestionar sus modelos 3D
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default Professor3DPage;