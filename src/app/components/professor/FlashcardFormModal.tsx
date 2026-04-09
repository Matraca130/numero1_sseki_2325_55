// ============================================================
// FlashcardFormModal — Create / Edit modal for flashcards
// C3 cleanup: kw.term → kw.name || kw.term
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as flashcardApi from '@/app/services/flashcardApi';
import type { FlashcardItem } from '@/app/services/flashcardApi';
import type { Keyword } from '@/app/types/platform';
import type { Subtopic } from '@/app/types/flashcard-manager';
import { ensureGeneralKeyword } from '@/app/lib/api';
import { extractImageUrl, extractText, detectCardType } from '@/app/lib/flashcard-utils';
import { FlashcardTypeSelector } from './FlashcardTypeSelector';
import type { CardType } from './FlashcardTypeSelector';
import { FlashcardPreview } from './FlashcardPreview';
import { FlashcardImageUpload } from './FlashcardImageUpload';
import { useFlashcardImage } from '@/app/hooks/useFlashcardImage';
import {
  Plus, Pencil, X, Check, AlertCircle, Loader2, Sparkles,
  Link2, Trash, Wand2,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Content encoding helpers ──────────────────────────────

function encodeContent(text: string, imageUrl: string): string {
  const parts: string[] = [];
  if (text.trim()) parts.push(text.trim());
  if (imageUrl.trim()) parts.push(`![img](${imageUrl.trim()})`);
  return parts.join('\n\n');
}

// ── Helper: get keyword display name (C3) ─────────────────
// Type-safe cast: Keyword.name may exist in DB but isn't in
// the TS type yet. Avoids `as any` per Gemini review.
function kwDisplay(kw: Keyword): string {
  return (kw as Keyword & { name?: string }).name || kw.term || kw.id?.substring(0, 8) || '?';
}

// ── Image URL inline input ────────────────────────────────

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

// ── Props ─────────────────────────────────────────────────

interface FlashcardFormModalProps {
  isOpen: boolean;
  editingCard: FlashcardItem | null;
  keywords: Keyword[];
  subtopicsMap: Map<string, Subtopic[]>;
  summaryId: string;
  onClose: () => void;
  onSaved: () => void;
  loadSubtopicsForKeyword: (keywordId: string) => Promise<void>;
  userId: string;
}

// ── Component ─────────────────────────────────────────────

export function FlashcardFormModal({
  isOpen,
  editingCard,
  keywords,
  subtopicsMap,
  summaryId,
  onClose,
  onSaved,
  loadSubtopicsForKeyword,
  userId,
}: FlashcardFormModalProps) {
  const [cardType, setCardType] = useState<CardType>('text');
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState('');
  const [frontImageUrl, setFrontImageUrl] = useState('');
  const [backImageUrl, setBackImageUrl] = useState('');
  const [keywordId, setKeywordId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [source, setSource] = useState<'manual' | 'ai'>('manual');
  const [generateImageWithAi, setGenerateImageWithAi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subtopicsLoading, setSubtopicsLoading] = useState(false);

  const { generateImage } = useFlashcardImage();

  const isEditing = !!editingCard;
  const currentSubtopics = keywordId ? (subtopicsMap.get(keywordId) || []) : [];
  const selectedKeyword = keywords.find(k => k.id === keywordId);

  const clozeAutoBack = useMemo(() => {
    if (cardType !== 'cloze') return '';
    return frontText.replace(/\{\{([^}]+)\}\}/g, '$1');
  }, [cardType, frontText]);

  useEffect(() => {
    if (cardType === 'cloze' && !isEditing) {
      setBackText(clozeAutoBack);
    }
  }, [clozeAutoBack, cardType, isEditing]);

  useEffect(() => {
    if (editingCard) {
      const detected = detectCardType(editingCard.front, editingCard.back);
      setCardType(detected);

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
      setGenerateImageWithAi(false);
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

  const handleTypeChange = (newType: CardType) => {
    const oldType = cardType;
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
        const resolvedKeywordId = keywordId || await ensureGeneralKeyword(summaryId);
        const created = await flashcardApi.createFlashcard({
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

        // Generate AI image if requested (no manual upload provided)
        if (generateImageWithAi && !frontImageUrl.trim() && created?.id) {
          setGeneratingImage(true);
          try {
            await generateImage(created.id, { imagePrompt: front.trim() });
          } catch (imgErr: any) {
            console.error('[FlashcardForm] Image generation failed:', imgErr);
            // Toast already shown by hook; non-fatal — card itself was created
          } finally {
            setGeneratingImage(false);
          }
        }
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
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
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                {isEditing ? <Pencil size={16} className="text-teal-600" /> : <Plus size={16} className="text-teal-600" />}
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

          {/* Modal body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0">
            <div className="flex flex-col lg:flex-row min-h-0">
              {/* Left: Editor */}
              <div className="flex-1 p-6 space-y-4 overflow-y-auto border-r border-gray-100">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Tipo de tarjeta
                  </label>
                  <FlashcardTypeSelector value={cardType} onChange={handleTypeChange} compact />
                </div>

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
                        <option key={kw.id} value={kw.id}>{kwDisplay(kw)}</option>
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
                        <option>&mdash;</option>
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

                {/* FRONT content */}
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

                  <FlashcardImageUpload
                    side="front"
                    currentImageUrl={frontImageUrl || null}
                    onImageUploaded={(url) => setFrontImageUrl(url)}
                    onImageRemoved={() => setFrontImageUrl('')}
                    userId={userId}
                  />
                </div>

                {/* BACK content */}
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

                  <FlashcardImageUpload
                    side="back"
                    currentImageUrl={backImageUrl || null}
                    onImageUploaded={(url) => setBackImageUrl(url)}
                    onImageRemoved={() => setBackImageUrl('')}
                    userId={userId}
                  />
                </div>

                {/* Source */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Fuente:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSource('manual')}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        source === 'manual'
                          ? 'bg-teal-50 text-teal-600 border border-teal-200'
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

                {/* AI image generation toggle (create mode only, when no manual front image) */}
                {!isEditing && !frontImageUrl.trim() && (
                  <label className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-purple-200 bg-purple-50/40 cursor-pointer hover:bg-purple-50 transition-all">
                    <input
                      type="checkbox"
                      checked={generateImageWithAi}
                      onChange={(e) => setGenerateImageWithAi(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-purple-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-purple-700">
                        <Wand2 size={12} />
                        Generar imagen con IA
                      </div>
                      <p className="text-[10px] text-purple-500/80 mt-0.5">
                        Tras crear la flashcard, se generará una imagen automáticamente con Gemini usando el texto del frente como prompt.
                      </p>
                    </div>
                  </label>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2 text-sm">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}
              </div>

              {/* Right: Preview */}
              <div className="w-full lg:w-80 shrink-0 p-6 bg-gray-50/50">
                <FlashcardPreview
                  front={frontText}
                  back={cardType === 'cloze' ? (backText || clozeAutoBack) : backText}
                  frontImageUrl={frontImageUrl}
                  backImageUrl={backImageUrl}
                  cardType={cardType}
                  keywordName={selectedKeyword ? kwDisplay(selectedKeyword) : null}
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
              disabled={saving || generatingImage}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2a8c7a] text-white text-sm font-semibold hover:bg-[#244e47] disabled:opacity-50 transition-all"
            >
              {(saving || generatingImage) ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {generatingImage
                ? 'Generando imagen...'
                : saving
                  ? 'Guardando...'
                  : isEditing ? 'Guardar cambios' : 'Crear flashcard'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
