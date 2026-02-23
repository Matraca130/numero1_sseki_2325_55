// ============================================================
// Axon — Professor: Curriculum Page
// Full content tree with CRUD for courses, semesters, sections, topics.
// Uses ContentTreeContext for data + ContentTree for UI.
// Right panel: 3D model management for selected topic.
// PARALLEL-SAFE: This file is independent. Edit freely.
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { TopicDetailPanel } from './TopicDetailPanel';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { ContentTree } from '@/app/components/shared/ContentTree';
import { PageHeader } from '@/app/components/shared/PageHeader';
import {
  ListTree, RefreshCw, FileText, ChevronRight, Box, Plus,
  Pencil, Trash2, X, Save, Loader2, MapPin, RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import * as modelsApi from '@/app/services/models3dApi';
import type { Model3D, Model3DPin } from '@/app/services/models3dApi';

export function ProfessorCurriculumPage() {
  const {
    tree, loading, error, selectedTopicId, canEdit,
    refresh, selectTopic,
    addCourse, editCourse, removeCourse,
    addSemester, editSemester, removeSemester,
    addSection, editSection, removeSection,
    addTopic, editTopic, removeTopic,
  } = useContentTree();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | '3d'>('content');

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      toast.success('Contenido actualizado');
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setRefreshing(false);
    }
  };

  // Wrap CRUD with toast feedback
  const wrap = (fn: (...args: any[]) => Promise<void>, successMsg: string) =>
    async (...args: any[]) => {
      try {
        await fn(...args);
        toast.success(successMsg);
      } catch (err: any) {
        toast.error(err.message || 'Error en la operacion');
        throw err;
      }
    };

  // Find selected topic name from tree for the detail panel
  let selectedTopicName = '';
  if (tree && selectedTopicId) {
    const courses = tree?.courses || [];
    outer:
    for (const c of courses) {
      for (const s of (c.semesters || [])) {
        for (const sec of (s.sections || [])) {
          for (const t of (sec.topics || [])) {
            if (t.id === selectedTopicId) {
              selectedTopicName = t.name;
              break outer;
            }
          }
        }
      }
    }
  }

  // Count stats
  const stats = React.useMemo(() => {
    const courses = tree?.courses || [];
    if (courses.length === 0) return { courses: 0, semesters: 0, sections: 0, topics: 0 };
    let semesters = 0, sections = 0, topics = 0;
    for (const c of courses) {
      const sems = c.semesters || [];
      semesters += sems.length;
      for (const s of sems) {
        const secs = s.sections || [];
        sections += secs.length;
        for (const sec of secs) {
          topics += (sec.topics || []).length;
        }
      }
    }
    return { courses: courses.length, semesters, sections, topics };
  }, [tree]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <Toaster position="top-right" richColors />

      {/* Page Header */}
      <div className="px-6 pt-6 pb-0">
        <PageHeader
          icon={<ListTree size={20} />}
          title="Curriculum"
          subtitle="Administra la estructura de cursos, semestres, secciones y topicos"
          accent="purple"
          actions={
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              Actualizar
            </button>
          }
        />
      </div>

      {/* Stats bar */}
      {!loading && tree && (tree?.courses || []).length > 0 && (
        <div className="px-6 py-3 border-b border-gray-100 bg-white flex items-center gap-6">
          {[
            { label: 'Cursos', value: stats.courses, color: 'text-violet-600' },
            { label: 'Semestres', value: stats.semesters, color: 'text-blue-600' },
            { label: 'Secciones', value: stats.sections, color: 'text-emerald-600' },
            { label: 'Topicos', value: stats.topics, color: 'text-gray-600' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className={`text-sm font-semibold ${s.color}`}>{s.value}</span>
              <span className="text-xs text-gray-400">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main content: tree + detail panel */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Content Tree (dark panel) */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-[340px] shrink-0 bg-zinc-950 border-r border-white/[0.06] flex flex-col overflow-hidden"
        >
          <ContentTree
            tree={tree}
            loading={loading}
            error={error}
            editable={canEdit}
            selectedTopicId={selectedTopicId}
            onSelectTopic={(id) => selectTopic(id)}
            onRefresh={refresh}
            onAddCourse={wrap(addCourse, 'Curso creado')}
            onEditCourse={wrap(editCourse, 'Curso actualizado')}
            onDeleteCourse={wrap(removeCourse, 'Curso eliminado')}
            onAddSemester={wrap(addSemester, 'Semestre creado')}
            onEditSemester={wrap(editSemester, 'Semestre actualizado')}
            onDeleteSemester={wrap(removeSemester, 'Semestre eliminado')}
            onAddSection={wrap(addSection, 'Seccion creada')}
            onEditSection={wrap(editSection, 'Seccion actualizada')}
            onDeleteSection={wrap(removeSection, 'Seccion eliminada')}
            onAddTopic={wrap(addTopic, 'Topico creado')}
            onEditTopic={wrap(editTopic, 'Topico actualizado')}
            onDeleteTopic={wrap(removeTopic, 'Topico eliminado')}
          />
        </motion.div>

        {/* Right: Detail panel */}
        <div className="flex-1 overflow-y-auto">
          {selectedTopicId ? (
            <motion.div
              key={selectedTopicId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8"
            >
              <div className="max-w-4xl">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                  <span>Curriculum</span>
                  <ChevronRight size={14} />
                  <span className="text-gray-600">{selectedTopicName}</span>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 border-b border-gray-100 pb-0">
                  <button
                    onClick={() => setActiveTab('content')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                      activeTab === 'content'
                        ? 'border-violet-600 text-violet-700 bg-violet-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FileText size={14} />
                    Contenido
                  </button>
                  <button
                    onClick={() => setActiveTab('3d')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                      activeTab === '3d'
                        ? 'border-violet-600 text-violet-700 bg-violet-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Box size={14} />
                    Modelos 3D
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'content' && (
                  <TopicDetailPanel
                    topicId={selectedTopicId}
                    topicName={selectedTopicName}
                  />
                )}
                {activeTab === '3d' && (
                  <TopicModelsPanel topicId={selectedTopicId} topicName={selectedTopicName} />
                )}
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <ListTree size={28} className="text-gray-300" />
                </div>
                <p className="text-gray-400 text-sm">Selecciona un topico del arbol</p>
                <p className="text-gray-300 text-xs mt-1">para ver y editar su contenido y modelos 3D</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════
// ── Topic Models Panel (Professor CRUD) ──
// ══════════════════════════════════════════════
function TopicModelsPanel({ topicId, topicName }: { topicId: string; topicName: string }) {
  const [models, setModels] = useState<Model3D[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [showAddModel, setShowAddModel] = useState(false);
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);

  // Fetch models for this topic
  const fetchModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const res = await modelsApi.getModels3D(topicId);
      setModels(res?.items || []);
    } catch (err: any) {
      console.error('[TopicModelsPanel] Error:', err);
      toast.error('Error al cargar modelos');
    } finally {
      setModelsLoading(false);
    }
  }, [topicId]);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  // Add model
  const handleAddModel = async (data: { title: string; file_url: string; file_format?: string }) => {
    try {
      await modelsApi.createModel3D({ topic_id: topicId, ...data });
      toast.success('Modelo 3D creado');
      setShowAddModel(false);
      fetchModels();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear modelo');
    }
  };

  // Delete model (soft-delete)
  const handleDeleteModel = async (id: string) => {
    if (!confirm('Eliminar este modelo 3D?')) return;
    try {
      await modelsApi.deleteModel3D(id);
      toast.success('Modelo eliminado');
      fetchModels();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  // Update model
  const handleUpdateModel = async (id: string, data: Partial<Model3D>) => {
    try {
      await modelsApi.updateModel3D(id, data);
      toast.success('Modelo actualizado');
      fetchModels();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
              <Box size={20} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-gray-900">{topicName}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Modelos 3D de este topico</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModel(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
          >
            <Plus size={13} />
            Agregar Modelo
          </button>
        </div>
      </div>

      {/* Add model form */}
      <AnimatePresence>
        {showAddModel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <AddModelForm
              onSubmit={handleAddModel}
              onCancel={() => setShowAddModel(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {modelsLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-teal-500" />
        </div>
      )}

      {/* Empty state */}
      {!modelsLoading && models.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <Box size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No hay modelos 3D para este topico.</p>
          <p className="text-xs text-gray-400 mt-1">Haz clic en "Agregar Modelo" para comenzar.</p>
        </div>
      )}

      {/* Models list */}
      {!modelsLoading && models.map((model) => (
        <ModelCard
          key={model.id}
          model={model}
          isExpanded={expandedModelId === model.id}
          onToggleExpand={() => setExpandedModelId(expandedModelId === model.id ? null : model.id)}
          onDelete={() => handleDeleteModel(model.id)}
          onUpdate={(data) => handleUpdateModel(model.id, data)}
        />
      ))}
    </div>
  );
}


// ── Add Model Form ──
function AddModelForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: { title: string; file_url: string; file_format?: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileFormat, setFileFormat] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !fileUrl.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), file_url: fileUrl.trim(), file_format: fileFormat.trim() || undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-teal-200 p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Plus size={14} className="text-teal-600" />
          Nuevo Modelo 3D
        </h3>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
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
          <label className="block text-xs text-gray-500 mb-1">Formato</label>
          <input
            type="text"
            value={fileFormat}
            onChange={(e) => setFileFormat(e.target.value)}
            placeholder="glb, gltf, obj..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
          />
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
          Guardar
        </button>
      </div>
    </form>
  );
}


// ── Model Card ──
function ModelCard({
  model,
  isExpanded,
  onToggleExpand,
  onDelete,
  onUpdate,
}: {
  model: Model3D;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onUpdate: (data: Partial<Model3D>) => Promise<void>;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(model.title);

  const handleSaveTitle = async () => {
    if (titleDraft.trim() && titleDraft.trim() !== model.title) {
      await onUpdate({ title: titleDraft.trim() });
    }
    setEditingTitle(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Model header */}
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
            <Box size={18} className="text-teal-400" />
          </div>
          <div className="min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                  autoFocus
                  className="text-sm font-semibold text-gray-900 border border-teal-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
                <button onClick={handleSaveTitle} className="text-teal-600 hover:text-teal-700"><Save size={13} /></button>
                <button onClick={() => setEditingTitle(false)} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
              </div>
            ) : (
              <h4
                className="text-sm font-semibold text-gray-900 truncate cursor-pointer hover:text-teal-700 transition-colors"
                onDoubleClick={() => { setTitleDraft(model.title); setEditingTitle(true); }}
              >
                {model.title}
              </h4>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              {model.file_format && (
                <span className="text-[10px] text-teal-600 font-medium uppercase">{model.file_format}</span>
              )}
              {model.file_size_bytes && (
                <span className="text-[10px] text-gray-400">{(model.file_size_bytes / 1024 / 1024).toFixed(1)} MB</span>
              )}
              <span className={`text-[10px] font-medium ${model.is_active !== false ? 'text-emerald-500' : 'text-red-400'}`}>
                {model.is_active !== false ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setTitleDraft(model.title); setEditingTitle(true); }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Editar titulo"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onToggleExpand}
            className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
            title="Ver/gestionar pins"
          >
            <MapPin size={13} />
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

      {/* URL preview */}
      <div className="px-5 pb-3">
        <p className="text-[10px] text-gray-400 truncate" title={model.file_url}>
          {model.file_url}
        </p>
      </div>

      {/* Pins panel (expanded) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100">
              <ModelPinsPanel modelId={model.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


// ══════════════════════════════════════════════
// ── Model Pins Panel (Professor CRUD) ──
// ══════════════════════════════════════════════
function ModelPinsPanel({ modelId }: { modelId: string }) {
  const [pins, setPins] = useState<Model3DPin[]>([]);
  const [pinsLoading, setPinsLoading] = useState(true);
  const [showAddPin, setShowAddPin] = useState(false);

  const fetchPins = useCallback(async () => {
    setPinsLoading(true);
    try {
      const res = await modelsApi.getModel3DPins(modelId);
      setPins(res?.items || []);
    } catch (err: any) {
      console.error('[ModelPinsPanel] Error:', err);
    } finally {
      setPinsLoading(false);
    }
  }, [modelId]);

  useEffect(() => { fetchPins(); }, [fetchPins]);

  const handleAddPin = async (data: {
    label: string;
    description: string;
    geometry: { x: number; y: number; z: number };
    color: string;
    pin_type: 'annotation' | 'label' | 'link';
  }) => {
    try {
      await modelsApi.createModel3DPin({ model_id: modelId, ...data });
      toast.success('Pin creado');
      setShowAddPin(false);
      fetchPins();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear pin');
    }
  };

  const handleDeletePin = async (id: string) => {
    try {
      await modelsApi.deleteModel3DPin(id);
      toast.success('Pin eliminado');
      fetchPins();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar pin');
    }
  };

  const handleUpdatePin = async (id: string, data: Partial<Model3DPin>) => {
    try {
      await modelsApi.updateModel3DPin(id, data);
      toast.success('Pin actualizado');
      fetchPins();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar pin');
    }
  };

  return (
    <div className="p-5 bg-gray-50/60">
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
          <MapPin size={13} className="text-teal-500" />
          Pins de anotacion ({pins.length})
        </h5>
        <button
          onClick={() => setShowAddPin(true)}
          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
        >
          <Plus size={11} />
          Agregar Pin
        </button>
      </div>

      {/* Add pin form */}
      <AnimatePresence>
        {showAddPin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-3"
          >
            <AddPinForm
              onSubmit={handleAddPin}
              onCancel={() => setShowAddPin(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {pinsLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={16} className="animate-spin text-gray-400" />
        </div>
      )}

      {!pinsLoading && pins.length === 0 && !showAddPin && (
        <div className="text-center py-6">
          <MapPin size={20} className="text-gray-300 mx-auto mb-2" />
          <p className="text-[11px] text-gray-400">Sin pins. Agrega puntos de anotacion al modelo.</p>
        </div>
      )}

      {!pinsLoading && pins.length > 0 && (
        <div className="space-y-2">
          {pins.map((pin) => (
            <PinRow
              key={pin.id}
              pin={pin}
              onDelete={() => handleDeletePin(pin.id)}
              onUpdate={(data) => handleUpdatePin(pin.id, data)}
            />
          ))}
        </div>
      )}
    </div>
  );
}


// ── Add Pin Form ──
function AddPinForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: {
    label: string;
    description: string;
    geometry: { x: number; y: number; z: number };
    color: string;
    pin_type: 'annotation' | 'label' | 'link';
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [x, setX] = useState('0');
  const [y, setY] = useState('0');
  const [z, setZ] = useState('0');
  const [color, setColor] = useState('#60a5fa');
  const [pinType, setPinType] = useState<'annotation' | 'label' | 'link'>('annotation');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        label: label.trim(),
        description: description.trim(),
        geometry: { x: parseFloat(x) || 0, y: parseFloat(y) || 0, z: parseFloat(z) || 0 },
        color,
        pin_type: pinType,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-teal-200 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">Label *</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ej: Cabeza del Humero"
            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
            required
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">Tipo</label>
          <select
            value={pinType}
            onChange={(e) => setPinType(e.target.value as any)}
            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 bg-white"
          >
            <option value="annotation">Anotacion</option>
            <option value="label">Etiqueta</option>
            <option value="link">Enlace</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[10px] text-gray-500 mb-0.5">Descripcion</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripcion del punto anatomico..."
          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">X</label>
          <input type="number" step="0.1" value={x} onChange={(e) => setX(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">Y</label>
          <input type="number" step="0.1" value={y} onChange={(e) => setY(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">Z</label>
          <input type="number" step="0.1" value={z} onChange={(e) => setZ(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">Color</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-[30px] border border-gray-200 rounded-lg cursor-pointer" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-2.5 py-1 text-[10px] text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">Cancelar</button>
        <button
          type="submit"
          disabled={!label.trim() || saving}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
          Guardar Pin
        </button>
      </div>
    </form>
  );
}


// ── Pin Row ──
function PinRow({
  pin,
  onDelete,
  onUpdate,
}: {
  pin: Model3DPin;
  onDelete: () => void;
  onUpdate: (data: Partial<Model3DPin>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [labelDraft, setLabelDraft] = useState(pin.label || '');
  const [descDraft, setDescDraft] = useState(pin.description || '');

  const handleSave = async () => {
    await onUpdate({ label: labelDraft.trim(), description: descDraft.trim() });
    setEditing(false);
  };

  return (
    <div className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-gray-100 group hover:border-gray-200 transition-colors">
      <div
        className="w-3 h-3 rounded-full shrink-0 mt-1 border border-white shadow-sm"
        style={{ backgroundColor: pin.color || '#60a5fa' }}
      />
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-1.5">
            <input
              type="text"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              className="w-full text-xs font-semibold text-gray-900 border border-teal-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
              autoFocus
            />
            <input
              type="text"
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              className="w-full text-[10px] text-gray-600 border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
              placeholder="Descripcion..."
            />
            <div className="flex gap-1">
              <button onClick={handleSave} className="text-teal-600 hover:text-teal-700"><Save size={11} /></button>
              <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={11} /></button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-gray-800 truncate">{pin.label || 'Sin nombre'}</p>
            {pin.description && (
              <p className="text-[10px] text-gray-500 truncate">{pin.description}</p>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] text-gray-400">
                ({pin.geometry.x.toFixed(1)}, {pin.geometry.y.toFixed(1)}, {pin.geometry.z.toFixed(1)})
              </span>
              {pin.pin_type && (
                <span className="text-[9px] text-teal-500 font-medium uppercase">{pin.pin_type}</span>
              )}
            </div>
          </>
        )}
      </div>
      {!editing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => { setLabelDraft(pin.label || ''); setDescDraft(pin.description || ''); setEditing(true); }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <Pencil size={11} />
          </button>
          <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors">
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
