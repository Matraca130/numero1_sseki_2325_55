// ============================================================
// Axon — Professor: Quizzes (connected to real backend)
//
// Backend routes (flat with query params):
//   GET /memberships → filter professor courses
//   GET /semesters?course_id=xxx
//   GET /sections?semester_id=xxx
//   GET /topics?section_id=xxx
//   GET /summaries?topic_id=xxx
//   GET /keywords?summary_id=xxx
//   GET/POST/PUT/DELETE /quiz-questions
//   PUT /quiz-questions/:id/restore
//
// Data flow:
//   Cascade selectors → pick course → semester → section →
//   topic → summary → load quiz questions → CRUD
// ============================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { apiCall, ensureGeneralKeyword } from '@/app/lib/api';
import * as quizApi from '@/app/services/quizApi';
import type {
  QuizQuestion,
  QuestionType,
  Difficulty,
  CreateQuizQuestionPayload,
  UpdateQuizQuestionPayload,
} from '@/app/services/quizApi';
import type { Summary, Keyword } from '@/app/types/platform';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  ClipboardList, ChevronRight, ChevronDown, BookOpen, FileText,
  Plus, Pencil, Trash2, RotateCcw, X, Check, AlertCircle,
  Loader2, Filter, BarChart3, HelpCircle, CheckCircle2,
  CircleDot, MessageSquare, GraduationCap, Layers, Search,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Helpers ───────────────────────────────────────────────

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'Opcion multiple',
  true_false: 'Verdadero / Falso',
  fill_blank: 'Completar',
  open: 'Respuesta abierta',
};

const QUESTION_TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  mcq: <CircleDot size={14} />,
  true_false: <CheckCircle2 size={14} />,
  fill_blank: <Pencil size={14} />,
  open: <MessageSquare size={14} />,
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Facil',
  medium: 'Media',
  hard: 'Dificil',
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  hard: 'bg-red-100 text-red-700 border-red-200',
};

// ── Difficulty ↔ integer mapping (DB stores 1/2/3) ────────
const DIFFICULTY_TO_INT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
const INT_TO_DIFFICULTY: Record<number, Difficulty> = { 1: 'easy', 2: 'medium', 3: 'hard' };

// ── Shared select styles ──────────────────────────────────

const SELECT_CLS =
  'w-full text-[12px] border border-gray-200 rounded-lg px-2.5 py-2 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all';

// ── Main Page ─────────────────────────────────────────────

