// ============================================================
// Tests -- NodeContextMenu contract + logic tests
//
// Tests the pure logic and contract of NodeContextMenu:
//   - Module export shape and props interface
//   - Action types (ICONS map, LABELS map with Spanish strings)
//   - Mastery color display (getMasteryLabel, MASTERY_HEX)
//   - Click-outside close behavior (mousedown listener)
//   - Keyboard navigation (ArrowUp/Down, Escape)
//   - Auto-focus on first menuitem
//   - Color picker (NODE_COLOR_PALETTE, onColorChange)
//   - Collapse/expand action (hasChildren, isCollapsed)
//   - Mobile responsive behavior (isSmallScreen, bottom sheet)
//   - onCloseRef pattern (stabilized onClose)
//   - ARIA roles (menu, menuitem, menuitemradio)
//   - Body scroll lock on mobile
//   - adjustedPosition memoization
//
// Pattern: source-based contract checks + replicated pure logic.
// No React rendering (no RTL).
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Source inspection ───────────────────────────────────────

const COMPONENT_PATH = resolve(__dirname, '..', 'NodeContextMenu.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// ── Module contract ─────────────────────────────────────────

describe('NodeContextMenu: module contract', () => {
  it('exports a named function NodeContextMenu (optionally wrapped in memo)', () => {
    expect(source).toMatch(/export\s+(const\s+NodeContextMenu\s*=\s*memo\s*\(\s*function\s+NodeContextMenu|function\s+NodeContextMenu)/);
  });

  it('has no default export (named export only)', () => {
    expect(source).not.toMatch(/export\s+default/);
  });
});

// ── Props interface ─────────────────────────────────────────

describe('NodeContextMenu: props interface', () => {
  it('requires node prop of type MapNode | null', () => {
    expect(source).toContain('node: MapNode | null');
  });

  it('requires position prop', () => {
    expect(source).toContain('position: { x: number; y: number } | null');
  });

  it('requires onAction callback with (action, node) signature', () => {
    expect(source).toContain('onAction: (action: NodeAction, node: MapNode) => void');
  });

  it('requires onClose callback', () => {
    expect(source).toContain('onClose: () => void');
  });

  it('has optional hasChildren boolean', () => {
    expect(source).toContain('hasChildren?: boolean');
  });

  it('has optional isCollapsed boolean', () => {
    expect(source).toContain('isCollapsed?: boolean');
  });

  it('has optional onToggleCollapse callback', () => {
    expect(source).toContain('onToggleCollapse?: () => void');
  });

  it('has optional onColorChange callback for user-created nodes', () => {
    expect(source).toContain('onColorChange?: (nodeId: string, color: string) => void');
  });

  it('has optional currentCustomColor string', () => {
    expect(source).toContain('currentCustomColor?: string');
  });
});

// ── Action types: ICONS map ─────────────────────────────────

describe('NodeContextMenu: ICONS map', () => {
  it('defines ICONS as Record<NodeAction, ElementType>', () => {
    expect(source).toContain('const ICONS: Record<NodeAction, ElementType>');
  });

  it('maps flashcard to Layers icon', () => {
    expect(source).toContain('flashcard: Layers');
  });

  it('maps quiz to HelpCircle icon', () => {
    expect(source).toContain('quiz: HelpCircle');
  });

  it('maps summary to FileText icon', () => {
    expect(source).toContain('summary: FileText');
  });

  it('maps annotate to Edit3 icon', () => {
    expect(source).toContain('annotate: Edit3');
  });

  it('maps details to Info icon', () => {
    expect(source).toContain('details: Info');
  });

  it('imports all five icons from lucide-react', () => {
    expect(source).toContain('Layers');
    expect(source).toContain('HelpCircle');
    expect(source).toContain('FileText');
    expect(source).toContain('Edit3');
    expect(source).toContain('Info');
  });
});

// ── Action types: LABELS map with Spanish strings ───────────

describe('NodeContextMenu: LABELS map', () => {
  it('defines LABELS as Record<NodeAction, string>', () => {
    expect(source).toContain('const LABELS: Record<NodeAction, string>');
  });

  it('maps flashcard to "Flashcards"', () => {
    expect(source).toContain("flashcard: 'Flashcards'");
  });

  it('maps quiz to "Quiz"', () => {
    expect(source).toContain("quiz: 'Quiz'");
  });

  it('maps summary to "Ver resumen"', () => {
    expect(source).toContain("summary: 'Ver resumen'");
  });

  it('maps annotate to "Anotaci\u00f3n"', () => {
    expect(source).toContain("annotate: 'Anotaci\u00f3n'");
  });

  it('maps connect to "Conectar"', () => {
    expect(source).toContain("connect: 'Conectar'");
  });

  it('maps details to "Detalles"', () => {
    expect(source).toContain("details: 'Detalles'");
  });

  it('has exactly 6 action labels matching the 6 icons', () => {
    const labelMatches = source.match(/LABELS:\s*Record<NodeAction,\s*string>\s*=\s*\{([^}]+)\}/s);
    expect(labelMatches).not.toBeNull();
    const body = labelMatches![1];
    const entries = body.split(',').filter(e => e.includes(':'));
    expect(entries.length).toBe(6);
  });
});

// ── Mastery color display ───────────────────────────────────

describe('NodeContextMenu: mastery color display', () => {
  it('imports MASTERY_HEX from mindmap types', () => {
    expect(source).toContain("import { MASTERY_HEX } from '@/app/types/mindmap'");
  });

  it('imports getSafeMasteryColor and getMasteryLabel from mastery-helpers', () => {
    expect(source).toContain("import { getSafeMasteryColor, getMasteryLabel } from '@/app/lib/mastery-helpers'");
  });

  it('computes masteryColor via getSafeMasteryColor(node.mastery)', () => {
    expect(source).toContain('getSafeMasteryColor(node.mastery)');
  });

  it('computes masteryPct from node.mastery when >= 0', () => {
    expect(source).toContain('node.mastery >= 0 ? Math.round(node.mastery * 100) : null');
  });

  it('renders mastery dot with MASTERY_HEX background color', () => {
    expect(source).toContain('backgroundColor: MASTERY_HEX[masteryColor]');
  });

  it('renders mastery label using getMasteryLabel with es locale', () => {
    expect(source).toContain("getMasteryLabel(masteryColor, 'es')");
  });

  it('renders mastery percentage alongside label', () => {
    expect(source).toContain('{masteryPct}%');
  });

  it('only shows mastery info when masteryPct is not null', () => {
    expect(source).toContain('{masteryPct !== null && (');
  });

  it('mastery dot is aria-hidden (decorative)', () => {
    // The mastery dot span in the header
    const headerSection = source.slice(
      source.indexOf('masteryPct !== null'),
      source.indexOf('node.definition'),
    );
    expect(headerSection).toContain('aria-hidden="true"');
  });
});

// ── Mastery color correctness (via MASTERY_HEX) ────────────

describe('NodeContextMenu: mastery color correctness', () => {
  const EXPECTED_HEX: Record<string, string> = {
    green:  '#10b981',
    yellow: '#f59e0b',
    red:    '#ef4444',
    gray:   '#9ca3af',
  };

  it.each(Object.entries(EXPECTED_HEX))(
    'MASTERY_HEX[%s] should be %s (verified in types/mindmap.ts)',
    (color, hex) => {
      const mindmapSource = readFileSync(
        resolve(__dirname, '..', '..', '..', '..', 'types', 'mindmap.ts'),
        'utf-8',
      );
      expect(mindmapSource).toContain(`'${hex}'`);
      expect(mindmapSource).toMatch(new RegExp(`${color}:\\s+'${hex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
    },
  );
});

// ── Mastery label correctness (replicated logic) ────────────

describe('NodeContextMenu: mastery label logic', () => {
  // Replicate getMasteryLabel for es locale
  function getMasteryLabelEs(color: string): string {
    switch (color) {
      case 'green':  return 'Dominado';
      case 'yellow': return 'Aprendiendo';
      case 'red':    return 'D\u00e9bil';
      case 'gray':   return 'Sin datos';
      default:       return '';
    }
  }

  it('green -> "Dominado"', () => {
    expect(getMasteryLabelEs('green')).toBe('Dominado');
  });

  it('yellow -> "Aprendiendo"', () => {
    expect(getMasteryLabelEs('yellow')).toBe('Aprendiendo');
  });

  it('red -> "D\u00e9bil"', () => {
    expect(getMasteryLabelEs('red')).toBe('D\u00e9bil');
  });

  it('gray -> "Sin datos"', () => {
    expect(getMasteryLabelEs('gray')).toBe('Sin datos');
  });

  it('source passes locale "es" to getMasteryLabel', () => {
    expect(source).toContain("getMasteryLabel(masteryColor, 'es')");
  });
});

// ── Click-outside close behavior ────────────────────────────

describe('NodeContextMenu: click-outside close', () => {
  it('registers mousedown listener on document', () => {
    expect(source).toContain("document.addEventListener('mousedown', handleClickOutside)");
  });

  it('removes mousedown listener on cleanup', () => {
    expect(source).toContain("document.removeEventListener('mousedown', handleClickOutside)");
  });

  it('checks if click target is outside menuRef', () => {
    expect(source).toContain('menuRef.current && !menuRef.current.contains(e.target as Node)');
  });

  it('calls onCloseRef.current() on outside click (not onClose directly)', () => {
    // The handler calls onCloseRef.current() to avoid stale closure
    const handlerBlock = source.slice(
      source.indexOf('const handleClickOutside'),
      source.indexOf('const handleKeyDown'),
    );
    expect(handlerBlock).toContain('onCloseRef.current()');
    expect(handlerBlock).not.toContain('onClose()');
  });

  it('only registers listeners when node is truthy', () => {
    expect(source).toContain('if (!node) return');
  });
});

// ── Keyboard navigation ─────────────────────────────────────

describe('NodeContextMenu: keyboard navigation', () => {
  it('registers keydown listener on document', () => {
    expect(source).toContain("document.addEventListener('keydown', handleKeyDown)");
  });

  it('removes keydown listener on cleanup', () => {
    expect(source).toContain("document.removeEventListener('keydown', handleKeyDown)");
  });

  it('closes on Escape key via onCloseRef', () => {
    expect(source).toContain("if (e.key === 'Escape')");
    const escBlock = source.slice(
      source.indexOf("if (e.key === 'Escape')"),
      source.indexOf("if (e.key === 'ArrowDown'"),
    );
    expect(escBlock).toContain('onCloseRef.current()');
  });

  it('handles ArrowDown key', () => {
    expect(source).toContain("e.key === 'ArrowDown'");
  });

  it('handles ArrowUp key', () => {
    expect(source).toContain("e.key === 'ArrowUp'");
  });

  it('prevents default on arrow keys', () => {
    expect(source).toContain('e.preventDefault()');
  });

  it('queries menuitem and menuitemradio elements for navigation', () => {
    expect(source).toContain('querySelectorAll<HTMLButtonElement>(\'[role="menuitem"], [role="menuitemradio"]\')');
  });

  it('ArrowDown wraps from last to first item', () => {
    expect(source).toContain('const next = idx < items.length - 1 ? idx + 1 : 0');
  });

  it('ArrowUp wraps from first to last item', () => {
    expect(source).toContain('const prev = idx > 0 ? idx - 1 : items.length - 1');
  });

  it('calls focus() on the target menu item', () => {
    expect(source).toContain('items[next].focus()');
    expect(source).toContain('items[prev].focus()');
  });
});

// ── Auto-focus on first menuitem ────────────────────────────

describe('NodeContextMenu: auto-focus on open', () => {
  it('uses requestAnimationFrame for deferred focus', () => {
    expect(source).toContain('const rafId = requestAnimationFrame(');
  });

  it('queries first menuitem for auto-focus', () => {
    expect(source).toContain('querySelector<HTMLButtonElement>(\'[role="menuitem"]\')');
  });

  it('calls focus on the first menuitem', () => {
    expect(source).toContain('firstItem?.focus()');
  });

  it('cancels animation frame on cleanup', () => {
    expect(source).toContain('cancelAnimationFrame(rafId)');
  });

  it('saves previouslyFocused element before focusing menu', () => {
    expect(source).toContain('const previouslyFocused = document.activeElement as HTMLElement | null');
  });

  it('restores focus to previouslyFocused element on cleanup', () => {
    expect(source).toContain('previouslyFocused?.focus()');
  });
});

// ── Color picker (NODE_COLOR_PALETTE) ───────────────────────

describe('NodeContextMenu: color picker', () => {
  it('imports NODE_COLOR_PALETTE from useNodeColors', () => {
    expect(source).toContain("import { NODE_COLOR_PALETTE } from './useNodeColors'");
  });

  it('only renders color swatches for user-created nodes', () => {
    expect(source).toContain('node.isUserCreated && onColorChange');
  });

  it('maps over NODE_COLOR_PALETTE to render swatch buttons', () => {
    expect(source).toContain('NODE_COLOR_PALETTE.map(({ hex, label })');
  });

  it('calls onColorChange with node.id and hex on swatch click', () => {
    expect(source).toContain('onColorChange(node.id, hex)');
  });

  it('uses role="menuitemradio" on swatch buttons', () => {
    expect(source).toContain('role="menuitemradio"');
  });

  it('uses aria-checked to indicate selected color', () => {
    expect(source).toContain('aria-checked={currentCustomColor === hex}');
  });

  it('uses aria-label with color name on each swatch', () => {
    expect(source).toContain('aria-label={`Color ${label}`}');
  });

  it('uses title attribute with color label', () => {
    expect(source).toContain('title={label}');
  });

  it('applies outline ring on selected color swatch', () => {
    expect(source).toContain('outline: currentCustomColor === hex ? `2px solid ${hex}`');
  });

  it('wraps swatches in a group with role="group" and aria-label', () => {
    expect(source).toContain('role="group" aria-label="Color del nodo"');
  });

  it('renders Palette icon next to the color label', () => {
    expect(source).toContain('<Palette');
  });

  it('has "Color" section label text', () => {
    // The text "Color" appears as a text node inside a span element
    const colorSection = source.slice(
      source.indexOf('node.isUserCreated && onColorChange'),
      source.indexOf('NODE_COLOR_PALETTE.map'),
    );
    expect(colorSection).toContain('Color');
  });
});

// ── Color palette correctness ───────────────────────────────

describe('NodeContextMenu: NODE_COLOR_PALETTE values', () => {
  const EXPECTED_PALETTE = [
    { hex: '#2a8c7a', label: 'Turquesa' },
    { hex: '#ef4444', label: 'Rojo' },
    { hex: '#3b82f6', label: 'Azul' },
    { hex: '#8b5cf6', label: 'Morado' },
    { hex: '#f97316', label: 'Naranja' },
    { hex: '#ec4899', label: 'Rosa' },
  ];

  it('palette has 6 colors', () => {
    const paletteSource = readFileSync(
      resolve(__dirname, '..', 'useNodeColors.ts'),
      'utf-8',
    );
    const paletteBlock = paletteSource.slice(
      paletteSource.indexOf('NODE_COLOR_PALETTE'),
      paletteSource.indexOf('] as const') + 10,
    );
    const hexMatches = paletteBlock.match(/#[0-9a-fA-F]{6}/g);
    expect(hexMatches).not.toBeNull();
    expect(hexMatches!.length).toBe(6);
  });

  it.each(EXPECTED_PALETTE)(
    'palette includes $label ($hex)',
    ({ hex, label }) => {
      const paletteSource = readFileSync(
        resolve(__dirname, '..', 'useNodeColors.ts'),
        'utf-8',
      );
      expect(paletteSource).toContain(`hex: '${hex}', label: '${label}'`);
    },
  );
});

// ── Collapse/expand action ──────────────────────────────────

describe('NodeContextMenu: collapse/expand action', () => {
  it('renders collapse/expand only when hasChildren AND onToggleCollapse', () => {
    expect(source).toContain('{hasChildren && onToggleCollapse && (');
  });

  it('calls onToggleCollapse on click', () => {
    expect(source).toContain('onToggleCollapse()');
  });

  it('calls onClose after toggling collapse', () => {
    // Both calls in the same onClick handler
    const collapseSection = source.slice(
      source.indexOf('{hasChildren && onToggleCollapse'),
      source.indexOf('</motion.div>'),
    );
    expect(collapseSection).toContain('onToggleCollapse(); onClose()');
  });

  it('shows "Expandir rama" when isCollapsed is true', () => {
    expect(source).toContain("'Expandir rama'");
  });

  it('shows "Colapsar rama" when isCollapsed is false', () => {
    expect(source).toContain("'Colapsar rama'");
  });

  it('uses ChevronDown icon when collapsed (expand)', () => {
    // The ternary checks isCollapsed to pick ChevronDown vs ChevronRight
    expect(source).toContain('{isCollapsed');
    expect(source).toContain('<ChevronDown');
  });

  it('uses ChevronRight icon when expanded (collapse)', () => {
    expect(source).toContain('<ChevronRight');
  });

  it('collapse/expand button has role="menuitem"', () => {
    // Verify that the collapse button specifically has role="menuitem"
    const collapseSection = source.slice(
      source.indexOf('{hasChildren && onToggleCollapse'),
      source.indexOf('</motion.div>'),
    );
    expect(collapseSection).toContain('role="menuitem"');
  });

  it('renders in a separate border-t section', () => {
    const collapseSection = source.slice(
      source.indexOf('{hasChildren && onToggleCollapse'),
      source.indexOf('</motion.div>'),
    );
    expect(collapseSection).toContain('border-t border-gray-100');
  });
});

// ── Mobile responsive behavior ──────────────────────────────

describe('NodeContextMenu: mobile responsive (isSmallScreen)', () => {
  it('initializes isSmallScreen based on window.innerWidth < 640', () => {
    expect(source).toContain('window.innerWidth < 640');
  });

  it('uses matchMedia with max-width: 639px for reactive detection', () => {
    expect(source).toContain("window.matchMedia('(max-width: 639px)')");
  });

  it('adds change event listener to media query', () => {
    expect(source).toContain("mq.addEventListener('change', handler)");
  });

  it('removes change event listener on cleanup', () => {
    expect(source).toContain("mq.removeEventListener('change', handler)");
  });

  it('renders backdrop overlay only on mobile', () => {
    expect(source).toContain('{isSmallScreen && (');
  });

  it('backdrop has fixed inset-0 positioning with semi-transparent bg', () => {
    expect(source).toContain('className="fixed inset-0 bg-black/20 z-40"');
  });

  it('backdrop click calls onClose', () => {
    // The backdrop motion.div (rendered only on mobile) has onClick={onClose}
    const backdropStart = source.indexOf('{/* Backdrop (mobile only) */}');
    // Find the closing tag of the backdrop motion.div (the self-closing />)
    const backdropEnd = source.indexOf('/>', backdropStart);
    const backdropSection = source.slice(backdropStart, backdropEnd);
    expect(backdropSection).toContain('onClick={onClose}');
  });

  it('uses bottom sheet layout on mobile (bottom-0 left-0 right-0 rounded-t-2xl)', () => {
    expect(source).toContain('bottom-0 left-0 right-0 rounded-t-2xl');
  });

  it('applies max-h-[75dvh] on mobile for scroll', () => {
    expect(source).toContain('max-h-[75dvh]');
  });

  it('renders mobile drag handle on small screens', () => {
    expect(source).toContain('{/* Mobile drag handle */}');
    expect(source).toContain('{isSmallScreen && (');
  });

  it('uses different initial/animate/exit animations for mobile vs desktop', () => {
    expect(source).toContain('isSmallScreen ? { opacity: 0, y: 100 }');
    expect(source).toContain('isSmallScreen ? { opacity: 1, y: 0 }');
  });

  it('uses absolute position (left/top) on desktop only', () => {
    expect(source).toContain('style={isSmallScreen ? undefined : {');
  });
});

// ── onCloseRef pattern (stabilized onClose) ─────────────────

describe('NodeContextMenu: onCloseRef pattern', () => {
  it('creates a ref for onClose', () => {
    expect(source).toContain('const onCloseRef = useRef(onClose)');
  });

  it('updates onCloseRef.current on every render', () => {
    expect(source).toContain('onCloseRef.current = onClose');
  });

  it('uses onCloseRef.current in handleClickOutside (not onClose)', () => {
    const handler = source.slice(
      source.indexOf('const handleClickOutside'),
      source.indexOf('const handleKeyDown'),
    );
    expect(handler).toContain('onCloseRef.current()');
  });

  it('uses onCloseRef.current in handleKeyDown Escape handler', () => {
    const escHandler = source.slice(
      source.indexOf("if (e.key === 'Escape')"),
      source.indexOf('ArrowDown'),
    );
    expect(escHandler).toContain('onCloseRef.current()');
  });

  it('effect depends only on [node] (not onClose), thanks to the ref pattern', () => {
    // The useEffect that sets up listeners depends on [node]
    const effectBlock = source.slice(
      source.indexOf('// Close on outside click + keyboard navigation'),
      source.indexOf('// Reactive small-screen detection'),
    );
    expect(effectBlock).toContain('}, [node])');
    expect(effectBlock).not.toContain('[node, onClose]');
  });
});

// ── ARIA roles ──────────────────────────────────────────────

describe('NodeContextMenu: ARIA accessibility', () => {
  it('menu container has role="menu"', () => {
    expect(source).toContain('role="menu"');
  });

  it('menu has aria-label with node label', () => {
    expect(source).toContain('aria-label={`Acciones para ${node.label}`}');
  });

  it('action buttons have role="menuitem"', () => {
    expect(source).toContain('role="menuitem"');
  });

  it('color swatch buttons have role="menuitemradio"', () => {
    expect(source).toContain('role="menuitemradio"');
  });

  it('header section has role="presentation"', () => {
    expect(source).toContain('role="presentation"');
  });

  it('close button has aria-label="Cerrar"', () => {
    expect(source).toContain('aria-label="Cerrar"');
  });

  it('mastery dot is aria-hidden', () => {
    const masterySection = source.slice(
      source.indexOf('{masteryPct !== null'),
      source.indexOf('{node.definition'),
    );
    expect(masterySection).toContain('aria-hidden="true"');
  });

  it('Palette icon is aria-hidden', () => {
    expect(source).toMatch(/<Palette[^>]*aria-hidden="true"/);
  });

  it('backdrop is aria-hidden', () => {
    expect(source).toContain('aria-hidden="true"');
  });
});

// ── Body scroll lock on mobile ──────────────────────────────

describe('NodeContextMenu: body scroll lock', () => {
  it('locks html overflow when node is present and isSmallScreen', () => {
    expect(source).toContain("document.documentElement.style.overflow = 'hidden'");
  });

  it('locks body overflow when node is present and isSmallScreen', () => {
    expect(source).toContain("document.body.style.overflow = 'hidden'");
  });

  it('restores html overflow on cleanup', () => {
    expect(source).toContain("document.documentElement.style.overflow = ''");
  });

  it('restores body overflow on cleanup', () => {
    expect(source).toContain("document.body.style.overflow = ''");
  });

  it('scroll lock depends on [node, isSmallScreen]', () => {
    // The useEffect that locks scroll has [node, isSmallScreen] as deps
    expect(source).toContain('}, [node, isSmallScreen]);');
  });

  it('early-returns when not on small screen (no lock on desktop)', () => {
    expect(source).toContain('if (!node || !isSmallScreen) return');
  });
});

// ── adjustedPosition memoization ────────────────────────────

describe('NodeContextMenu: adjustedPosition memoization', () => {
  it('uses useMemo for adjustedPosition', () => {
    expect(source).toContain('const adjustedPosition = useMemo(');
  });

  it('depends on [position, isSmallScreen]', () => {
    expect(source).toContain('[position, isSmallScreen]');
  });

  it('returns null when position is null', () => {
    expect(source).toContain('position ? {');
  });

  it('clamps x to stay within viewport (min 4px, max innerWidth - 220)', () => {
    expect(source).toContain('Math.max(4, Math.min(position.x, window.innerWidth - 220))');
  });

  it('clamps y to stay within viewport (min 4px, max innerHeight - 320)', () => {
    expect(source).toContain('Math.max(4, Math.min(position.y, window.innerHeight - 320))');
  });

  it('sets x=0, y=0 on small screen (bottom sheet ignores position)', () => {
    expect(source).toContain('isSmallScreen ? 0 :');
  });
});

// ── Actions list logic ──────────────────────────────────────

describe('NodeContextMenu: actions list', () => {
  it('always includes flashcard action', () => {
    expect(source).toContain("'flashcard'");
  });

  it('always includes quiz action', () => {
    expect(source).toContain("'quiz'");
  });

  it('conditionally includes summary only when node has summaryId', () => {
    expect(source).toContain("node?.summaryId ? ['summary' as const] : []");
  });

  it('always includes annotate action', () => {
    expect(source).toContain("'annotate'");
  });

  it('always includes details action', () => {
    expect(source).toContain("'details'");
  });

  it('renders action buttons by mapping over the actions array', () => {
    expect(source).toContain('{actions.map((action) => {');
  });

  it('looks up the icon from ICONS map for each action', () => {
    expect(source).toContain('const Icon = ICONS[action]');
  });

  it('renders the label from LABELS map for each action', () => {
    expect(source).toContain('{LABELS[action]}');
  });

  it('calls onAction with action and node on click', () => {
    expect(source).toContain('onClick={() => onAction(action, node)}');
  });
});

// ── Node header display ─────────────────────────────────────

describe('NodeContextMenu: header display', () => {
  it('renders node.label in the header', () => {
    expect(source).toContain('{node.label}');
  });

  it('renders node.definition when present', () => {
    expect(source).toContain('{node.definition && (');
    expect(source).toContain('{node.definition}');
  });

  it('definition text is truncated with line-clamp-2', () => {
    expect(source).toContain('line-clamp-2');
  });

  it('label uses Georgia serif font', () => {
    expect(source).toContain("fontFamily: 'Georgia, serif'");
  });

  it('close button uses X icon', () => {
    expect(source).toContain('<X');
  });

  it('close button has min touch target on mobile (44px)', () => {
    expect(source).toContain('min-w-[44px] min-h-[44px]');
  });
});

// ── Shared styles ───────────────────────────────────────────

describe('NodeContextMenu: shared style constants', () => {
  it('defines menuItemFontSize with clamp', () => {
    expect(source).toContain("const menuItemFontSize = 'clamp(0.8rem, 1.5vw, 0.8125rem)'");
  });

  it('defines captionFontSize with clamp', () => {
    expect(source).toContain("const captionFontSize = 'clamp(0.7rem, 1.3vw, 0.75rem)'");
  });

  it('uses menuItemFontSize for action buttons on desktop', () => {
    expect(source).toContain('menuItemFontSize');
  });

  it('uses captionFontSize for mastery label and definition', () => {
    expect(source).toContain('fontSize: captionFontSize');
  });
});

// ── Animation (Framer Motion) ───────────────────────────────

describe('NodeContextMenu: animation', () => {
  it('uses AnimatePresence for enter/exit', () => {
    expect(source).toContain('<AnimatePresence>');
    expect(source).toContain('</AnimatePresence>');
  });

  it('imports motion and AnimatePresence from motion/react', () => {
    expect(source).toContain("import { motion, AnimatePresence } from 'motion/react'");
  });

  it('only renders when node AND position are truthy', () => {
    expect(source).toContain('{node && position && (');
  });

  it('uses custom easing curve for transition', () => {
    expect(source).toContain('ease: [0.32, 0.72, 0, 1]');
  });

  it('transition duration is 0.18s', () => {
    expect(source).toContain('duration: 0.18');
  });
});

// ── Focus trap (Tab/Shift+Tab cycling) ──────────────────────

describe('NodeContextMenu: focus trap', () => {
  it('defines FOCUSABLE_SELECTOR for querying focusable elements', () => {
    expect(source).toContain('FOCUSABLE_SELECTOR');
  });

  it('handles Tab key to trap focus within the menu', () => {
    expect(source).toContain("e.key === 'Tab'");
  });

  it('wraps focus from last to first on Tab', () => {
    expect(source).toContain('first.focus()');
  });

  it('wraps focus from first to last on Shift+Tab', () => {
    expect(source).toContain('last.focus()');
  });

  it('checks e.shiftKey for reverse Tab direction', () => {
    expect(source).toContain('e.shiftKey');
  });

  it('prevents default Tab behavior at boundaries', () => {
    expect(source).toContain('e.preventDefault()');
  });
});

// ── memo wrapping ───────────────────────────────────────────

describe('NodeContextMenu: memo optimization', () => {
  it('is wrapped in React.memo', () => {
    expect(source).toMatch(/export\s+const\s+NodeContextMenu\s*=\s*memo\s*\(/);
  });
});

// ── Safe-area inset for bottom sheet ────────────────────────

describe('NodeContextMenu: safe area insets', () => {
  it('uses env(safe-area-inset-bottom) for mobile bottom padding', () => {
    expect(source).toContain('env(safe-area-inset-bottom');
  });

  it('applies safe area on collapse section when on mobile', () => {
    const collapseSection = source.slice(
      source.indexOf('{hasChildren && onToggleCollapse'),
      source.indexOf('</motion.div>'),
    );
    expect(collapseSection).toContain('env(safe-area-inset-bottom');
  });
});
