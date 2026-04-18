// ============================================================
// Axon — Algorithmic Art: Respiratorio · Arquitectura del Aire
//
// Ported from respiratorio_arquitectura_aire.html to TypeScript
// engine using the ALICIA framework.
//
// Visualizes the respiratory system: bilateral lungs with
// alveoli, gas exchange particles (O₂/CO₂), peristaltic
// breathing cycle, and pathology overlays (consolidation,
// pleural effusion, pneumothorax).
//
// Params:
//   respiratoryRate    — Breaths per minute 8–40
//   tidalVolume        — Tidal volume 200–800 mL
//   lungCompliance     — Compliance 10–100%
//   airwayResistance   — Resistance 0–90%
//   consolidation      — Lung consolidation 0–100%
//   pleuralEffusion    — Pleural effusion 0–100%
//   pneumothorax       — Pneumothorax 0–100%
//
// Presets: Normal, Neumonía, EPOC, Neumotórax,
//          Derrame Pleural, Asma Aguda
// ============================================================

import type p5 from 'p5';
import type {
  EngineModule,
  ParamSchema,
  PresetDefinition,
  SketchFactory,
  ParamValues,
} from '../types';

// ── Constants ───────────────────────────────────────────────

const PARTICLE_COUNT = 800;
const ALVEOLI_PER_LUNG = 120;

// ── Param Schema ─────────────────────────────────────────────

export const paramSchema: ParamSchema = {
  respiratoryRate: {
    type: 'slider',
    label: 'Frecuencia Respiratoria',
    min: 8,
    max: 40,
    step: 1,
    default: 16,
    unit: ' rpm',
  },
  tidalVolume: {
    type: 'slider',
    label: 'Volumen Tidal',
    min: 200,
    max: 800,
    step: 50,
    default: 500,
    unit: ' mL',
  },
  lungCompliance: {
    type: 'slider',
    label: 'Compliance Pulmonar',
    min: 10,
    max: 100,
    step: 5,
    default: 70,
    unit: '%',
  },
  airwayResistance: {
    type: 'slider',
    label: 'Resistencia Vía Aérea',
    min: 0,
    max: 90,
    step: 5,
    default: 10,
    unit: '%',
  },
  consolidation: {
    type: 'slider',
    label: 'Consolidación',
    min: 0,
    max: 100,
    step: 5,
    default: 0,
    unit: '%',
  },
  pleuralEffusion: {
    type: 'slider',
    label: 'Derrame Pleural',
    min: 0,
    max: 100,
    step: 5,
    default: 0,
    unit: '%',
  },
  pneumothorax: {
    type: 'slider',
    label: 'Neumotórax',
    min: 0,
    max: 100,
    step: 5,
    default: 0,
    unit: '%',
  },
};

// ── Presets ───────────────────────────────────────────────────

