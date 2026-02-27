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
  ToggleLeft, ToggleRight, ChevronDown, Upload,
  Image as ImageIcon, Link2, Trash,
  Copy, Download, Filter, CheckSquare, Square,
  XCircle, BarChart3, Type, TextCursorInput,
} from 'lucide-react';
import { toast } from 'sonner';
import { FlashcardBulkImport } from '../professor/FlashcardBulkImport';
import { FlashcardTypeSelector } from '../professor/FlashcardTypeSelector';
import type { CardType } from '../professor/FlashcardTypeSelector';
import { FlashcardPreview, extractImageUrl, extractText } from '../professor/FlashcardPreview';
import { FlashcardImageUpload } from '../professor/FlashcardImageUpload';
import { useAuth } from '@/app/context/AuthContext';

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
  onDuplicate,
  isSelected,
  onToggleSelect,
}: {
  card: FlashcardItem;
  keywords: Keyword[];
  subtopicsMap: Map<string, Subtopic[]>;
  onEdit: (card: FlashcardItem) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onToggleActive: (id: string, currentActive: boolean) => void;
  onDuplicate: (card: FlashcardItem) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const keyword = keywords.find(k => k.id === card.keyword_id);
  const isDeleted = !!card.deleted_at;
  const isInactive = !card.is_active && !isDeleted;
  const cardType = detectCardType(card.front, card.back);

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
        isSelected
          ? 'border-purple-300 bg-purple-50/30 ring-1 ring-purple-200'
          : isDeleted
            ? 'border-red-200 bg-red-50/30 opacity-70'
            : isInactive
              ? 'border-amber-200 bg-amber-50/20 opacity-80'
              : 'border-gray-100 hover:border-purple-200 hover:shadow-sm'
      }`}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {/* Selection checkbox */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(card.id); }}
            className={`p-0.5 rounded transition-all ${isSelected ? 'text-purple-600' : 'text-gray-300 hover:text-gray-500'}`}
          >
            {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
          </button>
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
          {/* Card type badge */}
          {cardType !== 'text' && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              cardType === 'cloze'
                ? 'bg-cyan-50 text-cyan-600'
                : 'bg-teal-50 text-teal-600'
            }`}>
              {cardType === 'cloze' ? 'Cloze'
                : cardType === 'text_image' ? 'Txt→Img'
                : cardType === 'image_text' ? 'Img→Txt'
                : cardType === 'image_image' ? 'Img→Img'
                : cardType === 'text_both' ? 'Mixto'
                : cardType}
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
                onClick={() => onDuplicate(card)}
                className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all"
                title="Duplicar"
              >
                <Copy size={14} />
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
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {/* Thumbnail if card has image */}
            {(() => {
              const imgUrl = flipped
                ? (card.back_image_url || extractImageUrl(card.back))
                : (card.front_image_url || extractImageUrl(card.front));
              return imgUrl ? (
                <img
                  src={imgUrl}
                  alt=""
                  className="w-10 h-10 rounded-md object-cover shrink-0 border border-gray-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : null;
            })()}
            <p className="text-sm text-gray-700 leading-relaxed">
              {extractText(flipped ? card.back : card.front) || (flipped ? card.back : card.front)}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Create / Edit Modal ──────────────────────────────────

// ── Content encoding helpers ──────────────────────────────
// Backend stores front/back as text. We encode images as ![img](URL)
// and detect card type from content patterns on load.

function detectCardType(front: string, back: string): CardType {
  const hasCloze = /\{\{.+?\}\}/.test(front);
  if (hasCloze) return 'cloze';
  const frontImg = extractImageUrl(front);
  const backImg = extractImageUrl(back);
  const frontTxt = extractText(front);
  const backTxt = extractText(back);
  if (frontImg && backImg && frontTxt && backTxt) return 'text_both';
  if (frontImg && backImg) return 'image_image';
  if (frontImg && !backImg) return 'image_text';
  if (!frontImg && backImg) return 'text_image';
  return 'text';
}

function encodeContent(text: string, imageUrl: string): string {
  const parts: string[] = [];
  if (text.trim()) parts.push(text.trim());
  if (imageUrl.trim()) parts.push(`![img](${imageUrl.trim()})`);
  return parts.join('\n\n');
}

function ImageUrlInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Link2 size={12} className="text-gray-400" />
        <input
          type="url"
          value={value}
          onChange={(e) => { onChange(e.target.value); setImgError(false); }}
          placeholder="https://ejemplo.com/imagen.jpg"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
          >
            <Trash size={12} />
          </button>
        )}
      </div>
      {value && !imgError && (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <img
            src={value}
            alt={label}
            onError={() => setImgError(true)}
            className="w-full h-28 object-cover"
          />
        </div>
      )}
      {imgError && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600">
          <AlertCircle size={12} />
          No se pudo cargar la imagen. Verifica la URL.
        </div>
      )}
    </div>
  );
}

