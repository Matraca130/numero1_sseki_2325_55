import React, { useState, useMemo } from 'react';
import { useApp } from '@/app/context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { ModelViewer3D } from '@/app/components/content/ModelViewer3D';
import { courses, Course, Section, Topic, Model3D } from '@/app/data/courses';
import {
  Box, ChevronRight, Search, ArrowRight,
} from 'lucide-react';
import clsx from 'clsx';
import { colors, components, headingStyle, sectionColors, shapes } from '@/app/design-system';
import { iconClasses, cardClasses, ctaButtonClasses } from '@/app/design-system';

// ── Types ──
type ViewState = 'atlas' | 'section' | 'viewer';

interface SectionWithModels {
  section: Section;
  semesterTitle: string;
  models: { topic: Topic; model: Model3D }[];
  availableCount: number;
  totalCount: number;
}

// ── Section accent colors — from design system ──
const SECTION_COLORS = sectionColors.teal;

// ── Helper: collect all sections with 3D models from a course ──
function getSectionsWithModels(course: Course): SectionWithModels[] {
  const result: SectionWithModels[] = [];
  for (const semester of course.semesters) {
    for (const section of semester.sections) {
      const models: { topic: Topic; model: Model3D }[] = [];
      for (const topic of section.topics) {
        if (topic.model3D) {
          models.push({ topic, model: topic.model3D });
        }
      }
      if (models.length > 0) {
        result.push({
          section,
          semesterTitle: semester.title,
          models,
          availableCount: models.filter(m => m.model.available).length,
          totalCount: models.length,
        });
      }
    }
  }
  return result;
}

