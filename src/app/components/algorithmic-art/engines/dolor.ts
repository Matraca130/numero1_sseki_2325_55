// ============================================================
// Axon — Algorithmic Art: Dolor · Campos de Percepción
//
// Ported from dolor_campos_percepcion.html to TypeScript
// engine using the ALICIA framework.
//
// Visualizes pain perception as concentric fields, wave
// interference, and neural discharge patterns based on the
// five Argente pain characters: Lancinante, Urente,
// Constrictivo, Cólico, Transfixiante.
//
// Params:
//   tipoDolor      — Somático / Visceral / Neuropático
//   caracter       — Argente classification (5 types)
//   intensidad     — EVA scale 0–10
//   irradiacion    — Radiation spread 0–100%
//   antiguedad     — Duration in days 0–365
//   alodinia       — Sensitization / allodynia 0–100%
//
// Presets: Cólico Renal, Migraña, Angina, Fibromialgia, Ciática L5
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

/** Seeded LCG random number generator (deterministic) */
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

/** Map EVA intensity to RGB color */
function getColorForIntensity(intensity: number): [number, number, number] {
  if (intensity < 1) return [200, 200, 200];
  if (intensity < 3) return [100, 150, 255];
  if (intensity < 6) return [255, 165, 0];
  if (intensity < 9) return [255, 50, 50];
  return [100, 0, 0];
}

/** Dark mode–aware background color */
function bgColor(dark: boolean): [number, number, number] {
  return dark ? [20, 20, 19] : [250, 248, 245];
}

/** Dark mode–aware nerve network color */
function nerveColor(dark: boolean): number {
  return dark ? 60 : 220;
}

// ── Param Schema ─────────────────────────────────────────────

export const paramSchema: ParamSchema = {
  tipoDolor: {
    type: 'select',
    label: 'Tipo de Dolor',
    options: [
      { value: 'somatic', label: 'Somático' },
      { value: 'visceral', label: 'Visceral' },
      { value: 'neuropathic', label: 'Neuropático' },
    ],
    default: 'somatic',
  },
  caracter: {
    type: 'select',
    label: 'Carácter (Argente)',
    options: [
      { value: 'lancinante', label: 'Lancinante (Agudo)' },
      { value: 'urente', label: 'Urente (Ardiente)' },
      { value: 'constrictivo', label: 'Constrictivo (Compresivo)' },
      { value: 'colico', label: 'Cólico (Pulsante)' },
      { value: 'transfixiante', label: 'Transfixiante (Penetrante)' },
    ],
    default: 'lancinante',
  },
  intensidad: {
    type: 'slider',
    label: 'Intensidad EVA',
    min: 0,
    max: 10,
    step: 0.5,
    default: 5,
    unit: '/10',
  },
  irradiacion: {
    type: 'slider',
    label: 'Irradiación',
    min: 0,
    max: 100,
    step: 5,
    default: 30,
    unit: '%',
  },
  antiguedad: {
    type: 'slider',
    label: 'Antigüedad',
    min: 0,
    max: 365,
    step: 1,
    default: 1,
    unit: ' días',
  },
  alodinia: {
    type: 'slider',
    label: 'Sensibilización / Alodinia',
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
    key: 'colico_renal',
    label: '🔴 Cólico Renal',
    description:
      'Dolor visceral cólico intenso con irradiación fosa lumbar → genitales',
    params: {
      tipoDolor: 'visceral',
      caracter: 'colico',
      intensidad: 8,
      irradiacion: 60,
      antiguedad: 1,
      alodinia: 0,
    },
  },
  {
    key: 'migrana',
    label: '🟠 Migraña con Aura',
    description:
      'Dolor neuropático lancinante hemicraneal con fotosensibilización',
    params: {
      tipoDolor: 'neuropathic',
      caracter: 'lancinante',
      intensidad: 7,
      irradiacion: 40,
      antiguedad: 2,
      alodinia: 20,
    },
  },
  {
    key: 'angina',
    label: '🔵 Angina Estable',
    description:
      'Dolor visceral constrictivo retroesternal con irradiación a brazo izquierdo',
    params: {
      tipoDolor: 'visceral',
      caracter: 'constrictivo',
      intensidad: 6,
      irradiacion: 70,
      antiguedad: 5,
      alodinia: 10,
    },
  },
  {
    key: 'fibromialgia',
    label: '🟡 Fibromialgia',
    description:
      'Dolor somático urente difuso con alta sensibilización central',
    params: {
      tipoDolor: 'somatic',
      caracter: 'urente',
      intensidad: 5,
      irradiacion: 80,
      antiguedad: 180,
      alodinia: 70,
    },
  },
  {
    key: 'ciatica',
    label: '🟣 Ciática L5',
    description:
      'Dolor neuropático lancinante con distribución radicular L5-S1',
    params: {
      tipoDolor: 'neuropathic',
      caracter: 'lancinante',
      intensidad: 6,
      irradiacion: 90,
      antiguedad: 14,
      alodinia: 15,
    },
  },
];

