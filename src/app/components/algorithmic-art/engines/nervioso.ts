// ============================================================
// Axon — Algorithmic Art: Nervioso Engine
// "Circuitos y Síndromes" — Neural network oscillator simulation
//
// Ported from nervioso_circuitos_sindromes.html → instance-mode p5
// ============================================================
import type {
  EngineModule,
  ParamSchema,
  ParamValues,
  PresetDefinition,
  SketchFactory,
} from '../types';

// ── Param schema ─────────────────────────────────────────────

const paramSchema: ParamSchema = {
  nodeCount: {
    type: 'slider',
    label: 'Nodos Neuronales',
    min: 20,
    max: 80,
    step: 5,
    default: 40,
  },
  conductionSpeed: {
    type: 'slider',
    label: 'Velocidad de Conducción',
    min: 0.1,
    max: 3.0,
    step: 0.1,
    default: 1.0,
  },
  threshold: {
    type: 'slider',
    label: 'Umbral de Excitación',
    min: 0.1,
    max: 1.0,
    step: 0.05,
    default: 0.5,
  },
  inhibition: {
    type: 'slider',
    label: 'Inhibición Global (%)',
    min: 0,
    max: 100,
    step: 5,
    default: 30,
    unit: '%',
  },
  noise: {
    type: 'slider',
    label: 'Ruido Sináptico (%)',
    min: 0,
    max: 50,
    step: 5,
    default: 10,
    unit: '%',
  },
  injury: {
    type: 'slider',
    label: 'Lesión Focal (%)',
    min: 0,
    max: 100,
    step: 5,
    default: 0,
    unit: '%',
  },
  injuryZone: {
    type: 'select',
    label: 'Zona de Lesión',
    options: [
      { value: 'motor', label: 'Corteza Motora' },
      { value: 'sensory', label: 'Corteza Sensorial' },
      { value: 'thalamus', label: 'Tálamo' },
      { value: 'cerebellum', label: 'Cerebelo' },
      { value: 'brainstem', label: 'Tronco Encefálico' },
    ],
    default: 'motor',
  },
};

// ── Presets ───────────────────────────────────────────────────

const presets: PresetDefinition[] = [
  {
    key: 'normal',
    label: 'Normal',
    description: 'Actividad neuronal fisiológica normal',
    params: {
      nodeCount: 40,
      conductionSpeed: 1.0,
      threshold: 0.5,
      inhibition: 30,
      noise: 10,
      injury: 0,
      injuryZone: 'motor',
    },
  },
  {
    key: 'crisis-epileptica',
    label: 'Crisis Epiléptica',
    description: 'Descargas hipersincrónicas con umbral bajo',
    params: {
      nodeCount: 40,
      conductionSpeed: 1.2,
      threshold: 0.15,
      inhibition: 5,
      noise: 40,
      injury: 0,
      injuryZone: 'motor',
    },
  },
  {
    key: 'acv-motor',
    label: 'ACV Motor',
    description: 'Accidente cerebrovascular en corteza motora',
    params: {
      nodeCount: 40,
      conductionSpeed: 0.3,
      threshold: 0.5,
      inhibition: 30,
      noise: 10,
      injury: 60,
      injuryZone: 'motor',
    },
  },
  {
    key: 'parkinson',
    label: 'Parkinson',
    description: 'Inhibición aumentada con bradicinesia',
    params: {
      nodeCount: 40,
      conductionSpeed: 0.8,
      threshold: 0.5,
      inhibition: 70,
      noise: 20,
      injury: 0,
      injuryZone: 'motor',
    },
  },
  {
    key: 'neuropatia-periferica',
    label: 'Neuropatía Periférica',
    description: 'Conducción lenta con daño en tronco encefálico',
    params: {
      nodeCount: 40,
      conductionSpeed: 0.2,
      threshold: 0.6,
      inhibition: 30,
      noise: 30,
      injury: 30,
      injuryZone: 'brainstem',
    },
  },
];

// ── Internal types ───────────────────────────────────────────

interface ZoneDef {
  name: string;
  color: [number, number, number];
  rect: { x: number; y: number; w: number; h: number };
}

interface NeuronNode {
  id: number;
  x: number;
  y: number;
  zone: string;
  phase: number;
  activation: number;
  refractoryCounter: number;
  inDamageZone: boolean;
  baseColor: [number, number, number];
}

interface Connection {
  from: number;
  to: number;
  distance: number;
  isInhibitory: boolean;
  strength: number;
}

