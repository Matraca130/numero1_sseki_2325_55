// ============================================================
// Axon — Algorithmic Art: Semiología Regional · Redes de Conexión
//
// Ported from semiologia_regional_redes.html to TypeScript
//
// Visualizes head & neck anatomy as a spatial graph with 24
// anatomical nodes (lymphatic chains, vessels, glands) and 3
// edge types (lymphatic/vascular/neural). Inflammation
// propagates along connections from a user-selected zone.
//
// Params:
//   nodeCount       — Visible nodes 10–30
//   lymphatic       — Lymphatic connection density 0–100%
//   vascular        — Vascular connection density 0–100%
//   neural          — Neural connection density 0–100%
//   inflammation    — Regional inflammation intensity 0–100%
//   affectedZone    — Anatomical zone seed for inflammation
//
// Presets: Normal, Adenopatía Cervical, Bocio, Parotiditis,
//          Masa Cervical
// ============================================================

import type p5 from 'p5';
import type {
  EngineModule,
  ParamSchema,
  PresetDefinition,
  SketchFactory,
  ParamValues,
} from '../types';

// ── Anatomical Data ─────────────────────────────────────────

interface AnatomicalNode {
  id: number;
  name: string;
  group: string;
  zone: string;
  baseX: number;
  baseY: number;
}

interface Edge {
  from: number;
  to: number;
  type: 'lymphatic' | 'vascular' | 'neural';
  weight: number;
}

const ANATOMICAL_NODES: AnatomicalNode[] = [
  // Cabeza (8 nodes)
  { id: 0, name: 'Corteza\nCerebral', group: 'cabeza', zone: 'cabeza', baseX: 450, baseY: 80 },
  { id: 1, name: 'Tiroides', group: 'cabeza', zone: 'tiroides', baseX: 450, baseY: 350 },
  { id: 2, name: 'Paratiroides', group: 'cabeza', zone: 'cabeza', baseX: 480, baseY: 340 },
  { id: 3, name: 'Ganglios\nParotídeos', group: 'cabeza', zone: 'parotida', baseX: 250, baseY: 180 },
  { id: 4, name: 'Ganglios\nSubmandibulares', group: 'cabeza', zone: 'submandibular', baseX: 350, baseY: 220 },
  { id: 5, name: 'Ganglios\nSubmentonianos', group: 'cabeza', zone: 'submandibular', baseX: 450, baseY: 240 },
  { id: 6, name: 'Oído\n(Sensorial)', group: 'cabeza', zone: 'cabeza', baseX: 180, baseY: 150 },
  { id: 7, name: 'Senos\nParanasales', group: 'cabeza', zone: 'cabeza', baseX: 550, baseY: 140 },
  // Cuello anterior (8 nodes)
  { id: 8, name: 'Cadena\nYugular Ant.', group: 'cuello', zone: 'cuello', baseX: 350, baseY: 300 },
  { id: 9, name: 'Cadena\nYugular Med.', group: 'cuello', zone: 'cuello', baseX: 450, baseY: 320 },
  { id: 10, name: 'Cadena\nYugular Post.', group: 'cuello', zone: 'cuello', baseX: 550, baseY: 300 },
  { id: 11, name: 'Cadena\nCervical Prof.', group: 'cuello', zone: 'cuello', baseX: 450, baseY: 280 },
  { id: 12, name: 'Espacio\nSubmandibular', group: 'cuello', zone: 'submandibular', baseX: 400, baseY: 260 },
  { id: 13, name: 'Fosa\nSupraclavicular', group: 'cuello', zone: 'cuello', baseX: 400, baseY: 420 },
  { id: 14, name: 'Ganglios\nPre-Traqueales', group: 'cuello', zone: 'cuello', baseX: 450, baseY: 400 },
  { id: 15, name: 'Ganglios\nParatraqueales', group: 'cuello', zone: 'cuello', baseX: 500, baseY: 410 },
  // Cuello posterior (4 nodes)
  { id: 16, name: 'Cadena\nOccipital', group: 'cuello', zone: 'cuello', baseX: 300, baseY: 240 },
  { id: 17, name: 'Cadena\nEspinal Access.', group: 'cuello', zone: 'cuello', baseX: 600, baseY: 250 },
  { id: 18, name: 'Cadena\nSupraclav. Post.', group: 'cuello', zone: 'cuello', baseX: 600, baseY: 420 },
  { id: 19, name: 'Ganglios\nMediastinales', group: 'cuello', zone: 'cuello', baseX: 450, baseY: 500 },
  // Vasos principales (4 nodes)
  { id: 20, name: 'Carótida\nComún', group: 'vasos', zone: 'cuello', baseX: 480, baseY: 360 },
  { id: 21, name: 'Carótida\nInterna', group: 'vasos', zone: 'cabeza', baseX: 520, baseY: 280 },
  { id: 22, name: 'Yugular\nInterna', group: 'vasos', zone: 'cuello', baseX: 420, baseY: 360 },
  { id: 23, name: 'Arteria\nSubclavia', group: 'vasos', zone: 'cuello', baseX: 500, baseY: 450 },
];

