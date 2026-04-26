// ============================================================
// useFlashcardsManager — Custom hook for FlashcardsManager state
//
// Extracts all state management, data fetching, handlers, and
// computed values from FlashcardsManager into a reusable hook.
// ============================================================
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiCall } from '@/app/lib/api';
import * as flashcardApi from '@/app/services/flashcardApi';
import type { FlashcardItem } from '@/app/services/flashcardApi';
import type { Keyword } from '@/app/types/platform';
import type { Subtopic } from '@/app/types/flashcard-manager';
import { detectCardType } from '@/app/lib/flashcard-utils';
import { toast } from 'sonner';
import { useAuth } from '@/app/context/AuthContext';

// ── Types ─────────────────────────────────────────────────

export type FilterType = 'all' | 'text' | 'image' | 'cloze';

export interface ConfirmAction {
  title: string;
  description: string;
  confirmLabel: string;
  variant: 'destructive' | 'default';
  onConfirm: () => void;
}

export interface FlashcardsManagerState {
  // Auth
  currentUserId: string;

  // Data
  keywords: Keyword[];
  keywordsLoading: boolean;
  subtopicsMap: Map<string, Subtopic[]>;
  flashcards: FlashcardItem[];
  flashcardsLoading: boolean;
  flashcardsTotal: number;

  // Filters
  filterKeywordId: string | null;
  setFilterKeywordId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showDeleted: boolean;
  setShowDeleted: (v: boolean) => void;
  filterType: FilterType;
  setFilterType: (v: FilterType) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;

  // Selection
  selectedFlashcards: string[];
  setSelectedFlashcards: (ids: string[]) => void;
  handleToggleSelect: (id: string) => void;
  handleSelectAll: () => void;

  // Modal
  modalOpen: boolean;
  setModalOpen: (v: boolean) => void;
  editingCard: FlashcardItem | null;
  setEditingCard: (card: FlashcardItem | null) => void;
  bulkImportOpen: boolean;
  setBulkImportOpen: (v: boolean) => void;

  // Confirm dialog
  confirmAction: ConfirmAction | null;
  setConfirmAction: (a: ConfirmAction | null) => void;

  // Derived data
  filteredCards: FlashcardItem[];
  counters: { active: number; inactive: number };
  keywordStats: Map<string, number>;
  typeStats: { text: number; image: number; cloze: number; total: number };

  // Handlers
  loadFlashcards: () => Promise<void>;
  loadSubtopicsForKeyword: (keywordId: string) => Promise<void>;
  handleDelete: (id: string) => void;
  handleRestore: (id: string) => Promise<void>;
  handleToggleActive: (id: string, currentActive: boolean) => Promise<void>;
  handleEdit: (card: FlashcardItem) => void;
  handleCreate: () => void;
  handleDuplicate: (card: FlashcardItem) => Promise<void>;
  handleBulkToggleActive: (activate: boolean) => void;
  handleBulkDelete: () => void;
  handleBulkAssignKeyword: (kwId: string) => void;
  handleExport: (format: 'csv' | 'json', onlySelected: boolean) => void;
}

// ── Hook ──────────────────────────────────────────────────

