// ============================================================
// Axon — Professor: Flashcards Management
// PARALLEL-SAFE: This file is independent.
// Backend: FLAT routes via /src/app/services/flashcardApi.ts
// ============================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/app/context/AuthContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { apiCall, ensureGeneralKeyword } from '@/app/lib/api';
import * as flashcardApi from '@/app/services/flashcardApi';
import type { FlashcardItem } from '@/app/services/flashcardApi';
import type { Summary, Keyword } from '@/app/types/platform';
import type { TreeCourse } from '@/app/services/contentTreeApi';
import {
  CreditCard, Plus, Pencil, Trash2,
  Search, BookOpen, Tag, Layers, GraduationCap,
  X, Check, AlertCircle, Loader2, FileText, Sparkles,
  Eye, EyeOff, Archive, ArchiveRestore,
} from 'lucide-react';
import { toast } from 'sonner';

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

// ── Flashcard Card Component ─────────────────────────────

function FlashcardCard({
  card,
  keywords,
  onEdit,
  onDelete,
  onRestore,
}: {
  card: FlashcardItem;
  keywords: Keyword[];
  onEdit: (card: FlashcardItem) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const keyword = keywords.find(k => k.id === card.keyword_id);
  const isDeleted = !!card.deleted_at || !card.is_active;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`bg-white rounded-xl border transition-all group ${
        isDeleted
          ? 'border-red-200 bg-red-50/30 opacity-70'
          : 'border-gray-100 hover:border-purple-200 hover:shadow-sm'
      }`}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          {keyword && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-[10px] font-semibold uppercase tracking-wide shrink-0">
              <Tag size={10} />
              {keyword.term}
            </span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            card.source === 'ai'
              ? 'bg-amber-50 text-amber-600'
              : card.source === 'manual'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-gray-50 text-gray-500'
          }`}>
            {card.source === 'ai' ? 'IA' : card.source === 'manual' ? 'Manual' : card.source}
          </span>
          {isDeleted && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
              Eliminado
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setFlipped(!flipped)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
            title={flipped ? 'Ver frente' : 'Ver reverso'}
          >
            {flipped ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          {!isDeleted && (
            <>
              <button
                onClick={() => onEdit(card)}
                className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-all"
                title="Editar"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(card.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
          {isDeleted && (
            <button
              onClick={() => onRestore(card.id)}
              className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-all"
              title="Restaurar"
            >
              <ArchiveRestore size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Card content */}
      <div className="px-4 py-3 min-h-[72px]">
        <div className="flex items-start gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 shrink-0 ${
            flipped ? 'text-emerald-500' : 'text-purple-400'
          }`}>
            {flipped ? 'Reverso' : 'Frente'}
          </span>
          <p className="text-sm text-gray-700 leading-relaxed">
            {flipped ? card.back : card.front}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Create / Edit Modal ──────────────────────────────────

