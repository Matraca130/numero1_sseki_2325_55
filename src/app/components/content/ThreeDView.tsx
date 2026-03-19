// ============================================================
// Axon — ThreeDView (Student)
//
// 3-level navigation for 3D anatomical models:
//   Level 1: Atlas grid (AtlasScreen — extracted to AtlasScreen.tsx)
//   Level 2: Section detail (SectionScreen)
//   Level 3: 3D viewer (ViewerScreen → ModelViewer3D)
//
// Data flow: ContentTree → fetch models per topic → group by section
// ============================================================

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { motion, AnimatePresence } from 'motion/react';
import { Box, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { ModelViewer3D } from '@/app/components/content/ModelViewer3D';
import { AtlasScreen } from '@/app/components/content/AtlasScreen';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import { getModels3DBatch } from '@/app/lib/model3d-api';
import type { Model3D } from '@/app/lib/model3d-api';
import type { SectionWithModels } from '@/app/types/model3d';
import { logger } from '@/app/lib/logger';
import { components, headingStyle } from '@/app/design-system';
import { iconClasses, ctaButtonClasses } from '@/app/design-system';

// ── Types ──
type ViewState = 'atlas' | 'section' | 'viewer';

// ══════════════════════════════════════════════
// ── Main ThreeDView Component ──
// ══════════════════════════════════════════════
export function ThreeDView() {
  const { tree, loading: treeLoading } = useContentTree();

  const [viewState, setViewState] = useState<ViewState>('atlas');
  const [selectedSection, setSelectedSection] = useState<SectionWithModels | null>(null);
  const [selectedModel, setSelectedModel] = useState<{ topicName: string; model: Model3D } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch models for all topics from content tree
  const [modelsMap, setModelsMap] = useState<Record<string, Model3D[]>>({});
  const [modelsLoading, setModelsLoading] = useState(true);

  // Collect all topic IDs from tree
  const allTopics = useMemo(() => {
    if (!tree?.courses) return [];
    const topics: { topicId: string; topicName: string; sectionId: string; sectionName: string; semesterName: string; courseName: string }[] = [];
    for (const course of tree.courses) {
      for (const semester of course.semesters || []) {
        for (const section of semester.sections || []) {
          for (const topic of section.topics || []) {
            topics.push({
              topicId: topic.id,
              topicName: topic.name,
              sectionId: section.id,
              sectionName: section.name,
              semesterName: semester.name,
              courseName: course.name,
            });
          }
        }
      }
    }
    return topics;
  }, [tree]);

  // Stable list of topic IDs for dependency tracking
  const topicIds = useMemo(
    () => allTopics.map(t => t.topicId),
    [allTopics],
  );

  // H2 audit fix: batch fetch with cache + throttle + AbortController
  useEffect(() => {
    if (treeLoading) return;
    if (topicIds.length === 0) {
      setModelsMap({});
      setModelsLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      setModelsLoading(true);
      try {
        const batchResult = await getModels3DBatch(topicIds, controller.signal);
        if (cancelled) return;
        // Filter to only topics with models
        const map: Record<string, Model3D[]> = {};
        for (const [tid, models] of Object.entries(batchResult)) {
          if (models.length > 0) {
            map[tid] = models;
          }
        }
        setModelsMap(map);
      } catch (err) {
        if (cancelled) return;
        logger.error('ThreeDView', 'Error fetching models:', err);
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [treeLoading, topicIds]);

  // Build sections with models grouped by course
  const allCoursesSections = useMemo(() => {
    if (!tree?.courses) return [];

    return tree.courses.map(course => {
      const sections: SectionWithModels[] = [];
      for (const semester of course.semesters || []) {
        for (const section of semester.sections || []) {
          const sectionModels: SectionWithModels['models'] = [];
          for (const topic of section.topics || []) {
            const topicModels = modelsMap[topic.id] || [];
            for (const model of topicModels) {
              sectionModels.push({ topicId: topic.id, topicName: topic.name, model });
            }
          }
          if (sectionModels.length > 0) {
            sections.push({
              sectionId: section.id,
              sectionName: section.name,
              semesterName: semester.name,
              models: sectionModels,
              totalCount: sectionModels.length,
            });
          }
        }
      }
      return { course, sections };
    }).filter(c => c.sections.length > 0);
  }, [tree, modelsMap]);

  const totalModels = useMemo(
    () => allCoursesSections.reduce((sum, c) => sum + c.sections.reduce((s, sec) => s + sec.totalCount, 0), 0),
    [allCoursesSections]
  );

  const isLoading = treeLoading || modelsLoading;

  // Navigate
  const openSection = (sec: SectionWithModels) => {
    setSelectedSection(sec);
    setViewState('section');
  };

  const openViewer = (item: { topicName: string; model: Model3D }) => {
    setSelectedModel(item);
    setViewState('viewer');
  };

  const goBack = () => {
    if (viewState === 'viewer') {
      setViewState('section');
      setSelectedModel(null);
    } else if (viewState === 'section') {
      setViewState('atlas');
      setSelectedSection(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-full bg-[#F0F2F5]">
        <AxonPageHeader title="Atlas 3D" subtitle="Explore modelos anatomicos interativos" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Loader2 size={32} className="animate-spin text-[#2a8c7a]" />
            <p className="text-sm">Carregando modelos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={<ThreeDErrorFallback />}>
      <AnimatePresence mode="wait">
        {viewState === 'atlas' && (
          <motion.div key="atlas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <AtlasScreen
              allCoursesSections={allCoursesSections}
              totalModels={totalModels}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onOpenSection={openSection}
            />
          </motion.div>
        )}
        {viewState === 'section' && selectedSection && (
          <motion.div key="section" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
            <SectionScreen
              sectionData={selectedSection}
              onBack={goBack}
              onOpenModel={openViewer}
            />
          </motion.div>
        )}
        {viewState === 'viewer' && selectedModel && (
          <motion.div key="viewer" className="h-full" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25 }}>
            <ViewerScreen
              topicName={selectedModel.topicName}
              model={selectedModel.model}
              onBack={goBack}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}

// ── Error Fallback ──
function ThreeDErrorFallback() {
  return (
    <div className="flex flex-col min-h-full bg-[#F0F2F5]">
      <AxonPageHeader title="Atlas 3D" subtitle="Explore modelos anatomicos interativos" />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <AlertTriangle size={32} className="text-red-500" />
          <p className="text-sm">Ocorreu um erro ao carregar os modelos 3D.</p>
        </div>
      </div>
    </div>
  );
}

// ── Error Fallback for Model Viewer ──
function ModelViewerErrorFallback({ modelName, onBack }: { modelName: string; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full bg-[#111118] relative overflow-hidden">
      {/* Header */}
      <div className="relative z-20 h-12 flex items-center justify-between px-5 bg-[#111118]/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition-colors"
          >
            <ChevronRight size={14} className="rotate-180" />
            <span>Voltar</span>
          </button>
          <div className="w-px h-5 bg-white/10" />
          <div>
            <h2 className="text-xs font-bold text-white">{modelName}</h2>
            <p className="text-[9px] text-gray-500">Erro ao carregar o modelo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-600 font-medium">Arraste para rotacionar &middot; Scroll para zoom</span>
        </div>
      </div>

      {/* 3D Viewport — ModelViewer3D fills remaining space */}
      <div className="flex-1 relative z-10">
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <AlertTriangle size={32} className="text-red-500" />
          <p className="text-sm">Ocorreu um erro ao carregar o modelo 3D.</p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Level 2: Section Screen (Models) ──
// ═════════════════════════════════════════════���
function SectionScreen({
  sectionData,
  onBack,
  onOpenModel,
}: {
  sectionData: SectionWithModels;
  onBack: () => void;
  onOpenModel: (item: { topicName: string; model: Model3D }) => void;
}) {
  const { sectionName, semesterName, models } = sectionData;

  return (
    <div className="flex flex-col min-h-full bg-[#F0F2F5]">
      <AxonPageHeader
        title={sectionName}
        subtitle={semesterName}
        onBack={onBack}
        backLabel="Atlas 3D"
        statsLeft={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Box size={13} className="text-[#2a8c7a]" />
              <span className="text-xs text-gray-500"><span className="font-semibold text-gray-700">{models.length}</span> modelos</span>
            </div>
          </div>
        }
      />

      <div className="flex-1 px-6 py-6 space-y-6 custom-scrollbar-light">
        {/* Summary line */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{models.length}</span> modelos 3D em{' '}
            <span className="font-semibold text-gray-700">{new Set(models.map(m => m.topicId)).size}</span> topicos
          </p>
        </div>

        {/* Models grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {models.map(({ topicName, model }) => (
            <div
              key={model.id}
              className={`${components.card.base} ${components.card.padding}`}
            >
              {/* Top row: icon + title + status */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className={`${iconClasses('md')} flex-shrink-0 mt-0.5`}>
                    <Box size={20} className="text-[#2a8c7a]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900" style={headingStyle}>
                      {model.title}
                    </h4>
                    <p className="text-xs text-[#2a8c7a] font-semibold uppercase tracking-wider mt-0.5">
                      {topicName}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-[#2a8c7a]">
                  {model.file_format?.toUpperCase() || '3D'}
                </span>
              </div>

              {/* Info row */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">Modelo</span>
                <span className="text-sm text-gray-700 font-medium">
                  {model.file_size_bytes ? `${(model.file_size_bytes / 1024 / 1024).toFixed(1)} MB` : 'Disponivel'}
                </span>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => onOpenModel({ topicName, model })}
                className={`${ctaButtonClasses()} cursor-pointer`}
              >
                Visualizar 3D
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Level 3: Viewer Screen (3D Model) ──
// ══════════════════════════════════════════════
function ViewerScreen({
  topicName,
  model,
  onBack,
}: {
  topicName: string;
  model: Model3D;
  onBack: () => void;
}) {
  // F3 audit: Esc key navigates back to section screen.
  // Guard: only fires when not typing in an input (PinEditor, Notes, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      onBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  return (
    <div className="flex flex-col h-full bg-[#111118] relative overflow-hidden">
      {/* Header */}
      <div className="relative z-20 h-12 flex items-center justify-between px-5 bg-[#111118]/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition-colors"
          >
            <ChevronRight size={14} className="rotate-180" />
            <span>Voltar</span>
          </button>
          <div className="w-px h-5 bg-white/10" />
          <div>
            <h2 className="text-xs font-bold text-white">{model.title}</h2>
            <p className="text-[9px] text-gray-500">{topicName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-600 font-medium">Arraste para rotacionar &middot; Scroll para zoom</span>
        </div>
      </div>

      {/* 3D Viewport — ModelViewer3D fills remaining space */}
      <div className="flex-1 relative z-10">
        <ErrorBoundary
          fallback={<ModelViewerErrorFallback modelName={model.title} onBack={onBack} />}
        >
          <ModelViewer3D modelId={model.id} modelName={model.title} fileUrl={model.file_url} />
        </ErrorBoundary>
      </div>
    </div>
  );
}