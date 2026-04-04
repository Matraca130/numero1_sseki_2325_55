// ============================================================
// Axon — Algorithmic Art: Hematología · Ríos de Oxígeno
//
// Ported from hematologia_rios_oxigeno.html to TypeScript
//
// Visualizes the circulatory system as an L-system fractal
// vascular tree with three cell types (erythrocytes, leukocytes,
// platelets) flowing through vessels. Hemoglobin concentration
// controls color saturation, VCM controls cell size, and a
// compensatory heart rate increases with anemia.
//
// Params:
//   hemoglobin      — g/dL (5–20)
//   vcm             — Mean Corpuscular Volume fL (60–120)
//   wbc             — White Blood Cells /µL (1000–50000)
//   plt             — Platelets /µL (10000–500000)
//   retic           — Reticulocyte % (0–10)
//   flowSpeed       — Flow multiplier (0.2–3.0)
//   vascularDepth   — L-system branch depth (2–8)
//
// Presets: Normal, Anemia Ferropénica, Megaloblástica, Leucemia,
//          Policitemia, Trombocitopenia
// ============================================================

import type p5 from 'p5';
import type {
  EngineModule,
  ParamSchema,
  PresetDefinition,
  SketchFactory,
  ParamValues,
} from '../types';

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
  hemoglobin: {
    type: 'slider',
    label: 'Hemoglobina',
    min: 5,
    max: 20,
    step: 0.5,
    default: 14,
    unit: ' g/dL',
  },
  vcm: {
    type: 'slider',
    label: 'VCM',
    min: 60,
    max: 120,
    step: 1,
    default: 90,
    unit: ' fL',
  },
  wbc: {
    type: 'slider',
    label: 'Leucocitos',
    min: 1000,
    max: 50000,
    step: 500,
    default: 7500,
    unit: ' /µL',
  },
  plt: {
    type: 'slider',
    label: 'Plaquetas',
    min: 10000,
    max: 500000,
    step: 10000,
    default: 250000,
    unit: ' /µL',
  },
  retic: {
    type: 'slider',
    label: 'Reticulocitos',
    min: 0,
    max: 10,
    step: 0.5,
    default: 1,
    unit: '%',
  },
  flowSpeed: {
    type: 'slider',
    label: 'Velocidad de Flujo',
    min: 0.2,
    max: 3.0,
    step: 0.1,
    default: 1.0,
    unit: 'x',
  },
  vascularDepth: {
    type: 'slider',
    label: 'Ramificación Vascular',
    min: 2,
    max: 8,
    step: 1,
    default: 5,
  },
};

// ── Presets ───────────────────────────────────────────────────

export const presets: PresetDefinition[] = [
  {
    key: 'normal',
    label: '🟢 Normal',
    description: 'Hemograma normal con flujo fisiológico',
    params: {
      hemoglobin: 14,
      vcm: 90,
      wbc: 7500,
      plt: 250000,
      retic: 1,
      flowSpeed: 1.0,
      vascularDepth: 5,
    },
  },
  {
    key: 'ferropenica',
    label: '🔴 Anemia Ferropénica',
    description: 'Hb baja, VCM disminuido, eritrocitos microcíticos',
    params: {
      hemoglobin: 8,
      vcm: 65,
      wbc: 6000,
      plt: 300000,
      retic: 3,
      flowSpeed: 1.3,
      vascularDepth: 5,
    },
  },
  {
    key: 'megaloblastica',
    label: '🟠 Megaloblástica',
    description: 'Déficit B12/folato con macrocitosis',
    params: {
      hemoglobin: 9,
      vcm: 115,
      wbc: 5000,
      plt: 200000,
      retic: 0.5,
      flowSpeed: 1.2,
      vascularDepth: 5,
    },
  },
  {
    key: 'leucemia',
    label: '🟡 Leucemia',
    description: 'Leucocitosis extrema con citopenias',
    params: {
      hemoglobin: 10,
      vcm: 90,
      wbc: 40000,
      plt: 50000,
      retic: 2,
      flowSpeed: 1.5,
      vascularDepth: 4,
    },
  },
  {
    key: 'policitemia',
    label: '🔵 Policitemia',
    description: 'Exceso de eritrocitos con hiperviscosidad',
    params: {
      hemoglobin: 18,
      vcm: 88,
      wbc: 9000,
      plt: 400000,
      retic: 0.5,
      flowSpeed: 0.8,
      vascularDepth: 6,
    },
  },
  {
    key: 'trombocitopenia',
    label: '🟣 Trombocitopenia',
    description: 'Plaquetas severamente disminuidas',
    params: {
      hemoglobin: 13,
      vcm: 90,
      wbc: 7500,
      plt: 30000,
      retic: 1.5,
      flowSpeed: 1.0,
      vascularDepth: 5,
    },
  },
];

// ── Sketch Factory ───────────────────────────────────────────

interface Vessel {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  depth: number;
  thickness: number;
}

