// ============================================================
// Contract Tests — PresentationMode
//
// Source-based contract tests using readFileSync + string/regex
// matching to verify structural contracts without importing
// heavy dependencies (G6, motion/react, etc.).
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(
  resolve(__dirname, '..', 'PresentationMode.tsx'),
  'utf-8',
);

describe('PresentationMode contract', () => {
  // ── Export ─────────────────────────────────────────────────

  it('exports PresentationMode as a memo-wrapped named component', () => {
    expect(source).toMatch(/export\s+const\s+PresentationMode\s*=\s*memo\(function\s+PresentationMode/);
  });

  // ── Focus management ──────────────────────────────────────

  it('uses useFocusTrap for focus management', () => {
    expect(source).toContain('useFocusTrap');
    expect(source).toMatch(/import\s*\{[^}]*useFocusTrap[^}]*\}\s*from/);
  });

  // ── Keyboard navigation ──────────────────────────────────

  it('handles ArrowRight key', () => {
    expect(source).toContain("'ArrowRight'");
  });

  it('handles ArrowLeft key', () => {
    expect(source).toContain("'ArrowLeft'");
  });

  it('handles ArrowUp key', () => {
    expect(source).toContain("'ArrowUp'");
  });

  it('handles ArrowDown key', () => {
    expect(source).toContain("'ArrowDown'");
  });

  it('handles Escape key', () => {
    expect(source).toContain("'Escape'");
  });

  // ── Mobile swipe gestures ────────────────────────────────

  it('has onTouchStart handler for swipe gestures', () => {
    expect(source).toContain('onTouchStart');
    expect(source).toContain('handleTouchStart');
  });

  it('has onTouchEnd handler for swipe gestures', () => {
    expect(source).toContain('onTouchEnd');
    expect(source).toContain('handleTouchEnd');
  });

  // ── Accessibility: dialog ────────────────────────────────

  it('has role="dialog" for modal semantics', () => {
    expect(source).toContain('role="dialog"');
  });

  it('has aria-modal="true"', () => {
    expect(source).toContain('aria-modal="true"');
  });

  it('has aria-label in Spanish mentioning "Modo presentacion"', () => {
    // The source uses \u00f3 for the accent in "presentacion"
    expect(source).toMatch(/aria-label=\{?[`"'].*Modo presentaci/);
  });

  // ── Screen reader live region ─────────────────────────────

  it('has sr-only aria-live="polite" region for announcements', () => {
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('sr-only');
  });

  // ── Body scroll lock ──────────────────────────────────────

  it('locks body scroll with overflow hidden', () => {
    expect(source).toContain("document.body.style.overflow = 'hidden'");
  });

  it('restores body scroll on cleanup', () => {
    // Cleanup stores previous value and restores it
    expect(source).toContain('document.body.style.overflow = prevBody');
  });

  // ── AnimatePresence for slide transitions ─────────────────

  it('uses AnimatePresence from motion/react', () => {
    expect(source).toContain('AnimatePresence');
    expect(source).toMatch(/import\s*\{[^}]*AnimatePresence[^}]*\}\s*from\s*['"]motion\/react['"]/);
  });

  // ── topologicalSort ──────────────────────────────────────

  it('uses topologicalSort from presentationHelpers', () => {
    expect(source).toContain('topologicalSort');
    expect(source).toMatch(/import\s*\{[^}]*topologicalSort[^}]*\}\s*from\s*['"]\.\/presentationHelpers['"]/);
  });

  // ── Navigation buttons with aria-labels ───────────────────

  it('has prev button with aria-label "Concepto anterior"', () => {
    expect(source).toContain('aria-label="Concepto anterior"');
  });

  it('has next button with aria-label "Siguiente concepto"', () => {
    expect(source).toContain('aria-label="Siguiente concepto"');
  });

  // ── Close button ──────────────────────────────────────────

  it('close button aria-label mentions "Escape"', () => {
    expect(source).toMatch(/aria-label="[^"]*Escape[^"]*"/);
  });

  // ── Progress bar ──────────────────────────────────────────

  it('has role="progressbar" with aria-valuenow/min/max', () => {
    expect(source).toContain('role="progressbar"');
    expect(source).toContain('aria-valuenow');
    expect(source).toContain('aria-valuemin');
    expect(source).toContain('aria-valuemax');
  });

  // ── onExitRef pattern to avoid stale closures ─────────────

  it('uses onExitRef pattern to avoid stale closures', () => {
    expect(source).toContain('onExitRef');
    expect(source).toMatch(/onExitRef\.current\s*=\s*onExit/);
    expect(source).toContain('onExitRef.current()');
  });
});

// ── Swipe gesture math (replicated) ────────────────────────

describe('Swipe gesture detection (replicated)', () => {
  // Mirrors handleTouchEnd's gate: require horizontal swipe > 50px,
  // mostly horizontal (>1.5× vertical), under 500ms.
  function detectSwipe(dx: number, dy: number, dt: number): 'left' | 'right' | 'none' {
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 500) {
      return dx < 0 ? 'left' : 'right';
    }
    return 'none';
  }

  it('left swipe (dx < -50, fast, mostly horizontal) → "left" (advances)', () => {
    expect(detectSwipe(-100, 10, 200)).toBe('left');
    expect(detectSwipe(-60, 0, 100)).toBe('left');
  });

  it('right swipe (dx > 50, fast, mostly horizontal) → "right" (goes back)', () => {
    expect(detectSwipe(80, -5, 250)).toBe('right');
  });

  it('rejects micro-swipes ≤50px', () => {
    expect(detectSwipe(50, 0, 100)).toBe('none');
    expect(detectSwipe(40, 0, 100)).toBe('none');
    expect(detectSwipe(-50, 0, 100)).toBe('none');
  });

  it('rejects diagonal/vertical-dominant gestures (avoids hijacking scroll)', () => {
    // dy*1.5 = 90, dx=80 → fails the 1.5× threshold
    expect(detectSwipe(80, 60, 200)).toBe('none');
    // pure vertical
    expect(detectSwipe(20, 200, 200)).toBe('none');
  });

  it('rejects slow swipes ≥500ms (probably a drag, not a flick)', () => {
    expect(detectSwipe(100, 0, 500)).toBe('none');
    expect(detectSwipe(100, 0, 1500)).toBe('none');
  });

  it('source uses the same 50px / 1.5× / 500ms thresholds', () => {
    expect(source).toMatch(/Math\.abs\(dx\)\s*>\s*50/);
    expect(source).toMatch(/Math\.abs\(dx\)\s*>\s*Math\.abs\(dy\)\s*\*\s*1\.5/);
    expect(source).toMatch(/dt\s*<\s*500/);
  });

  it('left swipe (dx < 0) calls goNext, right calls goPrev (slide forward = swipe-from-right)', () => {
    expect(source).toMatch(/dx\s*<\s*0\s*\)\s*goNext\(\);\s*else\s+goPrev\(\)/);
  });
});

// ── Index clamp + safe-index ───────────────────────────────

describe('Index clamping invariants', () => {
  it('initial index is clamped to [0, total-1] via Math.max+Math.min', () => {
    expect(source).toMatch(/Math\.max\(0,\s*Math\.min\(initialIndex,\s*total\s*-\s*1\)\)/);
  });

  it('a "total changes" effect clamps stale index when nodes shrink during presentation', () => {
    expect(source).toMatch(/if\s*\(total\s*>\s*0\)\s*setIndex\(i\s*=>\s*Math\.min\(i,\s*total\s*-\s*1\)\)/);
    expect(source).toMatch(/\}, \[total\]\)/);
  });

  it('renders safeIndex (= min(index, total-1)) to avoid one-frame flicker', () => {
    expect(source).toContain('safeIndex');
    expect(source).toMatch(/total\s*>\s*0\s*\?\s*Math\.min\(index,\s*total\s*-\s*1\)\s*:\s*0/);
  });

  it('returns null when total === 0 or current is undefined (no DOM)', () => {
    expect(source).toMatch(/if\s*\(total\s*===\s*0\s*\|\|\s*!current\)\s*return\s+null/);
  });

  it('goNext clamps to total-1 (no overshoot at end)', () => {
    expect(source).toMatch(/setIndex\(i\s*=>\s*Math\.min\(i\s*\+\s*1,\s*total\s*-\s*1\)\)/);
  });

  it('goPrev clamps to 0 (no underflow at start)', () => {
    expect(source).toMatch(/setIndex\(i\s*=>\s*Math\.max\(i\s*-\s*1,\s*0\)\)/);
  });
});

// ── Direction state ────────────────────────────────────────

describe('Slide direction', () => {
  it("goNext sets direction='right'", () => {
    expect(source).toMatch(/goNext[\s\S]{0,100}setDirection\('right'\)/);
  });

  it("goPrev sets direction='left'", () => {
    expect(source).toMatch(/goPrev[\s\S]{0,100}setDirection\('left'\)/);
  });

  it('passes direction as `custom` prop to motion (variants read it)', () => {
    expect(source).toMatch(/<AnimatePresence\s+mode="wait"\s+custom=\{direction\}/);
    expect(source).toMatch(/<motion\.div[\s\S]{0,500}custom=\{direction\}/);
  });
});

// ── onNodeFocus invariant ──────────────────────────────────

describe('onNodeFocus dependency', () => {
  it('depends on currentId (string), NOT the current object — avoids re-firing on identity change', () => {
    expect(source).toContain('const currentId = current?.id');
    expect(source).toMatch(/\}, \[currentId\]\)/);
  });

  it('only fires onNodeFocus when currentId is defined (no null calls)', () => {
    expect(source).toMatch(/if\s*\(currentId\s*&&\s*onNodeFocusRef\.current\)/);
  });
});

// ── Progress percentage ────────────────────────────────────

describe('Progress percentage', () => {
  it("formula = ((index + 1) / total) * 100", () => {
    expect(source).toMatch(/progressPct\s*=\s*\(\(index\s*\+\s*1\)\s*\/\s*total\)\s*\*\s*100/);
  });

  it('renders progress as a width: ${progressPct}% style on a motion.div', () => {
    expect(source).toMatch(/animate=\{\{\s*width:\s*`\$\{progressPct\}%`\s*\}\}/);
  });
});

// ── Boundary disabled state ────────────────────────────────

describe('Navigation button boundaries', () => {
  it('prev button is disabled at index === 0', () => {
    expect(source).toMatch(/disabled=\{index\s*===\s*0\}/);
  });

  it('next button is disabled at index === total-1', () => {
    expect(source).toMatch(/disabled=\{index\s*===\s*total\s*-\s*1\}/);
  });

  it('disabled buttons get opacity-20 + cursor-default (visual feedback)', () => {
    expect(source).toContain('disabled:opacity-20');
    expect(source).toContain('disabled:cursor-default');
  });
});

// ── Body + html scroll-lock symmetry ───────────────────────

describe('Scroll lock', () => {
  it('locks BOTH body AND documentElement overflow', () => {
    expect(source).toContain("document.body.style.overflow = 'hidden'");
    expect(source).toContain("document.documentElement.style.overflow = 'hidden'");
  });

  it('captures the prior overflow values for both elements before locking', () => {
    expect(source).toMatch(/const prevBody\s*=\s*document\.body\.style\.overflow/);
    expect(source).toMatch(/const prevHtml\s*=\s*document\.documentElement\.style\.overflow/);
  });

  it('restores BOTH on cleanup (not hardcoded "auto")', () => {
    expect(source).toContain('document.body.style.overflow = prevBody');
    expect(source).toContain('document.documentElement.style.overflow = prevHtml');
  });
});

// ── Card content rendering ─────────────────────────────────

describe('Card content rendering', () => {
  it('renders a fallback "Sin definición disponible" when current.definition is empty', () => {
    expect(source).toContain('Sin definici');
    expect(source).toMatch(/current\.definition\s*\?[\s\S]{0,400}:[\s\S]{0,100}Sin definici/);
  });

  it('renders the user annotation in italics with quote marks', () => {
    expect(source).toContain('current.annotation');
    expect(source).toContain('&ldquo;');
    expect(source).toContain('&rdquo;');
  });

  it('shows flashcardCount only when truthy ("X tarjetas")', () => {
    expect(source).toMatch(/current\.flashcardCount\s*\?\s*<span>\{current\.flashcardCount\}\s*tarjetas/);
  });

  it('shows quizCount only when truthy ("X preguntas")', () => {
    expect(source).toMatch(/current\.quizCount\s*\?\s*<span>\{current\.quizCount\}\s*preguntas/);
  });

  it('renders type badge for non-keyword nodes (Tema/Subtema)', () => {
    expect(source).toMatch(/current\.type\s*!==\s*'keyword'/);
    expect(source).toMatch(/current\.type\s*===\s*'topic'\s*\?\s*'Tema'\s*:\s*'Subtema'/);
  });

  it('mastery percent uses Math.round(mastery * 100) clamped to >= 0', () => {
    expect(source).toMatch(/current\.mastery\s*>=\s*0\s*\?\s*Math\.round\(current\.mastery\s*\*\s*100\)/);
  });

  it('mastery aria-valuemin=0, aria-valuemax=100', () => {
    expect(source).toMatch(/aria-valuemin=\{0\}/);
    expect(source).toMatch(/aria-valuemax=\{100\}/);
  });

  it('keyword name uses Georgia serif (design-system mandatory)', () => {
    expect(source).toContain("fontFamily: 'Georgia, serif'");
  });

  it('card background uses MASTERY_HEX_LIGHT for the current node tier', () => {
    expect(source).toMatch(/backgroundColor:\s*MASTERY_HEX_LIGHT\[mc\]/);
  });
});

// ── AnimatePresence config ─────────────────────────────────

describe('AnimatePresence config', () => {
  it('uses mode="wait" so slides fully exit before next enters', () => {
    expect(source).toContain('mode="wait"');
  });

  it('keys the inner motion.div by current.id (forces remount per slide)', () => {
    expect(source).toMatch(/key=\{current\.id\}/);
  });

  it('uses 0.25s duration with easeInOut for slide transitions', () => {
    expect(source).toMatch(/duration:\s*0\.25,\s*ease:\s*'easeInOut'/);
  });
});

// ── Bottom hint i18n ───────────────────────────────────────

describe('Bottom hint i18n (Spanish)', () => {
  it('shows desktop hint with arrow + Escape instructions on sm+', () => {
    expect(source).toContain('Flechas izquierda/derecha para navegar');
    expect(source).toContain('Escape para salir');
  });

  it('shows mobile hint hint about tapping arrows', () => {
    expect(source).toContain('Toca las flechas para navegar');
  });
});

// ── Backdrop ────────────────────────────────────────────────

describe('Backdrop styling', () => {
  it('uses the brand-dark backdrop rgba(27,59,54,0.92)', () => {
    expect(source).toContain('rgba(27,59,54,0.92)');
  });

  it('takes the entire viewport (fixed inset-0 z-50)', () => {
    expect(source).toContain('fixed inset-0 z-50');
  });
});
