// ============================================================
// Axon — Algorithmic Art: Digestivo · El Tubo Vivo
//
// Ported from digestivo_tubo_vivo.html to TypeScript engine
// using the ALICIA framework.
//
// Visualizes the GI tract as a continuous Catmull-Rom tube
// with peristaltic waves, food particle transit, gland
// secretion (bile/pancreatic), absorption sprites, and a
// colonic microbiome ecosystem. Pathology overlays for
// ERGE, Úlcera, Oclusión, SII, Colitis.
//
// Params:
//   peristaticSpeed        — Peristaltic wave speed 0–3
//   phGastrico             — Gastric pH 1–7
//   secrecionBiliar        — Biliary secretion 0–100%
//   secrecionPancreatica   — Pancreatic secretion 0–100%
//   absorcionIntestinal    — Intestinal absorption 0–100%
//   motilidadColonica      — Colonic motility 0–100%
//   microbiomaDiversidad   — Microbiome diversity 0–100%
//
// Presets: Normal, ERGE, Úlcera Gástrica, Oclusión Intestinal,
//          S. Intestino Irritable, Colitis
// ============================================================

import type p5 from 'p5';
import type {
  EngineModule,
  ParamSchema,
  PresetDefinition,
  SketchFactory,
  ParamValues,
} from '../types';

// ── Anatomical path — 40 control points on 900×700 canvas ──

interface Point {
  x: number;
  y: number;
}

const RAW_PATH: Point[] = [
  { x: 45, y: 352 },
  { x: 88, y: 350 },
  { x: 118, y: 344 },
  { x: 140, y: 354 },
  { x: 158, y: 370 },
  { x: 172, y: 388 },
  { x: 198, y: 378 },
  { x: 234, y: 362 },
  { x: 256, y: 380 },
  { x: 266, y: 410 },
  { x: 276, y: 436 },
  { x: 298, y: 418 },
  { x: 320, y: 394 },
  { x: 340, y: 366 },
  { x: 346, y: 350 },
  { x: 352, y: 372 },
  { x: 370, y: 360 },
  { x: 402, y: 340 },
  { x: 432, y: 360 },
  { x: 462, y: 340 },
  { x: 492, y: 357 },
  { x: 522, y: 340 },
  { x: 552, y: 357 },
  { x: 578, y: 374 },
  { x: 602, y: 394 },
  { x: 624, y: 418 },
  { x: 646, y: 440 },
  { x: 670, y: 416 },
  { x: 686, y: 358 },
  { x: 698, y: 298 },
  { x: 716, y: 270 },
  { x: 754, y: 260 },
  { x: 794, y: 264 },
  { x: 826, y: 274 },
  { x: 840, y: 318 },
  { x: 846, y: 378 },
  { x: 838, y: 438 },
  { x: 820, y: 498 },
  { x: 844, y: 552 },
  { x: 858, y: 622 },
];

// ── Zone definitions ────────────────────────────────────────

interface Zone {
  name: string;
  start: number;
  end: number;
  baseRadius: number;
  speedFactor: number;
}

const ZONES: Zone[] = [
  { name: 'Boca', start: 0.0, end: 0.07, baseRadius: 9, speedFactor: 2.5 },
  { name: 'Esófago', start: 0.07, end: 0.2, baseRadius: 8, speedFactor: 4.0 },
  { name: 'Estómago', start: 0.2, end: 0.35, baseRadius: 26, speedFactor: 0.25 },
  { name: 'Duodeno', start: 0.35, end: 0.44, baseRadius: 11, speedFactor: 1.8 },
  { name: 'Yeyuno', start: 0.44, end: 0.57, baseRadius: 12, speedFactor: 1.2 },
  { name: 'Íleon', start: 0.57, end: 0.7, baseRadius: 11, speedFactor: 0.9 },
  { name: 'Colon', start: 0.7, end: 0.99, baseRadius: 19, speedFactor: 0.4 },
  { name: 'Recto', start: 0.99, end: 1.01, baseRadius: 14, speedFactor: 1.0 },
];

// ── Gland definitions ───────────────────────────────────────

interface GlandDef {
  id: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: [number, number, number];
  label: string;
  injectAt: number;
  paramKey: string;
  pColor: [number, number, number];
}