function FlashcardFormModal({
  isOpen,
  editingCard,
  keywords,
  subtopicsMap,
  summaryId,
  onClose,
  onSaved,
  loadSubtopicsForKeyword,
  userId,
}: {
  isOpen: boolean;
  editingCard: FlashcardItem | null;
  keywords: Keyword[];
  subtopicsMap: Map<string, Subtopic[]>;
  summaryId: string;
  onClose: () => void;
  onSaved: () => void;
  loadSubtopicsForKeyword: (keywordId: string) => Promise<void>;
  userId: string;
}) {
  const [cardType, setCardType] = useState<CardType>('text');
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState('');
  const [frontImageUrl, setFrontImageUrl] = useState('');
  const [backImageUrl, setBackImageUrl] = useState('');
  const [keywordId, setKeywordId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [source, setSource] = useState<'manual' | 'ai'>('manual');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subtopicsLoading, setSubtopicsLoading] = useState(false);

  const isEditing = !!editingCard;
  const currentSubtopics = keywordId ? (subtopicsMap.get(keywordId) || []) : [];
  const selectedKeyword = keywords.find(k => k.id === keywordId);

  // ── Cloze auto-back ─────────────────────────────────────
  const clozeAutoBack = useMemo(() => {
    if (cardType !== 'cloze') return '';
    // Replace {{word}} with just "word" for the back
    return frontText.replace(/\{\{([^}]+)\}\}/g, '$1');
  }, [cardType, frontText]);

  // When cloze, auto-set back if user hasn't customized it
  useEffect(() => {
    if (cardType === 'cloze' && !isEditing) {
      setBackText(clozeAutoBack);
    }
  }, [clozeAutoBack, cardType, isEditing]);

  // ── Init from editing card ──────────────────────────────
  useEffect(() => {
    if (editingCard) {
      // Detect type from content
      const detected = detectCardType(editingCard.front, editingCard.back);
      setCardType(detected);

      // Extract components — prefer explicit columns over content-embedded
      const fImg = editingCard.front_image_url || extractImageUrl(editingCard.front);
      const bImg = editingCard.back_image_url || extractImageUrl(editingCard.back);
      setFrontText(extractText(editingCard.front));
      setBackText(extractText(editingCard.back));
      setFrontImageUrl(fImg || '');
      setBackImageUrl(bImg || '');

      setKeywordId(editingCard.keyword_id);
      setSubtopicId(editingCard.subtopic_id || '');
      setSource(editingCard.source === 'ai' ? 'ai' : 'manual');
      if (editingCard.keyword_id) {
        loadSubtopicsForKeyword(editingCard.keyword_id);
      }
    } else {
      setCardType('text');
      setFrontText('');
      setBackText('');
      setFrontImageUrl('');
      setBackImageUrl('');
      setKeywordId('');
      setSubtopicId('');
      setSource('manual');
    }
    setError(null);
  }, [editingCard, isOpen]);

  const handleKeywordChange = async (newKeywordId: string) => {
    setKeywordId(newKeywordId);
    setSubtopicId('');
    if (newKeywordId) {
      setSubtopicsLoading(true);
      await loadSubtopicsForKeyword(newKeywordId);
      setSubtopicsLoading(false);
    }
  };

  // ── Type change with warnings ───────────────────────────
  const handleTypeChange = (newType: CardType) => {
    const oldType = cardType;

    // Warn about data loss
    if ((oldType === 'text' || oldType === 'cloze') && (newType === 'image_image')) {
      if (frontText || backText) {
        if (!confirm('El texto actual se perdera al cambiar a solo imagen. Continuar?')) return;
        setFrontText('');
        setBackText('');
      }
    }
    if ((oldType === 'text_image' || oldType === 'image_text' || oldType === 'image_image' || oldType === 'text_both')
        && newType === 'text') {
      if (frontImageUrl || backImageUrl) {
        if (!confirm('Las imagenes se eliminaran al cambiar a solo texto. Continuar?')) return;
        setFrontImageUrl('');
        setBackImageUrl('');
      }
    }

    setCardType(newType);
  };

  // ── Build final front/back for saving ───────────────────
  const buildSaveContent = (): { front: string; back: string } => {
    switch (cardType) {
      case 'text':
        return { front: frontText, back: backText };
      case 'cloze':
        return { front: frontText, back: backText || clozeAutoBack };
      case 'text_image':
        return { front: frontText, back: backImageUrl ? `![img](${backImageUrl})` : backText };
      case 'image_text':
        return { front: frontImageUrl ? `![img](${frontImageUrl})` : frontText, back: backText };
      case 'image_image':
        return {
          front: frontImageUrl ? `![img](${frontImageUrl})` : '',
          back: backImageUrl ? `![img](${backImageUrl})` : '',
        };
      case 'text_both':
        return {
          front: encodeContent(frontText, frontImageUrl),
          back: encodeContent(backText, backImageUrl),
        };
      default:
        return { front: frontText, back: backText };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { front, back } = buildSaveContent();

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
          front_image_url: frontImageUrl.trim() || null,
          back_image_url: backImageUrl.trim() || null,
        });
        toast.success('Flashcard actualizada');
      } else {
        const resolvedKeywordId = keywordId || (await ensureGeneralKeyword(summaryId)).id;
        await flashcardApi.createFlashcard({
          summary_id: summaryId,
          keyword_id: resolvedKeywordId,
          subtopic_id: subtopicId || null,
          front: front.trim(),
          back: back.trim(),
          source,
          front_image_url: frontImageUrl.trim() || null,
          back_image_url: backImageUrl.trim() || null,
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

  // ── Which sides need text / image inputs ─────────────────
  const frontNeedsText = ['text', 'text_image', 'text_both', 'cloze'].includes(cardType);
  const frontNeedsImage = ['image_text', 'image_image', 'text_both'].includes(cardType);
  const backNeedsText = ['text', 'image_text', 'text_both', 'cloze'].includes(cardType);
  const backNeedsImage = ['text_image', 'image_image', 'text_both'].includes(cardType);

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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col"
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                {isEditing ? <Pencil size={16} className="text-purple-600" /> : <Plus size={16} className="text-purple-600" />}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{isEditing ? 'Editar Flashcard' : 'Nueva Flashcard'}</h3>
                <p className="text-xs text-gray-400">
                  {isEditing ? 'Modifica el contenido y tipo' : 'Selecciona tipo, keyword y contenido'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-all">
              <X size={18} />
            </button>
          </div>

          {/* Modal body - split view */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0">
            <div className="flex flex-col lg:flex-row min-h-0">
              {/* ── Left: Editor ── */}
              <div className="flex-1 p-6 space-y-4 overflow-y-auto border-r border-gray-100">
                {/* Card type selector */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Tipo de tarjeta
                  </label>
                  <FlashcardTypeSelector value={cardType} onChange={handleTypeChange} compact />
                </div>

                {/* Keyword + Subtopic row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Keyword
                    </label>
                    <select
                      value={keywordId}
                      onChange={(e) => handleKeywordChange(e.target.value)}
                      disabled={isEditing}
                      className={`w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all ${
                        isEditing ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'
                      }`}
                    >
                      <option value="">General</option>
                      {keywords.map(kw => (
                        <option key={kw.id} value={kw.id}>{kw.term}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Subtopic
                    </label>
                    {subtopicsLoading ? (
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 py-2">
                        <Loader2 size={10} className="animate-spin" /> Cargando...
                      </div>
                    ) : !keywordId ? (
                      <select disabled className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-gray-50 text-gray-400 cursor-not-allowed">
                        <option>—</option>
                      </select>
                    ) : currentSubtopics.length === 0 ? (
                      <select disabled className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-gray-50 text-gray-400 cursor-not-allowed">
                        <option>Sin subtopics</option>
                      </select>
                    ) : (
                      <select
                        value={subtopicId}
                        onChange={(e) => setSubtopicId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                      >
                        <option value="">Ninguno</option>
                        {currentSubtopics.map(st => (
                          <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* ── FRONT content ── */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-500">
                    Frente {cardType === 'cloze' ? '(con {{blancos}})' : ''}
                  </label>

                  {frontNeedsText && (
                    <div className="relative">
                      <textarea
                        value={frontText}
                        onChange={(e) => setFrontText(e.target.value)}
                        placeholder={
                          cardType === 'cloze'
                            ? 'La {{mitocondria}} es el organelo que produce {{ATP}}...'
                            : 'Escribe la pregunta o concepto...'
                        }
                        rows={cardType === 'cloze' ? 4 : 3}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all resize-none"
                      />
                      {cardType === 'cloze' && frontText && (
                        <div className="mt-1 text-[10px] text-blue-500">
                          {(frontText.match(/\{\{[^}]+\}\}/g) || []).length} blanco(s) detectado(s)
                        </div>
                      )}
                    </div>
                  )}

                  {/* Image upload — always available */}
                  <FlashcardImageUpload
                    side="front"
                    currentImageUrl={frontImageUrl || null}
                    onImageUploaded={(url) => setFrontImageUrl(url)}
                    onImageRemoved={() => setFrontImageUrl('')}
                    userId={userId}
                  />
                </div>

                {/* ── BACK content ── */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-500">
                    Reverso {cardType === 'cloze' ? '(auto-generado)' : ''}
                  </label>

                  {backNeedsText && (
                    <textarea
                      value={backText}
                      onChange={(e) => setBackText(e.target.value)}
                      placeholder={
                        cardType === 'cloze'
                          ? 'Se auto-genera del frente. Puedes editar aqui.'
                          : 'Escribe la respuesta o explicacion...'
                      }
                      rows={3}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all resize-none ${
                        cardType === 'cloze' ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'
                      }`}
                    />
                  )}

                  {/* Image upload — always available */}
                  <FlashcardImageUpload
                    side="back"
                    currentImageUrl={backImageUrl || null}
                    onImageUploaded={(url) => setBackImageUrl(url)}
                    onImageRemoved={() => setBackImageUrl('')}
                    userId={userId}
                  />
                </div>

                {/* Source */}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Fuente:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSource('manual')}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        source === 'manual'
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Pencil size={10} /> Manual
                    </button>
                    <button
                      type="button"
                      onClick={() => setSource('ai')}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        source === 'ai'
                          ? 'bg-amber-50 text-amber-600 border border-amber-200'
                          : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Sparkles size={10} /> IA
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
              </div>

              {/* ── Right: Preview ── */}
              <div className="w-full lg:w-80 shrink-0 p-6 bg-gray-50/50">
                <FlashcardPreview
                  front={frontText}
                  back={cardType === 'cloze' ? (backText || clozeAutoBack) : backText}
                  frontImageUrl={frontImageUrl}
                  backImageUrl={backImageUrl}
                  cardType={cardType}
                  keywordName={selectedKeyword?.term || null}
                />
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {isEditing ? 'Guardar cambios' : 'Crear flashcard'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main FlashcardsManager Component ─────────────────────

export function FlashcardsManager({ summaryId }: FlashcardsManagerProps) {
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
  const [filterType, setFilterType] = useState<'all' | 'text' | 'image' | 'cloze'>('all');

  // Selection
  const [selectedFlashcards, setSelectedFlashcards] = useState<string[]>([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashcardItem | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

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

  // ── Card type stats (PASO 6) ────────────────────────────
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

  const handleBulkToggleActive = async (activate: boolean) => {
    if (!selectedFlashcards.length) return;
    const label = activate ? 'activar' : 'desactivar';
    if (!confirm(`${activate ? 'Activar' : 'Desactivar'} ${selectedFlashcards.length} flashcard(s)?`)) return;
    let ok = 0;
    for (const id of selectedFlashcards) {
      try {
        await flashcardApi.updateFlashcard(id, { is_active: activate });
        ok++;
      } catch (err) { console.error(`Bulk ${label} error:`, err); }
    }
    toast.success(`${ok} flashcard(s) ${activate ? 'activadas' : 'desactivadas'}`);
    setSelectedFlashcards([]);
    loadFlashcards();
  };

  const handleBulkDelete = async () => {
    if (!selectedFlashcards.length) return;
    if (!confirm(`Eliminar ${selectedFlashcards.length} flashcard(s)?`)) return;
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
  };

  const handleBulkAssignKeyword = async (kwId: string) => {
    if (!selectedFlashcards.length || !kwId) return;
    const kw = keywords.find(k => k.id === kwId);
    if (!confirm(`Asignar keyword "${kw?.term || kwId}" a ${selectedFlashcards.length} flashcard(s)?`)) return;
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkImportOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 transition-all"
            >
              <Upload size={14} />
              Importar en lote
            </button>
            {/* Export dropdown */}
            <div className="relative group/export">
              <button
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-green-50 hover:border-green-200 hover:text-green-600 transition-all"
              >
                <Download size={14} />
                Exportar
                <ChevronDown size={12} />
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20 hidden group-hover/export:block min-w-[180px]">
                <button onClick={() => handleExport('csv', false)} className="w-full px-4 py-2 text-xs text-left text-gray-600 hover:bg-gray-50">
                  Exportar CSV (todas)
                </button>
                <button onClick={() => handleExport('json', false)} className="w-full px-4 py-2 text-xs text-left text-gray-600 hover:bg-gray-50">
                  Exportar JSON (todas)
                </button>
                {selectedFlashcards.length > 0 && (
                  <>
                    <div className="border-t border-gray-100 my-1" />
                    <button onClick={() => handleExport('csv', true)} className="w-full px-4 py-2 text-xs text-left text-purple-600 hover:bg-purple-50">
                      CSV seleccionadas ({selectedFlashcards.length})
                    </button>
                    <button onClick={() => handleExport('json', true)} className="w-full px-4 py-2 text-xs text-left text-purple-600 hover:bg-purple-50">
                      JSON seleccionadas ({selectedFlashcards.length})
                    </button>
                  </>
                )}
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

              {/* Type filter */}
              <div className="flex items-center gap-1">
                {([
                  { val: 'all' as const, label: 'Todos', icon: null },
                  { val: 'text' as const, label: 'Texto', icon: <Type size={10} /> },
                  { val: 'image' as const, label: 'Imagen', icon: <ImageIcon size={10} /> },
                  { val: 'cloze' as const, label: 'Cloze', icon: <TextCursorInput size={10} /> },
                ]).map(ft => (
                  <button
                    key={ft.val}
                    onClick={() => setFilterType(ft.val)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                      filterType === ft.val
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {ft.icon}
                    {ft.label}
                  </button>
                ))}
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

            <div className="flex items-center gap-2">
              {/* Counter */}
              {hasActiveFilters && (
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {filteredCards.length} de {flashcardsTotal}
                </span>
              )}
              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                >
                  <XCircle size={12} />
                  Limpiar
                </button>
              )}
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
        </div>
      )}

      {/* ── Bulk Action Bar ── */}
      {selectedFlashcards.length > 0 && (
        <div className="bg-purple-50 border-b border-purple-200 px-6 py-2.5 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 text-[11px] font-medium text-purple-700"
            >
              {selectedFlashcards.length === filteredCards.length
                ? <CheckSquare size={14} />
                : <Square size={14} />}
              {selectedFlashcards.length === filteredCards.length ? 'Deseleccionar' : 'Seleccionar'} todas
            </button>
            <span className="text-[11px] text-purple-500 font-medium">
              {selectedFlashcards.length} seleccionada{selectedFlashcards.length !== 1 ? 's' : ''}
            </span>
            <div className="flex-1" />
            <select
              onChange={(e) => { if (e.target.value) handleBulkAssignKeyword(e.target.value); e.target.value = ''; }}
              className="px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white text-[11px] text-purple-700 font-medium focus:outline-none"
              defaultValue=""
            >
              <option value="" disabled>Asignar keyword...</option>
              {keywords.map(kw => (
                <option key={kw.id} value={kw.id}>{kw.term}</option>
              ))}
            </select>
            <button
              onClick={() => handleBulkToggleActive(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-600 border border-green-200 text-[11px] font-medium hover:bg-green-100 transition-all"
            >
              <ToggleRight size={12} /> Activar
            </button>
            <button
              onClick={() => handleBulkToggleActive(false)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 text-[11px] font-medium hover:bg-amber-100 transition-all"
            >
              <ToggleLeft size={12} /> Desactivar
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[11px] font-medium hover:bg-red-100 transition-all"
            >
              <Trash2 size={12} /> Eliminar
            </button>
            <button
              onClick={() => setSelectedFlashcards([])}
              className="p-1.5 rounded-lg text-purple-400 hover:bg-purple-100 transition-all"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Mini-stats (PASO 6) */}
        {!flashcardsLoading && typeStats.total > 0 && (
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-200">
              <Type size={12} className="text-violet-500" />
              <span className="text-[11px] font-medium text-violet-700">Texto: {typeStats.text}</span>
            </div>
            {typeStats.image > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200">
                <ImageIcon size={12} className="text-teal-500" />
                <span className="text-[11px] font-medium text-teal-700">
                  Imagen: {typeStats.image}
                  <span className="text-teal-500 ml-1">({Math.round(typeStats.image / typeStats.total * 100)}%)</span>
                </span>
              </div>
            )}
            {typeStats.cloze > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 border border-cyan-200">
                <TextCursorInput size={12} className="text-cyan-500" />
                <span className="text-[11px] font-medium text-cyan-700">Cloze: {typeStats.cloze}</span>
              </div>
            )}
            {hasActiveFilters && (
              <span className="text-[10px] text-gray-400 ml-auto">
                Mostrando {filteredCards.length} de {flashcardsTotal}
              </span>
            )}
          </div>
        )}

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
                  onDuplicate={handleDuplicate}
                  isSelected={selectedFlashcards.includes(card.id)}
                  onToggleSelect={handleToggleSelect}
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
        userId={currentUserId}
      />

      {/* ── Bulk Import Modal ── */}
      <FlashcardBulkImport
        isOpen={bulkImportOpen}
        summaryId={summaryId}
        keywords={keywords}
        subtopicsMap={subtopicsMap}
        loadSubtopicsForKeyword={loadSubtopicsForKeyword}
        onClose={() => setBulkImportOpen(false)}
        onImported={loadFlashcards}
      />
    </div>
  );
}

export default FlashcardsManager;