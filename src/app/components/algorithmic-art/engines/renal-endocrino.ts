// ============================================================
// Axon — Algorithmic Art: Renal-Endocrino · Filtros y Cascadas
//
// Ported from renal_endocrino_filtros_cascadas.html to TypeScript
// engine following the dolor.ts pattern.
//
// Dual-split canvas: LEFT nephron (glomerulus→proximal→LoH→
// distal→colector) with particle filtering; RIGHT endocrine
// cascade (hypothalamus→pituitary→thyroid/adrenal) with
// feedback loops and hormone bars.
//
// Params:
//   tfg           — Glomerular Filtration Rate 10–150 ml/min
//   reabsorcion   — Tubular Reabsorption 0–100%
//   osmolalidad   — Osmolality 250–350 mOsm/kg
//   adh           — Antidiuretic Hormone 0–100%
//   aldosterona   — Aldosterone 0–100%
//   tsh           — TSH 0–200%
//   cortisol      — Cortisol 0–200%
//
// Presets: Normal, FRA, Nefrótico, Hipertiroidismo, Addison, Cushing
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

/** Particle types for the renal-endocrine system */
type ParticleType =
  | 'water'
  | 'glucose'
  | 'sodium'
  | 'waste'
  | 'protein'
  | 'signal_crhacth'
  | 'signal_tsh'
  | 'signal_cortisol';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: ParticleType;
  life: number;
  age: number;
  maxAge: number;
}

/** Dark mode–aware background color */
function bgColor(dark: boolean): [number, number, number] {
  return dark ? [20, 20, 19] : [250, 249, 245];
}

// ── Param Schema ─────────────────────────────────────────────

export const paramSchema: ParamSchema = {
  tfg: {
    type: 'slider',
    label: 'TFG (ml/min)',
    min: 10,
    max: 150,
    step: 1,
    default: 100,
    unit: ' ml/min',
  },
  reabsorcion: {
    type: 'slider',
    label: 'Reabsorción Tubular',
    min: 0,
    max: 100,
    step: 1,
    default: 95,
    unit: '%',
  },
  osmolalidad: {
    type: 'slider',
    label: 'Osmolalidad',
    min: 250,
    max: 350,
    step: 1,
    default: 290,
    unit: ' mOsm/kg',
  },
  adh: {
    type: 'slider',
    label: 'ADH',
    min: 0,
    max: 100,
    step: 1,
    default: 50,
    unit: '%',
  },
  aldosterona: {
    type: 'slider',
    label: 'Aldosterona',
    min: 0,
    max: 100,
    step: 1,
    default: 50,
    unit: '%',
  },
  tsh: {
    type: 'slider',
    label: 'TSH',
    min: 0,
    max: 200,
    step: 1,
    default: 100,
    unit: '%',
  },
  cortisol: {
    type: 'slider',
    label: 'Cortisol',
    min: 0,
    max: 200,
    step: 1,
    default: 100,
    unit: '%',
  },
};

// ── Presets ───────────────────────────────────────────────────

export const presets: PresetDefinition[] = [
  {
    key: 'normal',
    label: '🟢 Normal',
    description: 'Homeostasis fisiológica — filtración y ejes endocrinos normales',
    params: { tfg: 100, reabsorcion: 95, osmolalidad: 290, adh: 50, aldosterona: 50, tsh: 100, cortisol: 100 },
  },
  {
    key: 'fra',
    label: '🔴 Falla Renal Aguda',
    description: 'TFG colapsada, reabsorción disminuida, hiperosmolalidad',
    params: { tfg: 20, reabsorcion: 40, osmolalidad: 320, adh: 80, aldosterona: 70, tsh: 100, cortisol: 100 },
  },
  {
    key: 'nefrotico',
    label: '🟠 Síndrome Nefrótico',
    description: 'Proteinuria masiva, TFG reducida, edema por hipoalbuminemia',
    params: { tfg: 60, reabsorcion: 50, osmolalidad: 310, adh: 70, aldosterona: 80, tsh: 100, cortisol: 100 },
  },
  {
    key: 'hipertiroidismo',
    label: '🟡 Hipertiroidismo',
    description: 'TSH suprimida, metabolismo acelerado, hipoosmolalidad',
    params: { tfg: 100, reabsorcion: 95, osmolalidad: 280, adh: 30, aldosterona: 50, tsh: 10, cortisol: 120 },
  },
  {
    key: 'addison',
    label: '🟣 Addison',
    description: 'Insuficiencia suprarrenal — cortisol y aldosterona bajos',
    params: { tfg: 90, reabsorcion: 70, osmolalidad: 310, adh: 70, aldosterona: 10, tsh: 100, cortisol: 20 },
  },
  {
    key: 'cushing',
    label: '🔵 Cushing',
    description: 'Hipercortisolismo — retención de sodio, alcalosis metabólica',
    params: { tfg: 100, reabsorcion: 95, osmolalidad: 270, adh: 40, aldosterona: 80, tsh: 100, cortisol: 180 },
  },
];

