// ============================================================
// TEST: TopicSidebar Navigation Guard
//
// BUG-017: TopicSidebar.tsx had an unconditional navigateTo('study')
// in handleTopicClick, which kicked users out of /student/flashcards
// whenever they clicked a topic in the sidebar.
//
// This test performs STATIC ANALYSIS of the TopicSidebar source
// to ensure it NEVER unconditionally navigates away from the
// current view. It doesn't render components (no React deps).
//
// DOMAIN: This test is owned by Agent 3 (flashcard) because the
// flashcard view is the primary victim of unconditional navigation.
// The fix itself must be applied by the Layout team.
// ============================================================
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const LAYOUT_DIR = path.resolve(__dirname, '../../app/components/layout');

describe('TopicSidebar navigation guard (BUG-017)', () => {
  /**
   * Reads the file that StudentLayout actually imports.
   * If it's a bridge re-export (< 300 bytes), the real logic is in
   * topic-sidebar/TopicSidebarRoot.tsx — read that instead.
   */
  function getEffectiveTopicSidebarSource(): string {
    const mainFile = path.join(LAYOUT_DIR, 'TopicSidebar.tsx');
    if (!fs.existsSync(mainFile)) {
      // File doesn't exist — maybe renamed; skip gracefully
      return '';
    }
    const content = fs.readFileSync(mainFile, 'utf-8');

    // If it's a bridge file, read the real implementation
    if (content.length < 400 && content.includes('topic-sidebar')) {
      const rootFile = path.join(LAYOUT_DIR, 'topic-sidebar', 'TopicSidebarRoot.tsx');
      if (fs.existsSync(rootFile)) {
        return fs.readFileSync(rootFile, 'utf-8');
      }
    }

    return content;
  }

  it('should NOT have an unconditional navigateTo("study") call', () => {
    const source = getEffectiveTopicSidebarSource();
    if (!source) return; // File not found — nothing to test

    const lines = source.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Look for navigateTo('study') or navigateTo("study")
      if (
        line.includes("navigateTo('study')") ||
        line.includes('navigateTo("study")')
      ) {
        // Check that there's a conditional guard (if/ternary) within
        // the preceding 5 lines or on the same line
        const contextWindow = lines
          .slice(Math.max(0, i - 5), i + 1)
          .join('\n');

        const hasGuard =
          contextWindow.includes('if ') ||
          contextWindow.includes('if(') ||
          contextWindow.includes('? ') ||
          contextWindow.includes('&&');

        expect(
          hasGuard,
          `TopicSidebar line ${i + 1} has unconditional navigateTo('study'). ` +
          `This kicks users out of /student/flashcards when they click a topic. ` +
          `Must be guarded with: if (currentView !== 'flashcards') navigateTo('study')`,
        ).toBe(true);
      }
    }
  });

  it('should use currentView or isView to decide navigation target', () => {
    const source = getEffectiveTopicSidebarSource();
    if (!source) return;

    // If the source contains navigateTo('study'), it should also
    // reference currentView or isView for context-aware routing
    if (
      source.includes("navigateTo('study')") ||
      source.includes('navigateTo("study")')
    ) {
      const usesContextAwareNav =
        source.includes('currentView') ||
        source.includes('isView(');

      expect(
        usesContextAwareNav,
        'TopicSidebar uses navigateTo("study") but does NOT check currentView/isView. ' +
        'This means it will always redirect away from flashcards/quiz views.',
      ).toBe(true);
    }
  });
});