const GLAND_DEFS: GlandDef[] = [
  {
    id: 'liver',
    cx: 248, cy: 224, rx: 40, ry: 27,
    color: [138, 42, 42], label: 'Hígado',
    injectAt: 0.358, paramKey: 'secrecionBiliar',
    pColor: [175, 55, 35],
  },
  {
    id: 'gallbladder',
    cx: 298, cy: 248, rx: 20, ry: 14,
    color: [72, 128, 55], label: 'Vesícula',
    injectAt: 0.361, paramKey: 'secrecionBiliar',
    pColor: [95, 155, 50],
  },
  {
    id: 'pancreas',
    cx: 336, cy: 484, rx: 30, ry: 19,
    color: [196, 176, 72], label: 'Páncreas',
    injectAt: 0.364, paramKey: 'secrecionPancreatica',
    pColor: [218, 198, 78],
  },
];

const MAX_FOOD = 680;
const MAX_MICROBE = 110;
const OCCLUSION_POS = 0.52;

// ── Param Schema ─────────────────────────────────────────────

export const paramSchema: ParamSchema = {
  peristaticSpeed: {
    type: 'slider',
    label: 'Velocidad Peristáltica',
    min: 0,
    max: 3,
    step: 0.1,
    default: 1.0,
  },
  phGastrico: {
    type: 'slider',
    label: 'pH Gástrico',
    min: 1,
    max: 7,
    step: 0.5,
    default: 2.0,
  },
  secrecionBiliar: {
    type: 'slider',
    label: 'Secreción Biliar',
    min: 0,
    max: 100,
    step: 5,
    default: 60,
    unit: '%',
  },
  secrecionPancreatica: {
    type: 'slider',
    label: 'Secreción Pancreática',
    min: 0,
    max: 100,
    step: 5,
    default: 60,
    unit: '%',
  },
  absorcionIntestinal: {
    type: 'slider',
    label: 'Absorción Intestinal',
    min: 0,
    max: 100,
    step: 5,
    default: 80,
    unit: '%',
  },
  motilidadColonica: {
    type: 'slider',
    label: 'Motilidad Colónica',
    min: 0,
    max: 100,
    step: 5,
    default: 50,
    unit: '%',
  },
  microbiomaDiversidad: {
    type: 'slider',
    label: 'Diversidad Microbioma',
    min: 0,
    max: 100,
    step: 5,
    default: 70,
    unit: '%',
  },
};

// ── Presets ───────────────────────────────────────────────────

export const presets: PresetDefinition[] = [
  {
    key: 'normal',
    label: '🟢 Normal',
    description: 'Fisiología digestiva normal con tránsito y absorción estándar',
    params: {
      peristaticSpeed: 1.0,
      phGastrico: 2.0,
      secrecionBiliar: 60,
      secrecionPancreatica: 60,
      absorcionIntestinal: 80,
      motilidadColonica: 50,
      microbiomaDiversidad: 70,
    },
  },
  {
    key: 'erge',
    label: '🔴 ERGE',
    description: 'Enfermedad por reflujo gastroesofágico: peristalsis reducida, pH alto',
    params: {
      peristaticSpeed: 0.3,
      phGastrico: 5.0,
      secrecionBiliar: 40,
      secrecionPancreatica: 40,
      absorcionIntestinal: 75,
      motilidadColonica: 50,
      microbiomaDiversidad: 60,
    },
  },
  {
    key: 'ulcera',
    label: '🟠 Úlcera Gástrica',
    description: 'Úlcera antral con pH bajo e hipersecreción ácida',
    params: {
      peristaticSpeed: 0.8,
      phGastrico: 1.0,
      secrecionBiliar: 30,
      secrecionPancreatica: 35,
      absorcionIntestinal: 70,
      motilidadColonica: 45,
      microbiomaDiversidad: 55,
    },
  },
  {
    key: 'oclusion',
    label: '⬛ Oclusión Intestinal',
    description: 'Obstrucción mecánica a nivel de yeyuno medio con íleo',
    params: {
      peristaticSpeed: 0.0,
      phGastrico: 3.0,
      secrecionBiliar: 20,
      secrecionPancreatica: 20,
      absorcionIntestinal: 10,
      motilidadColonica: 10,
      microbiomaDiversidad: 40,
    },
  },
  {
    key: 'sii',
    label: '🟡 S. Intestino Irritable',
    description: 'Hipermotilidad con disbiosis y absorción reducida',
    params: {
      peristaticSpeed: 1.5,
      phGastrico: 2.5,
      secrecionBiliar: 55,
      secrecionPancreatica: 55,
      absorcionIntestinal: 60,
      motilidadColonica: 90,
      microbiomaDiversidad: 30,
    },
  },
  {
    key: 'colitis',
    label: '🟣 Colitis',
    description: 'Inflamación colónica con disbiosis severa y malabsorción',
    params: {
      peristaticSpeed: 1.2,
      phGastrico: 2.0,
      secrecionBiliar: 50,
      secrecionPancreatica: 50,
      absorcionIntestinal: 40,
      motilidadColonica: 80,
      microbiomaDiversidad: 20,
    },
  },
];

