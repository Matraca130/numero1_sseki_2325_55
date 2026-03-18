/**
 * Sprint Preflight Validation Tests
 *
 * These tests act as guardrails to catch planning errors BEFORE
 * they become wasted sprints or broken PRs.
 *
 * Single source of truth: .github/sprint-config.json
 * All values (phantoms, blocked files, size caps, palette patterns)
 * are read from that config — nothing is duplicated here.
 *
 * Origin: Near-miss on 2026-03-16 — planned work against a phantom file
 * (`SummarySessionNew.tsx`) and almost duplicated a completed modularization.
 *
 * Run: npx vitest run src/app/components/content/__tests__/sprint-preflight.test.ts
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const CONTENT_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = path.resolve(__dirname, '../../../../../.github/sprint-config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

// ─────────────────────────────────────────────────────────
// 1. PHANTOM FILE DETECTION
//    Any file referenced in sprint plans MUST actually exist.
// ─────────────────────────────────────────────────────────

/** Sprint targets derived from sizeCaps (files being actively tracked). */
const PLANNED_SPRINT_TARGETS = Object.keys(config.sizeCaps.files).map(
  (filepath: string) => path.basename(filepath),
);

describe('Phantom file detection', () => {
  it.each(PLANNED_SPRINT_TARGETS)(
    '%s exists in content directory',
    (filename) => {
      const filePath = path.join(CONTENT_DIR, filename);
      expect(
        fs.existsSync(filePath),
        `PHANTOM FILE: "${filename}" is listed as a sprint target but does NOT exist at ${filePath}. ` +
        `Verify the actual filename with: ls src/app/components/content/`,
      ).toBe(true);
    },
  );
});

// ─────────────────────────────────────────────────────────
// 2. DUPLICATE MODULARIZATION DETECTION
// ─────────────────────────────────────────────────────────

const COMPLETED_MODULARIZATIONS: Record<string, { phases: string[]; headerPattern: RegExp }> = {};

for (const [filepath, phaseInfo] of Object.entries(config.modularizationLog.completed)) {
  const filename = path.basename(filepath);
  COMPLETED_MODULARIZATIONS[filename] = {
    phases: [phaseInfo as string],
    headerPattern: /refactor|phase|sprint|extract|design|refined|figma/i,
  };
}

describe('Duplicate modularization guard', () => {
  Object.entries(COMPLETED_MODULARIZATIONS).forEach(([filename, { phases, headerPattern }]) => {
    it(`${filename} has modularization history documented (${phases.length} phase(s))`, () => {
      const filePath = path.join(CONTENT_DIR, filename);
      if (!fs.existsSync(filePath)) return;

      const content = fs.readFileSync(filePath, 'utf-8');
      const headerLines = content.split('\n').slice(0, 20).join('\n');
      const hasRefactorNote = headerPattern.test(headerLines);

      expect(
        hasRefactorNote,
        `WARNING: "${filename}" has completed modularization phases:\n` +
        phases.map((p) => `  - ${p}`).join('\n') +
        `\nbut its file header does NOT mention this. Add a header comment to prevent duplicate work.`,
      ).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────
// 3. LOCAL-ONLY FILES MUST NOT APPEAR IN CONTENT DIR
// ─────────────────────────────────────────────────────────

const LOCAL_ONLY_FILES = (config.localOnlyFiles.blocked as string[]).map(
  (filepath: string) => path.basename(filepath),
);

describe('Local-only files are not committed', () => {
  it.each(LOCAL_ONLY_FILES)(
    '%s must NOT exist in content directory (belongs to another agent or has route conflicts)',
    (filename) => {
      const filePath = path.join(CONTENT_DIR, filename);
      expect(
        fs.existsSync(filePath),
        `CONFLICT: "${filename}" exists in the content directory but is marked as local-only. ` +
        `Do NOT commit this file — it belongs to another agent or causes route conflicts.`,
      ).toBe(false);
    },
  );
});

// ─────────────────────────────────────────────────────────
// 4. FILE SIZE SANITY CHECK
// ─────────────────────────────────────────────────────────

const SIZE_CAPS: Record<string, number> = {};
for (const [filepath, maxKB] of Object.entries(config.sizeCaps.files)) {
  SIZE_CAPS[path.basename(filepath)] = maxKB as number;
}

describe('File size regression detection', () => {
  Object.entries(SIZE_CAPS).forEach(([filename, maxKB]) => {
    it(`${filename} stays under ${maxKB}KB (post-modularization cap)`, () => {
      const filePath = path.join(CONTENT_DIR, filename);
      if (!fs.existsSync(filePath)) return;

      const stats = fs.statSync(filePath);
      const sizeKB = Math.ceil(stats.size / 1024);

      expect(
        sizeKB,
        `SIZE REGRESSION: "${filename}" is ${sizeKB}KB but should stay under ${maxKB}KB. ` +
        `It was previously modularized — someone may have added inline code that should be extracted.`,
      ).toBeLessThanOrEqual(maxKB);
    });
  });
});

// ─────────────────────────────────────────────────────────
// 5. PALETTE CONSISTENCY
// ─────────────────────────────────────────────────────────

const PALETTE_AUDITED_FILES = (config.paletteAudit.auditedFiles as string[]).map(
  (filepath: string) => path.basename(filepath),
);

const FORBIDDEN_PATTERNS = (config.paletteAudit.forbiddenPatterns as string[]).map(
  (pattern: string) => new RegExp(pattern, 'g'),
);

describe('Palette regression detection', () => {
  it.each(PALETTE_AUDITED_FILES)(
    '%s has no generic brand-color Tailwind classes after audit',
    (filename) => {
      const filePath = path.join(CONTENT_DIR, filename);
      if (!fs.existsSync(filePath)) return;

      const content = fs.readFileSync(filePath, 'utf-8');
      const allMatches: string[] = [];
      for (const regex of FORBIDDEN_PATTERNS) {
        // Reset lastIndex since we reuse the regex across files
        regex.lastIndex = 0;
        const matches = content.match(regex) || [];
        allMatches.push(...matches);
      }

      expect(
        allMatches,
        `PALETTE REGRESSION in "${filename}": Found generic brand colors that should use palette tokens:\n` +
        allMatches.map((m) => `  - ${m}`).join('\n') +
        `\nReplace with axon.* or tint.* from src/app/lib/palette.ts`,
      ).toEqual([]);
    },
  );
});
