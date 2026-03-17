// ============================================================
// Tests — Lucide-react import collision check
//
// Reads all mindmap .ts/.tsx source files and verifies that
// NO import from lucide-react uses a name that collides with
// JavaScript built-in globals.
//
// This is a CRITICAL check. The bug pattern:
//   import { Map } from 'lucide-react'  ← overwrites global Map!
// Any such import causes all `new Map()` calls to silently fail.
//
// We use fs.readFileSync to parse real source files — no mocking
// needed because we are only checking text content, not executing
// the imported modules.
// ============================================================

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ── Globals to protect ───────────────────────────────────────

const DANGEROUS_GLOBALS = new Set([
  'Map',
  'Set',
  'Array',
  'Object',
  'Number',
  'String',
  'Boolean',
  'Symbol',
  'Date',
  'Error',
  'Function',
  'RegExp',
  'Promise',
  'Proxy',
  'Reflect',
  'JSON',
  'Math',
  'parseInt',
  'parseFloat',
  'undefined',
  'NaN',
  'Infinity',
  'eval',
  'isNaN',
  'isFinite',
  'decodeURI',
  'encodeURI',
  'decodeURIComponent',
  'encodeURIComponent',
]);

// ── File discovery ───────────────────────────────────────────

const MINDMAP_DIR = path.resolve(
  __dirname,
  '..' // src/app/components/content/mindmap/
);

function findSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    // Skip test directories and __tests__
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__' && entry.name !== 'node_modules') {
        results.push(...findSourceFiles(path.join(dir, entry.name)));
      }
      continue;
    }
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

// ── Lucide import parser ─────────────────────────────────────

/**
 * Extract all LOCAL binding names from 'lucide-react' imports.
 * Handles single and multiline import statements.
 * Returns the LOCAL name (after 'as' alias if present).
 *
 * Examples:
 *   import { Map } from 'lucide-react'       → ['Map']     (DANGEROUS)
 *   import { Map as MapIcon } from 'lucide-react' → ['MapIcon'] (safe)
 */
function extractLucideLocalBindings(source: string): string[] {
  const bindings: string[] = [];

  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;

  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(source)) !== null) {
    const block = match[1];
    const names = block
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((token) => {
        // "Map as MapIcon" → local binding is "MapIcon" (safe)
        // "Map" → local binding is "Map" (dangerous)
        const parts = token.split(/\s+as\s+/i);
        return parts[parts.length - 1].trim();
      });
    bindings.push(...names);
  }

  return bindings;
}

// ── Tests ────────────────────────────────────────────────────

describe('lucide-react: no global name collisions in mindmap files', () => {
  const sourceFiles = findSourceFiles(MINDMAP_DIR);

  it('found mindmap source files to check', () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it('source file list contains known files', () => {
    const names = sourceFiles.map((f) => path.basename(f));
    expect(names).toContain('graphHelpers.ts');
    expect(names).toContain('MapToolsPanel.tsx');
    expect(names).toContain('AiTutorPanel.tsx');
    expect(names).toContain('KnowledgeGraph.tsx');
  });

  // Run one assertion per file for clear failure messages
  for (const filePath of sourceFiles.filter(
    (f) => f.endsWith('.ts') || f.endsWith('.tsx')
  )) {
    const filename = path.relative(MINDMAP_DIR, filePath);

    it(`${filename} — no lucide imports collide with JS globals`, () => {
      const source = fs.readFileSync(filePath, 'utf-8');
      const lucideImports = extractLucideLocalBindings(source);

      const collisions = lucideImports.filter((name) =>
        DANGEROUS_GLOBALS.has(name)
      );

      if (collisions.length > 0) {
        throw new Error(
          `${filename} imports ${JSON.stringify(collisions)} from lucide-react.\n` +
            `These names shadow global JavaScript built-ins and will break runtime behavior.\n` +
            `Fix: use an alias, e.g.  import { Map as MapIcon } from 'lucide-react'`
        );
      }

      expect(collisions).toHaveLength(0);
    });
  }
});

// ── Unit tests for the parser itself ────────────────────────

describe('extractLucideLocalBindings (parser)', () => {
  it('extracts single-line named imports', () => {
    const src = `import { Sparkles, X, Loader2 } from 'lucide-react';`;
    expect(extractLucideLocalBindings(src)).toEqual(['Sparkles', 'X', 'Loader2']);
  });

  it('extracts multiline imports', () => {
    const src = `
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
    `;
    expect(extractLucideLocalBindings(src)).toContain('Sparkles');
    expect(extractLucideLocalBindings(src)).toContain('AlertTriangle');
    expect(extractLucideLocalBindings(src)).toContain('CheckCircle2');
  });

  it('extracts the LOCAL binding (after "as" alias)', () => {
    // "Map as MapIcon" → local binding is "MapIcon" (safe, no collision)
    const src = `import { Map as MapIcon } from 'lucide-react';`;
    const names = extractLucideLocalBindings(src);
    expect(names).toContain('MapIcon');
    expect(names).not.toContain('Map');
  });

  it('flags bare imports without alias as the local name', () => {
    // "Map" without alias → local binding IS "Map" (dangerous!)
    const src = `import { Map } from 'lucide-react';`;
    const names = extractLucideLocalBindings(src);
    expect(names).toContain('Map');
  });

  it('returns empty array when no lucide imports exist', () => {
    const src = `import { useState } from 'react';`;
    expect(extractLucideLocalBindings(src)).toHaveLength(0);
  });

  it('handles double-quoted and single-quoted module specifiers', () => {
    const src1 = `import { Star } from "lucide-react";`;
    const src2 = `import { Heart } from 'lucide-react';`;
    expect(extractLucideLocalBindings(src1)).toContain('Star');
    expect(extractLucideLocalBindings(src2)).toContain('Heart');
  });

  it('does not extract from non-lucide imports', () => {
    const src = `
import { Set } from 'some-other-lib';
import { Map } from '@tanstack/react-table';
    `;
    expect(extractLucideLocalBindings(src)).toHaveLength(0);
  });

  it('handles multiple lucide import blocks in same file', () => {
    const src = `
import { Star } from 'lucide-react';
import { Heart, X } from 'lucide-react';
    `;
    const names = extractLucideLocalBindings(src);
    expect(names).toContain('Star');
    expect(names).toContain('Heart');
    expect(names).toContain('X');
  });

  it('DANGEROUS_GLOBALS set contains expected entries', () => {
    expect(DANGEROUS_GLOBALS.has('Map')).toBe(true);
    expect(DANGEROUS_GLOBALS.has('Set')).toBe(true);
    expect(DANGEROUS_GLOBALS.has('Array')).toBe(true);
    expect(DANGEROUS_GLOBALS.has('Promise')).toBe(true);
    expect(DANGEROUS_GLOBALS.has('Error')).toBe(true);
  });
});
