// ============================================================
// TEST: Flashcard Component Exports
//
// Ensures the components referenced by flashcard-student-routes
// actually export the expected named exports. A mismatch would
// cause a runtime crash on lazy load (white screen).
// ============================================================
import { describe, it, expect } from 'vitest';

describe('Flashcard component exports', () => {
  it('FlashcardView exports named FlashcardView', async () => {
    const mod = await import('@/app/components/content/FlashcardView');
    expect(mod.FlashcardView).toBeDefined();
    expect(typeof mod.FlashcardView).toBe('function');
  });

  it('AdaptiveFlashcardView exports named AdaptiveFlashcardView', async () => {
    const mod = await import('@/app/components/content/AdaptiveFlashcardView');
    expect(mod.AdaptiveFlashcardView).toBeDefined();
    expect(typeof mod.AdaptiveFlashcardView).toBe('function');
  });

  it('ReviewSessionView exports named ReviewSessionView', async () => {
    const mod = await import('@/app/components/content/ReviewSessionView');
    expect(mod.ReviewSessionView).toBeDefined();
    expect(typeof mod.ReviewSessionView).toBe('function');
  });
});
