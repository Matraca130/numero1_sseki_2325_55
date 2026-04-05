// ============================================================
// Axon — MasteryLegend
//
// Compact legend showing the 5-level Delta Mastery Scale with
// colored dots + labels, plus a summary stat of how many blocks
// are consolidated (mastery >= 1.0).
//
// Uses MASTERY_LIGHT from design-system/mastery.ts (canonical color defs)
// and headingStyle from the design system.
// ============================================================

import { headingStyle, MASTERY_LIGHT } from '@/app/design-system';

// ── Types ────────────────────────────────────────────────────

interface MasteryLegendProps {
  masteryLevels: Record<string, number>;
  totalBlocks: number;
}

// ── Ordered level entries for rendering ──────────────────────

const LEVEL_KEYS = ['gray', 'red', 'yellow', 'green', 'blue'] as const;

// ── Component ────────────────────────────────────────────────

export function MasteryLegend({ masteryLevels, totalBlocks }: MasteryLegendProps) {
  const consolidatedCount = Object.values(masteryLevels).filter(
    (v) => v >= 1.0,
  ).length;

  return (
    <div
      role="region"
      aria-label="Progreso de dominio del material"
      style={{
        padding: '12px 16px',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        background: '#ffffff',
      }}
    >
      {/* Heading */}
      <p
        style={{
          ...headingStyle,
          fontSize: '0.875rem',
          lineHeight: '1.25rem',
          margin: '0 0 8px 0',
          color: '#1f2937',
        }}
      >
        Dominio del material
      </p>

      {/* Dots row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px 14px',
          marginBottom: 8,
        }}
      >
        {LEVEL_KEYS.map((key) => {
          const { border, label } = MASTERY_LIGHT[key];
          return (
            <span
              key={key}
              className="font-sans"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.75rem',
                lineHeight: '1rem',
                color: '#4b5563',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: border,
                  flexShrink: 0,
                }}
                aria-hidden="true"
              />
              {label}
            </span>
          );
        })}
      </div>

      {/* Stats line */}
      <p
        className="font-sans"
        style={{
          fontSize: '0.75rem',
          lineHeight: '1rem',
          color: '#6b7280',
          margin: 0,
        }}
      >
        {consolidatedCount} de {totalBlocks} bloques consolidados
      </p>
    </div>
  );
}
