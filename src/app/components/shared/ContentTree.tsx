// ============================================================
// Axon — Content Tree Component
//
// Expandable tree: Courses > Semesters > Sections > Topics
// Supports read-only (student) and editable (professor) modes.
//
// Used by:
//   - ProfessorCurriculumPage (editable, full page)
//   - TopicSidebar (read-only, narrow sidebar)
// ============================================================

import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronRight, ChevronDown, Plus, Pencil, Trash2,
  BookOpen, GraduationCap, FolderOpen, FileText,
  Loader2, AlertCircle, BookMarked, X, Check,
} from 'lucide-react';
import clsx from 'clsx';
import type {
  ContentTree as ContentTreeType,
  TreeCourse, TreeSemester, TreeSection, TreeTopic,
} from '@/app/services/contentTreeApi';

// ── Types ─────────────────────────────────────────────────

type NodeLevel = 'course' | 'semester' | 'section' | 'topic';

interface ContentTreeProps {
  tree: ContentTreeType | null;
  loading: boolean;
  error: string | null;
  editable?: boolean;
  selectedTopicId?: string | null;
  compact?: boolean; // narrow sidebar mode

  // Callbacks
  onSelectTopic?: (topicId: string, topicName: string) => void;
  onRefresh?: () => Promise<void>;

  // CRUD callbacks (only when editable)
  onAddCourse?: (name: string, description?: string) => Promise<void>;
  onEditCourse?: (id: string, name: string, description?: string) => Promise<void>;
  onDeleteCourse?: (id: string) => Promise<void>;
  onAddSemester?: (courseId: string, name: string) => Promise<void>;
  onEditSemester?: (id: string, name: string) => Promise<void>;
  onDeleteSemester?: (id: string) => Promise<void>;
  onAddSection?: (semesterId: string, name: string) => Promise<void>;
  onEditSection?: (id: string, name: string) => Promise<void>;
  onDeleteSection?: (id: string) => Promise<void>;
  onAddTopic?: (sectionId: string, name: string) => Promise<void>;
  onEditTopic?: (id: string, name: string) => Promise<void>;
  onDeleteTopic?: (id: string) => Promise<void>;
}

// ── Inline name editor ────────────────────────────────────

function InlineEditor({
  initialValue,
  placeholder,
  onSave,
  onCancel,
}: {
  initialValue: string;
  placeholder: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) onSave(value.trim());
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (value.trim()) onSave(value.trim()); else onCancel(); }}
        placeholder={placeholder}
        className="flex-1 min-w-0 px-2 py-1 bg-zinc-800 border border-violet-500/40 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
      />
      <button onClick={() => value.trim() && onSave(value.trim())} className="p-1 text-emerald-400 hover:text-emerald-300">
        <Check size={14} />
      </button>
      <button onClick={onCancel} className="p-1 text-zinc-500 hover:text-zinc-300">
        <X size={14} />
      </button>
    </div>
  );
}

// ── Action buttons (edit/delete/add child) ────────────────