interface CellParticle {
  vesselIdx: number;
  progress: number;
  type: 'erythrocyte' | 'leukocyte' | 'platelet';
  size: number;
  saturation: number;
  age: number;
  isReticulocyte: boolean;
  clustered: boolean;
  clusterSize: number;
}

export const sketch: SketchFactory = (
  p: p5,
  paramsRef: React.MutableRefObject<ParamValues>,
) => {
  let vascularTree: Vessel[] = [];
  let particles: CellParticle[] = [];
  let heartbeat = 0;
  let currentHR = 70;
  let sr: SeededRandom;

  function param<T>(key: string): T {
    return paramsRef.current[key] as T;
  }

  function getSeed(): number {
    return (paramsRef.current._seed as number) ?? 42;
  }

  function isDark(): boolean {
    return (paramsRef.current._darkMode as boolean) ?? false;
  }

  function buildVascularTree(
    x: number,
    y: number,
    length: number,
    angle: number,
    depth: number,
    maxDepth: number,
  ): void {
    if (depth === 0) return;

    const endX = x + length * Math.cos(angle);
    const endY = y + length * Math.sin(angle);

    vascularTree.push({
      x1: x,
      y1: y,
      x2: endX,
      y2: endY,
      depth: maxDepth - depth,
      thickness: 3 * Math.pow(0.75, maxDepth - depth),
    });

    const angleSpread = 0.45;
    buildVascularTree(endX, endY, length * 0.75, angle - angleSpread, depth - 1, maxDepth);
    buildVascularTree(endX, endY, length * 0.75, angle + angleSpread, depth - 1, maxDepth);
  }

  function initializeSystem(): void {
    sr = new SeededRandom(getSeed());
    p.randomSeed(getSeed());
    p.noiseSeed(getSeed());

    const hemoglobin = param<number>('hemoglobin');
    const vcm = param<number>('vcm');
    const wbc = param<number>('wbc');
    const retic = param<number>('retic');
    const vascularDepth = param<number>('vascularDepth');

    // Build vascular tree from center
    vascularTree = [];
    const treeStartX = p.width * 0.5;
    const treeStartY = p.height * 0.5;
    const branchLen = Math.min(p.width, p.height) * 0.14;
    buildVascularTree(treeStartX, treeStartY, branchLen, 0, vascularDepth, vascularDepth);

    if (vascularTree.length === 0) return;

    // Compensatory heart rate
    const hbDeficit = Math.max(0, 15 - hemoglobin);
    currentHR = 70 + hbDeficit * 8;

    // Create particles — cap total for performance
    particles = [];
    const totalParticles = Math.min(
      1500,
      Math.floor(800 + (hemoglobin / 20) * 700),
    );

    const cellSize = p.map(vcm, 60, 120, 2.5, 4.5);

    // Erythrocytes ~85%
    const erythCount = Math.floor(totalParticles * 0.85);
    for (let i = 0; i < erythCount; i++) {
      particles.push({
        vesselIdx: sr.int(0, vascularTree.length - 1),
        progress: sr.next(),
        type: 'erythrocyte',
        size: cellSize,
        saturation: 100,
        age: sr.range(0, 120),
        isReticulocyte: sr.next() * 100 < retic,
        clustered: false,
        clusterSize: 0,
      });
    }

    // Leukocytes ~10%
    const leukoSize = p.map(wbc, 1000, 50000, 5, 10);
    const leukoCount = Math.floor(totalParticles * 0.1);
    for (let i = 0; i < leukoCount; i++) {
      particles.push({
        vesselIdx: sr.int(0, vascularTree.length - 1),
        progress: sr.next(),
        type: 'leukocyte',
        size: leukoSize,
        saturation: 0,
        age: 0,
        isReticulocyte: false,
        clustered: false,
        clusterSize: 0,
      });
    }

    // Platelets ~5%
    const pltCount = Math.floor(totalParticles * 0.05);
    for (let i = 0; i < pltCount; i++) {
      particles.push({
        vesselIdx: sr.int(0, vascularTree.length - 1),
        progress: sr.next(),
        type: 'platelet',
        size: 2,
        saturation: 0,
        age: 0,
        isReticulocyte: false,
        clustered: sr.next() < 0.2,
        clusterSize: sr.int(2, 5),
      });
    }
  }

  // ── p5 lifecycle ──────────────────────────────────────────

  p.setup = function (): void {
    p.pixelDensity(1);
    p.noSmooth();
    initializeSystem();
  };

  p.draw = function (): void {
    const dark = isDark();
    const bg = bgColor(dark);
    p.background(bg[0], bg[1], bg[2]);

    const flowSpeed = param<number>('flowSpeed');
    const hemoglobin = param<number>('hemoglobin');
    const vDepth = param<number>('vascularDepth');

    // Draw vascular tree
    drawVascularTree(dark, vDepth);

    // Draw heartbeat
    drawHeart(dark);

    // Update and draw particles
    for (let i = 0; i < particles.length; i++) {
      const cell = particles[i];

      if (cell.vesselIdx >= vascularTree.length) {
        cell.vesselIdx = 0;
      }

      // Update
      if (cell.type === 'erythrocyte') {
        cell.progress += flowSpeed * 0.003;
        cell.saturation -= 0.1;
        cell.age += 0.01;
        if (cell.age > 120) cell.age = 0;
      } else if (cell.type === 'leukocyte') {
        cell.progress += flowSpeed * 0.002;
      } else {
        cell.progress += flowSpeed * 0.0025;
      }

      if (cell.progress > 1) {
        cell.progress = 0;
        cell.vesselIdx = Math.floor(Math.random() * vascularTree.length);
        if (cell.type === 'erythrocyte') cell.saturation = 100;
        if (cell.type === 'platelet') {
          cell.clustered = Math.random() < 0.2;
          cell.clusterSize = 2 + Math.floor(Math.random() * 4);
        }
      }

      // Display
      const vessel = vascularTree[cell.vesselIdx];
      if (!vessel) continue;
      const cx = p.lerp(vessel.x1, vessel.x2, cell.progress);
      const cy = p.lerp(vessel.y1, vessel.y2, cell.progress);

      if (cell.type === 'erythrocyte') {
        // Hemoglobin-based color: high Hb → rich red, low → pale/pink
        const hbNorm = Math.min(hemoglobin / 15, 1);
        const satNorm = Math.max(cell.saturation / 100, 0);
        if (cell.isReticulocyte) {
          p.fill(160, 100, 200, 200);
        } else {
          // Red intensity based on hemoglobin and oxygenation
          const r = Math.round(150 + 100 * hbNorm * satNorm);
          const g = Math.round(50 + 30 * (1 - hbNorm));
          const b = Math.round(50 + 60 * (1 - satNorm));
          p.fill(r, g, b, 200);
        }
        p.noStroke();
        p.ellipse(cx, cy, cell.size);
      } else if (cell.type === 'leukocyte') {
        p.fill(180, 190, 220);
        p.stroke(100, 120, 180);
        p.strokeWeight(1);
        p.ellipse(cx, cy, cell.size);
      } else {
        // Platelet
        p.fill(220, 180, 60);
        p.noStroke();
        if (cell.clustered) {
          for (let c = 0; c < cell.clusterSize; c++) {
            const ox = (Math.random() - 0.5) * 4;
            const oy = (Math.random() - 0.5) * 4;
            p.ellipse(cx + ox, cy + oy, 2);
          }
        } else {
          p.ellipse(cx, cy, 2);
        }
      }
    }

    // Heartbeat phase
    heartbeat += (p.TWO_PI * currentHR) / (60 * 60);

    // Info overlay
    p.fill(dark ? 200 : 80);
    p.noStroke();
    p.textSize(11);
    p.textAlign(p.LEFT, p.BOTTOM);
    p.text(
      `Hb: ${hemoglobin.toFixed(1)} g/dL  |  FC: ${Math.round(currentHR)} bpm  |  Células: ${particles.length}`,
      10,
      p.height - 8,
    );
  };

  // ── Drawing Functions ─────────────────────────────────────

  function drawVascularTree(dark: boolean, maxDepth: number): void {
    for (let i = 0; i < vascularTree.length; i++) {
      const vessel = vascularTree[i];
      const alpha = 200 * Math.pow(0.9, vessel.depth);

      // Arterial (shallow) → venous (deep)
      const isVenous = vessel.depth > maxDepth * 0.6;
      if (isVenous) {
        p.stroke(50 + (dark ? 20 : 0), 50, 200, alpha);
      } else {
        p.stroke(200, 50, 50, alpha);
      }
      p.strokeWeight(vessel.thickness);
      p.line(vessel.x1, vessel.y1, vessel.x2, vessel.y2);
    }
  }

  function drawHeart(dark: boolean): void {
    const heartSize = 20 + Math.sin(heartbeat) * 8;
    p.fill(220, 60, 80);
    p.noStroke();
    p.ellipse(50, p.height * 0.5, heartSize);

    p.fill(dark ? 180 : 100);
    p.textSize(11);
    p.textAlign(p.CENTER, p.TOP);
    p.text(Math.round(currentHR) + ' bpm', 50, p.height * 0.5 + 18);
  }

  // ── Touch Events ──────────────────────────────────────────

  p.touchStarted = function (): boolean {
    return false;
  };

  p.windowResized = function (): void {
    // Handled by P5Canvas wrapper
  };
};

// ── Module export ────────────────────────────────────────────

const displayName = 'Ríos de Oxígeno';
const description =
  'Hematología — Árbol vascular fractal con eritrocitos, leucocitos y plaquetas. Hemoglobina controla color, VCM controla tamaño celular, frecuencia cardíaca compensa la anemia.';

const hematologiaEngine: EngineModule = {
  sketch,
  paramSchema,
  presets,
  displayName,
  description,
};

export default hematologiaEngine;
