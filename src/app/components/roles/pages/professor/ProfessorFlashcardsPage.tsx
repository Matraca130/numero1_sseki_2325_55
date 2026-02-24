// ============================================================
// Axon — Professor: Flashcards Management
// PARALLEL-SAFE: This file is independent.
// Backend: FLAT routes via /src/app/services/flashcardApi.ts
//
// Refactored: CRUD logic extracted to FlashcardsManager component.
// This page provides the CascadeNavigator (content tree) + mounts
// <FlashcardsManager summaryId={...} /> for the selected summary.
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { apiCall } from '@/app/lib/api';
import type { Summary } from '@/app/types/platform';
import type { TreeCourse } from '@/app/services/contentTreeApi';
import { FlashcardsManager } from '@/app/components/content/FlashcardsManager';
import {
  CreditCard, BookOpen, Layers, GraduationCap,
  Loader2, FileText,
} from 'lucide-react';

// ── Helper: breadcrumb path for a topic ──────────────────

function buildTopicPath(
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

// ── Content Tree Navigator (left panel) ──────────────────

function CascadeNavigator({
  selectedTopicId,
  selectedSummaryId,
  onSelectTopic,
  onSelectSummary,
  institutionId,
  tree,
  treeLoading,
}: {
  selectedTopicId: string | null;
  selectedSummaryId: string | null;
  onSelectTopic: (topicId: string, topicName: string) => void;
  onSelectSummary: (summary: Summary) => void;
  institutionId: string | null;
  tree: { courses: TreeCourse[] } | null;
  treeLoading: boolean;
}) {
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
    if (profCourseIds.size === 0) return all; // fallback: show all
    const filtered = all.filter(c => profCourseIds.has(c.id));
    return filtered.length > 0 ? filtered : all;
  }, [tree, profCourseIds]);

  // ── 3. Derive semesters from selected course (in-memory) ──
  const semesters = useMemo(() => {
    if (!selectedCourseId) return [];
    const course = courses.find(c => c.id === selectedCourseId);
    return course?.semesters || [];
  }, [courses, selectedCourseId]);

  // ── 4. Derive sections from selected semester (in-memory) ──
  const sections = useMemo(() => {
    if (!selectedSemesterId) return [];
    const sem = semesters.find(s => s.id === selectedSemesterId);
    return sem?.sections || [];
  }, [semesters, selectedSemesterId]);

  // ── 5. Derive topics from selected section (in-memory) ──
  const topics = useMemo(() => {
    if (!selectedSectionId) return [];
    const sec = sections.find(s => s.id === selectedSectionId);
    return sec?.topics || [];
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

  const selectClass = "w-full px-3 py-2 rounded-lg border border-gray-200 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all disabled:bg-gray-50 disabled:text-gray-400";
  const labelClass = "block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1";

  // ── Loading state ──
  if (treeLoading || (!membershipsLoaded && !!institutionId)) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-purple-400" />
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
        <label className={labelClass}>
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
          <label className={labelClass}>Semestre</label>
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
          <label className={labelClass}>
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
          <label className={labelClass}>
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
                      ? 'bg-purple-100 text-purple-700 font-semibold border border-purple-200'
                      : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600 border border-transparent'
                  }`}
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
          <label className={labelClass}>
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
                      ? 'bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200'
                      : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 border border-transparent'
                  }`}
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

// ── Main Page Component ──────────────────────────────────

export function ProfessorFlashcardsPage() {
  const { activeMembership } = useAuth();
  const { tree, loading: treeLoading } = useContentTree();
  const institutionId = activeMembership?.institution_id || null;

  // Navigation state
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedTopicName, setSelectedTopicName] = useState<string>('');
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);

  // ── Handlers ────────────────────────────────────────────
  const handleSelectTopic = (topicId: string, topicName: string) => {
    setSelectedTopicId(topicId);
    setSelectedTopicName(topicName);
    setSelectedSummary(null);
  };

  const handleSelectSummary = (summary: Summary) => {
    setSelectedSummary(summary);
  };

  // Topic breadcrumb
  const topicPath = selectedTopicId ? buildTopicPath(tree, selectedTopicId) : '';

  return (
    <div className="flex h-full overflow-hidden">
      {/* ══════ LEFT PANEL — Content Tree ══════ */}
      <div className="w-[280px] shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
        {/* Panel header */}
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Layers size={14} className="text-purple-500" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-gray-900">Arbol de Contenido</h3>
              <p className="text-[10px] text-gray-400">Selecciona un topico</p>
            </div>
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar-light">
          <CascadeNavigator
            selectedTopicId={selectedTopicId}
            selectedSummaryId={selectedSummary?.id || null}
            onSelectTopic={handleSelectTopic}
            onSelectSummary={handleSelectSummary}
            institutionId={institutionId}
            tree={tree}
            treeLoading={treeLoading}
          />
        </div>
      </div>

      {/* ══════ RIGHT PANEL — Flashcard Management ══════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50">

        {/* ── Page Header ── */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <CreditCard size={18} className="text-purple-600" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Flashcards</h1>
              <p className="text-xs text-gray-400">
                {selectedSummary
                  ? topicPath
                  : 'Selecciona un topico y resumen para gestionar flashcards'
                }
              </p>
            </div>
          </div>
        </div>

        {/* ── Content: FlashcardsManager or placeholder ── */}
        {selectedSummary ? (
          <FlashcardsManager summaryId={selectedSummary.id} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            {!selectedTopicId ? (
              <>
                <div className="w-20 h-20 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                  <CreditCard size={32} className="text-purple-300" />
                </div>
                <h3 className="font-bold text-gray-700 mb-1">Gestion de Flashcards</h3>
                <p className="text-sm text-gray-400 max-w-md">
                  Selecciona un topico en el arbol de contenido para ver y gestionar los flashcards asociados a sus resumenes.
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                  <FileText size={28} className="text-amber-300" />
                </div>
                <h3 className="font-bold text-gray-700 mb-1">Selecciona un resumen</h3>
                <p className="text-sm text-gray-400 max-w-md">
                  Selecciona un resumen del topico <strong>{selectedTopicName}</strong> en el panel izquierdo para gestionar sus flashcards.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
