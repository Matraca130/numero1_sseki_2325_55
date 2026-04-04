// ============================================================
// Axon — Course Switcher (RESPONSIVE VERSION v2)
//
// Fixes from v1:
//   - P1: Dropdown uses fixed positioning on mobile to prevent overflow
//   - Single BookOpen icon (no hidden/show duplication)
//   - Touch-friendly course items (min-h-[44px])
// ============================================================
import React, { useState } from 'react';
import { useNavigation } from '@/app/context/NavigationContext';
import { useTreeCourses } from '@/app/hooks/useTreeCourses';
import { components, animation } from '@/app/design-system';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, BookOpen } from 'lucide-react';
import clsx from 'clsx';

export function CourseSwitcher() {
  const { currentCourse, setCurrentCourse } = useNavigation();
  const { courses } = useTreeCourses();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl hover:bg-white/5 transition-colors duration-200 group"
      >
        <div className={clsx(
          "w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-white shadow-sm transition-colors duration-300",
          currentCourse.color
        )}>
          <BookOpen className="w-[18px] h-[18px] sm:w-5 sm:h-5" strokeWidth={2.5} />
        </div>
        <div className="text-left hidden md:block">
          <p className="text-gray-400 group-hover:text-gray-300 font-medium tracking-wide uppercase text-[14px] font-sans">Curso Actual</p>
          <p className="font-semibold text-gray-200 group-hover:text-white leading-none text-[16px] font-sans">{currentCourse.name}</p>
        </div>
        <ChevronDown 
          size={16} 
          className={clsx("text-gray-500 group-hover:text-white transition-transform duration-200 ml-1", isOpen && "rotate-180")} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />

            {/* Desktop: absolute dropdown */}
            <motion.div
              initial={animation.dropdown.initial}
              animate={animation.dropdown.animate}
              exit={animation.dropdown.exit}
              transition={{ duration: animation.dropdown.duration, ease: animation.dropdown.ease }}
              className={clsx(
                "hidden sm:block absolute top-full left-0 mt-2 w-64 p-2 z-50 overflow-hidden ring-1 ring-black/5",
                components.courseSwitcher.dropdown
              )}
            >
              <CourseList
                courses={courses}
                currentCourse={currentCourse}
                onSelect={(course) => { setCurrentCourse(course); setIsOpen(false); }}
              />
            </motion.div>

            {/* Mobile: fixed bottom-aligned dropdown with safe margins */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className={clsx(
                "sm:hidden fixed left-4 right-4 top-14 p-2 z-50 overflow-hidden ring-1 ring-black/5",
                components.courseSwitcher.dropdown
              )}
            >
              <CourseList
                courses={courses}
                currentCourse={currentCourse}
                onSelect={(course) => { setCurrentCourse(course); setIsOpen(false); }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Extracted list to avoid duplication between mobile/desktop dropdowns */
function CourseList({
  courses,
  currentCourse,
  onSelect,
}: {
  courses: any[];
  currentCourse: any;
  onSelect: (course: any) => void;
}) {
  return (
    <>
      <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Selecione o Curso
      </div>
      {courses.map((course) => (
        <button
          key={course.id}
          onClick={() => onSelect(course)}
          className={clsx(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left mb-1 last:mb-0 min-h-[44px]",
            currentCourse.id === course.id 
              ? "bg-black/5 shadow-inner" 
              : "hover:bg-black/5"
          )}
        >
          <div className={clsx(
            "w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px]",
            course.color
          )}>
            <div className="w-2 h-2 bg-white rounded-full opacity-50" />
          </div>
          <span className={clsx(
            "text-sm font-medium truncate flex-1",
            currentCourse.id === course.id ? "text-gray-900" : "text-gray-600"
          )}>
            {course.name}
          </span>
          {currentCourse.id === course.id && (
            <motion.div 
              layoutId="active-dot"
              className={clsx("ml-auto w-1.5 h-1.5 rounded-full shrink-0", course.color)}
            />
          )}
        </button>
      ))}
    </>
  );
}
