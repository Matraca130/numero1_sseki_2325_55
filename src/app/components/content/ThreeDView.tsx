import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { motion, AnimatePresence } from 'motion/react';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { ModelViewer3D } from '@/app/components/content/ModelViewer3D';
import { getModels3D } from '@/app/services/models3dApi';
import type { Model3D } from '@/app/services/models3dApi';
import type { TreeCourse, TreeSemester, TreeSection, TreeTopic } from '@/app/services/contentTreeApi';
import {
  Box, ChevronRight, Search, ArrowRight, Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { colors, components, headingStyle, sectionColors, shapes } from '@/app/design-system';
import { iconClasses, cardClasses, ctaButtonClasses } from '@/app/design-system';

// ── Types ──
type ViewState = 'atlas' | 'section' | 'viewer';

interface SectionWithModels {
  sectionId: string;
  sectionName: string;
  semesterName: string;
  models: { topicId: string; topicName: string; model: Model3D }[];
  totalCount: number;
}

// ── Section accent colors — from design system ──
const SECTION_COLORS = sectionColors.teal;

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

  // Fetch models for all topics in parallel
  const fetchAllModels = useCallback(async () => {
    if (allTopics.length === 0) {
      setModelsMap({});
      setModelsLoading(false);
      return;
    }
    setModelsLoading(true);
    try {
      const results = await Promise.allSettled(
        allTopics.map(t => getModels3D(t.topicId))
      );
      const map: Record<string, Model3D[]> = {};
      results.forEach((result, i) => {
        const topicId = allTopics[i].topicId;
        if (result.status === 'fulfilled') {
          const items = result.value?.items || [];
          if (items.length > 0) {
            map[topicId] = items;
          }
        }
      });
      setModelsMap(map);
    } catch (err) {
      console.error('[ThreeDView] Error fetching models:', err);
    } finally {
      setModelsLoading(false);
    }
  }, [allTopics]);

  useEffect(() => {
    if (!treeLoading && allTopics.length > 0) {
      fetchAllModels();
    } else if (!treeLoading && allTopics.length === 0) {
      setModelsLoading(false);
    }
  }, [treeLoading, allTopics, fetchAllModels]);

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
      <div className="flex flex-col min-h-full bg-gray-50">
        <AxonPageHeader title="Atlas 3D" subtitle="Explore modelos anatomicos interativos" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Loader2 size={32} className="animate-spin text-teal-500" />
            <p className="text-sm">Carregando modelos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
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
  );
}

