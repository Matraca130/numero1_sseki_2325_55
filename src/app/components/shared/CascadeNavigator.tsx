// ============================================================
// Axon — Shared CascadeNavigator
//
// Reusable content-tree navigation panel for professor pages.
// Used by ProfessorFlashcardsPage and ProfessorQuizzesPage.
//
// Provides:
//   - CascadeNavigator: cascade dropdowns (course→semester→section→topic→summary)
//   - ContentTreePanel: collapsible left panel wrapper
//   - buildTopicPath: breadcrumb string builder
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import { apiCall } from '@/app/lib/api';
import type { Summary } from '@/app/types/platform';
import type { TreeCourse } from '@/app/services/contentTreeApi';
import {
  BookOpen, Layers, GraduationCap,
  Loader2, FileText, ChevronLeft, ChevronRight,
} from 'lucide-react';

// ── Color scheme presets ─────────────────────────────────

export type AccentScheme = 'purple' | 'indigo' | 'teal' | 'emerald';

const ACCENT_CLASSES: Record<AccentScheme, {
  spinnerColor: string;
  selectFocus: string;
  topicActive: string;
  topicHover: string;
  panelButton: string;
  panelButtonHover: string;
  panelIcon: string;
}> = {
  purple: {
    spinnerColor: 'text-purple-400',
    selectFocus: 'focus:ring-purple-500/30 focus:border-purple-400',
    topicActive: 'bg-purple-100 text-purple-700 border border-purple-200',
    topicHover: 'hover:bg-purple-50 hover:text-purple-600',
    panelButton: 'bg-purple-50',
    panelButtonHover: 'hover:bg-purple-100',
    panelIcon: 'text-purple-500',
  },
  indigo: {
    spinnerColor: 'text-indigo-400',
    selectFocus: 'focus:ring-indigo-500/30 focus:border-indigo-400',
    topicActive: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
    topicHover: 'hover:bg-indigo-50 hover:text-indigo-600',
    panelButton: 'bg-indigo-50',
    panelButtonHover: 'hover:bg-indigo-100',
    panelIcon: 'text-indigo-500',
  },
  teal: {
    spinnerColor: 'text-teal-400',
    selectFocus: 'focus:ring-teal-500/30 focus:border-teal-400',
    topicActive: 'bg-teal-100 text-teal-700 border border-teal-200',
    topicHover: 'hover:bg-teal-50 hover:text-teal-600',
    panelButton: 'bg-teal-50',
    panelButtonHover: 'hover:bg-teal-100',
    panelIcon: 'text-teal-500',
  },
  emerald: {
    spinnerColor: 'text-emerald-400',
    selectFocus: 'focus:ring-emerald-500/30 focus:border-emerald-400',
    topicActive: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    topicHover: 'hover:bg-emerald-50 hover:text-emerald-600',
    panelButton: 'bg-emerald-50',
    panelButtonHover: 'hover:bg-emerald-100',
    panelIcon: 'text-emerald-500',
  },
};

// ── buildTopicPath ───────────────────────────────────────

export function buildTopicPath(
  tree: { courses: TreeCourse[] } | null,
  topicId: string
): string {
  if (!tree) return '';
  for (const c of tree.courses) {
    for (const s of c.semesters) {
      for (const sec of s.sections) {
        for (const t of sec.topics) {
          if (t.id === topicId) {
            return `${c.name} > ${s.name} > ${sec.name} > ${t.name}`;
          }
        }
      }
    }
  }
  return '';
}

// ── CascadeNavigator Props ───────────────────────────────

export interface CascadeNavigatorProps {
  selectedTopicId: string | null;
  selectedSummaryId: string | null;
  onSelectTopic: (topicId: string, topicName: string) => void;
  onSelectSummary: (summary: Summary) => void;
  institutionId: string | null;
  tree: { courses: TreeCourse[] } | null;
  treeLoading: boolean;
  /** Color scheme for focus rings, active states, etc. Default: 'purple' */
  accent?: AccentScheme;
}

// ── CascadeNavigator ─────────────────────────────────────