export function useFlashcardsManager(summaryId: string): FlashcardsManagerState {
  const { user } = useAuth();
  const currentUserId = user?.id || '';

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
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Selection
  const [selectedFlashcards, setSelectedFlashcards] = useState<string[]>([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashcardItem | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  // ── Load keywords for this summary ──────────────────────
  useEffect(() => {
    if (!summaryId) return;
    let cancelled = false;
    setKeywordsLoading(true);
    apiCall<any>(`/keywords?summary_id=${summaryId}`)
      .then(data => {
        if (cancelled) return;
        const items = Array.isArray(data) ? data : data?.items || [];
        setKeywords(items);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[FlashcardsManager] Keywords error:', err);
        setKeywords([]);
      })
      .finally(() => {
        if (!cancelled) setKeywordsLoading(false);
      });
    return () => { cancelled = true; };
  }, [summaryId]);

  // ── Load subtopics for a keyword (on demand, cached) ────
  const loadSubtopicsForKeyword = useCallback(async (keywordId: string) => {
    if (subtopicsMap.has(keywordId)) return;
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
  // Stale-response guard: every call increments reqId, so older in-flight
  // responses are dropped when summaryId/filterKeywordId change quickly.
  const loadFlashcardsReqId = useRef(0);
  const loadFlashcards = useCallback(async () => {
    const reqId = ++loadFlashcardsReqId.current;
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
      if (reqId !== loadFlashcardsReqId.current) return;
      const items = Array.isArray(result) ? result : result.items || [];
      const total = Array.isArray(result) ? items.length : result.total || items.length;
      setFlashcards(items);
      setFlashcardsTotal(total);
    } catch (err: any) {
      if (reqId !== loadFlashcardsReqId.current) return;
      console.error('[FlashcardsManager] Load error:', err);
      setFlashcards([]);
      setFlashcardsTotal(0);
    } finally {
      if (reqId === loadFlashcardsReqId.current) {
        setFlashcardsLoading(false);
      }
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
  const handleDelete = (id: string) => {
    setConfirmAction({
      title: 'Eliminar flashcard',
      description: 'Esta flashcard sera eliminada. Puedes restaurarla despues.',
      confirmLabel: 'Eliminar',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await flashcardApi.deleteFlashcard(id);
          toast.success('Flashcard eliminada');
          loadFlashcards();
        } catch (err: any) {
          toast.error(err.message || 'Error al eliminar');
        }
        setConfirmAction(null);
      },
    });
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

  const handleDuplicate = async (card: FlashcardItem) => {
    try {
      await flashcardApi.createFlashcard({
        summary_id: summaryId,
        keyword_id: card.keyword_id,
        subtopic_id: card.subtopic_id || null,
        front: card.front,
        back: card.back,
        source: 'manual',
        front_image_url: card.front_image_url || null,
        back_image_url: card.back_image_url || null,
      });
      toast.success('Flashcard duplicada');
      loadFlashcards();
    } catch (err: any) {
      toast.error(err.message || 'Error al duplicar');
    }
  };

  const handleToggleSelect = (id: string) => {
    const index = selectedFlashcards.indexOf(id);
    if (index > -1) {
      setSelectedFlashcards(selectedFlashcards.filter(c => c !== id));
    } else {
      setSelectedFlashcards([...selectedFlashcards, id]);
    }
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
    if (filterType !== 'all') {
      cards = cards.filter(c => {
        const type = detectCardType(c.front, c.back);
        if (filterType === 'text') return type === 'text';
        if (filterType === 'image') return ['text_image', 'image_text', 'image_image', 'text_both'].includes(type);
        if (filterType === 'cloze') return type === 'cloze';
        return true;
      });
    }
    return cards;
  }, [flashcards, showDeleted, searchQuery, filterType]);

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

  // ── Card type stats ─────────────────────────────────────
  const typeStats = useMemo(() => {
    const nonDeleted = flashcards.filter(c => !c.deleted_at);
    const stats = { text: 0, image: 0, cloze: 0, total: nonDeleted.length };
    for (const c of nonDeleted) {
      const t = detectCardType(c.front, c.back);
      if (t === 'cloze') stats.cloze++;
      else if (['text_image', 'image_text', 'image_image', 'text_both'].includes(t)) stats.image++;
      else stats.text++;
    }
    return stats;
  }, [flashcards]);

  // ── Bulk actions ────────────────────────────────────────
  const handleSelectAll = () => {
    if (selectedFlashcards.length === filteredCards.length) {
      setSelectedFlashcards([]);
    } else {
      setSelectedFlashcards(filteredCards.map(c => c.id));
    }
  };

  const handleBulkToggleActive = (activate: boolean) => {
    if (!selectedFlashcards.length) return;
    setConfirmAction({
      title: `${activate ? 'Activar' : 'Desactivar'} flashcards`,
      description: `Se ${activate ? 'activaran' : 'desactivaran'} ${selectedFlashcards.length} flashcard(s).`,
      confirmLabel: activate ? 'Activar' : 'Desactivar',
      variant: 'default',
      onConfirm: async () => {
        let ok = 0;
        for (const id of selectedFlashcards) {
          try {
            await flashcardApi.updateFlashcard(id, { is_active: activate });
            ok++;
          } catch (err) { console.error(`Bulk toggle error:`, err); }
        }
        toast.success(`${ok} flashcard(s) ${activate ? 'activadas' : 'desactivadas'}`);
        setSelectedFlashcards([]);
        loadFlashcards();
        setConfirmAction(null);
      },
    });
  };

  const handleBulkDelete = () => {
    if (!selectedFlashcards.length) return;
    setConfirmAction({
      title: 'Eliminar flashcards',
      description: `Se eliminaran ${selectedFlashcards.length} flashcard(s). Puedes restaurarlas despues.`,
      confirmLabel: 'Eliminar',
      variant: 'destructive',
      onConfirm: async () => {
        let ok = 0;
        for (const id of selectedFlashcards) {
          try {
            await flashcardApi.deleteFlashcard(id);
            ok++;
          } catch (err) { console.error('Bulk delete error:', err); }
        }
        toast.success(`${ok} flashcard(s) eliminadas`);
        setSelectedFlashcards([]);
        loadFlashcards();
        setConfirmAction(null);
      },
    });
  };

  const handleBulkAssignKeyword = (kwId: string) => {
    if (!selectedFlashcards.length || !kwId) return;
    const kw = keywords.find(k => k.id === kwId);
    setConfirmAction({
      title: 'Asignar keyword',
      description: `Asignar keyword "${kw?.term || kwId}" a ${selectedFlashcards.length} flashcard(s)?`,
      confirmLabel: 'Asignar',
      variant: 'default',
      onConfirm: async () => {
        let ok = 0;
        for (const id of selectedFlashcards) {
          try {
            await flashcardApi.updateFlashcard(id, { keyword_id: kwId });
            ok++;
          } catch (err) { console.error('Bulk assign keyword error:', err); }
        }
        toast.success(`${ok} flashcard(s) asignadas a "${kw?.term || kwId}"`);
        setSelectedFlashcards([]);
        loadFlashcards();
        setConfirmAction(null);
      },
    });
  };

  // ── Export ──────────────────────────────────────────────
  const handleExport = (format: 'csv' | 'json', onlySelected: boolean) => {
    const cards = onlySelected
      ? flashcards.filter(c => selectedFlashcards.includes(c.id))
      : filteredCards;
    if (cards.length === 0) { toast.error('No hay flashcards para exportar'); return; }

    const date = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      const header = 'front,back,keyword,subtopic,type,source,front_image_url,back_image_url';
      const rows = cards.map(c => {
        const kw = keywords.find(k => k.id === c.keyword_id);
        let stName = '';
        if (c.subtopic_id) {
          for (const subs of subtopicsMap.values()) {
            const s = subs.find(s => s.id === c.subtopic_id);
            if (s) { stName = s.name; break; }
          }
        }
        const type = detectCardType(c.front, c.back);
        const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
        return `${esc(c.front)},${esc(c.back)},${esc(kw?.term || '')},${esc(stName)},${type},${c.source},${esc(c.front_image_url || '')},${esc(c.back_image_url || '')}`;
      });
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `flashcards-${date}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`${cards.length} flashcards exportadas como CSV`);
    } else {
      const data = cards.map(c => {
        const kw = keywords.find(k => k.id === c.keyword_id);
        let stName = '';
        if (c.subtopic_id) {
          for (const subs of subtopicsMap.values()) {
            const s = subs.find(s => s.id === c.subtopic_id);
            if (s) { stName = s.name; break; }
          }
        }
        return {
          front: c.front,
          back: c.back,
          keyword: kw?.term || '',
          subtopic: stName,
          type: detectCardType(c.front, c.back),
          source: c.source,
          front_image_url: c.front_image_url || null,
          back_image_url: c.back_image_url || null,
        };
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `flashcards-${date}.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`${cards.length} flashcards exportadas como JSON`);
    }
  };

  const clearFilters = () => {
    setFilterKeywordId(null);
    setSearchQuery('');
    setShowDeleted(false);
    setFilterType('all');
    setSelectedFlashcards([]);
  };

  const hasActiveFilters = !!filterKeywordId || !!searchQuery.trim() || showDeleted || filterType !== 'all';

  return {
    currentUserId,
    keywords,
    keywordsLoading,
    subtopicsMap,
    flashcards,
    flashcardsLoading,
    flashcardsTotal,
    filterKeywordId,
    setFilterKeywordId,
    searchQuery,
    setSearchQuery,
    showDeleted,
    setShowDeleted,
    filterType,
    setFilterType,
    hasActiveFilters,
    clearFilters,
    selectedFlashcards,
    setSelectedFlashcards,
    handleToggleSelect,
    handleSelectAll,
    modalOpen,
    setModalOpen,
    editingCard,
    setEditingCard,
    bulkImportOpen,
    setBulkImportOpen,
    confirmAction,
    setConfirmAction,
    filteredCards,
    counters,
    keywordStats,
    typeStats,
    loadFlashcards,
    loadSubtopicsForKeyword,
    handleDelete,
    handleRestore,
    handleToggleActive,
    handleEdit,
    handleCreate,
    handleDuplicate,
    handleBulkToggleActive,
    handleBulkDelete,
    handleBulkAssignKeyword,
    handleExport,
  };
}