// ── Sketch Factory ───────────────────────────────────────────

export const sketch: SketchFactory = (
  p: p5,
  paramsRef: React.MutableRefObject<ParamValues>,
) => {
  // ── Internal state ──
  let painFocusX = 0;
  let painFocusY = 0;
  let noiseOffsetX = 0;
  let noiseOffsetY = 0;
  let time = 0;
  let sr: SeededRandom;

  // Helper to read a param value
  function param<T>(key: string): T {
    return paramsRef.current[key] as T;
  }

  function getSeed(): number {
    return (paramsRef.current._seed as number) ?? 1701;
  }

  function isDark(): boolean {
    return (paramsRef.current._darkMode as boolean) ?? false;
  }

  // ── SETUP ──────────────────────────────────────────────
  p.setup = function () {
    // Canvas is sized by P5Canvas wrapper; we just initialize state
    p.pixelDensity(1);

    sr = new SeededRandom(getSeed());
    p.noiseSeed(getSeed());

    const margin = 100;
    painFocusX = sr.range(margin, p.width - margin);
    painFocusY = sr.range(margin, p.height - margin);
  };

  // ── DRAW ───────────────────────────────────────────────
  p.draw = function () {
    const dark = isDark();
    const bg = bgColor(dark);
    p.background(bg[0], bg[1], bg[2]);

    time += 0.016; // ~60fps
    noiseOffsetX += 0.003;
    noiseOffsetY += 0.002;

    drawNerveNetwork(dark);

    const tipo = param<string>('tipoDolor');
    if (tipo === 'somatic') drawSomaticPain();
    else if (tipo === 'visceral') drawVisceralPain();
    else if (tipo === 'neuropathic') drawNeuropathicPain();

    drawIrradiationTrails();

    const alodinia = param<number>('alodinia');
    if (alodinia > 0) drawSensitizationSparks();

    drawPainFocus();

    // Chronicity overlay — faint desaturation for chronic pain
    const antiguedad = param<number>('antiguedad');
    if (antiguedad > 30) {
      const chronicity = Math.min((antiguedad - 30) / 335, 0.35);
      p.noStroke();
      p.fill(bg[0], bg[1], bg[2], chronicity * 255);
      p.rect(0, 0, p.width, p.height);
    }
  };

  // ── DRAWING FUNCTIONS ──────────────────────────────────

  function drawNerveNetwork(dark: boolean): void {
    const nc = nerveColor(dark);
    p.stroke(nc);
    p.strokeWeight(0.5);

    for (let x = 0; x < p.width; x += 40) {
      for (let y = 0; y < p.height; y += 40) {
        const n = p.noise(x * 0.005 + noiseOffsetX, y * 0.005 + noiseOffsetY);
        const angle = n * p.TWO_PI;
        const len = 10;
        const x2 = x + Math.cos(angle) * len;
        const y2 = y + Math.sin(angle) * len;
        p.line(x, y, x2, y2);
      }
    }
  }

  function drawSomaticPain(): void {
    const intensity = param<number>('intensidad');
    const caracter = param<string>('caracter');
    const numRings = 12;

    for (let i = 0; i < numRings; i++) {
      const progress = i / numRings;
      const maxRadius = p.width * 0.4;
      const radius = progress * maxRadius;
      const decay = Math.exp(-progress * 2);

      const color = getColorForIntensity(intensity);
      const opacity = decay * (0.3 + (intensity / 10) * 0.7);

      // Character modulation (Argente)
      let radiusMod = 1;
      if (caracter === 'lancinante') {
        radiusMod = 1 + 0.3 * Math.sin(i * 5 + time * 3);
      } else if (caracter === 'urente') {
        radiusMod = 1 + 0.15 * p.noise(i * 0.5 + noiseOffsetX);
      } else if (caracter === 'constrictivo') {
        radiusMod = 1 + 0.2 * Math.sin(time * 1.5) * (1 - progress);
      } else if (caracter === 'colico') {
        const pulse = Math.abs(Math.sin((time * Math.PI) / 3));
        radiusMod = 1 + 0.3 * pulse;
      } else if (caracter === 'transfixiante') {
        // Penetrating: sharp spike outward along one axis
        radiusMod =
          1 +
          0.4 * Math.max(0, Math.sin(i * 3 + time * 2)) * (1 - progress);
      }

      p.noFill();
      p.stroke(color[0], color[1], color[2], opacity * 255);
      p.strokeWeight(2);
      p.ellipse(painFocusX, painFocusY, radius * 2 * radiusMod);
    }
  }

  function drawVisceralPain(): void {
    const intensity = param<number>('intensidad');
    const numWaves = 4;

    // Reinitialize seeded random for deterministic wave offsets each frame
    const waveSR = new SeededRandom(getSeed());

    for (let w = 0; w < numWaves; w++) {
      const offsetX = waveSR.range(-100, 100) + painFocusX;
      const offsetY = waveSR.range(-100, 100) + painFocusY;
      const freq = 0.01 + w * 0.005;
      const phaseShift = w * Math.PI / 2;

      for (let x = 0; x < p.width; x += 8) {
        for (let y = 0; y < p.height; y += 8) {
          const dx = x - offsetX;
          const dy = y - offsetY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const waveValue = Math.sin(dist * freq - time + phaseShift);
          const amplitude = 1 - Math.min(dist / (p.width * 0.3), 1);
          const alpha = Math.max(0, waveValue * amplitude);

          if (alpha > 0.01) {
            const color = getColorForIntensity(intensity);
            p.fill(color[0], color[1], color[2], alpha * intensity * 2);
            p.noStroke();
            p.ellipse(x, y, 4, 4);
          }
        }
      }
    }
  }

  function drawNeuropathicPain(): void {
    const intensity = param<number>('intensidad');
    const color = getColorForIntensity(intensity);

    // Deterministic nerve lines from focus
    const lineSR = new SeededRandom(getSeed() + 7);
    const numLines = 2 + lineSR.int(0, 1);

    for (let line = 0; line < numLines; line++) {
      const angle =
        (line / numLines) * p.TWO_PI + lineSR.range(-0.3, 0.3);
      const maxLen = Math.max(p.width, p.height);

      p.stroke(color[0], color[1], color[2], 0.6 * 255);
      p.strokeWeight(3);

      const steps = 100;
      for (let step = 0; step < steps; step++) {
        const progress = step / steps;
        const distance = progress * maxLen;

        const x = painFocusX + Math.cos(angle) * distance;
        const y = painFocusY + Math.sin(angle) * distance;

        const n = p.noise(x * 0.01, y * 0.01, time * 0.5);
        const jitter = (n - 0.5) * 10;

        p.point(x + jitter, y);
      }

      // Bright edge discharges
      const dischargeSR = new SeededRandom(getSeed() + line * 100);
      const dischargeCount = 20 + dischargeSR.int(0, 20);
      for (let i = 0; i < dischargeCount; i++) {
        const dprog = dischargeSR.next();
        const distance = dprog * maxLen;
        const x = painFocusX + Math.cos(angle) * distance;
        const y = painFocusY + Math.sin(angle) * distance;

        p.fill(255, 100, 100, 0.8 * 255);
        p.noStroke();
        p.ellipse(x, y, 4, 4);
      }
    }
  }

  function drawIrradiationTrails(): void {
    const irrad = param<number>('irradiacion') / 100;
    if (irrad < 0.01) return;

    const maxRadius = ((p.width + p.height) / 4) * irrad;
    const numRays = 8;

    p.noStroke();
    for (let i = 0; i < numRays; i++) {
      const angle = (i / numRays) * p.TWO_PI;
      const steps = 50;

      for (let step = 0; step < steps; step++) {
        const progress = step / steps;
        const distance = progress * maxRadius;

        const x = painFocusX + Math.cos(angle) * distance;
        const y = painFocusY + Math.sin(angle) * distance;

        const opacity = (1 - progress) * irrad;
        const color = getColorForIntensity(param<number>('intensidad'));

        p.fill(color[0], color[1], color[2], opacity * 80);
        p.ellipse(x, y, 15 - step * 0.1, 15 - step * 0.1);
      }
    }
  }

  function drawSensitizationSparks(): void {
    const alodinia = param<number>('alodinia') / 100;
    const numSparks = Math.floor(20 + alodinia * 80);

    // Deterministic spark positions per frame using seed + frame offset
    const sparkSR = new SeededRandom(getSeed() + Math.floor(time * 2));

    p.noStroke();
    for (let i = 0; i < numSparks; i++) {
      const x = sparkSR.range(0, p.width);
      const y = sparkSR.range(0, p.height);

      const pulse = Math.abs(Math.sin(time * 4 + i));
      const brightness = pulse * alodinia;

      p.fill(255, 200, 100, brightness * 255);
      p.ellipse(x, y, 3 + pulse * 3);
    }
  }

  function drawPainFocus(): void {
    const intensity = param<number>('intensidad');
    const color = getColorForIntensity(intensity);

    // Central marker
    p.fill(color[0], color[1], color[2], 0.9 * 255);
    p.noStroke();
    p.ellipse(painFocusX, painFocusY, 12, 12);

    // Pulsing halo
    p.noFill();
    p.stroke(color[0], color[1], color[2], 0.3 * 255);
    p.strokeWeight(2);
    const haloSize = 20 + 5 * Math.sin(time * 2);
    p.ellipse(painFocusX, painFocusY, haloSize, haloSize);
  }

  // ── TOUCH EVENTS ───────────────────────────────────────
  p.touchStarted = function () {
    if (p.touches.length > 0) {
      const touch = p.touches[0] as p5.Vector;
      painFocusX = touch.x;
      painFocusY = touch.y;
    } else {
      painFocusX = p.mouseX;
      painFocusY = p.mouseY;
    }
    return false; // prevent default
  };

  p.mousePressed = function () {
    // Only respond if click is inside canvas
    if (
      p.mouseX >= 0 &&
      p.mouseX <= p.width &&
      p.mouseY >= 0 &&
      p.mouseY <= p.height
    ) {
      painFocusX = p.mouseX;
      painFocusY = p.mouseY;
    }
  };

  // ── WINDOW RESIZE ──────────────────────────────────────
  p.windowResized = function () {
    // Handled by P5Canvas wrapper via ResizeObserver
  };
};

// ── Module export ────────────────────────────────────────────

const displayName = 'Campos de Percepción';
const description =
  'Semiología del Dolor — Framework ALICIA: visualización de los 5 caracteres Argente con campos de percepción, irradiación y sensibilización central.';

const dolorEngine: EngineModule = {
  sketch,
  paramSchema,
  presets,
  displayName,
  description,
};

export default dolorEngine;