export const presets: PresetDefinition[] = [
  {
    key: 'normal',
    label: '🟢 Normal',
    description: 'Fisiología respiratoria normal: 16 rpm, compliance y resistencia estándar',
    params: {
      respiratoryRate: 16,
      tidalVolume: 500,
      lungCompliance: 70,
      airwayResistance: 10,
      consolidation: 0,
      pleuralEffusion: 0,
      pneumothorax: 0,
    },
  },
  {
    key: 'neumonia',
    label: '🔴 Neumonía',
    description: 'Consolidación pulmonar con resistencia aumentada',
    params: {
      respiratoryRate: 18,
      tidalVolume: 480,
      lungCompliance: 70,
      airwayResistance: 40,
      consolidation: 60,
      pleuralEffusion: 0,
      pneumothorax: 0,
    },
  },
  {
    key: 'epoc',
    label: '🟠 EPOC',
    description: 'Compliance reducida con alta resistencia de vía aérea',
    params: {
      respiratoryRate: 20,
      tidalVolume: 450,
      lungCompliance: 30,
      airwayResistance: 70,
      consolidation: 0,
      pleuralEffusion: 0,
      pneumothorax: 0,
    },
  },
  {
    key: 'neumotorax',
    label: '⬛ Neumotórax',
    description: 'Colapso parcial del pulmón con aire en espacio pleural',
    params: {
      respiratoryRate: 22,
      tidalVolume: 400,
      lungCompliance: 60,
      airwayResistance: 15,
      consolidation: 0,
      pleuralEffusion: 0,
      pneumothorax: 80,
    },
  },
  {
    key: 'derrame',
    label: '🔵 Derrame Pleural',
    description: 'Acumulación de líquido en espacio pleural, compresión basal',
    params: {
      respiratoryRate: 18,
      tidalVolume: 380,
      lungCompliance: 60,
      airwayResistance: 20,
      consolidation: 0,
      pleuralEffusion: 70,
      pneumothorax: 0,
    },
  },
  {
    key: 'asma',
    label: '🟡 Asma Aguda',
    description: 'Broncoespasmo severo con alta resistencia y taquipnea',
    params: {
      respiratoryRate: 28,
      tidalVolume: 420,
      lungCompliance: 50,
      airwayResistance: 80,
      consolidation: 0,
      pleuralEffusion: 0,
      pneumothorax: 0,
    },
  },
];

// ── Sketch Factory ───────────────────────────────────────────