// ══════════════════════════════════════════════
// ── Level 1: Atlas Home Screen ──
// ══════════════════════════════════════════════
function AtlasScreen({
  allCoursesSections,
  totalModels,
  searchQuery,
  setSearchQuery,
  onOpenSection,
}: {
  allCoursesSections: { course: TreeCourse; sections: SectionWithModels[] }[];
  totalModels: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenSection: (sec: SectionWithModels) => void;
}) {
  // Filter by search
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return allCoursesSections;
    const q = searchQuery.toLowerCase();
    return allCoursesSections.map(c => ({
      ...c,
      sections: c.sections.filter(s =>
        s.sectionName.toLowerCase().includes(q) ||
        s.models.some(m => m.model.title.toLowerCase().includes(q) || m.topicName.toLowerCase().includes(q))
      ),
    })).filter(c => c.sections.length > 0);
  }, [allCoursesSections, searchQuery]);

  let colorIdx = 0;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <AxonPageHeader
        title="Atlas 3D"
        subtitle="Explore modelos anatomicos interativos"
        statsLeft={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500" />
              <span className="text-xs text-gray-500"><span className="font-semibold text-gray-700">{totalModels}</span> modelos</span>
            </div>
          </div>
        }
        statsRight={
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar modelo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-4 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 w-52"
            />
          </div>
        }
      />

      <div className="flex-1 px-6 py-6 space-y-8 custom-scrollbar-light">
        {filteredCourses.length === 0 && !searchQuery.trim() && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Box size={40} className="mb-4 opacity-40" />
            <p className="text-sm">Nenhum modelo 3D disponivel ainda.</p>
            <p className="text-xs mt-1 text-gray-300">Os modelos aparecerao aqui quando o professor adicionar.</p>
          </div>
        )}

        {filteredCourses.map(({ course, sections }) => (
          <div key={course.id}>
            {/* Course header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-teal-500" />
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide" style={headingStyle}>{course.name}</h3>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] text-rose-400 font-medium">
                {sections.reduce((s, sec) => s + sec.totalCount, 0)} m
              </span>
            </div>

            {/* Sections grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections.map((sec) => {
                const color = SECTION_COLORS[colorIdx % SECTION_COLORS.length];
                colorIdx++;
                return (
                  <SectionCard
                    key={sec.sectionId}
                    sectionData={sec}
                    color={color}
                    onOpen={() => onOpenSection(sec)}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {filteredCourses.length === 0 && searchQuery.trim() && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Search size={40} className="mb-4 opacity-40" />
            <p className="text-sm">Nenhum modelo encontrado para "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section Card (Level 1 grid item) ──
function SectionCard({
  sectionData,
  color,
  onOpen,
}: {
  sectionData: SectionWithModels;
  color: typeof SECTION_COLORS[0];
  onOpen: () => void;
}) {
  const { sectionName, semesterName, models, totalCount } = sectionData;
  const progressPercent = 100; // all available from backend

  // SVG circle params
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <motion.button
      onClick={onOpen}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="group relative bg-white rounded-2xl border border-gray-200 overflow-hidden text-left shadow-sm hover:shadow-md transition-shadow p-5"
    >
      {/* Top row: icon + progress circle */}
      <div className="flex items-start justify-between mb-4">
        <div className={iconClasses('md')}>
          <Box size={20} className={components.icon.default.text} />
        </div>
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg width="48" height="48" className="-rotate-90">
            <circle cx="24" cy="24" r={radius} fill="none" stroke={colors.border.card} strokeWidth="3" />
            <circle
              cx="24" cy="24" r={radius} fill="none"
              stroke={colors.primary[500]} strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute text-[10px] font-semibold text-teal-600">{totalCount}</span>
        </div>
      </div>

      {/* Title */}
      <h4 className="font-bold text-gray-900 mb-1" style={headingStyle}>{sectionName}</h4>
      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-3">
        {semesterName} · {totalCount} modelos
      </p>

      {/* Progress row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">Disponveis</span>
        <span className="text-xs font-semibold text-gray-700">{totalCount} Modelos</span>
      </div>

      {/* Topic tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {models.slice(0, 3).map(({ topicName }, i) => (
          <span key={i} className="px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-[10px] text-gray-600 font-medium">
            {topicName}
          </span>
        ))}
        {models.length > 3 && (
          <span className="px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-[10px] text-gray-400 font-medium">
            +{models.length - 3}
          </span>
        )}
      </div>

      {/* Teal button */}
      <div className={ctaButtonClasses()}>
        Explorar Modelos
      </div>
    </motion.button>
  );
}


// ══════════════════════════════════════════════
// ── Level 2: Section Screen (Models) ──
// ══════════════════════════════════════════════
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
    <div className="flex flex-col min-h-full bg-gray-50">
      <AxonPageHeader
        title={sectionName}
        subtitle={semesterName}
        onBack={onBack}
        backLabel="Atlas 3D"
        statsLeft={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Box size={13} className="text-teal-500" />
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
                    <Box size={20} className="text-teal-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900" style={headingStyle}>
                      {model.title}
                    </h4>
                    <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider mt-0.5">
                      {topicName}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-teal-600">
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
        <ModelViewer3D modelId={model.id} modelName={model.title} />
      </div>
    </div>
  );
}