const BASE_EDGES: Edge[] = [
  // Lymphatic
  { from: 3, to: 8, type: 'lymphatic', weight: 1.0 },
  { from: 4, to: 12, type: 'lymphatic', weight: 1.0 },
  { from: 5, to: 9, type: 'lymphatic', weight: 1.0 },
  { from: 8, to: 19, type: 'lymphatic', weight: 0.5 },
  { from: 14, to: 19, type: 'lymphatic', weight: 0.5 },
  { from: 9, to: 13, type: 'lymphatic', weight: 0.7 },
  { from: 1, to: 14, type: 'lymphatic', weight: 1.0 },
  { from: 10, to: 18, type: 'lymphatic', weight: 0.8 },
  // Vascular
  { from: 20, to: 21, type: 'vascular', weight: 1.5 },
  { from: 20, to: 23, type: 'vascular', weight: 1.5 },
  { from: 21, to: 0, type: 'vascular', weight: 1.5 },
  { from: 21, to: 7, type: 'vascular', weight: 1.5 },
  { from: 21, to: 6, type: 'vascular', weight: 1.5 },
  { from: 22, to: 9, type: 'vascular', weight: 1.5 },
  { from: 22, to: 1, type: 'vascular', weight: 1.5 },
  // Neural
  { from: 0, to: 3, type: 'neural', weight: 0.7 },
  { from: 0, to: 4, type: 'neural', weight: 0.7 },
  { from: 0, to: 6, type: 'neural', weight: 0.7 },
  { from: 0, to: 7, type: 'neural', weight: 0.7 },
  { from: 14, to: 1, type: 'neural', weight: 0.7 },
  { from: 0, to: 20, type: 'neural', weight: 0.7 },
];

// ── Helpers ──────────────────────────────────────────────────

class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(min + this.next() * (max - min + 1));
  }
}

function bgColor(dark: boolean): [number, number, number] {
  return dark ? [20, 20, 19] : [250, 249, 245];
}

// ── Param Schema ─────────────────────────────────────────────

export const paramSchema: ParamSchema = {
  nodeCount: {
    type: 'slider',
    label: 'Nodos Visibles',
    min: 10,
    max: 30,
    step: 1,
    default: 24,
  },
  lymphatic: {
    type: 'slider',
    label: 'Conexiones Linfáticas',
    min: 0,
    max: 100,
    step: 5,
    default: 60,
    unit: '%',
  },
  vascular: {
    type: 'slider',
    label: 'Conexiones Vasculares',
    min: 0,
    max: 100,
    step: 5,
    default: 80,
    unit: '%',
  },
  neural: {
    type: 'slider',
    label: 'Conexiones Neurales',
    min: 0,
    max: 100,
    step: 5,
    default: 70,
    unit: '%',
  },
  inflammation: {
    type: 'slider',
    label: 'Inflamación Regional',
    min: 0,
    max: 100,
    step: 5,
    default: 0,
    unit: '%',
  },
  affectedZone: {
    type: 'select',
    label: 'Zona Afectada',
    options: [
      { value: 'cabeza', label: 'Cabeza' },
      { value: 'cuello', label: 'Cuello' },
      { value: 'tiroides', label: 'Tiroides' },
      { value: 'ganglios', label: 'Ganglio Cervical' },
      { value: 'parotida', label: 'Parótida' },
      { value: 'submandibular', label: 'Submandibular' },
    ],
    default: 'cabeza',
  },
};

