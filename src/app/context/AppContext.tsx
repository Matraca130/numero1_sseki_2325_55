import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import type { Course, Topic } from '@/app/data/courses';

// @refresh reset

// ── Re-export ViewType from its canonical location ───────────
// Keeps existing `import { ViewType } from '@/app/context/AppContext'` working.
export type { ViewType } from '@/app/hooks/useStudentNav';

// ── Re-export ThemeType and useUI from UIContext for backward compat ──
export type { ThemeType } from '@/app/context/UIContext';
export { useUI } from '@/app/context/UIContext';

// ── Types ────────────────────────────────────────────────────

export interface StudyPlanTask {
  id: string;
  date: Date;
  title: string;
  subject: string;
  subjectColor: string;
  method: string;
  estimatedMinutes: number;
  completed: boolean;
  /** Topic ID for backend mapping (Phase 3+) */
  topicId?: string;
}

export interface StudyPlan {
  id: string;
  name: string;
  subjects: { id: string; name: string; color: string }[];
  methods: string[];
  selectedTopics: { courseId: string; courseName: string; sectionTitle: string; topicTitle: string; topicId: string }[];
  completionDate: Date;
  weeklyHours: number[]; // [mon, tue, wed, thu, fri, sat, sun]
  tasks: StudyPlanTask[];
  createdAt: Date;
  totalEstimatedHours: number;
}

interface AppContextType {
  currentCourse: Course;
  setCurrentCourse: (course: Course) => void;
  currentTopic: Topic | null;
  setCurrentTopic: (topic: Topic) => void;
  isStudySessionActive: boolean;
  setStudySessionActive: (active: boolean) => void;
  studyPlans: StudyPlan[];
  addStudyPlan: (plan: StudyPlan) => void;
  toggleTaskComplete: (planId: string, taskId: string) => void;
  quizAutoStart: boolean;
  setQuizAutoStart: (v: boolean) => void;
  flashcardAutoStart: boolean;
  setFlashcardAutoStart: (v: boolean) => void;
  // ── Deprecated: use useUI() instead ──
  /** @deprecated Use useUI().isSidebarOpen instead */
  isSidebarOpen: boolean;
  /** @deprecated Use useUI().setSidebarOpen instead */
  setSidebarOpen: (isOpen: boolean) => void;
  /** @deprecated Use useUI().theme instead */
  theme: ThemeType;
  /** @deprecated Use useUI().setTheme instead */
  setTheme: (theme: ThemeType) => void;
}

// Import ThemeType locally for use in this file
import type { ThemeType } from '@/app/context/UIContext';
import { useUI } from '@/app/context/UIContext';

const noop = () => {};

// Fallback empty course when no mock/real data is loaded yet
const emptyCourse: Course = {
  id: '',
  name: '',
  color: 'bg-gray-400',
  accentColor: 'text-gray-400',
  semesters: [],
};

const defaultContextValue: AppContextType = {
  currentCourse: emptyCourse,
  setCurrentCourse: noop,
  currentTopic: null,
  setCurrentTopic: noop,
  isSidebarOpen: true,
  setSidebarOpen: noop,
  isStudySessionActive: false,
  setStudySessionActive: noop,
  studyPlans: [],
  addStudyPlan: noop,
  toggleTaskComplete: noop,
  quizAutoStart: false,
  setQuizAutoStart: noop,
  flashcardAutoStart: false,
  setFlashcardAutoStart: noop,
  theme: 'light',
  setTheme: noop,
};

const AppContext = createContext<AppContextType>(defaultContextValue);

// ── Provider ─────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentCourse, setCurrentCourse] = useState<Course>(emptyCourse);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [isStudySessionActive, setStudySessionActive] = useState(false);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [quizAutoStart, setQuizAutoStart] = useState(false);
  const [flashcardAutoStart, setFlashcardAutoStart] = useState(false);

  // Delegate sidebar/theme to UIContext (backward compat bridge)
  const ui = useUI();

  const addStudyPlan = useCallback((plan: StudyPlan) => {
    setStudyPlans(prev => {
      // Dedup: replace existing plan with same ID, or append if new
      const idx = prev.findIndex(p => p.id === plan.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = plan;
        return next;
      }
      return [...prev, plan];
    });
  }, []);

  const toggleTaskComplete = useCallback((planId: string, taskId: string) => {
    setStudyPlans(prev => prev.map(plan => {
      if (plan.id !== planId) return plan;
      return {
        ...plan,
        tasks: plan.tasks.map(task =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        )
      };
    }));
  }, []);

  const value = useMemo<AppContextType>(() => ({
    currentCourse,
    setCurrentCourse,
    currentTopic,
    setCurrentTopic,
    isSidebarOpen: ui.isSidebarOpen,
    setSidebarOpen: ui.setSidebarOpen,
    isStudySessionActive,
    setStudySessionActive,
    studyPlans,
    addStudyPlan,
    toggleTaskComplete,
    quizAutoStart,
    setQuizAutoStart,
    flashcardAutoStart,
    setFlashcardAutoStart,
    theme: ui.theme,
    setTheme: ui.setTheme,
  }), [
    currentCourse, currentTopic,
    ui.isSidebarOpen, ui.setSidebarOpen, ui.theme, ui.setTheme,
    isStudySessionActive, studyPlans, addStudyPlan,
    toggleTaskComplete, quizAutoStart, flashcardAutoStart,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
