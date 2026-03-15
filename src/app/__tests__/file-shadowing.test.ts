// ============================================================
// TEST: File Shadowing Detection
//
// BUG-017 ROOT CAUSE: TopicSidebar.tsx (OLD, 10KB) shadowed
// topic-sidebar/index.ts barrel (NEW, with fixes). Vite/TS
// resolves files before directories, so the OLD file won.
//
// This test detects when a .tsx file and a kebab-case directory
// coexist in the same parent, creating a shadowing risk.
// If both exist, the .tsx file MUST be a tiny bridge (re-export),
// not a full component implementation.
//
// DOMAIN: Agent 3 (flashcard) owns this because the flashcard
// view was broken by this exact shadowing pattern.
// ============================================================
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const LAYOUT_DIR = path.resolve(__dirname, '../../app/components/layout');

/**
 * Convert kebab-case directory name to PascalCase filename.
 * e.g. "topic-sidebar" → "TopicSidebar"
 */
function kebabToPascal(kebab: string): string {
  return kebab
    .split('-')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

describe('File shadowing detection (layout/)', () => {
  it('TopicSidebar.tsx should be a bridge if topic-sidebar/ directory exists', () => {
    const filePath = path.join(LAYOUT_DIR, 'TopicSidebar.tsx');
    const dirPath = path.join(LAYOUT_DIR, 'topic-sidebar');

    const fileExists = fs.existsSync(filePath);
    const dirExists = fs.existsSync(dirPath);

    if (!fileExists || !dirExists) {
      // No shadowing risk — only one exists
      return;
    }

    // Both exist: the file MUST be a bridge (re-export), not a full component
    const content = fs.readFileSync(filePath, 'utf-8');

    // Bridge files are tiny (< 400 bytes) and contain a re-export
    const isBridge =
      content.length < 400 &&
      (content.includes("from './topic-sidebar'") ||
       content.includes('from "./topic-sidebar"') ||
       content.includes("from './topic-sidebar/TopicSidebarRoot'"));

    expect(
      isBridge,
      `BUG-017 REGRESSION: TopicSidebar.tsx (${content.length} bytes) coexists with ` +
      `topic-sidebar/ directory but is NOT a bridge re-export. ` +
      `This causes file shadowing — StudentLayout imports the OLD file ` +
      `instead of the NEW barrel. Either:\n` +
      `  1. Replace TopicSidebar.tsx with: export { TopicSidebar } from './topic-sidebar'\n` +
      `  2. Or delete TopicSidebar.tsx (requires updating StudentLayout import)`,
    ).toBe(true);
  });

  it('no other .tsx file shadows a kebab-case directory', () => {
    if (!fs.existsSync(LAYOUT_DIR)) return;

    const entries = fs.readdirSync(LAYOUT_DIR, { withFileTypes: true });
    const tsxFiles = entries
      .filter(e => e.isFile() && e.name.endsWith('.tsx'))
      .map(e => e.name.replace('.tsx', ''));
    const dirs = entries
      .filter(e => e.isDirectory())
      .map(e => e.name);

    for (const dir of dirs) {
      const pascalName = kebabToPascal(dir);

      if (tsxFiles.includes(pascalName)) {
        const filePath = path.join(LAYOUT_DIR, `${pascalName}.tsx`);
        const content = fs.readFileSync(filePath, 'utf-8');

        // If both coexist, file must be small (bridge/re-export)
        expect(
          content.length,
          `${pascalName}.tsx (${content.length} bytes) shadows directory ${dir}/. ` +
          `If intentional, it should be a ≤400-byte re-export bridge.`,
        ).toBeLessThanOrEqual(400);
      }
    }
  });
});