export const sketch: SketchFactory = (
  p: p5,
  paramsRef: React.MutableRefObject<ParamValues>,
) => {
  // ── Internal state ──
  interface Alveolus {
    x: number;
    y: number;
    baseRadius: number;
    side: 'left' | 'right';
  }

  interface GasParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    isO2: boolean;
    transformProgress: number;
    age: number;
  }

  let particles: GasParticle[] = [];
  let alveoli: Alveolus[] = [];

  function param<T>(key: string): T {
    return paramsRef.current[key] as T;
  }

  function getSeed(): number {
    return (paramsRef.current._seed as number) ?? 12345;
  }

  // ── Regenerate system ─────────────────────────────────

  function regenerateSystem(): void {
    p.randomSeed(getSeed());
    p.noiseSeed(getSeed());

    particles = [];
    alveoli = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: p.random(p.width),
        y: p.random(p.height * 0.2, p.height * 0.7),
        vx: p.random(-1, 1),
        vy: p.random(-0.5, 0.5),
        isO2: p.random() > 0.5,
        transformProgress: 0,
        age: 0,
      });
    }

    for (const side of ['left', 'right'] as const) {
      const baseLungX = side === 'left' ? p.width * 0.2 : p.width * 0.7;

      for (let i = 0; i < ALVEOLI_PER_LUNG; i++) {
        const angle = p.random(p.TWO_PI);
        const distance = p.random(5, 60);
        alveoli.push({
          x: baseLungX + p.cos(angle) * distance,
          y: p.height * 0.35 + p.sin(angle) * distance,
          baseRadius: p.random(6, 12),
          side,
        });
      }
    }
  }

  // ── Drawing functions ─────────────────────────────────

  function drawLungs(expansion: number): void {
    p.strokeWeight(2);
    p.stroke(200, 195, 180);
    p.fill(245, 240, 235, 100);

    const leftLungX = p.width * 0.2;
    const rightLungX = p.width * 0.7;
    const lungY = p.height * 0.3;
    const baseWidth = p.width * 0.15;
    const baseHeight = p.height * 0.35;

    const currentWidth = baseWidth * expansion;
    const currentHeight = baseHeight * expansion;

    p.ellipse(leftLungX, lungY + baseHeight * 0.15, currentWidth * 0.8, currentHeight * 1.1);
    p.ellipse(rightLungX, lungY + baseHeight * 0.15, currentWidth * 0.9, currentHeight * 1.1);

    // Chest outline
    p.strokeWeight(1);
    p.stroke(200, 195, 180, 150);
    p.noFill();
    p.rect(p.width * 0.05, p.height * 0.15, p.width * 0.9, p.height * 0.7, 10);
  }

  function drawAlveoli(expansion: number): void {
    p.noStroke();
    const consolidation = param<number>('consolidation');
    const pneumothorax = param<number>('pneumothorax');
    const pleuralEffusion = param<number>('pleuralEffusion');
    const consolidationFactor = p.constrain(consolidation / 100, 0, 1);

    for (const alveolus of alveoli) {
      let currentRadius = alveolus.baseRadius * expansion * (1 - consolidation / 100);

      if (pneumothorax > 30) {
        currentRadius *= 0.5;
      }

      if (pleuralEffusion > 0 && alveolus.y > p.height * 0.55) {
        currentRadius *= Math.max(0, 1 - pleuralEffusion / 100);
      }

      const r = p.lerp(180, 120, consolidationFactor);
      const g = p.lerp(175, 100, consolidationFactor);
      const b = p.lerp(170, 90, consolidationFactor);

      p.fill(r, g, b, 120);
      p.ellipse(alveolus.x, alveolus.y, currentRadius, currentRadius);

      p.stroke(200, 190, 180, 150);
      p.strokeWeight(1);
      p.noFill();
      p.ellipse(alveolus.x, alveolus.y, currentRadius, currentRadius);
    }
  }

  function updateAndDrawParticles(expansion: number, resistanceEffect: number): void {
    p.noStroke();
    const consolidation = param<number>('consolidation');

    for (const particle of particles) {
      particle.age++;

      const targetVx = (particle.isO2 ? 0.5 : -0.5) * resistanceEffect;
      particle.vx += (targetVx - particle.vx) * 0.05;
      particle.vy += p.sin(particle.age * 0.02) * 0.1 * resistanceEffect;

      particle.x += particle.vx;
      particle.y += particle.vy;

      // Gas exchange in left lung zone
      if (
        particle.x > p.width * 0.15 &&
        particle.x < p.width * 0.45 &&
        particle.y > p.height * 0.15 &&
        particle.y < p.height * 0.65
      ) {
        particle.transformProgress = Math.min(
          1,
          particle.transformProgress + 0.02 * (1 - consolidation / 100),
        );
      } else {
        particle.transformProgress = Math.max(0, particle.transformProgress - 0.01);
      }

      // Boundary wrapping
      if (particle.y < p.height * 0.15) {
        particle.isO2 = false;
        particle.y = p.height * 0.15;
        particle.vy = 0;
      }
      if (particle.y > p.height * 0.65) {
        particle.isO2 = true;
        particle.y = p.height * 0.65;
        particle.vy = 0;
      }
      if (particle.x < 0) particle.x = p.width;
      if (particle.x > p.width) particle.x = 0;

      // Draw
      let r: number, g: number, b: number;
      if (particle.isO2 || particle.transformProgress > 0.5) {
        r = p.lerp(200, 255, particle.transformProgress);
        g = p.lerp(100, 100, particle.transformProgress);
        b = p.lerp(100, 120, particle.transformProgress);
      } else {
        r = p.lerp(100, 200, particle.transformProgress);
        g = p.lerp(150, 100, particle.transformProgress);
        b = p.lerp(200, 120, particle.transformProgress);
      }

      p.fill(r, g, b, 150);
      p.ellipse(particle.x, particle.y, 4, 4);
    }
  }

  function drawConsolidation(): void {
    const consolidation = param<number>('consolidation');
    p.fill(150, 100, 80, consolidation * 1.5);
    p.noStroke();
    p.ellipse(p.width * 0.2, p.height * 0.35, p.width * 0.1, p.height * 0.25);
  }

  function drawPleuraEffusion(): void {
    const pleuralEffusion = param<number>('pleuralEffusion');
    p.fill(100, 150, 200, pleuralEffusion * 0.8);
    p.noStroke();
    const fluidHeight = (pleuralEffusion / 100) * p.height * 0.35;
    const y = p.height * 0.55 + (p.height * 0.35 - fluidHeight);
    p.rect(0, y, p.width, fluidHeight);
  }

  function drawPneumothorax(): void {
    const pneumothorax = param<number>('pneumothorax');
    const rightLungX = p.width * 0.7;
    const baseWidth = p.width * 0.15;
    const baseHeight = p.height * 0.35;
    const collapseAmount = (pneumothorax / 100) * 0.7;

    p.fill(200, 200, 200, pneumothorax * 0.5);
    p.noStroke();
    p.ellipse(
      rightLungX,
      p.height * 0.35 + baseHeight * 0.15,
      baseWidth * 0.9 * (1 - collapseAmount),
      baseHeight * 1.1 * (1 - collapseAmount),
    );

    // Air dots in pleural space
    const dotSR = Math.floor(pneumothorax / 10);
    for (let i = 0; i < dotSR; i++) {
      const dotX = rightLungX + p.random(-baseWidth * 0.5, baseWidth * 0.5);
      const dotY = p.height * 0.35 + p.random(-baseHeight * 0.5, baseHeight * 0.5);
      p.fill(220, 220, 220, 150);
      p.ellipse(dotX, dotY, 3, 3);
    }
  }

  function drawLabels(): void {
    p.fill(100, 95, 85);
    p.textSize(13);
    p.textAlign(p.CENTER);
    p.text('Pulmón Izquierdo', p.width * 0.2, p.height * 0.75);
    p.text('Pulmón Derecho', p.width * 0.7, p.height * 0.75);

    p.textSize(11);
    p.fill(150, 145, 140);
    const rr = param<number>('respiratoryRate');
    p.text('Respiración: ' + rr.toFixed(0) + ' rpm', p.width * 0.5, p.height * 0.92);
  }

  // ── SETUP ──────────────────────────────────────────────

  p.setup = function () {
    p.pixelDensity(1);
    regenerateSystem();
  };

  // ── DRAW ───────────────────────────────────────────────

  p.draw = function () {
    p.background(250, 249, 245);

    const respiratoryRate = param<number>('respiratoryRate');
    const lungCompliance = param<number>('lungCompliance');
    const airwayResistance = param<number>('airwayResistance');
    const consolidation = param<number>('consolidation');
    const pleuralEffusion = param<number>('pleuralEffusion');
    const pneumothorax = param<number>('pneumothorax');

    // Respiratory phase
    const respiratoryPhase =
      (p.frameCount * respiratoryRate / 60) % (2 * Math.PI);
    let lungExpansion = p.map(Math.cos(respiratoryPhase), -1, 1, 0.4, 1.0);
    const complianceAdjust = lungCompliance / 100;
    lungExpansion = 0.4 + (lungExpansion - 0.4) * complianceAdjust;

    const resistanceEffect = 1 - (airwayResistance / 100) * 0.5;

    drawLungs(lungExpansion);
    updateAndDrawParticles(lungExpansion, resistanceEffect);
    drawAlveoli(lungExpansion);

    // Pathology overlays
    if (consolidation > 0) drawConsolidation();
    if (pleuralEffusion > 0) drawPleuraEffusion();
    if (pneumothorax > 0) drawPneumothorax();

    drawLabels();
  };

  // ── WINDOW RESIZE ──────────────────────────────────────
  p.windowResized = function () {
    // Handled by P5Canvas wrapper via ResizeObserver
  };
};

// ── Module export ────────────────────────────────────────────

const displayName = 'Arquitectura del Aire';
const description =
  'Sistema Respiratorio — Intercambio gaseoso alveolar, ciclo respiratorio con compliance y resistencia, patologías: consolidación, derrame pleural, neumotórax.';

const respiratorioEngine: EngineModule = {
  sketch,
  paramSchema,
  presets,
  displayName,
  description,
};

export default respiratorioEngine;