// ── Path math — Catmull-Rom spline ──────────────────────────

function crPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

function pathPos(progress: number): Point {
  const pr = Math.max(0, Math.min(1, progress));
  const n = RAW_PATH.length - 1;
  const seg = pr * n;
  const i = Math.min(Math.floor(seg), n - 1);
  const t = seg - i;
  return crPoint(
    RAW_PATH[Math.max(0, i - 1)],
    RAW_PATH[i],
    RAW_PATH[Math.min(n, i + 1)],
    RAW_PATH[Math.min(n, i + 2)],
    t,
  );
}

function pathTangent(progress: number): Point {
  const eps = 0.002;
  const a = pathPos(Math.max(0, progress - eps));
  const b = pathPos(Math.min(1, progress + eps));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.0001) return { x: 1, y: 0 };
  return { x: dx / len, y: dy / len };
}

function pathNormal(progress: number): Point {
  const t = pathTangent(progress);
  return { x: -t.y, y: t.x };
}

function getZoneAt(progress: number): Zone {
  for (const z of ZONES) {
    if (progress >= z.start && progress < z.end) return z;
  }
  return ZONES[ZONES.length - 1];
}

function getZoneRadius(progress: number): number {
  return getZoneAt(progress).baseRadius;
}

// ── Sketch Factory ───────────────────────────────────────────

