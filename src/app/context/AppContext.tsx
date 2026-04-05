import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { UIProvider } from '@/app/context/UIContext';
import { NavigationProvider } from '@/app/context/NavigationContext';
import type { StudyPlan } from '@/app/types/study-plan';

// @refresh reset

// ── Re-exports for backwards compatibility ───────────────────
// Keeps existing `import { ViewType } from '@/app/context/AppContext'` working.
export type { ViewType } from '@/app/hooks/useStudentNav';
// Re-export UI types so existing `import { ThemeType } from '@/app/context/AppContext'` still works
export type { ThemeType } from '@/app/context/UIContext';

// ── Types ────────────────────────────────────────────────────
// Canonical definitions live in types/study-plan.ts; re-exported here for backward compatibility.
export type { StudyPlan, StudyPlanTask } from '@/app/types/study-plan';

// ── Study Session Context ────────────────────────────────────

interface StudySessionContextType {
  isStudySessionActive: boolean;
  setStudySessionActive: (active: boolean) => void;
  studyPlans: StudyPlan[];
  addStudyPlan: (plan: StudyPlan) => void;
  toggleTaskComplete: (planId: string, taskId: string) => void;
  quizAutoStart: boolean;
  setQuizAutoStart: (v: boolean) => void;
  flashcardAutoStart: boolean;
  setFlashcardAutoStart: (v: boolean) => void;
}

const noop = () => {};

const defaultStudySessionValue: StudySessionContextType = {
  isStudySessionActive: false,
  setStudySessionActive: noop,
  studyPlans: [],
  addStudyPlan: noop,
  toggleTaskComplete: noop,
  quizAutoStart: false,
  setQuizAutoStart: noop,
  flashcardAutoStart: false,
  setFlashcardAutoStart: noop,
};

const StudySessionContext = createContext<StudySessionContextType>(defaultStudySessionValue);

// ── Study Session Provider ───────────────────────────────────

function StudySessionProvider({ children }: { children: ReactNode }) {
  const [isStudySessionActive, setStudySessionActive] = useState(false);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [quizAutoStart, setQuizAutoStart] = useState(false);
  const [flashcardAutoStart, setFlashcardAutoStart] = useState(false);

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

  const value = useMemo<StudySessionContextType>(() => ({
    isStudySessionActive,
    setStudySessionActive,
    studyPlans,
    addStudyPlan,
    toggleTaskComplete,
    quizAutoStart,
    setQuizAutoStart,
    flashcardAutoStart,
    setFlashcardAutoStart,
  }), [
    isStudySessionActive, studyPlans, addStudyPlan,
    toggleTaskComplete, quizAutoStart, flashcardAutoStart,
  ]);

  return (
    <StudySessionContext.Provider value={value}>
      {children}
    </StudySessionContext.Provider>
  );
}

export function useStudySession() {
  return useContext(StudySessionContext);
}

// ── Composed AppProvider ─────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <UIProvider>
      <NavigationProvider>
        <StudySessionProvider>{children}</StudySessionProvider>
      </NavigationProvider>
    </UIProvider>
  );
}

// ── Legacy useApp hook (backwards compat) ────────────────────
// Re-composes all three contexts into a single object so existing
// consumers continue to work without changes. New code should
// import from the specific context instead.

// We need to import the hooks here to compose them
import { useUI } from '@/app/context/UIContext';
import { useNavigation } from '@/app/context/NavigationContext';

export function useApp() {
  const ui = useUI();
  const nav = useNavigation();
  const session = useStudySession();
  return { ...ui, ...nav, ...session };
}