// ══════════════════════════════════════════════
// ── Main ThreeDView Component ──
// ══════════════════════════════════════════════
export function ThreeDView() {
  const { currentCourse } = useApp();

  const [viewState, setViewState] = useState<ViewState>('atlas');
  const [selectedSection, setSelectedSection] = useState<SectionWithModels | null>(null);
  const [selectedModel, setSelectedModel] = useState<{ topic: Topic; model: Model3D } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // All courses aggregation for the atlas overview
  const allCoursesSections = useMemo(() => {
    return courses.map(course => ({
      course,
      sections: getSectionsWithModels(course),
    })).filter(c => c.sections.length > 0);
  }, []);

  const totalModels = useMemo(
    () => allCoursesSections.reduce((sum, c) => sum + c.sections.reduce((s, sec) => s + sec.totalCount, 0), 0),
    [allCoursesSections]
  );
  const availableModels = useMemo(
    () => allCoursesSections.reduce((sum, c) => sum + c.sections.reduce((s, sec) => s + sec.availableCount, 0), 0),
    [allCoursesSections]
  );

  // Navigate
  const openSection = (sec: SectionWithModels) => {
    setSelectedSection(sec);
    setViewState('section');
  };

  const openViewer = (item: { topic: Topic; model: Model3D }) => {
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

  return (
    <AnimatePresence mode="wait">
      {viewState === 'atlas' && (
        <motion.div key="atlas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <AtlasScreen
            allCoursesSections={allCoursesSections}
            totalModels={totalModels}
            availableModels={availableModels}
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
            topic={selectedModel.topic}
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
  availableModels,
  searchQuery,
  setSearchQuery,
  onOpenSection,
}: {
  allCoursesSections: { course: Course; sections: SectionWithModels[] }[];
  totalModels: number;
  availableModels: number;
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
        s.section.title.toLowerCase().includes(q) ||
        s.models.some(m => m.model.name.toLowerCase().includes(q) || m.topic.title.toLowerCase().includes(q))
      ),
    })).filter(c => c.sections.length > 0);
  }, [allCoursesSections, searchQuery]);

  let colorIdx = 0;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <AxonPageHeader
        title="Atlas 3D"
        subtitle="Explore modelos anatômicos interativos"
        statsLeft={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500" />
              <span className="text-xs text-gray-500"><span className="font-semibold text-gray-700">{availableModels}</span> disponíveis</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <span className="text-xs text-gray-500"><span className="font-semibold text-gray-700">{totalModels - availableModels}</span> em breve</span>
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

            {/* Sections grid — horizontal scroll of cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections.map((sec) => {
                const color = SECTION_COLORS[colorIdx % SECTION_COLORS.length];
                colorIdx++;
                return (
                  <SectionCard
                    key={sec.section.id}
                    sectionData={sec}
                    color={color}
                    onOpen={() => onOpenSection(sec)}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {filteredCourses.length === 0 && (
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
  const { section, semesterTitle, models, availableCount, totalCount } = sectionData;
  const progressPercent = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;

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
          <span className="absolute text-[10px] font-semibold text-teal-600">{progressPercent}%</span>
        </div>
      </div>

      {/* Title */}
      <h4 className="font-bold text-gray-900 mb-1" style={headingStyle}>{section.title}</h4>
      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-3">
        {models.length} modelos · {totalCount} items
      </p>

      {/* Progress row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">Disponíveis</span>
        <span className="text-xs font-semibold text-gray-700">{availableCount}/{totalCount} Modelos</span>
      </div>

      {/* Topic tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {models.slice(0, 3).map(({ topic }) => (
          <span key={topic.id} className="px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-[10px] text-gray-600 font-medium">
            {topic.title}
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
// ── Level 2: Section Screen (Topics) ──
// ══════════════════════════════════════════════
function SectionScreen({
  sectionData,
  onBack,
  onOpenModel,
}: {
  sectionData: SectionWithModels;
  onBack: () => void;
  onOpenModel: (item: { topic: Topic; model: Model3D }) => void;
}) {
  const { section, semesterTitle, models } = sectionData;
  const available = models.filter(m => m.model.available);
  const upcoming = models.filter(m => !m.model.available);

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <AxonPageHeader
        title={section.title}
        subtitle={semesterTitle}
        onBack={onBack}
        backLabel="Atlas 3D"
        statsLeft={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Box size={13} className="text-teal-500" />
              <span className="text-xs text-gray-500"><span className="font-semibold text-gray-700">{models.length}</span> modelos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-500"><span className="font-semibold text-gray-700">{available.length}</span> disponíveis</span>
            </div>
          </div>
        }
      />

      <div className="flex-1 px-6 py-6 space-y-6 custom-scrollbar-light">
        {/* Summary line */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{models.length}</span> modelos 3D em{' '}
            <span className="font-semibold text-gray-700">{new Set(models.map(m => m.topic.id)).size}</span> tópicos
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-500"><span className="font-semibold text-gray-700">{available.length}</span> disponíveis</span>
            </div>
            {upcoming.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-gray-500"><span className="font-semibold text-gray-700">{upcoming.length}</span> em breve</span>
              </div>
            )}
          </div>
        </div>

        {/* Models grid — Flashcard-style cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {models.map(({ topic, model }) => {
            const isAvailable = model.available;
            return (
              <div
                key={topic.id}
                className={clsx(
                  `${components.card.base} ${components.card.padding}`,
                  !isAvailable && "opacity-60"
                )}
              >
                {/* Top row: icon + title + status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className={`${iconClasses('md')} flex-shrink-0 mt-0.5`}>
                      <Box size={20} className="text-teal-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900" style={headingStyle}>
                        {model.name}
                      </h4>
                      <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider mt-0.5">
                        {topic.title}
                      </p>
                    </div>
                  </div>
                  <span className={clsx(
                    "text-sm font-semibold",
                    isAvailable ? "text-teal-600" : "text-gray-400"
                  )}>
                    {isAvailable ? '100%' : '0%'}
                  </span>
                </div>

                {/* Progress row */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500">Progresso</span>
                  <span className="text-sm text-gray-700 font-medium">
                    {isAvailable ? '1/1' : '0/1'} Modelo
                  </span>
                </div>

                {/* CTA Button */}
                {isAvailable ? (
                  <button
                    onClick={() => onOpenModel({ topic, model })}
                    className={`${ctaButtonClasses()} cursor-pointer`}
                  >
                    Visualizar 3D
                  </button>
                ) : (
                  <div className="w-full py-2.5 rounded-full bg-gray-200 text-gray-400 text-sm font-semibold text-center cursor-not-allowed">
                    Em Breve
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Topic Model Card (Level 2 grid item) ──
function TopicModelCard({
  topic,
  model,
  onOpen,
  disabled = false,
}: {
  topic: Topic;
  model: Model3D;
  onOpen?: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      onClick={disabled ? undefined : onOpen}
      whileHover={disabled ? {} : { y: -2 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={clsx(
        "group relative bg-white rounded-xl border overflow-hidden text-left transition-all",
        disabled
          ? "border-gray-200/60 opacity-60 cursor-not-allowed"
          : "border-gray-200/80 shadow-sm hover:shadow-md hover:border-teal-200/60 cursor-pointer"
      )}
    >
      {/* 3D preview placeholder */}
      <div className={clsx(
        "relative h-28 flex items-center justify-center overflow-hidden",
        disabled ? "bg-gray-100" : "bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900"
      )}>
        {/* Animated grid */}
        {!disabled && (
          <div className="absolute inset-0 opacity-15">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id={`grid-${topic.id}`} width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.4" opacity="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#grid-${topic.id})`} />
            </svg>
          </div>
        )}

        {/* 3D box icon with glow */}
        <div className="relative z-10">
          <Box
            size={36}
            className={clsx(
              "transition-transform duration-500",
              disabled ? "text-gray-300" : "text-teal-400 group-hover:scale-110"
            )}
            strokeWidth={1.2}
          />
          {!disabled && (
            <div className="absolute inset-0 bg-teal-500/20 rounded-full" />
          )}
        </div>

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          {model.available ? (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[8px] font-semibold text-emerald-300 border border-emerald-500/30">
              3D
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full bg-gray-200 text-[8px] font-semibold text-gray-500">
              Em breve
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h4 className={clsx("text-xs font-semibold mb-0.5 leading-tight", disabled ? "text-gray-400" : "text-gray-800")}>
          {model.name}
        </h4>
        <p className={clsx("text-[10px] leading-snug line-clamp-2", disabled ? "text-gray-300" : "text-gray-500")}>
          {model.description}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className={clsx("text-[9px] font-medium", disabled ? "text-gray-300" : "text-gray-400")}>
            {topic.title}
          </span>
          {!disabled && (
            <ArrowRight size={12} className="text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    </motion.button>
  );
}


// ══════════════════════════════════════════════
// ── Level 3: Viewer Screen (3D Model) ──
// ══════════════════════════════════════════════
function ViewerScreen({
  topic,
  model,
  onBack,
}: {
  topic: Topic;
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
            <h2 className="text-xs font-bold text-white">{model.name}</h2>
            <p className="text-[9px] text-gray-500">{topic.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-600 font-medium">Arraste para rotacionar &middot; Scroll para zoom</span>
        </div>
      </div>

      {/* 3D Viewport — ModelViewer3D fills remaining space */}
      <div className="flex-1 relative z-10">
        <ModelViewer3D modelId={model.id} modelName={model.name} />
      </div>
    </div>
  );
}