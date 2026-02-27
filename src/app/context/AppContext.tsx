import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Course, Topic, courses } from '@/app/types/content';

// @refresh reset

// ── Re-export ViewType from its canonical location ───────────
// Keeps existing `import { ViewType } from '@/app/context/AppContext'` working.
export type { ViewType } from '@/app/hooks/useStudentNav';

export type ThemeType = 'dark' | 'light';

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
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  isStudySessionActive: boolean;
  setStudySessionActive: (active: boolean) => void;
  studyPlans: StudyPlan[];
  addStudyPlan: (plan: StudyPlan) => void;
  toggleTaskComplete: (planId: string, taskId: string) => void;
  quizAutoStart: boolean;
  setQuizAutoStart: (v: boolean) => void;
  flashcardAutoStart: boolean;
  setFlashcardAutoStart: (v: boolean) => void;
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const noop = () => {};

const defaultContextValue: AppContextType = {
  currentCourse: courses[0],
  setCurrentCourse: noop,
  currentTopic: courses[0].semesters[0].sections[0].topics[0],
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
  const [currentCourse, setCurrentCourse] = useState<Course>(courses[0]);
  const defaultTopic = courses[0].semesters[0].sections[0].topics[0];
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(defaultTopic);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isStudySessionActive, setStudySessionActive] = useState(false);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [quizAutoStart, setQuizAutoStart] = useState(false);
  const [flashcardAutoStart, setFlashcardAutoStart] = useState(false);
  const [theme, setTheme] = useState<ThemeType>('light');

  const addStudyPlan = useCallback((plan: StudyPlan) => {
    setStudyPlans(prev => [...prev, plan]);
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
    isSidebarOpen,
    setSidebarOpen,
    isStudySessionActive,
    setStudySessionActive,
    studyPlans,
    addStudyPlan,
    toggleTaskComplete,
    quizAutoStart,
    setQuizAutoStart,
    flashcardAutoStart,
    setFlashcardAutoStart,
    theme,
    setTheme,
  }), [
    currentCourse, currentTopic,
    isSidebarOpen, isStudySessionActive, studyPlans, addStudyPlan,
    toggleTaskComplete, quizAutoStart, flashcardAutoStart, theme,
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