export const sketch: SketchFactory = (
  p: p5,
  paramsRef: React.MutableRefObject<ParamValues>,
) => {
  // ── Internal state ──
  let time = 0;
  let currentPresetKey = 'normal';

  interface FoodParticle {
    progress: number;
    latOff: number;
    type: number;
    sz: number;
    alpha: number;
    noiseOff: number;
    absorbed: boolean;
    absorbT: number;
  }

  interface GlandParticle {
    sx: number;
    sy: number;
    tx: number;
    ty: number;
    mx: number;
    my: number;
    t: number;
    spd: number;
    sz: number;
    r: number;
    g: number;
    b: number;
    alive: boolean;
  }

  interface MicrobeAgent {
    progress: number;
    latOff: number;
    beneficial: boolean;
    sz: number;
    alpha: number;
    noiseOff: number;
    spd: number;
  }

  interface AbsorbSprite {
    x: number;
    y: number;
    dx: number;
    dy: number;
    alpha: number;
    type: number;
  }

  let foodParticles: FoodParticle[] = [];
  let glandParticles: GlandParticle[] = [];
  let microbeAgents: MicrobeAgent[] = [];
  let absorbSprites: AbsorbSprite[] = [];

  // Helper to read a param value
  function param<T>(key: string): T {
    return paramsRef.current[key] as T;
  }

  function getSeed(): number {
    return (paramsRef.current._seed as number) ?? 42;
  }

  // ── Peristaltic wave ──────────────────────────────────

  function peristalticWave(progress: number, t: number): number {
    const spd = param<number>('peristaticSpeed');
    if (spd < 0.05) return 0;
    const z = getZoneAt(progress);
    if (z.name === 'Estómago') {
      return Math.sin(progress * 22 - t * 1.6) * 5.5 +
        Math.sin(progress * 38 - t * 2.5) * 2.5;
    } else if (z.name === 'Colon') {
      const colFactor = param<number>('motilidadColonica') / 50;
      return Math.sin(progress * 28 - t * 0.6 * colFactor) * 4.5;
    } else {
      return Math.sin(progress * 48 - t * spd * 3.2) * 2.8 +
        Math.sin(progress * 22 - t * spd * 1.5) * 1.5;
    }
  }

  // ── Zone speed ────────────────────────────────────────

  function getZoneSpeed(progress: number): number {
    const z = getZoneAt(progress);
    if (z.name === 'Colon') return z.speedFactor * (param<number>('motilidadColonica') / 50);
    return z.speedFactor;
  }

  // ── Particle color ────────────────────────────────────

  function particleColorAt(progress: number, type: number): [number, number, number] {
    let r: number, g: number, b: number;
    if (progress < 0.08) {
      r = 255; g = 235; b = 170;
    } else if (progress < 0.2) {
      const t = (progress - 0.08) / 0.12;
      r = 255 - t * 30; g = 235 - t * 60; b = 170 - t * 40;
    } else if (progress < 0.35) {
      const t = (progress - 0.2) / 0.15;
      const acidity = 1 - (param<number>('phGastrico') - 1.0) / 6.0;
      r = 230 - t * 25 + acidity * 15;
      g = 180 - t * 110;
      b = 130 - t * 100;
    } else if (progress < 0.44) {
      const t = (progress - 0.35) / 0.09;
      const bileInfluence = param<number>('secrecionBiliar') / 100;
      r = 210 - t * 15;
      g = 120 + t * 20 * bileInfluence;
      b = 50 + t * 20;
    } else if (progress < 0.7) {
      const t = (progress - 0.44) / 0.26;
      r = 195 - t * 55; g = 140 - t * 45; b = 70 - t * 30;
    } else {
      const t = Math.min(1, (progress - 0.7) / 0.29);
      r = 140 - t * 65; g = 95 - t * 50; b = 40 - t * 20;
    }
    if (type === 1) { g *= 0.85; }
    if (type === 2) { r = Math.min(255, r * 1.04); g *= 1.1; b *= 0.78; }
    if (type === 3) { r *= 0.88; g *= 0.96; b *= 0.85; }
    return [
      Math.max(0, Math.min(255, r)),
      Math.max(0, Math.min(255, g)),
      Math.max(0, Math.min(255, b)),
    ];
  }

  // ── Detect current preset key ─────────────────────────

  function detectPresetKey(): string {
    for (const preset of presets) {
      let match = true;
      for (const [k, v] of Object.entries(preset.params)) {
        if (paramsRef.current[k] !== v) { match = false; break; }
      }
      if (match) return preset.key;
    }
    return '';
  }

  // ── Initialize system ─────────────────────────────────

  function initializeSystem(): void {
    p.randomSeed(getSeed());
    p.noiseSeed(getSeed());

    foodParticles = [];
    glandParticles = [];
    absorbSprites = [];

    for (let i = 0; i < MAX_FOOD; i++) {
      foodParticles.push({
        progress: p.random(0, 1.0),
        latOff: p.random(-0.72, 0.72),
        type: Math.floor(p.random(4)),
        sz: p.random(2.5, 5.5),
        alpha: p.random(110, 215),
        noiseOff: p.random(5000),
        absorbed: false,
        absorbT: 0,
      });
    }

    rebuildMicrobiome();
  }

  function rebuildMicrobiome(): void {
    p.randomSeed(getSeed() + 7);
    const div = param<number>('microbiomaDiversidad') / 100;
    microbeAgents = [];
    for (let i = 0; i < MAX_MICROBE; i++) {
      microbeAgents.push({
        progress: p.random(0.72, 0.98),
        latOff: p.random(-0.65, 0.65),
        beneficial: p.random() < div,
        sz: p.random(1.8, 3.6),
        alpha: p.random(95, 175),
        noiseOff: p.random(3000),
        spd: p.random(0.00008, 0.0004),
      });
    }
  }

  // ── Food particle update ──────────────────────────────

  function updateFoodParticle(fp: FoodParticle): void {
    if (fp.absorbed) {
      fp.absorbT++;
      if (fp.absorbT > 18) resetFoodParticle(fp);
      return;
    }

    const spFactor = getZoneSpeed(fp.progress);
    const baseAdv = 0.00052 * param<number>('peristaticSpeed');
    const waveAdv = peristalticWave(fp.progress, time) * 0.000095;

    // ERGE reflux
    if (currentPresetKey === 'erge' &&
        fp.progress > 0.09 && fp.progress < 0.24 && p.random() < 0.004) {
      fp.progress -= 0.0025 * param<number>('peristaticSpeed');
    } else {
      fp.progress += baseAdv * spFactor + waveAdv;
    }

    // Occlusion
    if (currentPresetKey === 'oclusion' &&
        fp.progress > OCCLUSION_POS - 0.008 && fp.progress < OCCLUSION_POS + 0.004) {
      fp.progress = OCCLUSION_POS - 0.008 + p.random(-0.006, 0.006);
    }

    // Lateral drift
    fp.latOff += (p.noise(fp.noiseOff + time * 0.018) - 0.5) * 0.038;
    fp.latOff = Math.max(-0.88, Math.min(0.88, fp.latOff));

    // Absorption in jejunum/ileum
    const z = getZoneAt(fp.progress);
    if ((z.name === 'Yeyuno' || z.name === 'Íleon') && fp.type !== 3) {
      const chance = (param<number>('absorcionIntestinal') / 100) * 0.0028;
      if (p.random() < chance) {
        fp.absorbed = true;
        fp.absorbT = 0;
        const pos = pathPos(fp.progress);
        const norm = pathNormal(fp.progress);
        const r = getZoneRadius(fp.progress);
        absorbSprites.push({
          x: pos.x + norm.x * r * 1.1,
          y: pos.y + norm.y * r * 1.1,
          dx: norm.x * 0.5,
          dy: norm.y * 0.5,
          alpha: 190,
          type: fp.type,
        });
        return;
      }
    }

    if (fp.progress > 1.06) resetFoodParticle(fp);
  }

  function resetFoodParticle(fp: FoodParticle): void {
    fp.progress = p.random(-0.1, 0.01);
    fp.latOff = p.random(-0.72, 0.72);
    fp.type = Math.floor(p.random(4));
    fp.sz = p.random(2.5, 5.5);
    fp.alpha = p.random(140, 215);
    fp.noiseOff = p.random(5000);
    fp.absorbed = false;
    fp.absorbT = 0;
  }

  function drawFoodParticle(fp: FoodParticle): void {
    if (fp.absorbed) return;
    const pos = pathPos(fp.progress);
    const norm = pathNormal(fp.progress);
    const r = getZoneRadius(fp.progress);
    const wave = peristalticWave(fp.progress, time);
    const effR = r + wave * 0.45;

    const px = pos.x + norm.x * fp.latOff * effR;
    const py = pos.y + norm.y * fp.latOff * effR;

    const col = particleColorAt(fp.progress, fp.type);
    p.fill(col[0], col[1], col[2], fp.alpha);
    p.noStroke();

    if (fp.type === 2) {
      p.ellipse(px, py, fp.sz * 1.45, fp.sz * 0.78);
    } else if (fp.type === 3) {
      const tang = pathTangent(fp.progress);
      p.push();
      p.translate(px, py);
      p.rotate(Math.atan2(tang.y, tang.x));
      p.ellipse(0, 0, fp.sz * 1.9, fp.sz * 0.65);
      p.pop();
    } else {
      p.ellipse(px, py, fp.sz, fp.sz);
    }
  }

  // ── Gland particle helpers ────────────────────────────

  function emitGlandParticles(): void {
    const hasDuodenal = foodParticles.some(
      (fp) => fp.progress > 0.3 && fp.progress < 0.43,
    );
    for (const g of GLAND_DEFS) {
      const rate =
        g.paramKey === 'secrecionBiliar'
          ? param<number>('secrecionBiliar') / 100
          : param<number>('secrecionPancreatica') / 100;
      if (hasDuodenal && p.random() < rate * 0.1) {
        const target = pathPos(g.injectAt);
        glandParticles.push({
          sx: g.cx,
          sy: g.cy,
          tx: target.x,
          ty: target.y,
          mx: (g.cx + target.x) / 2 + p.random(-12, 12),
          my: (g.cy + target.y) / 2 + p.random(-12, 12),
          t: 0,
          spd: p.random(0.018, 0.032),
          sz: p.random(1.8, 4.2),
          r: g.pColor[0],
          g: g.pColor[1],
          b: g.pColor[2],
          alive: true,
        });
      }
    }
  }

  function updateAndDrawGlandParticle(gp: GlandParticle): void {
    gp.t += gp.spd;
    if (gp.t >= 1.0) gp.alive = false;

    const it = 1 - gp.t;
    const x = it * it * gp.sx + 2 * it * gp.t * gp.mx + gp.t * gp.t * gp.tx;
    const y = it * it * gp.sy + 2 * it * gp.t * gp.my + gp.t * gp.t * gp.ty;
    const a = gp.t < 0.5 ? gp.t * 2 * 200 : (1 - gp.t) * 2 * 200;
    p.fill(gp.r, gp.g, gp.b, a);
    p.noStroke();
    p.ellipse(x, y, gp.sz, gp.sz);
  }

  // ── Microbe update/draw ───────────────────────────────

  function updateMicrobe(m: MicrobeAgent): void {
    m.latOff += (p.noise(m.noiseOff + time * 0.025) - 0.5) * 0.028;
    m.latOff = Math.max(-0.72, Math.min(0.72, m.latOff));
    const colF = param<number>('motilidadColonica') / 100;
    m.progress += m.spd * colF;
    if (m.progress > 0.985) m.progress = 0.725;
  }

  function drawMicrobe(m: MicrobeAgent): void {
    const pos = pathPos(m.progress);
    const norm = pathNormal(m.progress);
    const r = getZoneRadius(m.progress);
    const x = pos.x + norm.x * m.latOff * r * 0.82;
    const y = pos.y + norm.y * m.latOff * r * 0.82;
    if (m.beneficial) {
      p.fill(88, 152, 70, m.alpha);
    } else {
      p.fill(208, 95, 55, m.alpha);
    }
    p.noStroke();
    p.ellipse(x, y, m.sz, m.sz);
  }

  // ── Drawing helpers ───────────────────────────────────

  function drawStomachBackground(): void {
    const steps = 70;
    const su: Point[] = [];
    const sl: Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = 0.2 + 0.15 * i / steps;
      const pos = pathPos(t);
      const n = pathNormal(t);
      const r = getZoneRadius(t) + peristalticWave(t, time) * 0.4;
      su.push({ x: pos.x + n.x * r, y: pos.y + n.y * r });
      sl.push({ x: pos.x - n.x * r, y: pos.y - n.y * r });
    }
    const acid = 1 - (param<number>('phGastrico') - 1.0) / 6.0;
    const fr = Math.floor(205 - acid * 30);
    const fg = Math.floor(85 + acid * 90);
    const fb = Math.floor(80 + acid * 80);
    p.fill(fr, fg, fb, 32);
    p.noStroke();
    p.beginShape();
    for (const pt of su) p.vertex(pt.x, pt.y);
    for (let i = sl.length - 1; i >= 0; i--) p.vertex(sl[i].x, sl[i].y);
    p.endShape(p.CLOSE);
  }

  function drawTubeWalls(): void {
    const steps = 260;
    const up: Point[] = [];
    const lo: Point[] = [];
    const periSpeed = param<number>('peristaticSpeed');
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pos = pathPos(t);
      const n = pathNormal(t);
      const r = getZoneRadius(t) + peristalticWave(t, time) * periSpeed * 0.38;
      up.push({ x: pos.x + n.x * r, y: pos.y + n.y * r });
      lo.push({ x: pos.x - n.x * r, y: pos.y - n.y * r });
    }

    // Lumen fill
    p.fill(255, 248, 234, 48);
    p.noStroke();
    p.beginShape();
    for (const pt of up) p.vertex(pt.x, pt.y);
    for (let i = lo.length - 1; i >= 0; i--) p.vertex(lo[i].x, lo[i].y);
    p.endShape(p.CLOSE);

    // Outer walls
    p.stroke(168, 118, 88, 170);
    p.strokeWeight(2.4);
    p.noFill();
    p.beginShape();
    for (const pt of up) p.vertex(pt.x, pt.y);
    p.endShape();
    p.beginShape();
    for (const pt of lo) p.vertex(pt.x, pt.y);
    p.endShape();

    // Inner wall highlight
    p.stroke(225, 190, 160, 60);
    p.strokeWeight(1.0);
    p.noFill();
    p.beginShape();
    for (const pt of up) p.vertex(pt.x, pt.y + 1);
    p.endShape();
  }

  function drawGlands(): void {
    for (const g of GLAND_DEFS) {
      const active =
        g.paramKey === 'secrecionBiliar'
          ? param<number>('secrecionBiliar') > 5
          : param<number>('secrecionPancreatica') > 5;
      const a = active ? 210 : 90;

      p.fill(g.color[0], g.color[1], g.color[2], a);
      p.stroke(g.color[0] * 0.65, g.color[1] * 0.65, g.color[2] * 0.65, a);
      p.strokeWeight(1.4);
      p.ellipse(g.cx, g.cy, g.rx * 2, g.ry * 2);

      // Duct
      const tgt = pathPos(g.injectAt);
      p.stroke(g.color[0], g.color[1], g.color[2], a * 0.65);
      p.strokeWeight(1.4);
      p.noFill();
      const cx = (g.cx + tgt.x) / 2;
      const cy = (g.cy + tgt.y) / 2;
      p.beginShape();
      p.vertex(g.cx, g.cy);
      p.quadraticVertex(cx, cy, tgt.x, tgt.y);
      p.endShape();

      // Label
      p.noStroke();
      p.fill(g.color[0] * 0.55, g.color[1] * 0.55, g.color[2] * 0.55, 210);
      p.textSize(9);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(g.label, g.cx, g.cy + g.ry + 12);
    }
  }

  function drawAbsorbSprites(): void {
    for (const s of absorbSprites) {
      p.fill(215, 55, 55, s.alpha);
      p.noStroke();
      p.ellipse(s.x, s.y, 3.2, 3.2);
      s.x += s.dx;
      s.y += s.dy;
      s.alpha -= 7;
    }
    absorbSprites = absorbSprites.filter((s) => s.alpha > 0);
  }

  // ── Pathology overlays ────────────────────────────────

  function drawERGEOverlay(): void {
    const steps = 38;
    const su: Point[] = [];
    const sl: Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = 0.09 + 0.13 * i / steps;
      const pos = pathPos(t);
      const n = pathNormal(t);
      const r = getZoneRadius(t) + 1.5;
      su.push({ x: pos.x + n.x * r, y: pos.y + n.y * r });
      sl.push({ x: pos.x - n.x * r, y: pos.y - n.y * r });
    }
    const pulse = 0.5 + 0.5 * Math.sin(p.frameCount * 0.09);
    p.fill(215, 100, 65, 38 + pulse * 32);
    p.noStroke();
    p.beginShape();
    for (const pt of su) p.vertex(pt.x, pt.y);
    for (let i = sl.length - 1; i >= 0; i--) p.vertex(sl[i].x, sl[i].y);
    p.endShape(p.CLOSE);

    const mp = pathPos(0.145);
    p.fill(175, 55, 25, 220);
    p.noStroke();
    p.textSize(8.5);
    p.textAlign(p.CENTER);
    p.text('▲ ERGE: reflujo ácido', mp.x + 2, mp.y - getZoneRadius(0.145) - 12);
  }

  function drawOcclusionOverlay(): void {
    const pos = pathPos(OCCLUSION_POS);
    const tang = pathTangent(OCCLUSION_POS);
    const r = getZoneRadius(OCCLUSION_POS);
    const ang = Math.atan2(tang.y, tang.x);
    const norm = pathNormal(OCCLUSION_POS);

    p.push();
    p.translate(pos.x, pos.y);
    p.rotate(ang);
    p.fill(38, 38, 38, 210);
    p.noStroke();
    p.rect(-5, -(r + 4), 10, (r + 4) * 2, 3);
    p.pop();

    p.fill(220, 50, 50, 230);
    p.noStroke();
    p.textSize(8.5);
    p.textAlign(p.CENTER);
    p.text('⬛ OCLUSIÓN', pos.x + norm.x * (r + 20), pos.y + norm.y * (r + 20) - 8);
  }

  function drawUlcerOverlay(): void {
    const uProg = 0.275;
    const pos = pathPos(uProg);
    const n = pathNormal(uProg);
    const r = getZoneRadius(uProg);
    const ux = pos.x + n.x * (r - 2);
    const uy = pos.y + n.y * (r - 2);

    const pulse = 0.5 + 0.5 * Math.sin(p.frameCount * 0.13);
    p.fill(170, 25, 25, 90 + pulse * 90);
    p.noStroke();
    p.ellipse(ux, uy, 11, 9);

    // Microhemorrhage droplets
    if (p.random() < 0.18) {
      absorbSprites.push({
        x: ux + p.random(-4, 4),
        y: uy + p.random(-4, 4),
        dx: p.random(-0.4, 0.4),
        dy: p.random(0.3, 0.8),
        alpha: p.random(140, 200),
        type: -1,
      });
    }

    p.fill(155, 30, 30, 200);
    p.noStroke();
    p.textSize(8.5);
    p.textAlign(p.CENTER);
    p.text('● Úlcera Antral', ux, uy - 14);
  }

  function drawStationLabels(): void {
    p.textSize(9);
    p.noStroke();
    const labels = [
      { label: 'Boca', t: 0.035, side: 1 },
      { label: 'Esófago', t: 0.13, side: -1 },
      { label: 'Estómago', t: 0.275, side: -1 },
      { label: 'Duodeno', t: 0.395, side: 1 },
      { label: 'Yeyuno', t: 0.505, side: -1 },
      { label: 'Íleon', t: 0.635, side: 1 },
      { label: 'Colon', t: 0.82, side: -1 },
    ];
    for (const lb of labels) {
      const pos = pathPos(lb.t);
      const n = pathNormal(lb.t);
      const r = getZoneRadius(lb.t) + 16;
      p.fill(105, 72, 50, 185);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(lb.label, pos.x + n.x * r * lb.side, pos.y + n.y * r * lb.side);
    }
  }

  function drawPhLabel(): void {
    const pos = pathPos(0.275);
    const n = pathNormal(0.275);
    const r = getZoneRadius(0.275);
    p.fill(165, 70, 50, 210);
    p.noStroke();
    p.textSize(9);
    p.textAlign(p.LEFT);
    p.text(
      'pH ' + param<number>('phGastrico').toFixed(1),
      pos.x + n.x * (r + 3),
      pos.y + n.y * (r + 3) - 14,
    );
  }

  function drawLegend(): void {
    const lx = 18;
    const ly = p.height - 30;
    p.textSize(8.5);
    p.noStroke();
    p.fill(88, 152, 70, 200);
    p.ellipse(lx, ly, 6, 6);
    p.fill(90, 75, 60, 180);
    p.textAlign(p.LEFT, p.CENTER);
    p.text('Microbiota beneficiosa', lx + 8, ly);

    p.fill(208, 95, 55, 200);
    p.ellipse(lx, ly + 14, 6, 6);
    p.fill(90, 75, 60, 180);
    p.text('Microbiota patogénica', lx + 8, ly + 14);

    p.fill(215, 55, 55, 200);
    p.ellipse(lx, ly + 28, 5, 5);
    p.fill(90, 75, 60, 180);
    p.text('Absorción portal', lx + 8, ly + 28);
  }

  // ── SETUP ──────────────────────────────────────────────

  p.setup = function () {
    p.pixelDensity(1);
    initializeSystem();
  };

  // ── DRAW ───────────────────────────────────────────────

  p.draw = function () {
    time = p.frameCount * 0.014;
    p.background(247, 243, 236);

    currentPresetKey = detectPresetKey();

    // 1. Stomach background
    drawStomachBackground();

    // 2. Tube walls
    drawTubeWalls();

    // 3. Gland anatomy
    drawGlands();

    // 4. Gland particles
    emitGlandParticles();
    for (const gp of glandParticles) updateAndDrawGlandParticle(gp);
    glandParticles = glandParticles.filter((gp) => gp.alive);

    // 5. Microbiome
    for (const m of microbeAgents) {
      updateMicrobe(m);
      drawMicrobe(m);
    }

    // 6. Food particles
    for (const fp of foodParticles) {
      updateFoodParticle(fp);
      drawFoodParticle(fp);
    }

    // 7. Absorption sprites
    drawAbsorbSprites();

    // 8. Pathology overlays
    if (currentPresetKey === 'erge') drawERGEOverlay();
    if (currentPresetKey === 'oclusion') drawOcclusionOverlay();
    if (currentPresetKey === 'ulcera') drawUlcerOverlay();

    // 9. Labels
    drawStationLabels();
    drawPhLabel();
    drawLegend();
  };

  // ── WINDOW RESIZE ──────────────────────────────────────
  p.windowResized = function () {
    // Handled by P5Canvas wrapper via ResizeObserver
  };
};

// ── Module export ────────────────────────────────────────────

const displayName = 'El Tubo Vivo';
const description =
  'Sistema Digestivo — Tubo GI continuo con peristalsis, secreción glandular, absorción intestinal y ecosistema de microbioma colónico.';

const digestivoEngine: EngineModule = {
  sketch,
  paramSchema,
  presets,
  displayName,
  description,
};

export default digestivoEngine;
