// ============================================================
// Axon — ModelManager (Professor)
//
// Full CRUD for 3D models within a topic:
//  - List with cards (title, format, size, status)
//  - Upload via ModelUploadZone (drag-and-drop)
//  - Edit title/order, toggle is_active, soft delete
//  - Empty state: "Sube tu primer modelo 3D"
//
// Uses lib/model3d-api.ts for all operations.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Plus, Pencil, Trash2, X, Save, Loader2, Upload,
  ToggleLeft, ToggleRight, GripVertical, Eye, EyeOff,
  ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  getModels3D,
  createModel3D,
  updateModel3D,
  deleteModel3D,
  uploadAndCreateModel,
  formatFileSize,
} from '@/app/lib/model3d-api';
import type { Model3D, UploadProgress } from '@/app/lib/model3d-api';
import { ModelUploadZone } from '@/app/components/professor/ModelUploadZone';

// ── Props ─────────────────────────────────────────────────

interface ModelManagerProps {
  topicId: string;
  topicName: string;
}

// ══════════════════════════════════════════════
// ── ModelManager Component ──
// ══════════════════════════════════════════════

export function ModelManager({ topicId, topicName }: ModelManagerProps) {
  const [models, setModels] = useState<Model3D[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');

  // ── Fetch ──
  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getModels3D(topicId);
      setModels(res?.items || []);
    } catch (err: any) {
      console.error('[ModelManager] fetch error:', err);
      toast.error('Error al cargar modelos 3D');
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  // ── Upload file ──
  const handleFileSelected = useCallback(async (file: File) => {
    const title = uploadTitle.trim() || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');

    try {
      await uploadAndCreateModel(file, topicId, title, setUploadProgress);
      toast.success('Modelo 3D subido exitosamente');
      fetchModels();
    } catch (err: any) {
      // Error already reported via progress callback
      console.error('[ModelManager] upload error:', err);
    }
  }, [topicId, uploadTitle, fetchModels]);

  const handleUploadReset = useCallback(() => {
    setUploadProgress(null);
  }, []);

  // ── Manual create (paste URL) ──
  const handleManualCreate = useCallback(async (data: {
    title: string;
    file_url: string;
    file_format: string;
    file_size_bytes?: number;
  }) => {
    try {
      await createModel3D({
        topic_id: topicId,
        title: data.title,
        file_url: data.file_url,
        file_format: data.file_format,
        file_size_bytes: data.file_size_bytes,
      });
      toast.success('Modelo 3D creado');
      setShowManualForm(false);
      fetchModels();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear modelo');
    }
  }, [topicId, fetchModels]);

  // ── Update ──
  const handleUpdate = useCallback(async (id: string, data: Partial<Model3D>) => {
    try {
      await updateModel3D(id, data);
      toast.success('Modelo actualizado');
      fetchModels();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar');
    }
  }, [fetchModels]);

  // ── Delete ──
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar este modelo 3D? (Se puede restaurar despues)')) return;
    try {
      await deleteModel3D(id);
      toast.success('Modelo eliminado');
      fetchModels();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  }, [fetchModels]);

  // ── Toggle active ──
  const handleToggleActive = useCallback(async (id: string, currentActive: boolean) => {
    await handleUpdate(id, { is_active: !currentActive });
  }, [handleUpdate]);

  return (
    <div className="space-y-6">
      {/* ── Header card ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
              <Box size={20} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-gray-900">{topicName}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {loading ? 'Cargando...' : `${models.length} modelo${models.length !== 1 ? 's' : ''} 3D`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowManualForm(!showManualForm); setShowUpload(false); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Crear con URL manual"
            >
              <ExternalLink size={13} />
              URL Manual
            </button>
            <button
              onClick={() => { setShowUpload(!showUpload); setShowManualForm(false); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
            >
              <Upload size={13} />
              Subir Modelo
            </button>
          </div>
        </div>
      </div>

      {/* ── Upload zone ── */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-xl border border-teal-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Upload size={14} className="text-teal-600" />
                  Subir archivo 3D
                </h3>
                <button
                  onClick={() => { setShowUpload(false); handleUploadReset(); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Titulo del modelo (opcional)</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Se usara el nombre del archivo si se deja vacio"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                />
              </div>

              {/* Drop zone */}
              <ModelUploadZone
                onFileSelected={handleFileSelected}
                progress={uploadProgress}
                onReset={handleUploadReset}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Manual URL form ── */}
      <AnimatePresence>
        {showManualForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <ManualModelForm
              onSubmit={handleManualCreate}
              onCancel={() => setShowManualForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-teal-500" />
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && models.length === 0 && (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <Box size={28} className="text-teal-300" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Sube tu primer modelo 3D</p>
          <p className="text-xs text-gray-400 mb-4">
            Arrastra un archivo .glb o .gltf, o pega una URL directa.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
          >
            <Upload size={14} />
            Subir Modelo
          </button>
        </div>
      )}

      {/* ── Models list ── */}
      {!loading && models.map((model, index) => (
        <ModelCard
          key={model.id}
          model={model}
          index={index}
          totalCount={models.length}
          onUpdate={(data) => handleUpdate(model.id, data)}
          onDelete={() => handleDelete(model.id)}
          onToggleActive={() => handleToggleActive(model.id, model.is_active !== false)}
          onMoveUp={index > 0 ? async () => {
            // Swap order_index with previous model
            const prev = models[index - 1];
            await handleUpdate(model.id, { order_index: prev.order_index ?? index - 1 });
            await handleUpdate(prev.id, { order_index: model.order_index ?? index });
          } : undefined}
          onMoveDown={index < models.length - 1 ? async () => {
            const next = models[index + 1];
            await handleUpdate(model.id, { order_index: next.order_index ?? index + 1 });
            await handleUpdate(next.id, { order_index: model.order_index ?? index });
          } : undefined}
        />
      ))}
    </div>
  );
}


// ══════════════════════════════════════════════
// ── Model Card ──
// ══════════════════════════════════════════════

function ModelCard({
  model,
  index,
  totalCount,
  onUpdate,
  onDelete,
  onToggleActive,
  onMoveUp,
  onMoveDown,
}: {
  model: Model3D;
  index: number;
  totalCount: number;
  onUpdate: (data: Partial<Model3D>) => Promise<void>;
  onDelete: () => void;
  onToggleActive: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(model.title);
  const [showDetails, setShowDetails] = useState(false);
  const isActive = model.is_active !== false;

  const handleSaveTitle = async () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== model.title) {
      await onUpdate({ title: trimmed });
    }
    setEditingTitle(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border overflow-hidden transition-colors ${
        isActive ? 'border-gray-200' : 'border-red-100 bg-red-50/20'
      }`}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 p-5">
        {/* Order controls */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={!onMoveUp}
            className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronUp size={12} />
          </button>
          <span className="text-[9px] text-gray-400 font-mono">{index + 1}</span>
          <button
            onClick={onMoveDown}
            disabled={!onMoveDown}
            className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDown size={12} />
          </button>
        </div>

        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isActive ? 'bg-slate-800' : 'bg-red-100'
        }`}>
          <Box size={18} className={isActive ? 'text-teal-400' : 'text-red-400'} />
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(model.title); }
                }}
                autoFocus
                className="flex-1 text-sm font-semibold text-gray-900 border border-teal-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              <button onClick={handleSaveTitle} className="text-teal-600 hover:text-teal-700">
                <Save size={13} />
              </button>
              <button onClick={() => { setEditingTitle(false); setTitleDraft(model.title); }} className="text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            </div>
          ) : (
            <h4
              className={`text-sm font-semibold truncate cursor-pointer transition-colors ${
                isActive ? 'text-gray-900 hover:text-teal-700' : 'text-gray-500 line-through'
              }`}
              onDoubleClick={() => { setTitleDraft(model.title); setEditingTitle(true); }}
            >
              {model.title}
            </h4>
          )}

          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {model.file_format && (
              <span className="text-[10px] text-teal-600 font-semibold uppercase bg-teal-50 px-1.5 py-0.5 rounded">
                {model.file_format}
              </span>
            )}
            {model.file_size_bytes != null && model.file_size_bytes > 0 && (
              <span className="text-[10px] text-gray-400">
                {formatFileSize(model.file_size_bytes)}
              </span>
            )}
            <span className={`text-[10px] font-medium ${isActive ? 'text-emerald-500' : 'text-red-400'}`}>
              {isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => { setTitleDraft(model.title); setEditingTitle(true); }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Editar titulo"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onToggleActive}
            className={`p-1.5 rounded-lg transition-colors ${
              isActive
                ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'
                : 'text-red-400 hover:text-red-500 hover:bg-red-50'
            }`}
            title={isActive ? 'Desactivar' : 'Activar'}
          >
            {isActive ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Ver detalles"
          >
            {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar modelo"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-1 border-t border-gray-100 space-y-2">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400">URL:</span>
                  <p className="text-gray-600 truncate mt-0.5" title={model.file_url}>
                    {model.file_url}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Formato:</span>
                  <p className="text-gray-600 mt-0.5">{model.file_format || 'Sin especificar'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Tamaño:</span>
                  <p className="text-gray-600 mt-0.5">
                    {model.file_size_bytes ? formatFileSize(model.file_size_bytes) : 'Desconocido'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Orden:</span>
                  <p className="text-gray-600 mt-0.5">{model.order_index ?? index}</p>
                </div>
              </div>
              {model.created_at && (
                <p className="text-[10px] text-gray-400">
                  Creado: {new Date(model.created_at).toLocaleString('es-ES')}
                </p>
              )}
              {model.thumbnail_url && (
                <div className="mt-2">
                  <span className="text-xs text-gray-400">Thumbnail:</span>
                  <img
                    src={model.thumbnail_url}
                    alt={model.title}
                    className="mt-1 w-24 h-24 object-cover rounded-lg border border-gray-200"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


// ══════════════════════════════════════════════
// ── Manual Model Form (paste URL) ──
// ══════════════════════════════════════════════

function ManualModelForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: {
    title: string;
    file_url: string;
    file_format: string;
    file_size_bytes?: number;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileFormat, setFileFormat] = useState('glb');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !fileUrl.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        file_url: fileUrl.trim(),
        file_format: fileFormat.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-teal-200 p-6 space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <ExternalLink size={14} className="text-teal-600" />
          Crear modelo con URL
        </h3>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Titulo *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Articulacion del Hombro"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Formato *</label>
          <select
            value={fileFormat}
            onChange={(e) => setFileFormat(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 bg-white"
          >
            <option value="glb">GLB</option>
            <option value="gltf">glTF</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">URL del archivo *</label>
        <input
          type="url"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          placeholder="https://storage.example.com/model.glb"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
          required
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!title.trim() || !fileUrl.trim() || saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Crear Modelo
        </button>
      </div>
    </form>
  );
}
