// ============================================================
// Axon — MasteryLegend Integration Tests
//
// Verifies that MasteryLegend correctly renders all 5 Delta
// Mastery Scale levels and maps colors to the right levels.
// ============================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MasteryLegend } from '../../MasteryLegend';
import { MASTERY_LIGHT } from '../../MasteryBar';

// ── Helpers ─────────────────────────────────────────────────

/** Convert hex (#rrggbb) to the rgb(r, g, b) format JSDOM normalizes to. */
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

// ── Fixtures ────────────────────────────────────────────────

const MOCK_MASTERY: Record<string, number> = {
  'block-1': 0.0,   // Por descubrir (gray)
  'block-2': 0.6,   // Emergente (red)
  'block-3': 0.9,   // En progreso (yellow)
  'block-4': 1.0,   // Consolidado (green)
  'block-5': 1.2,   // Maestria (blue)
};

// ── Tests ───────────────────────────────────────────────────

describe('MasteryLegend', () => {
  it('renders all 5 mastery level labels', () => {
    render(
      <MasteryLegend masteryLevels={MOCK_MASTERY} totalBlocks={5} />,
    );

    expect(screen.getByText('Por descubrir')).toBeInTheDocument();
    expect(screen.getByText('Emergente')).toBeInTheDocument();
    expect(screen.getByText('En progreso')).toBeInTheDocument();
    expect(screen.getByText('Consolidado')).toBeInTheDocument();
    expect(screen.getByText('Maestría')).toBeInTheDocument();
  });

  it('renders the heading "Dominio del material"', () => {
    render(
      <MasteryLegend masteryLevels={MOCK_MASTERY} totalBlocks={5} />,
    );

    expect(screen.getByText('Dominio del material')).toBeInTheDocument();
  });

  it('renders correct dot colors for each level', () => {
    const { container } = render(
      <MasteryLegend masteryLevels={MOCK_MASTERY} totalBlocks={5} />,
    );

    // Each dot is a span with aria-hidden="true" and borderRadius 50%
    const dots = container.querySelectorAll('[aria-hidden="true"]');
    expect(dots).toHaveLength(5);

    // JSDOM normalizes hex colors to rgb() format, so we compare border tokens directly
    const expectedBorders = [
      MASTERY_LIGHT.gray.border,   // Por descubrir
      MASTERY_LIGHT.red.border,    // Emergente
      MASTERY_LIGHT.yellow.border, // En progreso
      MASTERY_LIGHT.green.border,  // Consolidado
      MASTERY_LIGHT.blue.border,   // Maestria
    ];

    dots.forEach((dot, i) => {
      const el = dot as HTMLElement;
      // JSDOM normalizes hex to rgb() in computed style
      expect(el.style.backgroundColor).toBe(hexToRgb(expectedBorders[i]));
    });
  });

  it('counts consolidated blocks (mastery >= 1.0)', () => {
    render(
      <MasteryLegend masteryLevels={MOCK_MASTERY} totalBlocks={8} />,
    );

    // block-4 (1.0) and block-5 (1.2) are >= 1.0 → 2 consolidated
    expect(screen.getByText('2 de 8 bloques consolidados')).toBeInTheDocument();
  });

  it('shows 0 consolidated when all blocks are below 1.0', () => {
    const lowMastery: Record<string, number> = {
      'b1': 0.0,
      'b2': 0.5,
      'b3': 0.85,
    };

    render(
      <MasteryLegend masteryLevels={lowMastery} totalBlocks={3} />,
    );

    expect(screen.getByText('0 de 3 bloques consolidados')).toBeInTheDocument();
  });

  it('handles empty mastery levels gracefully', () => {
    render(
      <MasteryLegend masteryLevels={{}} totalBlocks={0} />,
    );

    expect(screen.getByText('0 de 0 bloques consolidados')).toBeInTheDocument();
    // All 5 level labels should still render
    expect(screen.getByText('Por descubrir')).toBeInTheDocument();
    expect(screen.getByText('Maestría')).toBeInTheDocument();
  });
});