export function ProfessorQuizzesPage() {
  const { selectedInstitution } = useAuth();
  const institutionId = selectedInstitution?.id || null;

  // ── Content-tree + cascade selection state ───────────────
  const [contentTree, setContentTree] = useState<any[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(false);

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);

  // ── Data state ──────────────────────────────────────────
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionsTotal, setQuestionsTotal] = useState(0);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // ── Filters ─────────────────────────────────────────────
  const [filterType, setFilterType] = useState<QuestionType | ''>('');
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | ''>('');
  const [filterKeywordId, setFilterKeywordId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Modal state ─────────────────────────────────────────
  const [showCreateEdit, setShowCreateEdit] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);

  // ── 1. Load content-tree + memberships (single load) ────
  useEffect(() => {
    if (!institutionId) {
      setContentTree([]);
      setTreeLoading(false);
      return;
    }
    let cancelled = false;
    setTreeLoading(true);
    (async () => {
      try {
        const [tree, memberships] = await Promise.all([
          apiCall<any>(`/content-tree?institution_id=${institutionId}`),
          apiCall<any[]>(`/memberships?institution_id=${institutionId}`),
        ]);
        if (cancelled) return;

        const allCourses = Array.isArray(tree) ? tree : [];
        const profCourseIds = (memberships || [])
          .filter((m: any) => m.role?.toLowerCase() === 'professor')
          .map((m: any) => m.course_id)
          .filter(Boolean);

        const professorCourses = allCourses.filter((c: any) => profCourseIds.includes(c.id));
        setContentTree(professorCourses.length > 0 ? professorCourses : allCourses);
      } catch (err) {
        console.error('[Quiz] Content tree load error:', err);
        if (!cancelled) setContentTree([]);
      } finally {
        if (!cancelled) setTreeLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [institutionId]);

  // ── Derived data from tree (instant, no API calls) ──────
  const courses = useMemo(() =>
    contentTree.map((c: any) => ({ id: c.id, name: c.name })),
    [contentTree]
  );

  const semesters = useMemo(() => {
    if (!selectedCourseId) return [];
    const course = contentTree.find((c: any) => c.id === selectedCourseId);
    return course?.semesters || [];
  }, [contentTree, selectedCourseId]);

  const sections = useMemo(() => {
    if (!selectedSemesterId) return [];
    const sem = semesters.find((s: any) => s.id === selectedSemesterId);
    return sem?.sections || [];
  }, [semesters, selectedSemesterId]);

  const topics = useMemo(() => {
    if (!selectedSectionId) return [];
    const sec = sections.find((s: any) => s.id === selectedSectionId);
    return sec?.topics || [];
  }, [sections, selectedSectionId]);

  // ── Cascade change handlers (reset downstream) ─────────
  const handleCourseChange = useCallback((id: string) => {
    setSelectedCourseId(id);
    setSelectedSemesterId(''); setSelectedSectionId('');
    setSelectedTopicId(''); setSummaries([]); setSelectedSummaryId(null);
  }, []);

  const handleSemesterChange = useCallback((id: string) => {
    setSelectedSemesterId(id);
    setSelectedSectionId(''); setSelectedTopicId('');
    setSummaries([]); setSelectedSummaryId(null);
  }, []);

  const handleSectionChange = useCallback((id: string) => {
    setSelectedSectionId(id);
    setSelectedTopicId(''); setSummaries([]); setSelectedSummaryId(null);
  }, []);

  const handleTopicChange = useCallback((id: string) => {
    setSelectedTopicId(id);
    setSummaries([]); setSelectedSummaryId(null);
  }, []);

  // ── 2. Load summaries when topic changes (only extra call) ──
  useEffect(() => {
    if (!selectedTopicId) { setSummaries([]); setSelectedSummaryId(null); return; }
    let cancelled = false;
    setSummariesLoading(true);
    (async () => {
      try {
        const res = await apiCall<any>(`/summaries?topic_id=${selectedTopicId}`);
        const items = res?.items || (Array.isArray(res) ? res : []);
        if (!cancelled) {
          setSummaries(items);
          const published = items.find((x: any) => x.status === 'published') || items[0];
          if (published) setSelectedSummaryId(published.id);
        }
      } catch (err) {
        console.error('[Quiz] Summaries load error:', err);
        if (!cancelled) { setSummaries([]); setSelectedSummaryId(null); }
      } finally {
        if (!cancelled) setSummariesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedTopicId]);

  // ── 3. Load keywords when summary changes ───────────────
  useEffect(() => {
    setKeywords([]); setFilterKeywordId('');
    if (!selectedSummaryId) return;
    (async () => {
      try {
        const res = await apiCall<any>(`/keywords?summary_id=${selectedSummaryId}`);
        const items = res?.items || (Array.isArray(res) ? res : []);
        setKeywords(items);
      } catch (err) {
        console.error('[Quiz] Keywords load error:', err);
        setKeywords([]);
      }
    })();
  }, [selectedSummaryId]);

  // ── Load quiz questions when summary/filters change ─────
  const loadQuestions = useCallback(async () => {
    if (!selectedSummaryId) {
      setQuestions([]);
      setQuestionsTotal(0);
      return;
    }
    setQuestionsLoading(true);
    try {
      const filters: any = {};
      if (filterType) filters.question_type = filterType;
      if (filterDifficulty) filters.difficulty = DIFFICULTY_TO_INT[filterDifficulty] || 2;
      if (filterKeywordId) filters.keyword_id = filterKeywordId;
      filters.limit = 200;
      const res = await quizApi.getQuizQuestions(selectedSummaryId, filters);
      setQuestions(res.items || []);
      setQuestionsTotal(res.total || 0);
    } catch (err: any) {
      console.error('[Quiz] Questions load error:', err);
      setQuestions([]);
      setQuestionsTotal(0);
    } finally {
      setQuestionsLoading(false);
    }
  }, [selectedSummaryId, filterType, filterDifficulty, filterKeywordId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // ── Filtered by search ──────────────────────────────────
  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return questions;
    const q = searchQuery.toLowerCase();
    return questions.filter(
      qq => qq.question.toLowerCase().includes(q) ||
            qq.correct_answer.toLowerCase().includes(q)
    );
  }, [questions, searchQuery]);

  // ── Stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const byType: Record<string, number> = { mcq: 0, true_false: 0, fill_blank: 0, open: 0 };
    const byDiff: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    let active = 0;
    for (const q of questions) {
      byType[q.question_type] = (byType[q.question_type] || 0) + 1;
      const diffKey = INT_TO_DIFFICULTY[q.difficulty] || 'medium';
      byDiff[diffKey] = (byDiff[diffKey] || 0) + 1;
      if (q.is_active) active++;
    }
    return { total: questions.length, active, byType, byDiff };
  }, [questions]);

  // ── CRUD handlers ───────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await quizApi.deleteQuizQuestion(id);
      toast.success('Pregunta eliminada');
      await loadQuestions();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await quizApi.restoreQuizQuestion(id);
      toast.success('Pregunta restaurada');
      await loadQuestions();
    } catch (err: any) {
      toast.error(err.message || 'Error al restaurar');
    }
  };

  const handleEdit = (q: QuizQuestion) => {
    setEditingQuestion(q);
    setShowCreateEdit(true);
  };

  const handleCreate = () => {
    setEditingQuestion(null);
    setShowCreateEdit(true);
  };

  const handleSaved = () => {
    setShowCreateEdit(false);
    setEditingQuestion(null);
    loadQuestions();
  };

  // ── Resolve names for breadcrumb ────────────────────────
  const selectedCourseName = courses.find(c => c.id === selectedCourseId)?.name || '';
  const selectedSemesterName = semesters.find((s: any) => s.id === selectedSemesterId)?.name || '';
  const selectedSectionName = sections.find((s: any) => s.id === selectedSectionId)?.name || '';
  const selectedTopicName = topics.find((t: any) => t.id === selectedTopicId)?.name || '';

  const getKeywordName = (kwId: string) => {
    const kw = keywords.find(k => k.id === kwId);
    return kw?.term || kwId.substring(0, 8) + '...';
  };

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="flex h-full">
      {/* ── Left Panel: Cascade Selectors ── */}
      <div className="w-[300px] shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList size={16} className="text-purple-600" />
            <h2 className="text-sm text-gray-900" style={{ fontWeight: 700 }}>Quizzes</h2>
          </div>
          <p className="text-[11px] text-gray-400">Navega la jerarquia para gestionar preguntas</p>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-3">
          {/* ── Course ── */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
              <BookOpen size={12} className="text-purple-500" />
              Curso
            </label>
            {treeLoading ? (
              <div className="flex items-center gap-2 px-2 py-2">
                <Loader2 size={13} className="animate-spin text-gray-400" />
                <span className="text-[11px] text-gray-400">Cargando cursos...</span>
              </div>
            ) : courses.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic px-1">Sin cursos asignados como profesor</p>
            ) : (
              <select
                value={selectedCourseId}
                onChange={e => handleCourseChange(e.target.value)}
                className={SELECT_CLS}
              >
                <option value="">-- Seleccionar curso --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* ── Semester ── */}
          {selectedCourseId && (
            <div>
              <label className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                <GraduationCap size={12} className="text-gray-400" />
                Semestre
              </label>
              {semesters.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic px-1">Sin semestres</p>
              ) : (
                <select
                  value={selectedSemesterId}
                  onChange={e => handleSemesterChange(e.target.value)}
                  className={SELECT_CLS}
                >
                  <option value="">-- Seleccionar semestre --</option>
                  {semesters.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* ── Section ── */}
          {selectedSemesterId && (
            <div>
              <label className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                <Layers size={12} className="text-gray-400" />
                Seccion
              </label>
              {sections.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic px-1">Sin secciones</p>
              ) : (
                <select
                  value={selectedSectionId}
                  onChange={e => handleSectionChange(e.target.value)}
                  className={SELECT_CLS}
                >
                  <option value="">-- Seleccionar seccion --</option>
                  {sections.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* ── Topic ── */}
          {selectedSectionId && (
            <div>
              <label className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                <FileText size={12} className="text-gray-400" />
                Topico
              </label>
              {topics.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic px-1">Sin topicos</p>
              ) : (
                <select
                  value={selectedTopicId}
                  onChange={e => handleTopicChange(e.target.value)}
                  className={SELECT_CLS}
                >
                  <option value="">-- Seleccionar topico --</option>
                  {topics.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* ── Summary ── */}
          {selectedTopicId && (
            <div>
              <label className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                <ClipboardList size={12} className="text-purple-500" />
                Resumen
              </label>
              {summariesLoading ? (
                <div className="flex items-center gap-2 px-2 py-2">
                  <Loader2 size={13} className="animate-spin text-gray-400" />
                  <span className="text-[11px] text-gray-400">Cargando...</span>
                </div>
              ) : summaries.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic px-1">Sin resumenes en este topico</p>
              ) : (
                <select
                  value={selectedSummaryId || ''}
                  onChange={e => setSelectedSummaryId(e.target.value || null)}
                  className={SELECT_CLS}
                >
                  <option value="">-- Seleccionar resumen --</option>
                  {summaries.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.title || `Resumen ${s.id.substring(0, 8)}`} ({s.status || 'draft'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* ── Selection indicator ── */}
          {selectedSummaryId && (
            <div className="mt-2 px-3 py-2.5 rounded-lg bg-purple-50 border border-purple-100">
              <div className="flex items-center gap-1.5 text-[10px] text-purple-600 mb-1" style={{ fontWeight: 700 }}>
                <Check size={12} />
                Resumen seleccionado
              </div>
              <p className="text-[11px] text-purple-800 truncate" style={{ fontWeight: 500 }}>
                {summaries.find(s => s.id === selectedSummaryId)?.title || selectedSummaryId.substring(0, 12)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel: Questions ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
        {!selectedSummaryId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center">
              <ClipboardList size={28} className="text-purple-300" />
            </div>
            <p className="text-sm">Selecciona un resumen desde el panel izquierdo</p>
            <p className="text-xs text-gray-300">Curso &rarr; Semestre &rarr; Seccion &rarr; Topico &rarr; Resumen</p>
          </div>
        ) : (
          <>
            {/* ── Header with breadcrumb ── */}
            <div className="bg-white border-b border-gray-100 px-5 py-3">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1.5 flex-wrap">
                {selectedCourseName && <span>{selectedCourseName}</span>}
                {selectedSemesterName && <><ChevronRight size={10} /><span>{selectedSemesterName}</span></>}
                {selectedSectionName && <><ChevronRight size={10} /><span>{selectedSectionName}</span></>}
                {selectedTopicName && <><ChevronRight size={10} /><span className="text-purple-600" style={{ fontWeight: 600 }}>{selectedTopicName}</span></>}
              </div>
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-purple-500" />
                <span className="text-[13px] text-gray-800" style={{ fontWeight: 600 }}>
                  {summaries.find(s => s.id === selectedSummaryId)?.title || 'Resumen seleccionado'}
                </span>
                <span className="text-[10px] text-gray-400 ml-1">
                  ({summaries.find(s => s.id === selectedSummaryId)?.status || ''})
                </span>
              </div>
            </div>

            {/* ── Stats bar ── */}
            <div className="bg-white border-b border-gray-100 px-5 py-2.5">
              <div className="flex items-center gap-4 flex-wrap">
                <StatBadge label="Total" value={stats.total} color="bg-gray-100 text-gray-700" />
                <StatBadge label="Activas" value={stats.active} color="bg-emerald-50 text-emerald-700" />
                <div className="w-px h-5 bg-gray-200" />
                <StatBadge label="Opcion mult." value={stats.byType.mcq} color="bg-blue-50 text-blue-700" />
                <StatBadge label="V/F" value={stats.byType.true_false} color="bg-indigo-50 text-indigo-700" />
                <StatBadge label="Completar" value={stats.byType.fill_blank} color="bg-cyan-50 text-cyan-700" />
                <StatBadge label="Abierta" value={stats.byType.open} color="bg-violet-50 text-violet-700" />
                <div className="w-px h-5 bg-gray-200" />
                <StatBadge label="Facil" value={stats.byDiff.easy} color="bg-emerald-50 text-emerald-700" />
                <StatBadge label="Media" value={stats.byDiff.medium} color="bg-amber-50 text-amber-700" />
                <StatBadge label="Dificil" value={stats.byDiff.hard} color="bg-red-50 text-red-700" />
              </div>
            </div>

            {/* ── Filters + Create button ── */}
            <div className="bg-white border-b border-gray-100 px-5 py-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Filter size={13} />
                  <span className="text-[10px] uppercase tracking-wider" style={{ fontWeight: 700 }}>Filtros</span>
                </div>

                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as QuestionType | '')}
                  className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 min-w-[130px]"
                >
                  <option value="">Todos los tipos</option>
                  {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>

                <select
                  value={filterDifficulty}
                  onChange={e => setFilterDifficulty(e.target.value as Difficulty | '')}
                  className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 min-w-[110px]"
                >
                  <option value="">Toda dificultad</option>
                  {(Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>

                <select
                  value={filterKeywordId}
                  onChange={e => setFilterKeywordId(e.target.value)}
                  className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 min-w-[140px] max-w-[200px]"
                >
                  <option value="">Todas las keywords</option>
                  {keywords.map(kw => (
                    <option key={kw.id} value={kw.id}>{kw.term}</option>
                  ))}
                </select>

                {/* Search */}
                <div className="relative flex-1 min-w-[150px] max-w-[260px]">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar en preguntas..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full text-[11px] border border-gray-200 rounded-lg pl-8 pr-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 placeholder:text-gray-300"
                  />
                </div>

                <div className="flex-1" />

                <button
                  onClick={handleCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[11px] hover:bg-purple-700 active:scale-[0.97] transition-all shadow-sm"
                  style={{ fontWeight: 600 }}
                >
                  <Plus size={14} />
                  Nueva pregunta
                </button>
              </div>
            </div>

            {/* ── Questions list ── */}
            <div className="flex-1 overflow-y-auto p-5">
              {questionsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin text-purple-500" size={24} />
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                  <HelpCircle size={32} className="opacity-30" />
                  <p className="text-sm">
                    {questions.length === 0 ? 'No hay preguntas en este resumen' : 'Sin resultados para los filtros aplicados'}
                  </p>
                  {questions.length === 0 && (
                    <button
                      onClick={handleCreate}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-[12px] hover:bg-purple-200 transition-colors"
                      style={{ fontWeight: 600 }}
                    >
                      <Plus size={14} />
                      Crear primera pregunta
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-w-4xl">
                  {filteredQuestions.map((q, idx) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      index={idx + 1}
                      keywordName={getKeywordName(q.keyword_id)}
                      onEdit={() => handleEdit(q)}
                      onDelete={() => handleDelete(q.id)}
                      onRestore={() => handleRestore(q.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Create/Edit Modal ── */}
      <AnimatePresence>
        {showCreateEdit && selectedSummaryId && (
          <QuestionFormModal
            summaryId={selectedSummaryId}
            question={editingQuestion}
            keywords={keywords}
            onClose={() => { setShowCreateEdit(false); setEditingQuestion(null); }}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Stat Badge ────────────────────────────────────────────

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={clsx('flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px]', color)}>
      <span style={{ fontWeight: 700 }}>{value}</span>
      <span style={{ fontWeight: 500 }}>{label}</span>
    </div>
  );
}

// ── Question Card ────────────────────────────────────────

function QuestionCard({
  question: q,
  index,
  keywordName,
  onEdit,
  onDelete,
  onRestore,
}: {
  question: QuizQuestion;
  index: number;
  keywordName: string;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'bg-white rounded-xl border transition-all',
        q.is_active
          ? 'border-gray-200 hover:border-purple-200 hover:shadow-sm'
          : 'border-red-200 bg-red-50/30 opacity-75'
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-50 text-purple-600 text-[11px] shrink-0 mt-0.5" style={{ fontWeight: 700 }}>
          {index}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {/* Type badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px]" style={{ fontWeight: 600 }}>
              {QUESTION_TYPE_ICONS[q.question_type]}
              {QUESTION_TYPE_LABELS[q.question_type]}
            </span>
            {/* Difficulty badge */}
            <span className={clsx('px-2 py-0.5 rounded-md border text-[10px]', DIFFICULTY_COLORS[INT_TO_DIFFICULTY[q.difficulty] || 'medium'])} style={{ fontWeight: 600 }}>
              {DIFFICULTY_LABELS[INT_TO_DIFFICULTY[q.difficulty] || 'medium']}
            </span>
            {/* Keyword */}
            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px]" style={{ fontWeight: 500 }}>
              {keywordName}
            </span>
            {/* Source */}
            <span className={clsx(
              'px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider',
              q.source === 'ai' ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500'
            )} style={{ fontWeight: 700 }}>
              {q.source}
            </span>
            {/* Inactive indicator */}
            {!q.is_active && (
              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[9px] uppercase" style={{ fontWeight: 700 }}>
                Eliminada
              </span>
            )}
          </div>

          <p className="text-[13px] text-gray-800" style={{ lineHeight: '1.5' }}>{q.question}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            title={expanded ? 'Colapsar' : 'Expandir'}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          {q.is_active ? (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <button
              onClick={onRestore}
              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Restaurar"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-0 ml-10 border-t border-gray-100 mt-1 pt-3 space-y-2.5">
              {/* Options (multiple choice) */}
              {q.question_type === 'mcq' && q.options && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5" style={{ fontWeight: 700 }}>Opciones</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {q.options.map((opt, i) => (
                      <div
                        key={i}
                        className={clsx(
                          'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] border',
                          opt === q.correct_answer
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-gray-50 border-gray-100 text-gray-600'
                        )}
                      >
                        {opt === q.correct_answer ? (
                          <Check size={12} className="text-emerald-600 shrink-0" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border border-gray-300 shrink-0" />
                        )}
                        <span style={{ fontWeight: opt === q.correct_answer ? 600 : 400 }}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correct answer (true/false or open) */}
              {q.question_type !== 'mcq' && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1" style={{ fontWeight: 700 }}>Respuesta correcta</p>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px]">
                    <Check size={12} />
                    <span style={{ fontWeight: 600 }}>
                      {q.question_type === 'true_false'
                        ? (q.correct_answer === 'true' ? 'Verdadero' : 'Falso')
                        : q.correct_answer
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* Explanation */}
              {q.explanation && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1" style={{ fontWeight: 700 }}>Explicacion</p>
                  <div className="px-2.5 py-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 text-[12px]" style={{ lineHeight: '1.5' }}>
                    {q.explanation}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Create/Edit Modal ─────────────────────────────────────

function QuestionFormModal({
  summaryId,
  question,
  keywords,
  onClose,
  onSaved,
}: {
  summaryId: string;
  question: QuizQuestion | null;
  keywords: Keyword[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!question;

  const [questionType, setQuestionType] = useState<QuestionType>(question?.question_type || 'mcq');
  const [questionText, setQuestionText] = useState(question?.question || '');
  const [keywordId, setKeywordId] = useState(question?.keyword_id || '');
  const [difficulty, setDifficulty] = useState<Difficulty>(
    question?.difficulty != null ? (INT_TO_DIFFICULTY[question.difficulty] || 'medium') : 'medium'
  );
  const [explanation, setExplanation] = useState(question?.explanation || '');
  const [correctAnswer, setCorrectAnswer] = useState(question?.correct_answer || '');
  const [options, setOptions] = useState<string[]>(
    question?.options || ['', '', '', '']
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset options when type changes
  useEffect(() => {
    if (!isEdit) {
      if (questionType === 'mcq') {
        setOptions(['', '', '', '']);
        setCorrectAnswer('');
      } else if (questionType === 'true_false') {
        setOptions([]);
        setCorrectAnswer('true');
      } else {
        setOptions([]);
        setCorrectAnswer('');
      }
    }
  }, [questionType, isEdit]);

  const handleOptionChange = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const addOption = () => {
    if (options.length < 6) setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const next = options.filter((_, i) => i !== index);
      // If the removed option was the correct answer, reset
      if (options[index] === correctAnswer) setCorrectAnswer('');
      setOptions(next);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!questionText.trim()) { setError('La pregunta es obligatoria'); return; }
    if (!correctAnswer.trim() && questionType !== 'true_false') { setError('La respuesta correcta es obligatoria'); return; }

    if (questionType === 'mcq') {
      const validOpts = options.filter(o => o.trim());
      if (validOpts.length < 2) { setError('Minimo 2 opciones con texto'); return; }
      if (!validOpts.includes(correctAnswer)) { setError('La respuesta correcta debe ser una de las opciones'); return; }
    }

    setSaving(true);
    try {
      // Resolve keyword: use selected or fallback to "General"
      let resolvedKeywordId = keywordId;
      if (!resolvedKeywordId && !isEdit) {
        const generalKw = await ensureGeneralKeyword(summaryId);
        resolvedKeywordId = generalKw.id;
      }

      if (isEdit && question) {
        const payload: UpdateQuizQuestionPayload = {
          question_type: questionType,
          question: questionText.trim(),
          correct_answer: correctAnswer.trim(),
          difficulty: DIFFICULTY_TO_INT[difficulty] || 2,
          explanation: explanation.trim() || undefined,
        };
        if (questionType === 'mcq') {
          payload.options = options.filter(o => o.trim());
        } else {
          payload.options = null;
        }
        await quizApi.updateQuizQuestion(question.id, payload);
        toast.success('Pregunta actualizada');
      } else {
        const payload: CreateQuizQuestionPayload = {
          name: questionText.trim().substring(0, 80),
          summary_id: summaryId,
          keyword_id: resolvedKeywordId,
          question_type: questionType,
          question: questionText.trim(),
          correct_answer: correctAnswer.trim(),
          difficulty: DIFFICULTY_TO_INT[difficulty] || 2,
          source: 'manual',
        };
        if (explanation.trim()) payload.explanation = explanation.trim();
        if (questionType === 'mcq') {
          payload.options = options.filter(o => o.trim());
        }
        await quizApi.createQuizQuestion(payload);
        toast.success('Pregunta creada');
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-[640px] max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              {isEdit ? <Pencil size={16} className="text-purple-600" /> : <Plus size={16} className="text-purple-600" />}
            </div>
            <div>
              <h3 className="text-sm text-gray-900" style={{ fontWeight: 700 }}>
                {isEdit ? 'Editar pregunta' : 'Nueva pregunta'}
              </h3>
              <p className="text-[10px] text-gray-400">Completa los campos y guarda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[12px]">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Row: Type + Difficulty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>Tipo de pregunta *</label>
              <select
                value={questionType}
                onChange={e => setQuestionType(e.target.value as QuestionType)}
                disabled={isEdit}
                className="w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>Dificultad *</label>
              <div className="flex gap-1.5">
                {(Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][]).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => setDifficulty(k)}
                    className={clsx(
                      'flex-1 py-2 rounded-lg text-[11px] border transition-all',
                      difficulty === k
                        ? DIFFICULTY_COLORS[k] + ' shadow-sm'
                        : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                    )}
                    style={{ fontWeight: difficulty === k ? 700 : 500 }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Keyword */}
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>
              Keyword <span className="text-gray-400" style={{ fontWeight: 400 }}>(opcional — si no eliges, se usara "General")</span>
            </label>
            <select
              value={keywordId}
              onChange={e => setKeywordId(e.target.value)}
              disabled={isEdit}
              className="w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">-- Sin keyword (se usara "General") --</option>
              {keywords.map(kw => (
                <option key={kw.id} value={kw.id}>{kw.term}</option>
              ))}
            </select>
          </div>

          {/* Question text */}
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>Pregunta *</label>
            <textarea
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              placeholder="Escribe la pregunta aqui..."
              rows={3}
              className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none placeholder:text-gray-300"
            />
          </div>

          {/* Dynamic answer section per type */}
          {questionType === 'mcq' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] text-gray-500" style={{ fontWeight: 600 }}>
                  Opciones * <span className="text-gray-400" style={{ fontWeight: 400 }}>(haz clic en el radio para marcar la correcta)</span>
                </label>
                {options.length < 6 && (
                  <button
                    onClick={addOption}
                    className="text-[10px] text-purple-600 hover:text-purple-800 flex items-center gap-0.5 transition-colors"
                    style={{ fontWeight: 600 }}
                  >
                    <Plus size={11} /> Agregar opcion
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      onClick={() => setCorrectAnswer(opt)}
                      className={clsx(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                        opt && correctAnswer === opt
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-gray-300 hover:border-purple-400'
                      )}
                      title="Marcar como correcta"
                      disabled={!opt.trim()}
                    >
                      {opt && correctAnswer === opt && <Check size={11} className="text-white" />}
                    </button>
                    <input
                      type="text"
                      value={opt}
                      onChange={e => handleOptionChange(i, e.target.value)}
                      placeholder={`Opcion ${String.fromCharCode(65 + i)}`}
                      className="flex-1 text-[12px] border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 placeholder:text-gray-300"
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => removeOption(i)}
                        className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {questionType === 'true_false' && (
            <div>
              <label className="text-[11px] text-gray-500 mb-2 block" style={{ fontWeight: 600 }}>Respuesta correcta *</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setCorrectAnswer('true')}
                  className={clsx(
                    'flex-1 py-2.5 rounded-lg text-[13px] border transition-all',
                    correctAnswer === 'true'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                  )}
                  style={{ fontWeight: correctAnswer === 'true' ? 700 : 500 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Check size={14} />
                    Verdadero
                  </div>
                </button>
                <button
                  onClick={() => setCorrectAnswer('false')}
                  className={clsx(
                    'flex-1 py-2.5 rounded-lg text-[13px] border transition-all',
                    correctAnswer === 'false'
                      ? 'bg-red-50 border-red-300 text-red-700 shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                  )}
                  style={{ fontWeight: correctAnswer === 'false' ? 700 : 500 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <X size={14} />
                    Falso
                  </div>
                </button>
              </div>
            </div>
          )}

          {questionType === 'open' && (
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>Respuesta correcta *</label>
              <textarea
                value={correctAnswer}
                onChange={e => setCorrectAnswer(e.target.value)}
                placeholder="Respuesta esperada..."
                rows={2}
                className="w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none placeholder:text-gray-300"
              />
            </div>
          )}

          {/* Explanation */}
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>
              Explicacion <span className="text-gray-400" style={{ fontWeight: 400 }}>(opcional, se muestra al alumno despues de responder)</span>
            </label>
            <textarea
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              placeholder="Por que esta es la respuesta correcta..."
              rows={2}
              className="w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100"
            style={{ fontWeight: 500 }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={clsx(
              'flex items-center gap-2 px-5 py-2 rounded-lg text-[12px] text-white transition-all shadow-sm',
              saving
                ? 'bg-purple-400 cursor-wait'
                : 'bg-purple-600 hover:bg-purple-700 active:scale-[0.97]'
            )}
            style={{ fontWeight: 600 }}
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> Guardando...</>
            ) : (
              <><Check size={14} /> {isEdit ? 'Guardar cambios' : 'Crear pregunta'}</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}