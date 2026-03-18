// ============================================================
// Tests — Arrow Types (edge direction + arrowhead types)
//
// Tests EdgeArrowType values, MapEdge directed/arrowType fields,
// and arrow configuration generation logic.
// ============================================================

import { describe, it, expect } from 'vitest';
import type { MapEdge, EdgeArrowType, EdgeLineStyle } from '@/app/types/mindmap';
import { CONNECTION_TYPES, CONNECTION_TYPE_MAP } from '@/app/types/mindmap';

// ── EdgeArrowType values ────────────────────────────────────

describe('EdgeArrowType', () => {
  it('supports the 4 expected arrow shapes', () => {
    const validTypes: EdgeArrowType[] = ['triangle', 'diamond', 'circle', 'vee'];
    expect(validTypes).toHaveLength(4);

    // Type-check: each value satisfies the union type
    for (const t of validTypes) {
      const edge: MapEdge = {
        id: 'e1',
        source: 'a',
        target: 'b',
        directed: true,
        arrowType: t,
      };
      expect(edge.arrowType).toBe(t);
    }
  });
});

// ── EdgeLineStyle values ────────────────────────────────────

describe('EdgeLineStyle', () => {
  it('supports solid, dashed, and dotted', () => {
    const validStyles: EdgeLineStyle[] = ['solid', 'dashed', 'dotted'];
    expect(validStyles).toHaveLength(3);

    for (const s of validStyles) {
      const edge: MapEdge = {
        id: 'e1',
        source: 'a',
        target: 'b',
        lineStyle: s,
      };
      expect(edge.lineStyle).toBe(s);
    }
  });
});

// ── MapEdge interface ───────────────────────────────────────

describe('MapEdge interface', () => {
  it('includes directed and arrowType fields', () => {
    const edge: MapEdge = {
      id: 'edge-1',
      source: 'node-a',
      target: 'node-b',
      directed: true,
      arrowType: 'vee',
    };
    expect(edge.directed).toBe(true);
    expect(edge.arrowType).toBe('vee');
  });

  it('directed and arrowType are optional', () => {
    const edge: MapEdge = {
      id: 'edge-2',
      source: 'node-a',
      target: 'node-b',
    };
    expect(edge.directed).toBeUndefined();
    expect(edge.arrowType).toBeUndefined();
  });

  it('supports all custom edge properties together', () => {
    const edge: MapEdge = {
      id: 'edge-3',
      source: 'a',
      target: 'b',
      label: 'causes',
      connectionType: 'causa-efecto',
      isUserCreated: true,
      lineStyle: 'dashed',
      customColor: '#ef4444',
      directed: true,
      arrowType: 'diamond',
    };
    expect(edge.lineStyle).toBe('dashed');
    expect(edge.customColor).toBe('#ef4444');
    expect(edge.directed).toBe(true);
    expect(edge.arrowType).toBe('diamond');
  });
});

// ── Arrow config generation logic ───────────────────────────

/**
 * Mirrors the arrow config generation used in KnowledgeGraph.
 * Given an arrowType, produce the G6-compatible arrow shape config.
 */
function getArrowConfig(arrowType: EdgeArrowType): { type: string; size: number } {
  const configs: Record<EdgeArrowType, { type: string; size: number }> = {
    triangle: { type: 'triangle', size: 8 },
    diamond:  { type: 'diamond',  size: 8 },
    circle:   { type: 'circle',   size: 4 },
    vee:      { type: 'vee',      size: 10 },
  };
  return configs[arrowType];
}

describe('Arrow config generation', () => {
  it('triangle returns correct config', () => {
    const config = getArrowConfig('triangle');
    expect(config.type).toBe('triangle');
    expect(config.size).toBe(8);
  });

  it('diamond returns correct config', () => {
    const config = getArrowConfig('diamond');
    expect(config.type).toBe('diamond');
    expect(config.size).toBe(8);
  });

  it('circle returns correct config', () => {
    const config = getArrowConfig('circle');
    expect(config.type).toBe('circle');
    expect(config.size).toBe(4);
  });

  it('vee returns correct config', () => {
    const config = getArrowConfig('vee');
    expect(config.type).toBe('vee');
    expect(config.size).toBe(10);
  });

  it('every EdgeArrowType has a config', () => {
    const types: EdgeArrowType[] = ['triangle', 'diamond', 'circle', 'vee'];
    for (const t of types) {
      const config = getArrowConfig(t);
      expect(config).toBeDefined();
      expect(config.type).toBe(t);
      expect(typeof config.size).toBe('number');
    }
  });
});

// ── CONNECTION_TYPES directed field ─────────────────────────

describe('CONNECTION_TYPES directedness', () => {
  it('directed types: prerequisito, causa-efecto, mecanismo, tratamiento, manifestacion, regulacion, componente', () => {
    const directedKeys = CONNECTION_TYPES.filter(ct => ct.directed).map(ct => ct.key);
    expect(directedKeys).toContain('prerequisito');
    expect(directedKeys).toContain('causa-efecto');
    expect(directedKeys).toContain('mecanismo');
    expect(directedKeys).toContain('tratamiento');
    expect(directedKeys).toContain('manifestacion');
    expect(directedKeys).toContain('regulacion');
    expect(directedKeys).toContain('componente');
  });

  it('undirected types: dx-diferencial, contraste, asociacion', () => {
    const undirectedKeys = CONNECTION_TYPES.filter(ct => !ct.directed).map(ct => ct.key);
    expect(undirectedKeys).toContain('dx-diferencial');
    expect(undirectedKeys).toContain('contraste');
    expect(undirectedKeys).toContain('asociacion');
  });

  it('every connection type has a color', () => {
    for (const ct of CONNECTION_TYPES) {
      expect(ct.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('CONNECTION_TYPE_MAP provides O(1) lookup by key', () => {
    for (const ct of CONNECTION_TYPES) {
      const found = CONNECTION_TYPE_MAP.get(ct.key);
      expect(found).toBeDefined();
      expect(found?.key).toBe(ct.key);
      expect(found?.color).toBe(ct.color);
    }
  });
});