function NodeActions({
  onEdit,
  onDelete,
  onAddChild,
  addLabel,
  compact,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onAddChild?: () => void;
  addLabel?: string;
  compact?: boolean;
}) {
  return (
    <div className={clsx("flex items-center gap-0.5 shrink-0", compact ? "opacity-0 group-hover/node:opacity-100" : "opacity-0 group-hover/node:opacity-100")} style={{ transition: 'opacity 0.15s' }}>
      {onAddChild && (
        <button
          onClick={e => { e.stopPropagation(); onAddChild(); }}
          title={addLabel}
          className="p-1 rounded text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
        >
          <Plus size={13} />
        </button>
      )}
      <button
        onClick={e => { e.stopPropagation(); onEdit(); }}
        title="Editar"
        className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
      >
        <Pencil size={12} />
      </button>
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        title="Eliminar"
        className="p-1 rounded text-red-500/60 hover:text-red-400 hover:bg-red-500/10"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────

export function ContentTree({
  tree, loading, error, editable = false, selectedTopicId, compact = false,
  onSelectTopic, onRefresh,
  onAddCourse, onEditCourse, onDeleteCourse,
  onAddSemester, onEditSemester, onDeleteSemester,
  onAddSection, onEditSection, onDeleteSection,
  onAddTopic, onEditTopic, onDeleteTopic,
}: ContentTreeProps) {
  // Expanded state: track which nodes are open
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState<{ type: 'edit' | 'add'; level: NodeLevel; id: string; parentId?: string; currentName?: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ level: NodeLevel; id: string; name: string } | null>(null);

  const toggle = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!tree) return;
    const courses = tree?.courses || [];
    const ids = new Set<string>();
    for (const c of courses) {
      ids.add(c.id);
      for (const s of (c.semesters || [])) {
        ids.add(s.id);
        for (const sec of (s.sections || [])) {
          ids.add(sec.id);
        }
      }
    }
    setExpanded(ids);
  }, [tree]);

  // Auto-expand all on first load
  React.useEffect(() => {
    if (tree && (tree?.courses || []).length > 0 && expanded.size === 0) {
      expandAll();
    }
  }, [tree, expandAll, expanded.size]);

  // ── CRUD handlers ──────────────────���──────────────────

  const handleSave = async (value: string) => {
    if (!editing) return;
    setActionLoading(true);
    try {
      if (editing.type === 'add') {
        switch (editing.level) {
          case 'course': await onAddCourse?.(value); break;
          case 'semester': await onAddSemester?.(editing.parentId!, value); break;
          case 'section': await onAddSection?.(editing.parentId!, value); break;
          case 'topic': await onAddTopic?.(editing.parentId!, value); break;
        }
      } else {
        switch (editing.level) {
          case 'course': await onEditCourse?.(editing.id, value); break;
          case 'semester': await onEditSemester?.(editing.id, value); break;
          case 'section': await onEditSection?.(editing.id, value); break;
          case 'topic': await onEditTopic?.(editing.id, value); break;
        }
      }
    } catch (err: any) {
      console.error(`[ContentTree] ${editing.type} ${editing.level} error:`, err);
    } finally {
      setEditing(null);
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(true);
    try {
      switch (confirmDelete.level) {
        case 'course': await onDeleteCourse?.(confirmDelete.id); break;
        case 'semester': await onDeleteSemester?.(confirmDelete.id); break;
        case 'section': await onDeleteSection?.(confirmDelete.id); break;
        case 'topic': await onDeleteTopic?.(confirmDelete.id); break;
      }
    } catch (err: any) {
      console.error(`[ContentTree] delete ${confirmDelete.level} error:`, err);
    } finally {
      setConfirmDelete(null);
      setActionLoading(false);
    }
  };

  // ── Loading state ─────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        <p className="text-sm text-zinc-500">Cargando contenido...</p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 px-4">
        <AlertCircle className="w-6 h-6 text-red-400" />
        <p className="text-sm text-red-300 text-center">{error}</p>
        {onRefresh && (
          <button onClick={onRefresh} className="text-xs text-violet-400 hover:text-violet-300 underline">
            Reintentar
          </button>
        )}
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────
  if (!tree || tree.courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 px-4">
        <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <BookMarked className="w-7 h-7 text-violet-400" />
        </div>
        <div className="text-center">
          <p className="text-sm text-zinc-300">No hay cursos aun</p>
          <p className="text-xs text-zinc-500 mt-1">
            {editable ? 'Crea el primer curso para empezar' : 'El profesor aun no ha creado contenido'}
          </p>
        </div>
        {editable && onAddCourse && (
          <button
            onClick={() => setEditing({ type: 'add', level: 'course', id: 'new' })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors"
          >
            <Plus size={16} />
            Crear primer curso
          </button>
        )}
        {editing?.level === 'course' && editing.type === 'add' && (
          <div className="w-full max-w-xs">
            <InlineEditor
              initialValue=""
              placeholder="Nombre del curso..."
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          </div>
        )}
      </div>
    );
  }

  // ── Delete confirmation ───────────────────────────────
  const deleteModal = confirmDelete && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setConfirmDelete(null)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-sm mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-white text-sm">Eliminar {confirmDelete.level}</h3>
        <p className="text-zinc-400 text-xs mt-2">
          Estas seguro de eliminar <span className="text-white">&ldquo;{confirmDelete.name}&rdquo;</span>?
          {confirmDelete.level !== 'topic' && ' Esto eliminara todo su contenido.'}
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={() => setConfirmDelete(null)}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={actionLoading}
            className="px-3 py-1.5 text-xs text-white bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            {actionLoading && <Loader2 size={12} className="animate-spin" />}
            Eliminar
          </button>
        </div>
      </motion.div>
    </div>
  );

  // ── Node indent based on depth ────────────────────────
  const depthPadding = (depth: number) => compact ? depth * 12 + 8 : depth * 16 + 12;

  const LEVEL_ICONS: Record<NodeLevel, React.ReactNode> = {
    course: <BookOpen size={compact ? 14 : 15} />,
    semester: <GraduationCap size={compact ? 13 : 14} />,
    section: <FolderOpen size={compact ? 13 : 14} />,
    topic: <FileText size={compact ? 12 : 13} />,
  };

  const LEVEL_COLORS: Record<NodeLevel, string> = {
    course: 'text-violet-400',
    semester: 'text-blue-400',
    section: 'text-emerald-400',
    topic: 'text-zinc-400',
  };

  const CHILD_LEVELS: Record<string, NodeLevel> = {
    course: 'semester',
    semester: 'section',
    section: 'topic',
  };

  const CHILD_LABELS: Record<string, string> = {
    course: 'semestre',
    semester: 'seccion',
    section: 'topico',
  };

  // ── Render a tree node ────────────────────────────────
  function renderNode(
    level: NodeLevel,
    item: { id: string; name: string },
    depth: number,
    children?: React.ReactNode,
    hasChildren?: boolean,
    parentId?: string,
  ) {
    const isExpanded = expanded.has(item.id);
    const isLeaf = level === 'topic';
    const isSelected = isLeaf && selectedTopicId === item.id;
    const isEditing = editing?.type === 'edit' && editing.id === item.id;
    const isAddingChild = editing?.type === 'add' && editing.parentId === item.id;

    return (
      <div key={item.id}>
        {/* Node row */}
        <div
          className={clsx(
            "group/node flex items-center gap-1.5 cursor-pointer transition-colors",
            compact ? "py-1.5 pr-2" : "py-1.5 pr-3",
            isSelected
              ? "bg-violet-500/15 text-violet-300"
              : "text-zinc-300 hover:bg-white/[0.04] hover:text-white",
          )}
          style={{ paddingLeft: depthPadding(depth) }}
          onClick={() => {
            if (isLeaf) {
              onSelectTopic?.(item.id, item.name);
            } else {
              toggle(item.id);
            }
          }}
        >
          {/* Expand arrow (non-leaf) */}
          {!isLeaf && (
            <span className={clsx("shrink-0 transition-transform", isExpanded && "rotate-90", LEVEL_COLORS[level])}>
              <ChevronRight size={compact ? 12 : 14} />
            </span>
          )}

          {/* Icon */}
          <span className={clsx("shrink-0", LEVEL_COLORS[level])}>
            {LEVEL_ICONS[level]}
          </span>

          {/* Name or inline editor */}
          {isEditing ? (
            <InlineEditor
              initialValue={item.name}
              placeholder={`Nombre del ${level}...`}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <span className={clsx(
              "flex-1 min-w-0 truncate",
              compact ? "text-xs" : "text-[13px]",
              isLeaf && !isSelected && "text-zinc-400",
            )}>
              {item.name}
            </span>
          )}

          {/* Edit/delete/add-child buttons (only when editable and not editing) */}
          {editable && !isEditing && (
            <NodeActions
              onEdit={() => setEditing({ type: 'edit', level, id: item.id, currentName: item.name })}
              onDelete={() => setConfirmDelete({ level, id: item.id, name: item.name })}
              onAddChild={!isLeaf ? () => {
                // Expand the node first, then show add child editor
                if (!isExpanded) toggle(item.id);
                setEditing({ type: 'add', level: CHILD_LEVELS[level], id: 'new', parentId: item.id });
              } : undefined}
              addLabel={!isLeaf ? `Agregar ${CHILD_LABELS[level]}` : undefined}
              compact={compact}
            />
          )}
        </div>

        {/* Children */}
        <AnimatePresence initial={false}>
          {isExpanded && children && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {children}
              {/* Inline add-child editor */}
              {isAddingChild && (
                <div
                  className="flex items-center gap-1.5 py-1.5"
                  style={{ paddingLeft: depthPadding(depth + 1) }}
                >
                  <span className={clsx("shrink-0", LEVEL_COLORS[CHILD_LEVELS[level]])}>
                    {LEVEL_ICONS[CHILD_LEVELS[level]]}
                  </span>
                  <InlineEditor
                    initialValue=""
                    placeholder={`Nuevo ${CHILD_LABELS[level]}...`}
                    onSave={handleSave}
                    onCancel={() => setEditing(null)}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Render the full tree ──────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header with "Add course" button */}
      {editable && (
        <div className={clsx("flex items-center justify-between border-b border-white/[0.06] shrink-0", compact ? "px-3 py-2" : "px-4 py-3")}>
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Contenido</span>
          <button
            onClick={() => setEditing({ type: 'add', level: 'course', id: 'new' })}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/15 rounded-md transition-colors"
          >
            <Plus size={12} />
            Curso
          </button>
        </div>
      )}

      {/* Scrollable tree */}
      <div className={clsx("flex-1 overflow-y-auto", compact ? "py-1" : "py-2")}>
        {/* Add course inline editor (top level) */}
        {editing?.level === 'course' && editing.type === 'add' && (
          <div className="flex items-center gap-1.5 py-1.5 px-3">
            <span className={clsx("shrink-0", LEVEL_COLORS.course)}>
              {LEVEL_ICONS.course}
            </span>
            <InlineEditor
              initialValue=""
              placeholder="Nombre del curso..."
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          </div>
        )}

        {tree.courses.map(course =>
          renderNode('course', course, 0,
            <>
              {(course.semesters || []).map(semester =>
                renderNode('semester', semester, 1,
                  <>
                    {(semester.sections || []).map(section =>
                      renderNode('section', section, 2,
                        <>
                          {(section.topics || []).map(topic =>
                            renderNode('topic', topic, 3, undefined, false, section.id)
                          )}
                        </>,
                        (section.topics || []).length > 0,
                        semester.id,
                      )
                    )}
                  </>,
                  (semester.sections || []).length > 0,
                  course.id,
                )
              )}
            </>,
            (course.semesters || []).length > 0,
          )
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteModal}
    </div>
  );
}