function FlashcardFormModal({
  isOpen,
  editingCard,
  keywords,
  summaryId,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  editingCard: FlashcardItem | null;
  keywords: Keyword[];
  summaryId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [keywordId, setKeywordId] = useState('');
  const [source, setSource] = useState<'manual' | 'ai'>('manual');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingCard;

  useEffect(() => {
    if (editingCard) {
      setFront(editingCard.front);
      setBack(editingCard.back);
      setKeywordId(editingCard.keyword_id);
      setSource(editingCard.source === 'ai' ? 'ai' : 'manual');
    } else {
      setFront('');
      setBack('');
      setKeywordId('');
      setSource('manual');
    }
    setError(null);
  }, [editingCard, isOpen, keywords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) {
      setError('Front y back son requeridos');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isEditing && editingCard) {
        await flashcardApi.updateFlashcard(editingCard.id, {
          front: front.trim(),
          back: back.trim(),
          source,
        });
        toast.success('Flashcard actualizado');
      } else {
        // Resolve keyword: use selected or auto-create "General"
        const resolvedKeywordId = keywordId || (await ensureGeneralKeyword(summaryId)).id;
        await flashcardApi.createFlashcard({
          summary_id: summaryId,
          keyword_id: resolvedKeywordId,
          front: front.trim(),
          back: back.trim(),
          source,
        });
        toast.success('Flashcard creado');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('[FlashcardForm] Error:', err);
      setError(err.message || 'Error al guardar');
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4"
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                {isEditing ? <Pencil size={16} className="text-purple-600" /> : <Plus size={16} className="text-purple-600" />}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{isEditing ? 'Editar Flashcard' : 'Nuevo Flashcard'}</h3>
                <p className="text-xs text-gray-400">
                  {isEditing ? 'Modifica el contenido' : 'Asociado a un keyword del resumen'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-all">
              <X size={18} />
            </button>
          </div>

          {/* Modal body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Keyword selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Keyword <span className="font-normal normal-case tracking-normal">(opcional)</span>
              </label>
              <select
                value={keywordId}
                onChange={(e) => setKeywordId(e.target.value)}
                disabled={isEditing}
                className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all ${
                  isEditing ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'
                }`}
              >
                <option value="">General (automatico)</option>
                {keywords.map(kw => (
                  <option key={kw.id} value={kw.id}>{kw.term}{kw.definition ? ` — ${kw.definition.substring(0, 40)}...` : ''}</option>
                ))}
              </select>
            </div>

            {/* Front */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Frente (pregunta)
              </label>
              <textarea
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="Escribe la pregunta o concepto..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all resize-none"
              />
            </div>

            {/* Back */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Reverso (respuesta)
              </label>
              <textarea
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="Escribe la respuesta o explicacion..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all resize-none"
              />
            </div>

            {/* Source */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Fuente
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSource('manual')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    source === 'manual'
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Pencil size={12} /> Manual
                </button>
                <button
                  type="button"
                  onClick={() => setSource('ai')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    source === 'ai'
                      ? 'bg-amber-50 text-amber-600 border border-amber-200'
                      : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Sparkles size={12} /> IA
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2 text-sm">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {isEditing ? 'Guardar cambios' : 'Crear flashcard'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
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

  // Data
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [flashcardsTotal, setFlashcardsTotal] = useState(0);

  // Filters
  const [filterKeywordId, setFilterKeywordId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashcardItem | null>(null);

  // ── Load keywords for selected summary ──────────────────
  useEffect(() => {
    if (!selectedSummary) {
      setKeywords([]);
      return;
    }
    setKeywordsLoading(true);
    apiCall<Keyword[]>(`/keywords?summary_id=${selectedSummary.id}`)
      .then(data => {
        const items = Array.isArray(data) ? data : (data as any)?.items || [];
        setKeywords(items);
      })
      .catch(err => {
        console.error('[ProfFlashcards] Keywords error:', err);
        setKeywords([]);
      })
      .finally(() => setKeywordsLoading(false));
  }, [selectedSummary?.id]);

  // ── Load summaries when topic selected ──────────────────
  useEffect(() => {
    if (!selectedTopicId) {
      setSummaries([]);
      setSelectedSummary(null);
      return;
    }
    setSummariesLoading(true);
    // Flat route: GET /summaries?topic_id=xxx
    apiCall<any>(`/summaries?topic_id=${selectedTopicId}`)
      .then(data => {
        const items = Array.isArray(data) ? data : (data as any)?.items || [];
        setSummaries(items);
        // Auto-select first summary if available
        if (items.length > 0 && !selectedSummary) {
          setSelectedSummary(items[0]);
        }
      })
      .catch(err => {
        console.error('[ProfFlashcards] Summaries error:', err);
        setSummaries([]);
      })
      .finally(() => setSummariesLoading(false));
  }, [selectedTopicId]);

  // ── Load flashcards when summary selected ───────────────
  const loadFlashcards = useCallback(async () => {
    if (!selectedSummary) {
      setFlashcards([]);
      setFlashcardsTotal(0);
      return;
    }
    setFlashcardsLoading(true);
    try {
      const result = await flashcardApi.getFlashcards(
        selectedSummary.id,
        filterKeywordId || undefined,
        { limit: 100 }
      );
      // Handle both shapes: { items, total } or plain array
      const items = Array.isArray(result) ? result : result.items || [];
      const total = Array.isArray(result) ? items.length : result.total || items.length;
      setFlashcards(items);
      setFlashcardsTotal(total);
    } catch (err: any) {
      console.error('[ProfFlashcards] Load error:', err);
      setFlashcards([]);
      setFlashcardsTotal(0);
    } finally {
      setFlashcardsLoading(false);
    }
  }, [selectedSummary, filterKeywordId]);

  useEffect(() => {
    loadFlashcards();
  }, [loadFlashcards]);

  // ── Handlers ────────────────────────────────────────────
  const handleSelectTopic = (topicId: string, topicName: string) => {
    setSelectedTopicId(topicId);
    setSelectedTopicName(topicName);
    setSelectedSummary(null);
    setFilterKeywordId(null);
    setSearchQuery('');
  };

  const handleSelectSummary = (summary: Summary) => {
    setSelectedSummary(summary);
    setFilterKeywordId(null);
    setSearchQuery('');
  };

  const handleDelete = async (id: string) => {
    try {
      await flashcardApi.deleteFlashcard(id);
      toast.success('Flashcard eliminado');
      loadFlashcards();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await flashcardApi.restoreFlashcard(id);
      toast.success('Flashcard restaurado');
      loadFlashcards();
    } catch (err: any) {
      toast.error(err.message || 'Error al restaurar');
    }
  };

  const handleEdit = (card: FlashcardItem) => {
    setEditingCard(card);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingCard(null);
    setModalOpen(true);
  };

  // ── Filtered flashcards ─────────────────────────────────
  const filteredCards = useMemo(() => {
    let cards = flashcards;
    if (!showDeleted) {
      cards = cards.filter(c => !c.deleted_at && c.is_active !== false);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      cards = cards.filter(c =>
        c.front.toLowerCase().includes(q) ||
        c.back.toLowerCase().includes(q)
      );
    }
    return cards;
  }, [flashcards, showDeleted, searchQuery]);

  // ── Keyword stats for this summary ──────────────────────
  const keywordStats = useMemo(() => {
    const map = new Map<string, number>();
    const activeCards = flashcards.filter(c => !c.deleted_at && c.is_active !== false);
    for (const card of activeCards) {
      map.set(card.keyword_id, (map.get(card.keyword_id) || 0) + 1);
    }
    return map;
  }, [flashcards]);

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <CreditCard size={18} className="text-purple-600" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Flashcards</h1>
                <p className="text-xs text-gray-400">
                  {selectedSummary
                    ? `${topicPath}`
                    : 'Selecciona un topico y resumen para gestionar flashcards'
                  }
                </p>
              </div>
            </div>

            {/* Stats */}
            {selectedSummary && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-600">{flashcardsTotal}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Cards</p>
                </div>
                {selectedSummary && (
                  <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-all shadow-sm shadow-purple-200"
                  >
                    <Plus size={16} />
                    Nuevo Flashcard
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Summary Selector ── */}
        {selectedTopicId && (
          <div className="bg-white border-b border-gray-100 px-6 py-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 shrink-0">Resumen:</span>
              {summariesLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Loader2 size={12} className="animate-spin" /> Cargando...
                </div>
              ) : summaries.length === 0 ? (
                <span className="text-xs text-gray-400 italic">No hay resumenes para este topico</span>
              ) : (
                <div className="flex items-center gap-2 overflow-x-auto">
                  {summaries.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSummary(s)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                        selectedSummary?.id === s.id
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <FileText size={12} />
                      {s.title || `Resumen ${s.id.substring(0, 8)}`}
                      <span className={`text-[10px] px-1 rounded ${
                        s.status === 'published' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {s.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Keyword Filter Bar ── */}
        {selectedSummary && flashcards.length > 0 && (
          <div className="bg-white border-b border-gray-100 px-6 py-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar flashcards..."
                    className="pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-xs w-52 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>

                {/* Keyword pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    onClick={() => setFilterKeywordId(null)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                      !filterKeywordId
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Todos
                    <span className="text-[10px] opacity-70">({flashcardsTotal})</span>
                  </button>
                  {keywords.filter(kw => keywordStats.has(kw.id)).map(kw => (
                    <button
                      key={kw.id}
                      onClick={() => setFilterKeywordId(filterKeywordId === kw.id ? null : kw.id)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                        filterKeywordId === kw.id
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Tag size={10} />
                      {kw.term}
                      <span className="text-[10px] opacity-70">({keywordStats.get(kw.id) || 0})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Show deleted toggle */}
              <button
                onClick={() => setShowDeleted(!showDeleted)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  showDeleted
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Archive size={12} />
                Eliminados
              </button>
            </div>
          </div>
        )}

        {/* ── Flashcard List ── */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* No topic selected */}
          {!selectedTopicId && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                <CreditCard size={32} className="text-purple-300" />
              </div>
              <h3 className="font-bold text-gray-700 mb-1">Gestion de Flashcards</h3>
              <p className="text-sm text-gray-400 max-w-md">
                Selecciona un topico en el arbol de contenido para ver y gestionar los flashcards asociados a sus resumenes.
              </p>
            </div>
          )}

          {/* Topic selected but no summary */}
          {selectedTopicId && !selectedSummary && !summariesLoading && summaries.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                <FileText size={28} className="text-amber-300" />
              </div>
              <h3 className="font-bold text-gray-700 mb-1">Sin resumenes</h3>
              <p className="text-sm text-gray-400 max-w-md">
                El topico <strong>{selectedTopicName}</strong> no tiene resumenes.
                Crea un resumen primero para poder agregar flashcards.
              </p>
            </div>
          )}

          {/* Loading */}
          {flashcardsLoading && selectedSummary && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-purple-400" />
            </div>
          )}

          {/* Summary selected but no flashcards */}
          {selectedSummary && !flashcardsLoading && filteredCards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                <CreditCard size={28} className="text-purple-300" />
              </div>
              <h3 className="font-bold text-gray-700 mb-1">
                {searchQuery ? 'Sin resultados' : 'Sin flashcards'}
              </h3>
              <p className="text-sm text-gray-400 max-w-md mb-4">
                {searchQuery
                  ? `No se encontraron flashcards para "${searchQuery}"`
                  : 'Este resumen aun no tiene flashcards. Crea el primero!'
                }
              </p>
              {!searchQuery && (
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-all"
                >
                  <Plus size={16} />
                  Crear primer flashcard
                </button>
              )}
            </div>
          )}

          {/* Flashcard grid */}
          {selectedSummary && !flashcardsLoading && filteredCards.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredCards.map(card => (
                  <FlashcardCard
                    key={card.id}
                    card={card}
                    keywords={keywords}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onRestore={handleRestore}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ══════ Form Modal ══════ */}
      {selectedSummary && (
        <FlashcardFormModal
          isOpen={modalOpen}
          editingCard={editingCard}
          keywords={keywords}
          summaryId={selectedSummary.id}
          onClose={() => { setModalOpen(false); setEditingCard(null); }}
          onSaved={loadFlashcards}
        />
      )}
    </div>
  );
}