// ── Presets ───────────────────────────────────────────────────

export const presets: PresetDefinition[] = [
  {
    key: 'normal',
    label: '🟢 Normal',
    description: 'Red anatómica sana sin inflamación',
    params: {
      nodeCount: 24,
      lymphatic: 60,
      vascular: 80,
      neural: 70,
      inflammation: 0,
      affectedZone: 'cabeza',
    },
  },
  {
    key: 'adenopatia',
    label: '🔴 Adenopatía Cervical',
    description: 'Inflamación ganglionar con propagación linfática',
    params: {
      nodeCount: 24,
      lymphatic: 70,
      vascular: 80,
      neural: 70,
      inflammation: 70,
      affectedZone: 'ganglios',
    },
  },
  {
    key: 'bocio',
    label: '🟠 Bocio',
    description: 'Aumento tiroideo con hipervasculación',
    params: {
      nodeCount: 24,
      lymphatic: 60,
      vascular: 85,
      neural: 70,
      inflammation: 60,
      affectedZone: 'tiroides',
    },
  },
  {
    key: 'parotiditis',
    label: '🟡 Parotiditis',
    description: 'Inflamación parotídea con extensión linfática',
    params: {
      nodeCount: 24,
      lymphatic: 75,
      vascular: 80,
      neural: 70,
      inflammation: 80,
      affectedZone: 'parotida',
    },
  },
  {
    key: 'masa',
    label: '🟣 Masa Cervical',
    description: 'Masa cervical con compresión vascular y neural',
    params: {
      nodeCount: 24,
      lymphatic: 65,
      vascular: 75,
      neural: 65,
      inflammation: 50,
      affectedZone: 'cuello',
    },
  },
];

// ── Sketch Factory ───────────────────────────────────────────

interface RuntimeNode {
  id: number;
  name: string;
  group: string;
  zone: string;
  x: number;
  y: number;
}

interface RuntimeEdge {
  from: number;
  to: number;
  type: 'lymphatic' | 'vascular' | 'neural';
  weight: number;
}

interface InflammationParticle {
  currentNodeId: number;
  targetNodeId: number | null;
  type: 'pathogen' | 'defense';
  progress: number;
  life: number;
  size: number;
}