// ── Sketch Factory ───────────────────────────────────────────

export const sketch: SketchFactory = (
  p: p5,
  paramsRef: React.MutableRefObject<ParamValues>,
) => {
  // ── Internal state ──
  let nephronParticles: Particle[] = [];
  let endocrineParticles: Particle[] = [];
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

  function makeParticle(x: number, y: number, type: ParticleType, rng: SeededRandom): Particle {
    return {
      x, y,
      vx: 0, vy: 0,
      type,
      life: 1.0,
      age: 0,
      maxAge: 200 + rng.int(0, 200),
    };
  }

  function initializeSystem(): void {
    sr = new SeededRandom(getSeed());
    p.noiseSeed(getSeed());

    nephronParticles = [];
    endocrineParticles = [];

    const tfg = param<number>('tfg');
    const totalParticles = 800 + Math.floor(tfg * 3);

    // Nephron particles (left side)
    const nephronCount = Math.floor(totalParticles * 0.55);
    for (let i = 0; i < nephronCount; i++) {
      const types: ParticleType[] = ['water', 'glucose', 'sodium', 'waste', 'protein'];
      const type = types[sr.int(0, types.length - 1)];
      nephronParticles.push(makeParticle(50 + sr.range(0, 150), 50 + sr.range(0, 600), type, sr));
    }

    // Endocrine particles (right side)
    const endoCount = totalParticles - nephronCount;
    for (let i = 0; i < endoCount; i++) {
      const types: ParticleType[] = ['signal_crhacth', 'signal_tsh', 'signal_cortisol'];
      const type = types[sr.int(0, types.length - 1)];
      endocrineParticles.push(makeParticle(500 + sr.range(0, 350), 80 + sr.range(0, 550), type, sr));
    }
  }

  function getParticleColor(type: ParticleType): [number, number, number, number] {
    switch (type) {
      case 'water': return [100, 180, 255, 200];
      case 'glucose': return [255, 200, 80, 200];
      case 'sodium': return [255, 255, 255, 220];
      case 'waste': return [230, 150, 80, 200];
      case 'protein': return [180, 100, 150, 180];
      case 'signal_crhacth': return [217, 119, 87, 220];
      case 'signal_tsh': return [106, 155, 204, 220];
      case 'signal_cortisol': return [120, 140, 93, 220];
    }
  }

  // ── SETUP ──────────────────────────────────────────────
  p.setup = function () {
    p.pixelDensity(1);
    initializeSystem();
  };

  // ── DRAW ───────────────────────────────────────────────
  p.draw = function () {
    const dark = isDark();
    const bg = bgColor(dark);
    p.background(bg[0], bg[1], bg[2]);

    const W = p.width;
    const H = p.height;
    const midX = W * 0.5;

    // Divider
    p.stroke(dark ? 60 : 220);
    p.strokeWeight(2);
    p.line(midX, 20, midX, H - 20);

    // LEFT: Nephron
    drawNephron(midX, H, dark);
    updateAndDrawParticles(nephronParticles, 'nephron', midX, H);

    // RIGHT: Endocrine cascade
    drawEndocrineCascade(midX, W, H, dark);
    updateAndDrawParticles(endocrineParticles, 'endocrine', midX, H);

    // Labels
    const txtColor = dark ? 230 : 20;
    p.fill(txtColor);
    p.textSize(14);
    p.textStyle(p.BOLD);
    p.textAlign(p.CENTER, p.TOP);
    p.text('NEFRÓN', midX * 0.5, 10);
    p.text('CASCADA ENDOCRINA', midX + (W - midX) * 0.5, 10);
    p.textStyle(p.NORMAL);
  };

  // ── NEPHRON ────────────────────────────────────────────
  function drawNephron(midX: number, H: number, dark: boolean): void {
    const scaleX = midX / 450;
    const scaleY = H / 700;

    // Glomerulus
    p.strokeWeight(2);
    p.stroke(106, 155, 204);
    p.fill(220, 240, 255, 80);
    p.ellipse(100 * scaleX, 100 * scaleY, 50 * scaleX, 50 * scaleY);
    p.fill(dark ? 220 : 20);
    p.noStroke();
    p.textSize(10);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('Glomérulo', 100 * scaleX, 100 * scaleY);

    // Tubule path
    p.noFill();
    p.strokeWeight(3);
    p.stroke(106, 155, 204);

    // Proximal tubule
    p.curve(125 * scaleX, 100 * scaleY, 200 * scaleX, 150 * scaleY, 200 * scaleX, 250 * scaleY, 200 * scaleX, 350 * scaleY);
    p.fill(dark ? 200 : 20);
    p.noStroke();
    p.textSize(9);
    p.text('Proximal', 220 * scaleX, 200 * scaleY);

    // Loop of Henle
    p.noFill();
    p.stroke(106, 155, 204);
    p.strokeWeight(3);
    p.curve(200 * scaleX, 350 * scaleY, 150 * scaleX, 400 * scaleY, 120 * scaleX, 500 * scaleY, 140 * scaleX, 600 * scaleY);
    p.fill(dark ? 200 : 20);
    p.noStroke();
    p.textSize(9);
    p.text('Asa Henle', 100 * scaleX, 500 * scaleY);

    // Distal tubule
    p.noFill();
    p.stroke(106, 155, 204);
    p.strokeWeight(3);
    p.curve(140 * scaleX, 600 * scaleY, 180 * scaleX, 620 * scaleY, 250 * scaleX, 630 * scaleY, 300 * scaleX, 620 * scaleY);
    p.fill(dark ? 200 : 20);
    p.noStroke();
    p.textSize(9);
    p.text('Distal', 260 * scaleX, 640 * scaleY);

    // Collecting duct
    p.noFill();
    p.stroke(106, 155, 204);
    p.strokeWeight(3);
    p.curve(300 * scaleX, 620 * scaleY, 320 * scaleX, 600 * scaleY, 320 * scaleX, 400 * scaleY, 320 * scaleX, 100 * scaleY);
    p.fill(dark ? 200 : 20);
    p.noStroke();
    p.textSize(9);
    p.text('Colector', 340 * scaleX, 350 * scaleY);

    // Peritubular capillaries
    p.noFill();
    p.strokeWeight(2);
    p.stroke(217, 119, 87, 100);
    const capSR = new SeededRandom(getSeed() + 99);
    for (let i = 150; i < 630; i += 80) {
      p.ellipse((280 + capSR.range(0, 20)) * scaleX, i * scaleY, 30 * scaleX, 15 * scaleY);
    }

    // Parameter indicators
    const tfg = param<number>('tfg');
    const reab = param<number>('reabsorcion');
    p.fill(217, 119, 87);
    p.noStroke();
    p.textSize(9);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`TFG: ${tfg} ml/min`, 20 * scaleX, 670 * scaleY);
    p.text(`Reabs: ${reab}%`, 20 * scaleX, 685 * scaleY);
  }

  // ── ENDOCRINE CASCADE ──────────────────────────────────
  function drawEndocrineCascade(midX: number, W: number, H: number, dark: boolean): void {
    const oX = midX; // offset for right half
    const halfW = W - midX;
    const scaleX = halfW / 450;
    const scaleY = H / 700;

    const boxW = 80 * scaleX;
    const boxH = 50 * scaleY;
    const txtColor = dark ? 220 : 20;

    // Hypothalamus
    p.fill(220, 100, 120, 150);
    p.stroke(217, 119, 87);
    p.strokeWeight(2);
    const hypoX = oX + 180 * scaleX;
    const hypoY = 60 * scaleY;
    p.rect(hypoX, hypoY, boxW, boxH, 5);
    p.fill(txtColor);
    p.noStroke();
    p.textSize(9);
    p.textStyle(p.BOLD);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('Hipotálamo', hypoX + boxW / 2, hypoY + boxH / 2);

    // Arrow
    p.stroke(217, 119, 87, 100);
    p.strokeWeight(2);
    const arrowX = hypoX + boxW / 2;
    p.line(arrowX, hypoY + boxH, arrowX, hypoY + boxH + 30 * scaleY);

    // Pituitary
    const pitY = hypoY + boxH + 30 * scaleY;
    p.fill(100, 150, 200, 150);
    p.stroke(106, 155, 204);
    p.strokeWeight(2);
    p.rect(hypoX, pitY, boxW, boxH, 5);
    p.fill(txtColor);
    p.noStroke();
    p.textSize(9);
    p.textStyle(p.BOLD);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('Hipófisis', hypoX + boxW / 2, pitY + boxH / 2);

    // Arrows to glands
    p.stroke(106, 155, 204, 100);
    p.strokeWeight(2);
    const thyX = oX + 40 * scaleX;
    const adrX = oX + 300 * scaleX;
    const glandY = pitY + boxH + 60 * scaleY;
    p.line(hypoX, pitY + boxH / 2, thyX + boxW / 2, glandY);
    p.line(hypoX + boxW, pitY + boxH / 2, adrX + boxW / 2, glandY);

    // Thyroid
    p.fill(150, 200, 120, 150);
    p.stroke(120, 140, 93);
    p.strokeWeight(2);
    p.rect(thyX, glandY, boxW, boxH, 5);
    p.fill(txtColor);
    p.noStroke();
    p.textSize(9);
    p.textStyle(p.BOLD);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('Tiroides', thyX + boxW / 2, glandY + boxH / 2);

    // Adrenal
    p.fill(200, 150, 100, 150);
    p.stroke(180, 120, 80);
    p.strokeWeight(2);
    p.rect(adrX, glandY, boxW, boxH, 5);
    p.fill(txtColor);
    p.noStroke();
    p.textSize(9);
    p.textStyle(p.BOLD);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('Suprarrenal', adrX + boxW / 2, glandY + boxH / 2);

    // Feedback arrows
    p.stroke(100, 100, 100, 80);
    p.strokeWeight(1.5);
    p.line(thyX + boxW / 2, glandY, hypoX + boxW * 0.3, pitY + boxH);
    p.line(adrX + boxW / 2, glandY, hypoX + boxW * 0.7, pitY + boxH);

    // Hormone bars
    const tsh = param<number>('tsh');
    const cortisol = param<number>('cortisol');
    drawHormoneBar('T3/T4', thyX + boxW / 2, glandY + boxH + 20 * scaleY, tsh, scaleX);
    drawHormoneBar('Cortisol', adrX + boxW / 2, glandY + boxH + 20 * scaleY, cortisol, scaleX);

    // ADH and Aldosterone bars
    const adh = param<number>('adh');
    const aldosterona = param<number>('aldosterona');
    const barY = glandY + boxH + 80 * scaleY;

    const adhSize = p.map(adh, 0, 100, 20, 80) * scaleX;
    p.fill(100, 180, 255, 100);
    p.stroke(100, 180, 255);
    p.strokeWeight(1);
    p.rect(oX + 100 * scaleX, barY, adhSize, 20 * scaleY, 3);
    p.fill(txtColor);
    p.noStroke();
    p.textSize(8);
    p.textAlign(p.LEFT, p.CENTER);
    p.text('ADH', oX + 110 * scaleX, barY + 10 * scaleY);

    const aldoSize = p.map(aldosterona, 0, 100, 20, 80) * scaleX;
    p.fill(120, 140, 93, 100);
    p.stroke(120, 140, 93);
    p.strokeWeight(1);
    p.rect(oX + 100 * scaleX, barY + 40 * scaleY, aldoSize, 20 * scaleY, 3);
    p.fill(txtColor);
    p.noStroke();
    p.textSize(8);
    p.textAlign(p.LEFT, p.CENTER);
    p.text('Aldosterona', oX + 110 * scaleX, barY + 50 * scaleY);

    p.textStyle(p.NORMAL);
  }

  function drawHormoneBar(label: string, x: number, y: number, value: number, scaleX: number): void {
    const barWidth = p.map(value, 0, 200, 10, 70) * scaleX;
    p.fill(217, 119, 87);
    p.stroke(217, 119, 87);
    p.strokeWeight(1);
    p.rect(x - 40 * scaleX, y, barWidth, 15, 2);

    const dark = isDark();
    p.fill(dark ? 220 : 20);
    p.noStroke();
    p.textSize(8);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text(label, x - 50 * scaleX, y + 7);
    p.textAlign(p.LEFT, p.CENTER);
    p.text(`${value}%`, x + 40 * scaleX, y + 7);
  }

  // ── PARTICLE UPDATE & DRAW ─────────────────────────────
  function updateAndDrawParticles(
    particles: Particle[],
    side: 'nephron' | 'endocrine',
    midX: number,
    H: number,
  ): void {
    const W = p.width;

    // Update existing
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      if (side === 'nephron') {
        updateNephronParticle(pt, midX, H);
      } else {
        updateEndocrineParticle(pt, midX, W, H);
      }

      pt.age++;
      pt.life = 1.0 - pt.age / pt.maxAge;
      pt.x += pt.vx;
      pt.y += pt.vy;

      // Draw
      const c = getParticleColor(pt.type);
      p.fill(c[0], c[1], c[2], c[3] * pt.life);
      p.noStroke();
      const sz = (pt.type.startsWith('signal') ? 2.5 : 3);
      p.ellipse(pt.x, pt.y, sz, sz);

      if (pt.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Emit new particles
    if (side === 'nephron' && particles.length < 250) {
      const types: ParticleType[] = ['water', 'glucose', 'sodium', 'waste', 'protein'];
      const type = types[sr.int(0, types.length - 1)];
      const scaleX = midX / 450;
      const scaleY = H / 700;
      particles.push(makeParticle(
        (50 + sr.range(0, 150)) * scaleX,
        (50 + sr.range(0, 600)) * scaleY,
        type, sr,
      ));
    } else if (side === 'endocrine' && particles.length < 200) {
      const types: ParticleType[] = ['signal_crhacth', 'signal_tsh', 'signal_cortisol'];
      const type = types[sr.int(0, types.length - 1)];
      const halfW = W - midX;
      const scaleX = halfW / 450;
      const scaleY = H / 700;
      particles.push(makeParticle(
        midX + sr.range(0, 350) * scaleX,
        (80 + sr.range(0, 550)) * scaleY,
        type, sr,
      ));
    }
  }

  function updateNephronParticle(pt: Particle, midX: number, H: number): void {
    const tfg = param<number>('tfg');
    const reabsorcion = param<number>('reabsorcion');
    const osmolalidad = param<number>('osmolalidad');
    const adh = param<number>('adh');
    const scaleX = midX / 450;
    const scaleY = H / 700;
    const flowSpeed = (tfg / 150) * 2.5;

    // Glomerulus filtration: proteins blocked
    if (pt.x < 125 * scaleX && pt.y < 125 * scaleY) {
      if (pt.type === 'protein') {
        pt.vx = -0.5;
        pt.vy = 0.2;
      } else {
        pt.vx = 0.3;
        pt.vy = flowSpeed;
      }
      return;
    }

    const reabChance = reabsorcion / 100;

    // Proximal tubule
    if (pt.x > 150 * scaleX && pt.x < 300 * scaleX) {
      if ((pt.type === 'glucose' || pt.type === 'sodium') && sr.next() < reabChance) {
        pt.vx = 1.5;
        pt.vy = -0.5;
      } else {
        pt.vx = 0.2;
        pt.vy = flowSpeed * 0.8;
      }
    }
    // Loop of Henle
    else if (pt.x > 100 * scaleX && pt.x < 200 * scaleX && pt.y > 300 * scaleY) {
      const osmGradient = (osmolalidad - 280) / 100;
      if (pt.type === 'water' && sr.next() < (0.8 + osmGradient)) {
        pt.vy = -flowSpeed * 0.5;
        pt.vx = sr.range(-0.3, 0.3);
      } else {
        pt.vx = sr.range(-0.2, 0.2);
        pt.vy = flowSpeed * 0.6;
      }
    }
    // Collecting duct
    else if (pt.y > 600 * scaleY) {
      const adhFactor = adh / 100;
      if (pt.type === 'water' && sr.next() < adhFactor * 0.9) {
        pt.vx = 1.0;
        pt.vy = 0;
      } else {
        pt.vx = 0;
        pt.vy = flowSpeed * 0.5;
      }
    }
    // General flow
    else {
      pt.vx = sr.range(-0.1, 0.3);
      pt.vy = flowSpeed;
    }

    // Brownian noise
    pt.vx += sr.range(-0.1, 0.1);
    pt.vy += sr.range(-0.1, 0.1);
  }

  function updateEndocrineParticle(pt: Particle, midX: number, W: number, H: number): void {
    const adh = param<number>('adh');
    const flowSpeed = 1.5;
    const scaleY = H / 700;

    // Flow down from hypothalamus
    if (pt.y < 180 * scaleY) {
      pt.vx = sr.range(-0.1, 0.1);
      pt.vy = flowSpeed * (adh > 50 ? 1.2 : 0.8);
    }
    // Pituitary level
    else if (pt.y < 220 * scaleY) {
      if (pt.type === 'signal_tsh') {
        pt.vx = -flowSpeed * 0.8;
      } else if (pt.type === 'signal_cortisol') {
        pt.vx = flowSpeed * 0.8;
      } else {
        pt.vx = sr.range(-0.2, 0.2);
      }
      pt.vy = flowSpeed * 0.5;
    }
    // Flowing to glands
    else if (pt.y < 310 * scaleY) {
      if (pt.type === 'signal_tsh' && pt.x > midX + 50) {
        pt.vx = -flowSpeed * 0.7;
        pt.vy = flowSpeed * 0.7;
      } else if (pt.type === 'signal_cortisol' && pt.x < W - 50) {
        pt.vx = flowSpeed * 0.7;
        pt.vy = flowSpeed * 0.7;
      } else {
        pt.vx = sr.range(-0.3, 0.3);
        pt.vy = flowSpeed * sr.range(0.5, 1.0);
      }
    }
    // Feedback return
    else if (pt.y > 400 * scaleY) {
      pt.vx = sr.range(-0.3, 0.3);
      pt.vy = -flowSpeed * 0.4;
    }
    // Default
    else {
      pt.vx = sr.range(-0.2, 0.2);
      pt.vy = flowSpeed;
    }

    // Turbulence
    pt.vx += sr.range(-0.15, 0.15);
    pt.vy += sr.range(-0.15, 0.15);

    // Keep in bounds (right half)
    if (pt.x < midX + 10) pt.x = midX + 11;
    if (pt.x > W - 1) pt.x = W - 2;
    if (pt.y < 50) pt.y = 51;
    if (pt.y > H - 20) pt.y = H - 21;
  }

  // ── WINDOW RESIZE ──────────────────────────────────────
  p.windowResized = function () {
    // Handled by P5Canvas wrapper via ResizeObserver
  };
};

// ── Module export ────────────────────────────────────────────

const displayName = 'Filtros y Cascadas';
const description =
  'Sistema Renal-Endocrino — Nefrón con filtración glomerular y reabsorción tubular + cascada endocrina hipotálamo-hipófisis-glandular con retroalimentación.';

const renalEndocrinoEngine: EngineModule = {
  sketch,
  paramSchema,
  presets,
  displayName,
  description,
};

export default renalEndocrinoEngine;
