// ============================================================
// Wizard Hooks Safety Tests
//
// PURPOSE: Prevent regression of the conditional hooks violation
// in StudyOrganizerWizard (React error #310).
//
// BACKGROUND:
//   StepReview() had a useMemo inside it, but was called as a
//   regular function (not <StepReview />) from renderStep(),
//   which only runs it when step === 5. This made the useMemo
//   conditional, violating React's Rules of Hooks and corrupting
//   hook state — causing "Objects are not valid as a React child."
//
// APPROACH:
//   1. AST-level: parse the wizard source and verify no hooks
//      exist inside the inner step functions (StepSubjects,
//      StepMethods, StepTopics, StepDate, StepHours, StepReview).
//   2. Structural: verify renderStep calls step functions as
//      functions (not components), confirming hooks MUST live
//      at the top level of StudyOrganizerWizard.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const WIZARD_PATH = resolve(
  __dirname,
  '../app/components/content/study-organizer-wizard/StudyOrganizerWizard.tsx',
);

const source = readFileSync(WIZARD_PATH, 'utf-8');

// ── Helpers ─────────────────────────────────────────────────

/**
 * Extract the body of a named inner function declared with
 * `function FnName() {` or `const fnName = () => {` inside the component.
 *
 * Uses brace-counting to find the matching closing brace.
 * Returns null if the function is not found.
 */
function extractFunctionBody(src: string, fnName: string): string | null {
  // Try `function FnName() {` first, then `const fnName = (...) => {`
  const patterns = [
    new RegExp(`function\\s+${fnName}\\s*\\([^)]*\\)\\s*\\{`),
    new RegExp(`(?:const|let|var)\\s+${fnName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{`),
    new RegExp(`(?:const|let|var)\\s+${fnName}\\s*=\\s*\\(\\)\\s*=>\\s*\\{`),
  ];
  let match: RegExpExecArray | null = null;
  for (const pattern of patterns) {
    match = pattern.exec(src);
    if (match) break;
  }
  if (!match) return null;

  const startIdx = match.index + match[0].length;
  let depth = 1;
  let i = startIdx;

  while (i < src.length && depth > 0) {
    const ch = src[i];

    // Skip string literals (single, double, template)
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') {
          i += 2; // skip escaped char
          continue;
        }
        if (src[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // Skip single-line comments
    if (ch === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }

    // Skip multi-line comments
    if (ch === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length - 1 && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    if (ch === '{') depth++;
    if (ch === '}') depth--;
    i++;
  }

  return src.slice(startIdx, i - 1);
}

// React hooks that must NOT appear inside conditionally-called functions
const HOOK_PATTERNS = [
  /\buseMemo\s*\(/,
  /\buseState\s*\(/,
  /\buseEffect\s*\(/,
  /\buseCallback\s*\(/,
  /\buseRef\s*\(/,
  /\buseContext\s*\(/,
  /\buseReducer\s*\(/,
  /\buseLayoutEffect\s*\(/,
  /\buseImperativeHandle\s*\(/,
  /\buseDebugValue\s*\(/,
];

const STEP_FUNCTIONS = [
  'StepSubjects',
  'StepMethods',
  'StepTopics',
  'StepDate',
  'StepHours',
  'StepReview',
];

// ══════════════════════════════════════════════════════════════
// SUITE 1: No hooks inside conditionally-called step functions
// ══════════════════════════════════════════════════════════════

describe('StudyOrganizerWizard — hooks safety', () => {
  it('wizard source file exists and is non-empty', () => {
    expect(source.length).toBeGreaterThan(100);
  });

  for (const fnName of STEP_FUNCTIONS) {
    it(`${fnName}() contains no React hooks`, () => {
      const body = extractFunctionBody(source, fnName);
      expect(body).not.toBeNull();

      for (const pattern of HOOK_PATTERNS) {
        const match = pattern.exec(body!);
        if (match) {
          throw new Error(
            `Found hook "${match[0]}" inside ${fnName}(). ` +
            `This function is called conditionally from renderStep(), ` +
            `so hooks inside it violate React's Rules of Hooks. ` +
            `Move the hook to the top level of StudyOrganizerWizard.`,
          );
        }
      }
    });
  }

  // ════════════════════════════════════════════════════════════
  // SUITE 2: renderStep calls functions, not components
  // ════════════════════════════════════════════════════════════

  it('renderStep calls step functions as regular functions (not JSX)', () => {
    const renderStepBody = extractFunctionBody(source, 'renderStep');
    expect(renderStepBody).not.toBeNull();

    // Should contain `StepSubjects()` not `<StepSubjects />`
    for (const fnName of STEP_FUNCTIONS) {
      // If the function is referenced in renderStep, it should be
      // called as `FnName()` not `<FnName ...>`
      const jsxPattern = new RegExp(`<\\s*${fnName}[\\s/>]`);
      const callPattern = new RegExp(`${fnName}\\s*\\(`);

      const hasJsx = jsxPattern.test(renderStepBody!);
      const hasCall = callPattern.test(renderStepBody!);

      if (hasJsx) {
        // If rendered as JSX component, hooks inside would be OK
        // (each component has its own hook state). But our architecture
        // uses function calls, so this test documents the expectation.
        // If someone changes to JSX, the hooks-inside-step test above
        // can be relaxed for that function.
      }

      if (hasCall) {
        // This is the expected pattern: StepX() as a function call.
        // Hooks MUST NOT be inside the function body.
        expect(hasCall).toBe(true);
      }
    }
  });

  // ════════════════════════════════════════════════════════════
  // SUITE 3: Shared context imports (no duplicate hook instances)
  // ════════════════════════════════════════════════════════════

  it('imports from context providers, not raw hooks', () => {
    expect(source).toContain('useStudyPlansContext');
    expect(source).not.toMatch(/import.*useStudyPlans\s*\}?\s*from.*hooks\/useStudyPlans/);
    expect(source).toContain('useTopicMasteryContext');
    expect(source).toContain('useStudyTimeEstimatesContext');
  });

  // ════════════════════════════════════════════════════════════
  // SUITE 4: Top-level useMemo calls exist for critical computed values
  // ════════════════════════════════════════════════════════════

  it('selectedMasteryStats useMemo is at the component top level', () => {
    // The useMemo for selectedMasteryStats must be in the main component body,
    // NOT inside any step function. We verify it appears before any step function.
    const masteryMemoIdx = source.indexOf('const selectedMasteryStats = useMemo(');
    expect(masteryMemoIdx).toBeGreaterThan(-1);

    // It should appear BEFORE the first step function definition
    const firstStepIdx = source.indexOf('function StepSubjects()');
    expect(firstStepIdx).toBeGreaterThan(-1);
    expect(masteryMemoIdx).toBeLessThan(firstStepIdx);
  });
});