interface Pulse {
  fromId: number;
  toId: number;
  startTime: number;
  travelTime: number;
  isInhibitory: boolean;
  strength: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

// ── Seeded RNG ───────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ── Zone definitions ─────────────────────────────────────────

const ZONES: Record<string, ZoneDef> = {
  motor: { name: 'Corteza Motora', color: [232, 93, 82], rect: { x: 100, y: 100, w: 200, h: 150 } },
  sensory: { name: 'Corteza Sensorial', color: [77, 166, 199], rect: { x: 550, y: 100, w: 200, h: 150 } },
  thalamus: { name: 'Tálamo', color: [166, 124, 201], rect: { x: 350, y: 280, w: 200, h: 120 } },
  cerebellum: { name: 'Cerebelo', color: [120, 166, 85], rect: { x: 100, y: 480, w: 200, h: 150 } },
  brainstem: { name: 'Tronco Encefálico', color: [218, 168, 62], rect: { x: 420, y: 480, w: 200, h: 150 } },
};

// ── Sketch factory ───────────────────────────────────────────

const createSketch: SketchFactory = (p, paramsRef) => {
  let nodes: NeuronNode[] = [];
  let connections: Connection[] = [];
  let pulses: Pulse[] = [];
  let lastSeed = -1;
  let lastNodeCount = -1;

  /** Read a numeric param with fallback */
  const num = (key: string, fallback: number): number => {
    const v = paramsRef.current[key];
    return typeof v === 'number' ? v : fallback;
  };

  const str = (key: string, fallback: string): string => {
    const v = paramsRef.current[key];
    return typeof v === 'string' ? v : fallback;
  };

  function initializeNetwork(seed: number) {
    nodes = [];
    connections = [];
    pulses = [];

    const nodeCount = num('nodeCount', 40);
    const injuryAmount = num('injury', 0) / 100;
    const injuryZone = str('injuryZone', 'motor');

    let rng = 0;
    const nodesPerZone = Math.floor(nodeCount / 5);
    let nodeId = 0;

    // Distribute nodes into zones
    for (const [zoneKey, zone] of Object.entries(ZONES)) {
      for (let i = 0; i < nodesPerZone; i++) {
        const x = zone.rect.x + seededRandom(seed + rng++) * zone.rect.w;
        const y = zone.rect.y + seededRandom(seed + rng++) * zone.rect.h;

        nodes.push({
          id: nodeId++,
          x,
          y,
          zone: zoneKey,
          phase: seededRandom(seed + rng++) * Math.PI * 2,
          activation: 0,
          refractoryCounter: 0,
          inDamageZone: false,
          baseColor: zone.color,
        });
      }
    }

    // Apply damage
    const damageCount = Math.floor(nodes.length * injuryAmount);
    const zoneNodes = nodes.filter(n => n.zone === injuryZone);
    const damageThisZone = Math.min(damageCount, zoneNodes.length);

    for (let i = 0; i < damageThisZone; i++) {
      const idx = Math.floor(seededRandom(seed + rng++) * zoneNodes.length);
      zoneNodes[idx].inDamageZone = true;
    }

    // Proximity-based connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {
          const isInhibitory = seededRandom(seed + rng++) < 0.3;
          const strength = 1 - dist / 150;

          connections.push({ from: i, to: j, distance: dist, isInhibitory, strength });
          connections.push({ from: j, to: i, distance: dist, isInhibitory, strength });
        }
      }
    }

    // Long-range connections
    const numLongRange = Math.floor(nodes.length * 0.3);
    for (let i = 0; i < numLongRange; i++) {
      const from = Math.floor(seededRandom(seed + rng++) * nodes.length);
      const to = Math.floor(seededRandom(seed + rng++) * nodes.length);

      if (from !== to) {
        const dx = nodes[from].x - nodes[to].x;
        const dy = nodes[from].y - nodes[to].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isInhibitory = seededRandom(seed + rng++) < 0.3;

        connections.push({ from, to, distance: dist, isInhibitory, strength: 0.6 });
      }
    }
  }

  function updateNetwork() {
    const conductionSpeed = num('conductionSpeed', 1.0);
    const threshold = num('threshold', 0.5);
    const inhibition = num('inhibition', 30);
    const noiseLevel = num('noise', 10) / 100;

    // Update phases and detect firing
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.inDamageZone) continue;

      // Update phase
      node.phase += 0.02 * conductionSpeed;
      if (node.phase > Math.PI * 2) node.phase -= Math.PI * 2;

      // Decay activation
      node.activation *= 0.95;

      // Add synaptic noise
      node.activation += (Math.random() - 0.5) * noiseLevel * 0.1;

      // Update refractory counter
      if (node.refractoryCounter > 0) node.refractoryCounter--;

      // Check firing threshold
      if (node.activation > threshold && node.refractoryCounter === 0) {
        node.activation = 0.8;
        node.refractoryCounter = 10;

        // Send signals along connections
        for (const conn of connections) {
          if (conn.from === i) {
            const pulseDelay = (conn.distance / 200) * (3 - conductionSpeed);

            pulses.push({
              fromId: i,
              toId: conn.to,
              startTime: 0,
              travelTime: Math.max(2, pulseDelay),
              isInhibitory: conn.isInhibitory,
              strength: conn.strength,
              fromX: node.x,
              fromY: node.y,
              toX: nodes[conn.to].x,
              toY: nodes[conn.to].y,
            });
          }
        }
      }
    }

    // Update pulses
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pulse = pulses[i];
      pulse.startTime++;

      if (pulse.startTime >= pulse.travelTime) {
        const targetNode = nodes[pulse.toId];
        if (!targetNode.inDamageZone) {
          if (pulse.isInhibitory) {
            targetNode.activation -= pulse.strength * (inhibition / 100);
          } else {
            targetNode.activation += pulse.strength;
          }
        }
        pulses.splice(i, 1);
      }
    }
  }

  // ── p5 lifecycle ─────────────────────────────────────────

  p.setup = () => {
    p.createCanvas(900, 700);
    p.smooth();
    initializeNetwork(42);
  };

  p.draw = () => {
    // Seed / nodeCount change detection
    const seed = num('seed', 42);
    const nodeCount = num('nodeCount', 40);
    const injury = num('injury', 0);

    if (seed !== lastSeed || nodeCount !== lastNodeCount) {
      lastSeed = seed;
      lastNodeCount = nodeCount;
      initializeNetwork(seed);
    }

    // Background
    const dark = paramsRef.current.darkMode;
    if (dark) {
      p.background(10, 10, 8);
    } else {
      p.background(245, 244, 241);
    }

    // Draw zone backgrounds
    p.strokeWeight(1);
    for (const [, zone] of Object.entries(ZONES)) {
      const [zr, zg, zb] = zone.color;
      p.fill(zr, zg, zb, 5);
      p.stroke(zr, zg, zb, 20);
      p.rect(zone.rect.x, zone.rect.y, zone.rect.w, zone.rect.h);
    }

    // Update network simulation
    updateNetwork();

    // Draw connections
    p.strokeWeight(1);
    for (const conn of connections) {
      const fromNode = nodes[conn.from];
      const toNode = nodes[conn.to];

      if (fromNode.inDamageZone || toNode.inDamageZone) continue;

      const baseAlpha = conn.isInhibitory ? 15 : 25;
      const signalStrength = fromNode.activation * 100;
      const alpha = Math.min(200, baseAlpha + signalStrength);

      if (dark) {
        p.stroke(150, 150, 148, alpha);
      } else {
        p.stroke(80, 80, 78, alpha);
      }
      p.line(fromNode.x, fromNode.y, toNode.x, toNode.y);
    }

    // Draw pulses
    p.noStroke();
    for (const pulse of pulses) {
      const progress = pulse.startTime / pulse.travelTime;
      const x = p.lerp(pulse.fromX, pulse.toX, progress);
      const y = p.lerp(pulse.fromY, pulse.toY, progress);
      const alpha = 200 * (1 - progress * 0.3);

      if (pulse.isInhibitory) {
        p.fill(100, 100, 100, alpha);
      } else {
        p.fill(217, 119, 87, alpha);
      }
      p.ellipse(x, y, 4, 4);
    }

    // Draw nodes
    for (const node of nodes) {
      const zone = ZONES[node.zone];

      if (node.inDamageZone) {
        // Damaged node
        p.fill(40, 40, 38);
        p.stroke(80, 80, 78);
        p.strokeWeight(2);
        p.ellipse(node.x, node.y, 12, 12);
        p.line(node.x - 5, node.y - 5, node.x + 5, node.y + 5);
        p.line(node.x - 5, node.y + 5, node.x + 5, node.y - 5);
      } else {
        const activation = Math.max(0, node.activation);
        const size = 8 + activation * 12;
        const glowSize = size + activation * 20;
        const [cr, cg, cb] = zone.color;

        // Glow
        p.noStroke();
        p.fill(cr, cg, cb, activation * 50);
        p.ellipse(node.x, node.y, glowSize, glowSize);

        // Node body
        p.fill(cr, cg, cb);
        p.ellipse(node.x, node.y, size, size);

        // Bright center when active
        if (activation > 0.3) {
          p.fill(255, 255, 250, activation * 200);
          p.ellipse(node.x, node.y, size * 0.5, size * 0.5);
        }
      }
    }

    // Info overlay
    const infoColor = dark ? p.color(212, 211, 207, 100) : p.color(80, 80, 78, 100);
    p.fill(infoColor);
    p.noStroke();
    p.textSize(10);
    p.textAlign(p.LEFT);
    p.text(
      `Nodos: ${nodeCount} | Umbral: ${num('threshold', 0.5).toFixed(2)} | Lesión: ${injury}%`,
      10,
      p.height - 10,
    );
  };
};

// ── Module export ────────────────────────────────────────────

const nerviosoEngine: EngineModule = {
  sketch: createSketch,
  paramSchema,
  presets,
  displayName: 'Circuitos y Síndromes',
  description: 'Sistema Nervioso — Osciladores Acoplados',
};

export default nerviosoEngine;
export { createSketch as sketch, paramSchema, presets };
export const displayName = nerviosoEngine.displayName;
export const description = nerviosoEngine.description;