export function CascadeNavigator({
  selectedTopicId,
  selectedSummaryId,
  onSelectTopic,
  onSelectSummary,
  institutionId,
  tree,
  treeLoading,
  accent = 'purple',
}: CascadeNavigatorProps) {
  const colors = ACCENT_CLASSES[accent];

  // Professor course filter (from memberships)
  const [profCourseIds, setProfCourseIds] = useState<Set<string>>(new Set());
  const [membershipsLoaded, setMembershipsLoaded] = useState(false);

  // Cascade selections (levels 1-4 from tree)
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Summaries (level 5 — from API)
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(false);

  // ── 1. Load memberships once to filter professor courses ──
  useEffect(() => {
    if (!institutionId) return;
    apiCall<any>(`/memberships?institution_id=${institutionId}`)
      .then(data => {
        const items = Array.isArray(data) ? data : data?.items || [];
        const ids = new Set<string>(
          items
            .filter((m: any) => m.role?.toLowerCase() === 'professor' && m.course_id)
            .map((m: any) => m.course_id)
        );
        setProfCourseIds(ids);
      })
      .catch(err => console.error('[CascadeNav] Memberships error:', err))
      .finally(() => setMembershipsLoaded(true));
  }, [institutionId]);

  // ── 2. Derive courses from tree, filtered by professor memberships ──
  const courses = useMemo(() => {
    if (!tree?.courses) return [];
    const all = tree.courses;
    if (profCourseIds.size === 0) return all;
    const filtered = all.filter(c => profCourseIds.has(c.id));
    return filtered.length > 0 ? filtered : all;
  }, [tree, profCourseIds]);

  // ── 3-5. Derive semesters → sections → topics in-memory ──
  const semesters = useMemo(() => {
    if (!selectedCourseId) return [];
    return courses.find(c => c.id === selectedCourseId)?.semesters || [];
  }, [courses, selectedCourseId]);

  const sections = useMemo(() => {
    if (!selectedSemesterId) return [];
    return semesters.find(s => s.id === selectedSemesterId)?.sections || [];
  }, [semesters, selectedSemesterId]);

  const topics = useMemo(() => {
    if (!selectedSectionId) return [];
    return sections.find(s => s.id === selectedSectionId)?.topics || [];
  }, [sections, selectedSectionId]);

  // ── 6. Load summaries when topic selected (flat API call) ──
  useEffect(() => {
    if (!selectedTopicId) { setSummaries([]); return; }
    setSummariesLoading(true);
    apiCall<any>(`/summaries?topic_id=${selectedTopicId}`)
      .then(data => {
        const items = Array.isArray(data) ? data : data?.items || [];
        setSummaries(items);
      })
      .catch(err => {
        console.error('[CascadeNav] Summaries error:', err);
        setSummaries([]);
      })
      .finally(() => setSummariesLoading(false));
  }, [selectedTopicId]);

  // ── Reset handlers ──
  const handleCourseChange = (id: string) => {
    setSelectedCourseId(id);
    setSelectedSemesterId('');
    setSelectedSectionId('');
  };

  const handleSemesterChange = (id: string) => {
    setSelectedSemesterId(id);
    setSelectedSectionId('');
  };

  const selectClass = `w-full px-3 py-2 rounded-lg border border-gray-200 text-[12px] bg-white focus:outline-none focus:ring-2 ${colors.selectFocus} transition-all disabled:bg-gray-50 disabled:text-gray-400`;
  const labelClass = 'block text-[10px] uppercase tracking-wider text-gray-400 mb-1';

  // ── Loading state ──
  if (treeLoading || (!membershipsLoaded && !!institutionId)) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className={`animate-spin ${colors.spinnerColor}`} />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <BookOpen size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">No hay cursos disponibles</p>
        <p className="text-xs text-gray-400 mt-1">No se encontraron cursos de profesor</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-1">
      {/* 1. Curso */}
      <div>
        <label className={labelClass} style={{ fontWeight: 700 }}>
          <GraduationCap size={10} className="inline mr-1" />
          Curso
        </label>
        <select
          value={selectedCourseId}
          onChange={e => handleCourseChange(e.target.value)}
          className={selectClass}
        >
          <option value="">Seleccionar curso...</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* 2. Semestre */}
      {selectedCourseId && (
        <div>
          <label className={labelClass} style={{ fontWeight: 700 }}>Semestre</label>
          {semesters.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-1">Sin semestres disponibles</p>
          ) : (
            <select
              value={selectedSemesterId}
              onChange={e => handleSemesterChange(e.target.value)}
              className={selectClass}
            >
              <option value="">Seleccionar semestre...</option>
              {semesters.map(s => (
                <option key={s.id} value={s.id}>{s.name || `Semestre ${s.id.substring(0, 8)}`}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* 3. Seccion */}
      {selectedSemesterId && (
        <div>
          <label className={labelClass} style={{ fontWeight: 700 }}>
            <Layers size={10} className="inline mr-1" />
            Seccion
          </label>
          {sections.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-1">Sin secciones disponibles</p>
          ) : (
            <select
              value={selectedSectionId}
              onChange={e => setSelectedSectionId(e.target.value)}
              className={selectClass}
            >
              <option value="">Seleccionar seccion...</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.name || `Seccion ${s.id.substring(0, 8)}`}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* 4. Topico */}
      {selectedSectionId && (
        <div>
          <label className={labelClass} style={{ fontWeight: 700 }}>
            <FileText size={10} className="inline mr-1" />
            Topico
          </label>
          {topics.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-1">Sin topicos</p>
          ) : (
            <div className="space-y-0.5">
              {topics.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => onSelectTopic(topic.id, topic.name || `Topico ${topic.id.substring(0, 8)}`)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg transition-all text-[12px] ${
                    selectedTopicId === topic.id
                      ? `${colors.topicActive}`
                      : `text-gray-600 ${colors.topicHover} border border-transparent`
                  }`}
                  style={selectedTopicId === topic.id ? { fontWeight: 600 } : undefined}
                >
                  <FileText size={12} className="shrink-0" />
                  <span className="truncate">{topic.name || `Topico ${topic.id.substring(0, 8)}`}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Resumen (loaded from API) */}
      {selectedTopicId && (
        <div>
          <label className={labelClass} style={{ fontWeight: 700 }}>
            <BookOpen size={10} className="inline mr-1" />
            Resumen
          </label>
          {summariesLoading ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
              <Loader2 size={12} className="animate-spin" /> Cargando...
            </div>
          ) : summaries.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-1">Sin resumenes para este topico</p>
          ) : (
            <div className="space-y-0.5">
              {summaries.map(s => (
                <button
                  key={s.id}
                  onClick={() => onSelectSummary(s)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg transition-all text-[12px] ${
                    selectedSummaryId === s.id
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 border border-transparent'
                  }`}
                  style={selectedSummaryId === s.id ? { fontWeight: 600 } : undefined}
                >
                  <BookOpen size={12} className="shrink-0" />
                  <span className="truncate">{s.title || `Resumen ${s.id.substring(0, 8)}`}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ContentTreePanel (collapsible wrapper) ────────────────

export interface ContentTreePanelProps {
  selectedTopicId: string | null;
  selectedSummaryId: string | null;
  onSelectTopic: (topicId: string, topicName: string) => void;
  onSelectSummary: (summary: Summary) => void;
  institutionId: string | null;
  tree: { courses: TreeCourse[] } | null;
  treeLoading: boolean;
  /** Color scheme for the panel and inner navigator */
  accent?: AccentScheme;
}

export function ContentTreePanel({
  selectedTopicId,
  selectedSummaryId,
  onSelectTopic,
  onSelectSummary,
  institutionId,
  tree,
  treeLoading,
  accent = 'purple',
}: ContentTreePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const colors = ACCENT_CLASSES[accent];

  return (
    <div
      className={`${
        isCollapsed ? 'w-[52px]' : 'w-[280px]'
      } shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden transition-all duration-300`}
    >
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`w-8 h-8 rounded-lg ${colors.panelButton} flex items-center justify-center ${colors.panelButtonHover} transition-colors cursor-pointer shrink-0`}
            title={isCollapsed ? 'Expandir panel' : 'Colapsar panel'}
          >
            {isCollapsed
              ? <ChevronRight size={14} className={colors.panelIcon} />
              : <Layers size={14} className={colors.panelIcon} />
            }
          </button>
          {!isCollapsed && (
            <div className="flex-1 flex items-center justify-between min-w-0">
              <div>
                <h3 className="text-[13px] text-gray-900" style={{ fontWeight: 700 }}>Arbol de Contenido</h3>
                <p className="text-[10px] text-gray-400">Selecciona un topico</p>
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                title="Colapsar panel"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tree body */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar-light">
          <CascadeNavigator
            selectedTopicId={selectedTopicId}
            selectedSummaryId={selectedSummaryId}
            onSelectTopic={onSelectTopic}
            onSelectSummary={onSelectSummary}
            institutionId={institutionId}
            tree={tree}
            treeLoading={treeLoading}
            accent={accent}
          />
        </div>
      )}
    </div>
  );
}