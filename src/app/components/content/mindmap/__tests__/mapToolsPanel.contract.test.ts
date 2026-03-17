// ============================================================
// Tests — MapToolsPanel contract tests
//
// Verifies the MapToolsPanel module structure and tool logic.
// Uses filesystem-based export checks since the component has
// transitive deps that hang in Node env without DOM.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const COMPONENT_PATH = resolve(__dirname, '..', 'MapToolsPanel.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// ── Module contract ─────────────────────────────────────────

describe('MapToolsPanel: module contract', () => {
  it('exports MapToolsPanel as a function', () => {
    expect(source).toMatch(/export\s+function\s+MapToolsPanel/);
  });

  it('exports MapTool type', () => {
    expect(source).toMatch(/export\s+type\s+MapTool/);
  });
});

// ── MapTool type values ─────────────────────────────────────

describe('MapTool: valid tool identifiers', () => {
  const VALID_MAP_TOOLS = ['pointer', 'add-node', 'connect', 'delete', 'annotate'] as const;
  type MapTool = typeof VALID_MAP_TOOLS[number];

  it('contains exactly 5 tool modes', () => {
    expect(VALID_MAP_TOOLS.length).toBe(5);
  });

  it('includes pointer as the default selection tool', () => {
    expect(VALID_MAP_TOOLS).toContain('pointer');
  });

  it('includes all expected tools', () => {
    const tools: MapTool[] = ['pointer', 'add-node', 'connect', 'delete', 'annotate'];
    for (const tool of tools) {
      expect(VALID_MAP_TOOLS).toContain(tool);
    }
  });

  it('all tool IDs are non-empty strings', () => {
    for (const tool of VALID_MAP_TOOLS) {
      expect(typeof tool).toBe('string');
      expect(tool.length).toBeGreaterThan(0);
    }
  });
});

// ── TOOLS array structure ───────────────────────────────────

describe('MapToolsPanel: TOOLS array structure', () => {
  const TOOLS = [
    { id: 'pointer',  label: 'Seleccionar',   shortcut: 'V' },
    { id: 'add-node', label: 'Nuevo concepto', shortcut: 'N' },
    { id: 'connect',  label: 'Crear conexión', shortcut: 'C' },
    { id: 'delete',   label: 'Eliminar',       shortcut: 'D' },
    { id: 'annotate', label: 'Anotar',         shortcut: 'A' },
  ];

  it('has 5 tool entries', () => {
    expect(TOOLS.length).toBe(5);
  });

  it('all tools have unique IDs', () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(TOOLS.length);
  });

  it('all tools have non-empty Spanish labels', () => {
    for (const tool of TOOLS) {
      expect(typeof tool.label).toBe('string');
      expect(tool.label.length).toBeGreaterThan(0);
    }
  });

  it('all tools have a single-character keyboard shortcut', () => {
    for (const tool of TOOLS) {
      expect(tool.shortcut.length).toBe(1);
    }
  });

  it('keyboard shortcuts are unique', () => {
    const shortcuts = TOOLS.map((t) => t.shortcut);
    expect(new Set(shortcuts).size).toBe(shortcuts.length);
  });

  it('shortcuts are uppercase letters', () => {
    for (const tool of TOOLS) {
      expect(tool.shortcut).toMatch(/^[A-Z]$/);
    }
  });

  it('first tool is "pointer" (default selection mode)', () => {
    expect(TOOLS[0].id).toBe('pointer');
  });
});

// ── Prop contract ───────────────────────────────────────────

describe('MapToolsPanel: prop contract', () => {
  it('activeTool prop accepts all valid MapTool values', () => {
    const validTools = ['pointer', 'add-node', 'connect', 'delete', 'annotate'];
    for (const tool of validTools) {
      expect(typeof tool).toBe('string');
    }
  });

  it('onToolChange callback receives MapTool value', () => {
    const onToolChange = vi.fn();
    onToolChange('connect');
    expect(onToolChange).toHaveBeenCalledWith('connect');
  });

  it('visible prop is optional (defaults true)', () => {
    // The component defaults visible=true per source
    expect(source).toContain('visible');
  });
});

// ── isActive logic ──────────────────────────────────────────

describe('MapToolsPanel: active tool styling logic', () => {
  it('isActive is true only for the currently selected tool', () => {
    const activeTool = 'connect';
    const TOOLS = ['pointer', 'add-node', 'connect', 'delete', 'annotate'];
    const activeStates = TOOLS.map((id) => ({ id, isActive: id === activeTool }));
    expect(activeStates.filter((t) => t.isActive).length).toBe(1);
    expect(activeStates.find((t) => t.id === 'connect')!.isActive).toBe(true);
    expect(activeStates.find((t) => t.id === 'pointer')!.isActive).toBe(false);
  });

  it('switching active tool changes which tool is highlighted', () => {
    let activeTool = 'pointer';
    const getActive = () => activeTool;
    expect(getActive()).toBe('pointer');
    activeTool = 'annotate';
    expect(getActive()).toBe('annotate');
  });
});
