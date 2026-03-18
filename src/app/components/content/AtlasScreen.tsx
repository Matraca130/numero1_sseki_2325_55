// ============================================================
// Axon — AtlasScreen + SectionCard
//
// Level 1 of the 3D Atlas: grid of sections with model counts.
// Extracted from ThreeDView.tsx to comply with <500 lines rule.
// ============================================================

import { useMemo, memo } from 'react';
import { motion } from 'motion/react';
import { Box, Search } from 'lucide-react';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import type { SectionWithModels } from '@/app/types/model3d';
import type { TreeCourse } from '@/app/services/contentTreeApi';
import { colors, components, headingStyle, sectionColors } from '@/app/design-system';
import { iconClasses, ctaButtonClasses } from '@/app/design-system';

// ── Section accent colors — from design system ──
const SECTION_COLORS = sectionColors.teal;

// ══════════════════════════════════════════════
// ── Atlas Home Screen ──
// ══════════════════════════════════════════════

interface AtlasScreenProps {
  allCoursesSections: { course: TreeCourse; sections: SectionWithModels[] }[];
  totalModels: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenSection: (sec: SectionWithModels) => void;
}

export function AtlasScreen({
  allCoursesSections,
  totalModels,
  searchQuery,
  setSearchQuery,
  onOpenSection,
}: AtlasScreenProps) {
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

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <AxonPageHeader
        title="Atlas 3D"
        subtitle="Explore modelos anatomicos interativos"
        statsLeft={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#2a8c7a]" />
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
              className="pl-8 pr-4 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2a8c7a]/20 focus:border-[#2a8c7a] w-52"
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

        {filteredCourses.map(({ course, sections }, courseIdx) => {
          // Global section offset = sum of section counts in all previous courses
          const sectionOffset = filteredCourses
            .slice(0, courseIdx)
            .reduce((acc, c) => acc + c.sections.length, 0);

          return (
          <div key={course.id}>
            {/* Course header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-[#2a8c7a]" />
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide" style={headingStyle}>{course.name}</h3>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] text-rose-400 font-medium">
                {sections.reduce((s, sec) => s + sec.totalCount, 0)} m
              </span>
            </div>

            {/* Sections grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections.map((sec, secIdx) => {
                const color = SECTION_COLORS[(sectionOffset + secIdx) % SECTION_COLORS.length];
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
          );
        })}

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


// ══════════════════════════════════════════════
// ── Section Card (grid item) ──
// Pattern: React.memo with custom comparator — callbacks are inline closures
// from .map(), so we compare data fields instead of function references.
// ══════════════════════════════════════════════

const SectionCard = memo(function SectionCard({
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
          <span className="absolute text-[10px] font-semibold text-[#2a8c7a]">{totalCount}</span>
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
},
  // Custom arePropsEqual: compare data identity, skip callback refs
  (prev, next) =>
    prev.sectionData.sectionId === next.sectionData.sectionId &&
    prev.sectionData.totalCount === next.sectionData.totalCount &&
    prev.sectionData.models.length === next.sectionData.models.length &&
    prev.color === next.color
);