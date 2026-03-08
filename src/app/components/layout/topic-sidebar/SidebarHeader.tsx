// ============================================================
// SidebarHeader — Course info, progress bar, collapse control
// ============================================================

import { BookOpen, PanelLeftClose, ArrowLeft } from 'lucide-react';
import { headingStyle } from '@/app/design-system';
import type { CourseInfo } from './types';

interface SidebarHeaderProps {
  course: CourseInfo;
  onCollapse: () => void;
  onBack: () => void;
}

export function SidebarHeader({ course, onCollapse, onBack }: SidebarHeaderProps) {
  return (
    <div className="px-4 pt-5 pb-4 border-b border-zinc-200">
      {/* Top row: back + course info + collapse */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button */}
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-teal-50 text-zinc-400 hover:text-teal-600 transition-colors shrink-0"
            aria-label="Volver al hub"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Course icon */}
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
            <BookOpen size={20} className="text-teal-600" />
          </div>

          {/* Course name + semester */}
          <div className="min-w-0">
            <h3
              className="text-sm font-semibold text-zinc-900 truncate leading-tight"
              style={headingStyle}
            >
              {course.name}
            </h3>
            {course.semesterName && (
              <p className="text-[11px] text-zinc-400 truncate">
                {course.semesterName}
              </p>
            )}
          </div>
        </div>

        {/* Collapse button */}
        <button
          onClick={onCollapse}
          className="p-1 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors shrink-0 mt-0.5"
          aria-label="Colapsar sidebar"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-teal-400 to-emerald-500"
          style={{ width: `${Math.max(course.progressPct, 2)}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-zinc-400">
          {course.completedSections}/{course.totalSections} secciones
        </span>
        <span className="font-semibold text-teal-600">
          {course.progressPct}%
        </span>
      </div>
    </div>
  );
}