export const sketch: SketchFactory = (
  p: p5,
  paramsRef: React.MutableRefObject<ParamValues>,
) => {
  let nodes: RuntimeNode[] = [];
  let edges: RuntimeEdge[] = [];
  let particles: InflammationParticle[] = [];
  let nodeInflammation: Record<number, number> = {};
  let sr: SeededRandom;

  function param<T>(key: string): T {
    return paramsRef.current[key] as T;
  }

  function getSeed(): number {
    return (paramsRef.current._seed as number) ?? 12345;
  }

  function isDark(): boolean {
    return (paramsRef.current._darkMode as boolean) ?? false;
  }

  function pickNextEdge(particle: InflammationParticle): void {
    const availableEdges = edges.filter(e => e.from === particle.currentNodeId);
    if (availableEdges.length > 0) {
      const idx = Math.floor(sr.next() * availableEdges.length);
      particle.targetNodeId = availableEdges[idx].to;
    } else {
      particle.targetNodeId = null;
    }
  }

  function createParticle(startNodeId: number, type: 'pathogen' | 'defense'): InflammationParticle {
    const particle: InflammationParticle = {
      currentNodeId: startNodeId,
      targetNodeId: null,
      type,
      progress: 0,
      life: 255,
      size: type === 'pathogen' ? 3 : 4,
    };
    pickNextEdge(particle);
    return particle;
  }

  function initializeSystem(): void {
    sr = new SeededRandom(getSeed());
    p.randomSeed(getSeed());
    p.noiseSeed(getSeed());

    const nodeCount = param<number>('nodeCount');
    const lymphatic = param<number>('lymphatic');
    const vascular = param<number>('vascular');
    const neural = param<number>('neural');
    const inflammation = param<number>('inflammation');
    const affectedZone = param<string>('affectedZone');

    // Scale node positions to canvas
    const scaleX = p.width / 900;
    const scaleY = p.height / 700;

    // Create nodes scaled to canvas
    const allNodes: RuntimeNode[] = ANATOMICAL_NODES.map(n => ({
      id: n.id,
      name: n.name,
      group: n.group,
      zone: n.zone,
      x: n.baseX * scaleX,
      y: n.baseY * scaleY,
    }));

    // Keep top nodeCount nodes
    const nodesToKeep = new Set(allNodes.slice(0, nodeCount).map(n => n.id));
    nodes = allNodes.filter(n => nodesToKeep.has(n.id));

    // Filter edges by connection percentages using seeded random
    edges = BASE_EDGES.filter(e => {
      const rand = sr.next() * 100;
      if (e.type === 'lymphatic') return rand < lymphatic;
      if (e.type === 'vascular') return rand < vascular;
      if (e.type === 'neural') return rand < neural;
      return true;
    }).filter(e => nodesToKeep.has(e.from) && nodesToKeep.has(e.to));

    // Reset inflammation state
    particles = [];
    nodeInflammation = {};
    nodes.forEach(n => { nodeInflammation[n.id] = 0; });

    // Spawn initial particles if inflammation > 0
    if (inflammation > 0) {
      const affectedNode = nodes.find(n => n.zone === affectedZone);
      if (affectedNode) {
        const count = Math.floor(inflammation / 10);
        for (let i = 0; i < count; i++) {
          particles.push(createParticle(affectedNode.id, 'pathogen'));
        }
      }
    }
  }

  // ── p5 lifecycle ──────────────────────────────────────────

  p.setup = function (): void {
    p.pixelDensity(1);
    initializeSystem();
  };

  p.draw = function (): void {
    const dark = isDark();
    const bg = bgColor(dark);
    p.background(bg[0], bg[1], bg[2]);

    const inflammation = param<number>('inflammation');
    const affectedZone = param<string>('affectedZone');

    // Draw edges
    drawEdges(dark);

    // Update inflammation from active seed zone
    if (inflammation > 0) {
      const affectedNode = nodes.find(n => n.zone === affectedZone);
      if (affectedNode && particles.length < inflammation / 5) {
        particles.push(createParticle(affectedNode.id, 'pathogen'));
      }

      // Propagate inflammation to neighbors
      const nodeIds = Object.keys(nodeInflammation);
      for (let k = 0; k < nodeIds.length; k++) {
        const nId = parseInt(nodeIds[k]);
        if (nodeInflammation[nId] > 5) {
          for (let e = 0; e < edges.length; e++) {
            if (edges[e].from === nId) {
              nodeInflammation[edges[e].to] =
                (nodeInflammation[edges[e].to] || 0) +
                nodeInflammation[nId] * 0.15;
            }
          }
        }
      }
    }

    // Decay inflammation
    const allNodeIds = Object.keys(nodeInflammation);
    for (let k = 0; k < allNodeIds.length; k++) {
      const nId = allNodeIds[k];
      nodeInflammation[parseInt(nId)] *= 0.98;
      if (nodeInflammation[parseInt(nId)] < 0.5) {
        nodeInflammation[parseInt(nId)] = 0;
      }
    }

    // Update and render particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const part = particles[i];
      // Update particle
      if (part.targetNodeId === null) {
        part.life -= 2;
      } else {
        part.progress += 0.015;
        if (part.progress >= 1.0) {
          part.currentNodeId = part.targetNodeId;
          part.progress = 0;
          if (part.type === 'pathogen') {
            nodeInflammation[part.currentNodeId] =
              (nodeInflammation[part.currentNodeId] || 0) + 3;
          }
          pickNextEdge(part);
        }
        part.life -= 1;
      }

      // Remove dead particles
      if (part.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      // Display particle
      const startNode = nodes.find(n => n.id === part.currentNodeId);
      if (!startNode) continue;

      let px: number, py: number;
      if (part.targetNodeId !== null) {
        const endNode = nodes.find(n => n.id === part.targetNodeId);
        if (endNode) {
          px = p.lerp(startNode.x, endNode.x, part.progress);
          py = p.lerp(startNode.y, endNode.y, part.progress);
        } else {
          px = startNode.x;
          py = startNode.y;
        }
      } else {
        px = startNode.x;
        py = startNode.y;
      }

      if (part.type === 'pathogen') {
        p.fill(220, 80, 80, part.life);
      } else {
        p.fill(100, 180, 100, part.life);
      }
      p.noStroke();
      p.circle(px, py, part.size);
    }

    // Render nodes
    for (let i = 0; i < nodes.length; i++) {
      drawNode(nodes[i], dark);
    }
  };

  // ── Drawing Functions ─────────────────────────────────────

  function drawEdges(dark: boolean): void {
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) continue;

      p.push();

      const ctx = (p.drawingContext as CanvasRenderingContext2D);

      if (edge.type === 'lymphatic') {
        p.stroke(dark ? 80 : 120, 180, 100, 120);
        p.strokeWeight(1.5);
        ctx.setLineDash([5, 5]);
      } else if (edge.type === 'vascular') {
        p.stroke(220, 100, 100, 140);
        p.strokeWeight(2);
        ctx.setLineDash([]);
      } else if (edge.type === 'neural') {
        p.stroke(100, 150, dark ? 255 : 200, 100);
        p.strokeWeight(1);
        ctx.setLineDash([2, 3]);
      }

      p.line(fromNode.x, fromNode.y, toNode.x, toNode.y);
      ctx.setLineDash([]);
      p.pop();
    }
  }

  function drawNode(node: RuntimeNode, dark: boolean): void {
    const inflam = nodeInflammation[node.id] || 0;
    const affectedZone = param<string>('affectedZone');
    const nodeCount = param<number>('nodeCount');
    const isAffected = affectedZone === node.zone;

    // Base node size
    let nodeSize = 16 + inflam * 0.5;
    if (nodeCount < 15) nodeSize *= 1.2;
    if (nodeCount > 20) nodeSize *= 0.9;

    p.push();

    // Fill color
    if (inflam > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(p.frameCount * 0.05);
      const r = p.lerp(200, 255, pulse);
      const g = p.lerp(80, 120, pulse);
      p.fill(r, g, 60);
    } else if (isAffected) {
      p.fill(dark ? 60 : 230, dark ? 55 : 220, dark ? 45 : 200);
    } else {
      p.fill(dark ? 45 : 245, dark ? 44 : 244, dark ? 40 : 242);
    }

    // Stroke
    if (inflam > 0) {
      p.stroke(220, 100, 80);
      p.strokeWeight(2);
    } else if (isAffected) {
      p.stroke(dark ? 150 : 200, dark ? 120 : 150, dark ? 80 : 100);
      p.strokeWeight(1.5);
    } else {
      p.stroke(dark ? 80 : 200, dark ? 78 : 195, dark ? 75 : 190);
      p.strokeWeight(1);
    }

    // Glow for inflamed nodes
    const ctx = (p.drawingContext as CanvasRenderingContext2D);
    if (inflam > 5) {
      ctx.shadowColor = 'rgba(220, 100, 80, 0.5)';
      ctx.shadowBlur = 15 + inflam * 0.3;
    }

    p.circle(node.x, node.y, nodeSize);

    // Reset shadow
    if (inflam > 5) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    // Node label
    p.fill(dark ? 200 : 50);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(9);
    p.text(node.name, node.x, node.y + nodeSize / 2 + 12);

    p.pop();
  }

  // ── Touch/Mouse Events ─────────────────────────────────────

  p.touchStarted = function (): boolean {
    return false;
  };

  p.windowResized = function (): void {
    // Handled by P5Canvas wrapper
  };
};

// ── Module export ────────────────────────────────────────────

const displayName = 'Redes de Conexión';
const description =
  'Semiología Regional — Grafos anatómicos de cabeza y cuello con propagación de inflamación a través de redes linfáticas, vasculares y neurales.';

const semiologiaRegionalEngine: EngineModule = {
  sketch,
  paramSchema,
  presets,
  displayName,
  description,
};

export default semiologiaRegionalEngine;
