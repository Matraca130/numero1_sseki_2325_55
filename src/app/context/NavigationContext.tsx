import React, { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import type { Course, Topic } from '@/app/data/courses';

// ── Types ────────────────────────────────────────────────────

interface NavigationContextType {
  currentCourse: Course;
  setCurrentCourse: (course: Course) => void;
  currentTopic: Topic | null;
  setCurrentTopic: (topic: Topic) => void;
}

const noop = () => {};

// Fallback empty course when no mock/real data is loaded yet
const emptyCourse: Course = {
  id: '',
  name: '',
  color: 'bg-gray-400',
  accentColor: 'text-gray-400',
  semesters: [],
};

const defaultValue: NavigationContextType = {
  currentCourse: emptyCourse,
  setCurrentCourse: noop,
  currentTopic: null,
  setCurrentTopic: noop,
};

const NavigationContext = createContext<NavigationContextType>(defaultValue);

// ── Provider ─────────────────────────────────────────────────

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentCourse, setCurrentCourse] = useState<Course>(emptyCourse);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);

  const value = useMemo<NavigationContextType>(() => ({
    currentCourse,
    setCurrentCourse,
    currentTopic,
    setCurrentTopic,
  }), [currentCourse, currentTopic]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────

export function useNavigation() {
  return useContext(NavigationContext);
}
