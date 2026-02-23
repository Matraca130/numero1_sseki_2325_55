// ============================================================
// Axon — Professor: Curriculum Page
// Full content tree with CRUD for courses, semesters, sections, topics.
// Uses ContentTreeContext for data + ContentTree for UI.
// PARALLEL-SAFE: This file is independent. Edit freely.
// ============================================================
import React, { useState } from 'react';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { ContentTree } from '@/app/components/shared/ContentTree';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { ListTree, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { TopicDetailPanel } from './TopicDetailPanel';

export function ProfessorCurriculumPage() {
  const {
    tree, loading, error, selectedTopicId, canEdit,
    refresh, selectTopic,
    addCourse, editCourse, removeCourse,
    addSemester, editSemester, removeSemester,
    addSection, editSection, removeSection,
    addTopic, editTopic, removeTopic,
  } = useContentTree();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      toast.success('Contenido actualizado');
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setRefreshing(false);
    }
  };

  // Wrap CRUD with toast feedback
  const wrap = (fn: (...args: any[]) => Promise<void>, successMsg: string) =>
    async (...args: any[]) => {
      try {
        await fn(...args);
        toast.success(successMsg);
      } catch (err: any) {
        toast.error(err.message || 'Error en la operacion');
        throw err;
      }
    };

  // Find selected topic name from tree for the detail panel
  let selectedTopicName = '';
  if (tree && selectedTopicId) {
    const courses = tree?.courses || [];
    outer:
    for (const c of courses) {
      for (const s of (c.semesters || [])) {
        for (const sec of (s.sections || [])) {
          for (const t of (sec.topics || [])) {
            if (t.id === selectedTopicId) {
              selectedTopicName = t.name;
              break outer;
            }
          }
        }
      }
    }
  }

  // Count stats
  const stats = React.useMemo(() => {
    const courses = tree?.courses || [];
    if (courses.length === 0) return { courses: 0, semesters: 0, sections: 0, topics: 0 };
    let semesters = 0, sections = 0, topics = 0;
    for (const c of courses) {
      const sems = c.semesters || [];
      semesters += sems.length;
      for (const s of sems) {
        const secs = s.sections || [];
        sections += secs.length;
        for (const sec of secs) {
          topics += (sec.topics || []).length;
        }
      }
    }
    return { courses: courses.length, semesters, sections, topics };
  }, [tree]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <Toaster position="top-right" richColors />

      {/* Page Header */}
      <div className="px-6 pt-6 pb-0">
        <PageHeader
          icon={<ListTree size={20} />}
          title="Curriculum"
          subtitle="Administra la estructura de cursos, semestres, secciones y topicos"
          accent="purple"
          actions={
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              Actualizar
            </button>
          }
        />
      </div>

      {/* Stats bar */}
      {!loading && tree && (tree?.courses || []).length > 0 && (
        <div className="px-6 py-3 border-b border-gray-100 bg-white flex items-center gap-6">
          {[
            { label: 'Cursos', value: stats.courses, color: 'text-violet-600' },
            { label: 'Semestres', value: stats.semesters, color: 'text-blue-600' },
            { label: 'Secciones', value: stats.sections, color: 'text-emerald-600' },
            { label: 'Topicos', value: stats.topics, color: 'text-gray-600' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className={`text-sm font-semibold ${s.color}`}>{s.value}</span>
              <span className="text-xs text-gray-400">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main content: tree + detail panel */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Content Tree (dark panel) */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-[340px] shrink-0 bg-zinc-950 border-r border-white/[0.06] flex flex-col overflow-hidden"
        >
          <ContentTree
            tree={tree}
            loading={loading}
            error={error}
            editable={canEdit}
            selectedTopicId={selectedTopicId}
            onSelectTopic={(id) => selectTopic(id)}
            onRefresh={refresh}
            onAddCourse={wrap(addCourse, 'Curso creado')}
            onEditCourse={wrap(editCourse, 'Curso actualizado')}
            onDeleteCourse={wrap(removeCourse, 'Curso eliminado')}
            onAddSemester={wrap(addSemester, 'Semestre creado')}
            onEditSemester={wrap(editSemester, 'Semestre actualizado')}
            onDeleteSemester={wrap(removeSemester, 'Semestre eliminado')}
            onAddSection={wrap(addSection, 'Seccion creada')}
            onEditSection={wrap(editSection, 'Seccion actualizada')}
            onDeleteSection={wrap(removeSection, 'Seccion eliminada')}
            onAddTopic={wrap(addTopic, 'Topico creado')}
            onEditTopic={wrap(editTopic, 'Topico actualizado')}
            onDeleteTopic={wrap(removeTopic, 'Topico eliminado')}
          />
        </motion.div>

        {/* Right: Detail panel */}
        <div className="flex-1 overflow-y-auto">
          {selectedTopicId ? (
            <TopicDetailPanel
              key={selectedTopicId}
              topicId={selectedTopicId}
              topicName={selectedTopicName}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <ListTree size={28} className="text-gray-300" />
                </div>
                <p className="text-gray-400 text-sm">Selecciona un topico del arbol</p>
                <p className="text-gray-300 text-xs mt-1">para ver y editar su contenido</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}