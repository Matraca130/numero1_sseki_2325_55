// ============================================================
// Axon — FlashcardsManager (Standalone CRUD Component)
//
// Receives summaryId as prop. Manages full flashcard CRUD:
// - List, Create, Edit, Delete, Restore, Toggle is_active
// - Keyword -> Subtopic cascade selector
// - Filters by keyword + search + show deleted
// - Counters: "X activas, Y inactivas"
//
// Used in ProfessorFlashcardsPage (now) and SummaryView (EV-2).
// Backend: FLAT routes via flashcardApi.ts
// ============================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiCall, ensureGeneralKeyword } from '@/app/lib/api';
import * as flashcardApi from '@/app/services/flashcardApi';
import type { FlashcardItem } from '@/app/services/flashcardApi';
import type { Keyword } from '@/app/types/platform';
import {
  CreditCard, Plus, Pencil, Trash2,
  Search, Tag,
  X, Check, AlertCircle, Loader2, Sparkles,
  Eye, EyeOff, Archive, ArchiveRestore,
  ToggleLeft, ToggleRight, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Subtopic type (from backend) ─────────────────────────

interface Subtopic {
  id: string;
  keyword_id: string;
  name: string;
  order_index: number;
  is_active?: boolean;
  deleted_at?: string | null;
}

// ── Props ─────────────────────────────────────────────────

interface FlashcardsManagerProps {
  summaryId: string;
}

// ── Flashcard Card Component ─────────────────────────────

function FlashcardCard({
  card,
  keywords,
  subtopicsMap,
  onEdit,
  onDelete,
  onRestore,
  onToggleActive,
}: {
  card: FlashcardItem;
  keywords: Keyword[];
  subtopicsMap: Map<string, Subtopic[]>;
  onEdit: (card: FlashcardItem) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onToggleActive: (id: string, currentActive: boolean) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const keyword = keywords.find(k => k.id === card.keyword_id);
  const isDeleted = !!card.deleted_at;
  const isInactive = !card.is_active && !isDeleted;

  // Find subtopic name
  const subtopicName = useMemo(() => {
    if (!card.subtopic_id) return null;
    for (const subs of subtopicsMap.values()) {
      const found = subs.find(s => s.id === card.subtopic_id);
      if (found) return found.name;
    }
    return null;
  }, [card.subtopic_id, subtopicsMap]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`bg-white rounded-xl border transition-all group ${
        isDeleted
          ? 'border-red-200 bg-red-50/30 opacity-70'
          : isInactive
            ? 'border-amber-200 bg-amber-50/20 opacity-80'
            : 'border-gray-100 hover:border-purple-200 hover:shadow-sm'
      }`}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {keyword && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-[10px] font-semibold uppercase tracking-wide shrink-0">
              <Tag size={10} />
              {keyword.term}
            </span>
          )}
          {subtopicName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-medium shrink-0">
              {subtopicName}
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
          {isInactive && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">
              Inactivo
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
                onClick={() => onToggleActive(card.id, card.is_active)}
                className={`p-1.5 rounded-lg transition-all ${
                  card.is_active
                    ? 'hover:bg-amber-50 text-gray-400 hover:text-amber-600'
                    : 'hover:bg-green-50 text-gray-400 hover:text-green-600'
                }`}
                title={card.is_active ? 'Desactivar' : 'Activar'}
              >
                {card.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              </button>
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
  subtopicsMap,
  summaryId,
  onClose,
  onSaved,
  loadSubtopicsForKeyword,
}: {
  isOpen: boolean;
  editingCard: FlashcardItem | null;
  keywords: Keyword[];
  subtopicsMap: Map<string, Subtopic[]>;
  summaryId: string;
  onClose: () => void;
  onSaved: () => void;
  loadSubtopicsForKeyword: (keywordId: string) => Promise<void>;
}) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [keywordId, setKeywordId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [source, setSource] = useState<'manual' | 'ai'>('manual');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subtopicsLoading, setSubtopicsLoading] = useState(false);

  const isEditing = !!editingCard;

  // Current subtopics for selected keyword
  const currentSubtopics = keywordId ? (subtopicsMap.get(keywordId) || []) : [];

  useEffect(() => {
    if (editingCard) {
      setFront(editingCard.front);
      setBack(editingCard.back);
      setKeywordId(editingCard.keyword_id);
      setSubtopicId(editingCard.subtopic_id || '');
      setSource(editingCard.source === 'ai' ? 'ai' : 'manual');
      // Load subtopics for the editing card's keyword
      if (editingCard.keyword_id) {
        loadSubtopicsForKeyword(editingCard.keyword_id);
      }
    } else {
      setFront('');
      setBack('');
      setKeywordId('');
      setSubtopicId('');
      setSource('manual');
    }
    setError(null);
  }, [editingCard, isOpen]);

  // Load subtopics when keyword changes
  const handleKeywordChange = async (newKeywordId: string) => {
    setKeywordId(newKeywordId);
    setSubtopicId(''); // Reset subtopic
    if (newKeywordId) {
      setSubtopicsLoading(true);
      await loadSubtopicsForKeyword(newKeywordId);
      setSubtopicsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) {
      setError('Frente y reverso son requeridos');
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
          subtopic_id: subtopicId || null,
        });
        toast.success('Flashcard actualizada');
      } else {
        // Resolve keyword: use selected or auto-create "General"
        const resolvedKeywordId = keywordId || (await ensureGeneralKeyword(summaryId)).id;
        await flashcardApi.createFlashcard({
          summary_id: summaryId,
          keyword_id: resolvedKeywordId,
          subtopic_id: subtopicId || null,
          front: front.trim(),
          back: back.trim(),
          source,
        });
        toast.success('Flashcard creada');
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
                <h3 className="font-bold text-gray-900">{isEditing ? 'Editar Flashcard' : 'Nueva Flashcard'}</h3>
                <p className="text-xs text-gray-400">
                  {isEditing ? 'Modifica el contenido' : 'Asociada a un keyword del resumen'}
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
                Keyword <span className="font-normal normal-case tracking-normal">(requerido)</span>
              </label>
              <select
                value={keywordId}
                onChange={(e) => handleKeywordChange(e.target.value)}
                disabled={isEditing}
                className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all ${
                  isEditing ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'
                }`}
              >
                <option value="">General (automatico)</option>
                {keywords.map(kw => (
                  <option key={kw.id} value={kw.id}>
                    {kw.term}{kw.definition ? ` — ${kw.definition.substring(0, 40)}...` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Subtopic selector (cascade from keyword) */}
            {keywordId && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Subtopic <span className="font-normal normal-case tracking-normal">(opcional)</span>
                </label>
                {subtopicsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                    <Loader2 size={12} className="animate-spin" /> Cargando subtopics...
                  </div>
                ) : currentSubtopics.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-1">No hay subtopics para este keyword</p>
                ) : (
                  <select
                    value={subtopicId}
                    onChange={(e) => setSubtopicId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all"
                  >
                    <option value="">Sin subtopic</option>
                    {currentSubtopics.map(st => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

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

// ── Main FlashcardsManager Component ─────────────────────

export function FlashcardsManager({ summaryId }: FlashcardsManagerProps) {
  // Data
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [subtopicsMap, setSubtopicsMap] = useState<Map<string, Subtopic[]>>(new Map());
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

  // ── Load keywords for this summary ──────────────────────
  useEffect(() => {
    if (!summaryId) return;
    setKeywordsLoading(true);
    apiCall<any>(`/keywords?summary_id=${summaryId}`)
      .then(data => {
        const items = Array.isArray(data) ? data : data?.items || [];
        setKeywords(items);
      })
      .catch(err => {
        console.error('[FlashcardsManager] Keywords error:', err);
        setKeywords([]);
      })
      .finally(() => setKeywordsLoading(false));
  }, [summaryId]);

  // ── Load subtopics for a keyword (on demand, cached) ────
  const loadSubtopicsForKeyword = useCallback(async (keywordId: string) => {
    if (subtopicsMap.has(keywordId)) return; // Already cached
    try {
      const data = await apiCall<any>(`/subtopics?keyword_id=${keywordId}`);
      const items: Subtopic[] = Array.isArray(data) ? data : data?.items || [];
      setSubtopicsMap(prev => {
        const next = new Map(prev);
        next.set(keywordId, items);
        return next;
      });
    } catch (err) {
      console.error('[FlashcardsManager] Subtopics error:', err);
      setSubtopicsMap(prev => {
        const next = new Map(prev);
        next.set(keywordId, []);
        return next;
      });
    }
  }, [subtopicsMap]);

  // ── Load flashcards ─────────────────────────────────────
  const loadFlashcards = useCallback(async () => {
    if (!summaryId) {
      setFlashcards([]);
      setFlashcardsTotal(0);
      return;
    }
    setFlashcardsLoading(true);
    try {
      const result = await flashcardApi.getFlashcards(
        summaryId,
        filterKeywordId || undefined,
        { limit: 200 }
      );
      const items = Array.isArray(result) ? result : result.items || [];
      const total = Array.isArray(result) ? items.length : result.total || items.length;
      setFlashcards(items);
      setFlashcardsTotal(total);
    } catch (err: any) {
      console.error('[FlashcardsManager] Load error:', err);
      setFlashcards([]);
      setFlashcardsTotal(0);
    } finally {
      setFlashcardsLoading(false);
    }
  }, [summaryId, filterKeywordId]);

  useEffect(() => {
    loadFlashcards();
  }, [loadFlashcards]);

  // ── Reset filters when summaryId changes ────────────────
  useEffect(() => {
    setFilterKeywordId(null);
    setSearchQuery('');
    setShowDeleted(false);
    setSubtopicsMap(new Map());
  }, [summaryId]);

  // ── Handlers ────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta flashcard?')) return;
    try {
      await flashcardApi.deleteFlashcard(id);
      toast.success('Flashcard eliminada');
      loadFlashcards();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await flashcardApi.restoreFlashcard(id);
      toast.success('Flashcard restaurada');
      loadFlashcards();
    } catch (err: any) {
      toast.error(err.message || 'Error al restaurar');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await flashcardApi.updateFlashcard(id, { is_active: !currentActive });
      toast.success(currentActive ? 'Flashcard desactivada' : 'Flashcard activada');
      loadFlashcards();
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar estado');
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
      cards = cards.filter(c => !c.deleted_at);
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

  // ── Counters ────────────────────────────────────────────
  const counters = useMemo(() => {
    const nonDeleted = flashcards.filter(c => !c.deleted_at);
    const active = nonDeleted.filter(c => c.is_active);
    const inactive = nonDeleted.filter(c => !c.is_active);
    return { active: active.length, inactive: inactive.length };
  }, [flashcards]);

  // ── Keyword stats ───────────────────────────────────────
  const keywordStats = useMemo(() => {
    const map = new Map<string, number>();
    const activeCards = flashcards.filter(c => !c.deleted_at && c.is_active !== false);
    for (const card of activeCards) {
      map.set(card.keyword_id, (map.get(card.keyword_id) || 0) + 1);
    }
    return map;
  }, [flashcards]);

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header Bar ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <CreditCard size={16} className="text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Flashcards</h2>
              <p className="text-[11px] text-gray-400">
                {counters.active} activa{counters.active !== 1 ? 's' : ''}
                {counters.inactive > 0 && (
                  <span className="text-amber-500">, {counters.inactive} inactiva{counters.inactive !== 1 ? 's' : ''}</span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-all shadow-sm shadow-purple-200"
          >
            <Plus size={16} />
            Nueva Flashcard
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      {flashcards.length > 0 && (
        <div className="bg-white border-b border-gray-100 px-6 py-2.5 shrink-0">
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

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Loading */}
        {flashcardsLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-purple-400" />
          </div>
        )}

        {/* Empty state */}
        {!flashcardsLoading && filteredCards.length === 0 && (
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
                : 'Este resumen aun no tiene flashcards. Crea la primera!'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-all"
              >
                <Plus size={16} />
                Crear primera flashcard
              </button>
            )}
          </div>
        )}

        {/* Flashcard grid */}
        {!flashcardsLoading && filteredCards.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredCards.map(card => (
                <FlashcardCard
                  key={card.id}
                  card={card}
                  keywords={keywords}
                  subtopicsMap={subtopicsMap}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onRestore={handleRestore}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Form Modal ── */}
      <FlashcardFormModal
        isOpen={modalOpen}
        editingCard={editingCard}
        keywords={keywords}
        subtopicsMap={subtopicsMap}
        summaryId={summaryId}
        onClose={() => { setModalOpen(false); setEditingCard(null); }}
        onSaved={loadFlashcards}
        loadSubtopicsForKeyword={loadSubtopicsForKeyword}
      />
    </div>
  );
}

export default FlashcardsManager;
