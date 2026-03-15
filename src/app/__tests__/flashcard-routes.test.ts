// ============================================================
// TEST: Flashcard Route Coverage
//
// Ensures every navigation target used by flashcard components
// has a corresponding route registered in flashcard-student-routes.ts.
//
// WHY: BUG-016 was caused by AdaptiveFlashcardView navigating to
// /student/adaptive-session, but that route was never registered.
// This test prevents similar regressions.
// ============================================================
import { describe, it, expect } from 'vitest';
import { flashcardStudentRoutes } from '@/app/routes/flashcard-student-routes';

describe('flashcard-student-routes', () => {
  const registeredPaths = flashcardStudentRoutes.map(r => r.path).filter(Boolean);

  // ── Core routes ──────────────────────────────────────

  it('registers the flashcards route', () => {
    expect(registeredPaths).toContain('flashcards');
  });

  it('registers the review-session route', () => {
    expect(registeredPaths).toContain('review-session');
  });

  it('registers the adaptive-session route (BUG-016)', () => {
    // BUG-016: Was missing → "Con IA" button landed on WelcomeView
    expect(registeredPaths).toContain('adaptive-session');
  });

  // ── Navigate targets used by flashcard components ───
  // If a flashcard component calls navigate('/student/X'),
  // then X must be in this list AND must have a registered route.

  it('covers all navigate targets used by flashcard components', () => {
    const flashcardNavigateTargets = [
      'flashcards',          // FlashcardView main route
      'adaptive-session',    // AdaptiveFlashcardView (from DeckScreen "Con IA")
      'review-session',      // ReviewSessionView (FSRS review center)
    ];

    for (const target of flashcardNavigateTargets) {
      expect(
        registeredPaths,
        `Missing route for navigate target: /student/${target}`,
      ).toContain(target);
    }
  });

  // ── Structure checks ──────────────────────────────

  it('every route has a lazy loader', () => {
    for (const route of flashcardStudentRoutes) {
      expect(
        route.lazy,
        `Route "${route.path}" is missing a lazy loader`,
      ).toBeDefined();
      expect(typeof route.lazy).toBe('function');
    }
  });

  it('has no duplicate paths', () => {
    const seen = new Set<string>();
    for (const path of registeredPaths) {
      expect(
        seen.has(path!),
        `Duplicate route path: ${path}`,
      ).toBe(false);
      seen.add(path!);
    }
  });

  it('no route path starts with / (should be relative)', () => {
    for (const path of registeredPaths) {
      expect(
        path!.startsWith('/'),
        `Route path "${path}" should be relative (no leading /)`,
      ).toBe(false);
    }
  });
});
