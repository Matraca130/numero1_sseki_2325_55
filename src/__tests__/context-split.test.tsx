// ============================================================
// Context Split Tests — Ronda 2 Verification
//
// PURPOSE: Verify the AppContext split into UIContext,
// NavigationContext, and StudySessionContext works correctly.
//
// Guards against:
//   - useUI() missing isSidebarOpen / setSidebarOpen / theme / setTheme
//   - useNavigation() missing currentCourse / setCurrentCourse / currentTopic / setCurrentTopic
//   - useStudySession() missing isStudySessionActive / studyPlans
//   - useApp() not composing all three contexts
//   - Cross-context re-render leaks (UI changes re-rendering Nav consumers)
//
// APPROACH: Render hooks inside providers, assert shape and isolation.
// ============================================================

import React, { useRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, act, screen } from '@testing-library/react';

import { UIProvider, useUI } from '@/app/context/UIContext';
import { NavigationProvider, useNavigation } from '@/app/context/NavigationContext';
import { AppProvider, useApp, useStudySession } from '@/app/context/AppContext';

// ══════════════════════════════════════════════════════════════
// SUITE 1: UIContext — shape and basic behavior
// ══════════════════════════════════════════════════════════════

describe('UIContext', () => {
  function UIConsumer() {
    const ui = useUI();
    return (
      <div>
        <span data-testid="sidebar">{String(ui.isSidebarOpen)}</span>
        <span data-testid="theme">{ui.theme}</span>
        <button data-testid="toggle-sidebar" onClick={() => ui.setSidebarOpen(!ui.isSidebarOpen)}>
          toggle
        </button>
        <button data-testid="set-dark" onClick={() => ui.setTheme('dark')}>
          dark
        </button>
      </div>
    );
  }

  it('returns isSidebarOpen, setSidebarOpen, theme, setTheme', () => {
    render(
      <UIProvider>
        <UIConsumer />
      </UIProvider>,
    );

    expect(screen.getByTestId('sidebar').textContent).toBe('true');
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('setSidebarOpen toggles sidebar state', () => {
    render(
      <UIProvider>
        <UIConsumer />
      </UIProvider>,
    );

    act(() => {
      screen.getByTestId('toggle-sidebar').click();
    });

    expect(screen.getByTestId('sidebar').textContent).toBe('false');
  });

  it('setTheme changes theme to dark', () => {
    render(
      <UIProvider>
        <UIConsumer />
      </UIProvider>,
    );

    act(() => {
      screen.getByTestId('set-dark').click();
    });

    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: NavigationContext — shape and basic behavior
// ══════════════════════════════════════════════════════════════

describe('NavigationContext', () => {
  function NavConsumer() {
    const nav = useNavigation();
    return (
      <div>
        <span data-testid="course-name">{nav.currentCourse.name}</span>
        <span data-testid="topic">{nav.currentTopic ? nav.currentTopic.id : 'null'}</span>
        <button
          data-testid="set-course"
          onClick={() =>
            nav.setCurrentCourse({
              id: 'c1',
              name: 'Anatomia',
              color: 'bg-teal-500',
              accentColor: 'text-teal-500',
              semesters: [],
            })
          }
        >
          set
        </button>
      </div>
    );
  }

  it('returns currentCourse, setCurrentCourse, currentTopic, setCurrentTopic', () => {
    render(
      <NavigationProvider>
        <NavConsumer />
      </NavigationProvider>,
    );

    // Default empty course
    expect(screen.getByTestId('course-name').textContent).toBe('');
    expect(screen.getByTestId('topic').textContent).toBe('null');
  });

  it('setCurrentCourse updates course', () => {
    render(
      <NavigationProvider>
        <NavConsumer />
      </NavigationProvider>,
    );

    act(() => {
      screen.getByTestId('set-course').click();
    });

    expect(screen.getByTestId('course-name').textContent).toBe('Anatomia');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 3: StudySessionContext — shape and basic behavior
// ══════════════════════════════════════════════════════════════

describe('StudySessionContext', () => {
  function SessionConsumer() {
    const session = useStudySession();
    return (
      <div>
        <span data-testid="active">{String(session.isStudySessionActive)}</span>
        <span data-testid="plans-count">{session.studyPlans.length}</span>
        <span data-testid="quiz-auto">{String(session.quizAutoStart)}</span>
        <span data-testid="fc-auto">{String(session.flashcardAutoStart)}</span>
        <button data-testid="activate" onClick={() => session.setStudySessionActive(true)}>
          activate
        </button>
        <button
          data-testid="add-plan"
          onClick={() =>
            session.addStudyPlan({
              id: 'plan-1',
              name: 'Test Plan',
              subjects: [],
              methods: [],
              selectedTopics: [],
              completionDate: new Date('2026-04-01'),
              weeklyHours: [0, 0, 0, 0, 0, 0, 0],
              tasks: [{ id: 't1', date: new Date(), title: 'Task 1', subject: 'Bio', subjectColor: '#fff', method: 'read', estimatedMinutes: 30, completed: false }],
              createdAt: new Date(),
              totalEstimatedHours: 10,
            })
          }
        >
          add plan
        </button>
      </div>
    );
  }

  it('returns isStudySessionActive, studyPlans, and auto-start flags', () => {
    render(
      <AppProvider>
        <SessionConsumer />
      </AppProvider>,
    );

    expect(screen.getByTestId('active').textContent).toBe('false');
    expect(screen.getByTestId('plans-count').textContent).toBe('0');
    expect(screen.getByTestId('quiz-auto').textContent).toBe('false');
    expect(screen.getByTestId('fc-auto').textContent).toBe('false');
  });

  it('setStudySessionActive toggles session', () => {
    render(
      <AppProvider>
        <SessionConsumer />
      </AppProvider>,
    );

    act(() => {
      screen.getByTestId('activate').click();
    });

    expect(screen.getByTestId('active').textContent).toBe('true');
  });

  it('addStudyPlan adds a plan', () => {
    render(
      <AppProvider>
        <SessionConsumer />
      </AppProvider>,
    );

    act(() => {
      screen.getByTestId('add-plan').click();
    });

    expect(screen.getByTestId('plans-count').textContent).toBe('1');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 4: Legacy useApp() — backwards compatibility
// ══════════════════════════════════════════════════════════════

describe('useApp() legacy hook', () => {
  function AppConsumer() {
    const app = useApp();
    return (
      <div>
        {/* UI fields */}
        <span data-testid="has-sidebar">{String('isSidebarOpen' in app)}</span>
        <span data-testid="has-theme">{String('theme' in app)}</span>
        {/* Navigation fields */}
        <span data-testid="has-course">{String('currentCourse' in app)}</span>
        <span data-testid="has-topic">{String('currentTopic' in app)}</span>
        {/* Session fields */}
        <span data-testid="has-session">{String('isStudySessionActive' in app)}</span>
        <span data-testid="has-plans">{String('studyPlans' in app)}</span>
        {/* Setters */}
        <span data-testid="has-set-sidebar">{String(typeof app.setSidebarOpen === 'function')}</span>
        <span data-testid="has-set-theme">{String(typeof app.setTheme === 'function')}</span>
        <span data-testid="has-set-course">{String(typeof app.setCurrentCourse === 'function')}</span>
        <span data-testid="has-set-topic">{String(typeof app.setCurrentTopic === 'function')}</span>
        <span data-testid="has-set-session-active">{String(typeof app.setStudySessionActive === 'function')}</span>
        <span data-testid="has-add-plan">{String(typeof app.addStudyPlan === 'function')}</span>
      </div>
    );
  }

  it('returns ALL combined fields from UI, Navigation, and Session contexts', () => {
    render(
      <AppProvider>
        <AppConsumer />
      </AppProvider>,
    );

    // UI
    expect(screen.getByTestId('has-sidebar').textContent).toBe('true');
    expect(screen.getByTestId('has-theme').textContent).toBe('true');
    // Navigation
    expect(screen.getByTestId('has-course').textContent).toBe('true');
    expect(screen.getByTestId('has-topic').textContent).toBe('true');
    // Session
    expect(screen.getByTestId('has-session').textContent).toBe('true');
    expect(screen.getByTestId('has-plans').textContent).toBe('true');
    // Setters are functions
    expect(screen.getByTestId('has-set-sidebar').textContent).toBe('true');
    expect(screen.getByTestId('has-set-theme').textContent).toBe('true');
    expect(screen.getByTestId('has-set-course').textContent).toBe('true');
    expect(screen.getByTestId('has-set-topic').textContent).toBe('true');
    expect(screen.getByTestId('has-set-session-active').textContent).toBe('true');
    expect(screen.getByTestId('has-add-plan').textContent).toBe('true');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 5: Cross-context isolation — UI changes do NOT
//          re-render NavigationContext consumers
// ══════════════════════════════════════════════════════════════

describe('Cross-context render isolation', () => {
  it('changing sidebar in UIContext does NOT re-render NavigationContext consumers', () => {
    const navRenderCount = { current: 0 };

    function NavObserver() {
      navRenderCount.current += 1;
      const nav = useNavigation();
      return <span data-testid="nav-course">{nav.currentCourse.name}</span>;
    }

    function UIToggler() {
      const ui = useUI();
      return (
        <button data-testid="toggle" onClick={() => ui.setSidebarOpen(!ui.isSidebarOpen)}>
          toggle
        </button>
      );
    }

    render(
      <AppProvider>
        <NavObserver />
        <UIToggler />
      </AppProvider>,
    );

    const initialRenders = navRenderCount.current;

    // Toggle sidebar — should NOT cause NavObserver to re-render
    act(() => {
      screen.getByTestId('toggle').click();
    });

    // NavObserver should not have re-rendered beyond the initial render
    expect(navRenderCount.current).toBe(initialRenders);
  });
});
