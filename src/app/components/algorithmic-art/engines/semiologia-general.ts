// ============================================================
// Axon — Algorithmic Art: Semiología General · Cartografía del Cuerpo
//
// Ported from semiologia_general_cartografia.html to TypeScript
// engine following the dolor.ts pattern.
//
// Topographic terrain visualization of vital signs using
// 3-layer Perlin noise (thermal/hydric/rhythmic), temperature-
// color mapping, flow particles, and consciousness fog.
//
// Params:
//   temperatura   — Body temperature 35–42 °C
//   paSistolica   — Systolic BP 70–200 mmHg
//   fc            — Heart rate 40–180 bpm
//   fr            — Respiratory rate 8–40 rpm
//   peso          — Weight 30–150 kg
//   nutricion     — Nutritional status 0–100%
//   conciencia    — Consciousness level 0–100%
//   hidratacion   — Hydration 0–100%
//
// Presets: Normal, Fiebre Alta, Shock, Desnutrición,
//          Deshidratación, Estado Confusional
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

/** Dark mode–aware background color */
function bgColor(dark: boolean): [number, number, number] {
  return dark ? [20, 20, 19] : [250, 249, 245];
}

// ── Param Schema ─────────────────────────────────────────────

export const paramSchema: ParamSchema = {
  temperatura: {
    type: 'slider',
    label: 'Temperatura',
    min: 35,
    max: 42,
    step: 0.1,
    default: 37,
    unit: ' °C',
  },
  paSistolica: {
    type: 'slider',
    label: 'PA Sistólica',
    min: 70,
    max: 200,
    step: 1,
    default: 120,
    unit: ' mmHg',
  },
  fc: {
    type: 'slider',
    label: 'Frecuencia Cardíaca',
    min: 40,
    max: 180,
    step: 1,
    default: 72,
    unit: ' bpm',
  },
  fr: {
    type: 'slider',
    label: 'Frecuencia Respiratoria',
    min: 8,
    max: 40,
    step: 1,
    default: 16,
    unit: ' rpm',
  },
  peso: {
    type: 'slider',
    label: 'Peso',
    min: 30,
    max: 150,
    step: 1,
    default: 70,
    unit: ' kg',
  },
  nutricion: {
    type: 'slider',
    label: 'Estado Nutricional',
    min: 0,
    max: 100,
    step: 5,
    default: 70,
    unit: '%',
  },
  conciencia: {
    type: 'slider',
    label: 'Nivel de Conciencia',
    min: 0,
    max: 100,
    step: 5,
    default: 100,
    unit: '%',
  },
  hidratacion: {
    type: 'slider',
    label: 'Hidratación',
    min: 0,
    max: 100,
    step: 5,
    default: 80,
    unit: '%',
  },
};

// ── Presets ───────────────────────────────────────────────────

export const presets: PresetDefinition[] = [
  {
    key: 'normal',
    label: '🟢 Normal',
    description: 'Signos vitales dentro de parámetros normales',
    params: { temperatura: 37, paSistolica: 120, fc: 72, fr: 16, peso: 70, nutricion: 70, conciencia: 100, hidratacion: 80 },
  },
  {
    key: 'fiebre',
    label: '🔴 Fiebre Alta',
    description: 'Síndrome febril con taquicardia y taquipnea compensatorias',
    params: { temperatura: 40, paSistolica: 130, fc: 110, fr: 24, peso: 70, nutricion: 70, conciencia: 80, hidratacion: 70 },
  },
  {
    key: 'shock',
    label: '⚫ Shock',
    description: 'Hipoperfusión tisular — hipotensión, taquicardia, alteración de conciencia',
    params: { temperatura: 36.5, paSistolica: 70, fc: 130, fr: 28, peso: 70, nutricion: 60, conciencia: 40, hidratacion: 30 },
  },
  {
    key: 'desnutricion',
    label: '🟡 Desnutrición',
    description: 'Déficit nutricional severo con bajo peso e hipotensión leve',
    params: { temperatura: 36.8, paSistolica: 100, fc: 80, fr: 16, peso: 40, nutricion: 20, conciencia: 90, hidratacion: 75 },
  },
  {
    key: 'deshidratacion',
    label: '🟠 Deshidratación',
    description: 'Pérdida de volumen con taquicardia e hipotensión compensatorias',
    params: { temperatura: 38, paSistolica: 90, fc: 100, fr: 18, peso: 70, nutricion: 60, conciencia: 85, hidratacion: 20 },
  },
  {
    key: 'confusional',
    label: '🟣 Estado Confusional',
    description: 'Alteración del sensorio — conciencia deprimida con febrícula',
    params: { temperatura: 38.2, paSistolica: 115, fc: 95, fr: 20, peso: 70, nutricion: 65, conciencia: 50, hidratacion: 70 },
  },
];

// ── Sketch Factory ───────────────────────────────────────────

export const sketch: SketchFactory = (
  p: p5,
  paramsRef: React.MutableRefObject<ParamValues>,
) => {
  // ── Internal state ──
  let time = 0;
  let noiseOffset = { thermal: 0, hydric: 0, rhythmic: 0 };

  // Smoothed params for transitions
  let smoothed: Record<string, number> = {};

  function param<T>(key: string): T {
    return paramsRef.current[key] as T;
  }

  function getSeed(): number {
    return (paramsRef.current._seed as number) ?? 42;
  }

  function isDark(): boolean {
    return (paramsRef.current._darkMode as boolean) ?? false;
  }

  function getSmoothed(key: string): number {
    const target = param<number>(key);
    if (smoothed[key] === undefined) smoothed[key] = target;
    smoothed[key] = p.lerp(smoothed[key], target, 0.05);
    return smoothed[key];
  }

  // ── SETUP ──────────────────────────────────────────────
  p.setup = function () {
    p.pixelDensity(1);
    p.noiseSeed(getSeed());

    // Initialize smoothed values
    const keys = Object.keys(paramSchema);
    for (const key of keys) {
      smoothed[key] = param<number>(key);
    }
  };

  // ── DRAW ───────────────────────────────────────────────
  p.draw = function () {
    const dark = isDark();
    const bg = bgColor(dark);
    p.background(bg[0], bg[1], bg[2]);

    time += 1 / 60;

    drawTerrainMap(dark);
    drawContours(dark);
    drawFlowParticles(dark);
    drawConsciousnessFog(dark);
    drawAnnotations(dark);
  };

  // ── TERRAIN MAP ────────────────────────────────────────
  function drawTerrainMap(dark: boolean): void {
    const W = p.width;
    const H = p.height;
    const scl = 5;
    const cols = Math.floor(W / scl);
    const rows = Math.floor(H / scl);

    const temp = getSmoothed('temperatura');
    const hidratacion = getSmoothed('hidratacion');
    const fc = getSmoothed('fc');
    const fr = getSmoothed('fr');
    const nutricion = getSmoothed('nutricion');
    const paSis = getSmoothed('paSistolica');

    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < cols - 1; x++) {
        // 3-layer Perlin noise
        const thermicNoise = p.noise(x * 0.004 + noiseOffset.thermal, y * 0.004 + noiseOffset.thermal) - 0.5;
        const hydricNoise = p.noise(x * 0.008 + noiseOffset.hydric + 100, y * 0.008 + noiseOffset.hydric + 100) - 0.5;
        const rhythmicNoise = p.noise(x * 0.016 + noiseOffset.rhythmic + 200, y * 0.016 + noiseOffset.rhythmic + 200) - 0.5;

        // Amplitudes
        const tempDeviation = (temp - 37) / 5;
        const thermicAmp = 0.4 + tempDeviation * 0.6;
        const hydricAmp = (hidratacion - 50) / 50 * 0.3;
        const metabolicRate = (temp - 37) + (fc - 72) * 0.01 + (fr - 16) * 0.05;
        const rhythmicAmp = 0.2 + Math.abs(metabolicRate) * 0.05;

        // Final altitude
        const rhythmicMod = Math.sin(time * (fc / 60)) * rhythmicNoise;
        let altitude = thermicNoise * thermicAmp + hydricNoise * hydricAmp + rhythmicMod * rhythmicAmp;

        // Nutrition texture
        const nutritionFactor = (nutricion - 50) / 50 * 0.2;
        altitude += p.noise(x * 0.02, y * 0.02 + time * 0.1) * nutritionFactor;

        // Color mapping
        const col = altitudeToColor(altitude, temp, paSis, dark);
        p.fill(col[0], col[1], col[2]);
        p.stroke(dark ? 255 : 0, 5);
        p.strokeWeight(0.3);
        p.quad(x * scl, y * scl, (x + 1) * scl, y * scl, (x + 1) * scl, (y + 1) * scl, x * scl, (y + 1) * scl);
      }
    }

    noiseOffset.thermal += 0.0005;
    noiseOffset.hydric += 0.0003;
    noiseOffset.rhythmic += 0.001;
  }

  function altitudeToColor(
    altitude: number,
    temp: number,
    paSis: number,
    dark: boolean,
  ): [number, number, number] {
    const normalizedAlt = p.constrain(altitude + 0.5, 0, 1);
    const tempFactor = p.constrain((temp - 35) / 7, 0, 1);

    let r: number, g: number, b: number;

    if (tempFactor < 0.2) {
      // Hypothermia: blue
      r = 50;
      g = 100 + normalizedAlt * 50;
      b = 200 - normalizedAlt * 50;
    } else if (tempFactor < 0.4) {
      const t = (tempFactor - 0.2) / 0.2;
      r = 100 + t * 50;
      g = 180 + t * 30;
      b = 150 - t * 80;
    } else if (tempFactor < 0.6) {
      const t = (tempFactor - 0.4) / 0.2;
      r = 150 + t * 50;
      g = 210 - t * 50;
      b = 70 + t * 20;
    } else if (tempFactor < 0.8) {
      const t = (tempFactor - 0.6) / 0.2;
      r = 200 + t * 55;
      g = 160 - t * 60;
      b = 90 - t * 30;
    } else {
      const t = (tempFactor - 0.8) / 0.2;
      r = 255;
      g = 100 - t * 50;
      b = 60 - t * 40;
    }

    // Pressure brightness
    const pressureFactor = p.constrain((paSis - 70) / 130, 0.3, 1.2);
    r *= pressureFactor;
    g *= pressureFactor;
    b *= pressureFactor;

    // Dark mode invert slightly
    if (dark) {
      r = p.constrain(r * 0.7, 0, 255);
      g = p.constrain(g * 0.7, 0, 255);
      b = p.constrain(b * 0.7, 0, 255);
    }

    return [
      p.constrain(r, 0, 255),
      p.constrain(g, 0, 255),
      p.constrain(b, 0, 255),
    ];
  }

  // ── CONTOURS ───────────────────────────────────────────
  function drawContours(dark: boolean): void {
    const W = p.width;
    const H = p.height;
    const scl = 8;
    const cols = Math.floor(W / scl);

    p.stroke(dark ? 255 : 0, 20);
    p.strokeWeight(0.8);
    p.noFill();

    for (let threshold = -0.3; threshold < 0.6; threshold += 0.15) {
      p.beginShape();
      for (let x = 0; x < cols; x++) {
        const noiseVal = p.noise(x * 0.004 + noiseOffset.thermal, threshold * 10 + noiseOffset.thermal);
        const y = p.map(noiseVal, 0, 1, H * 0.3, H * 0.7);
        if (x === 0) {
          p.vertex(x * scl, y);
        } else {
          p.vertex(x * scl, y);
        }
      }
      p.endShape();
    }
  }

  // ── FLOW PARTICLES ─────────────────────────────────────
  function drawFlowParticles(dark: boolean): void {
    const W = p.width;
    const H = p.height;
    const particleCount = 80;

    const temp = getSmoothed('temperatura');
    const fc = getSmoothed('fc');
    const hidratacion = getSmoothed('hidratacion');

    const metabolicRate = (temp - 37) + (fc - 72) * 0.01;
    const speedFactor = 0.5 + metabolicRate * 0.3;
    const hydrationFactor = hidratacion / 100;

    p.noStroke();
    for (let i = 0; i < particleCount; i++) {
      const x = (time * 20 + i * 2 + Math.sin(i) * 100) % W;
      const y = (time * 10 + Math.cos(i) * 150 + i * 3) % H;

      const particleSize = 3 * hydrationFactor * speedFactor;
      const alpha = 30 + hydrationFactor * 100;

      if (dark) {
        p.fill(140, 180, 240, alpha);
      } else {
        p.fill(100, 150, 200, alpha);
      }
      p.circle(x, y, particleSize);
    }
  }

  // ── CONSCIOUSNESS FOG ──────────────────────────────────
  function drawConsciousnessFog(dark: boolean): void {
    const conciencia = getSmoothed('conciencia');
    const fogIntensity = 1 - conciencia / 100;

    if (fogIntensity > 0.01) {
      p.noStroke();
      if (dark) {
        p.fill(10, 10, 10, fogIntensity * 150);
      } else {
        p.fill(200, 200, 200, fogIntensity * 150);
      }
      p.rect(0, 0, p.width, p.height);
    }
  }

  // ── ANNOTATIONS ────────────────────────────────────────
  function drawAnnotations(dark: boolean): void {
    const temp = getSmoothed('temperatura');
    const paSis = getSmoothed('paSistolica');
    const fc = getSmoothed('fc');
    const fr = getSmoothed('fr');
    const conciencia = getSmoothed('conciencia');
    const hidratacion = getSmoothed('hidratacion');

    const annotations: string[] = [];

    if (temp > 38.5) annotations.push(`FIEBRE: ${temp.toFixed(1)}°C`);
    else if (temp < 36) annotations.push(`HIPOTERMIA: ${temp.toFixed(1)}°C`);

    if (paSis < 90) annotations.push(`HIPOTENSIÓN: ${Math.round(paSis)} mmHg`);
    else if (paSis > 160) annotations.push(`HIPERTENSIÓN: ${Math.round(paSis)} mmHg`);

    if (fc > 100) annotations.push(`TAQUICARDIA: ${Math.round(fc)} bpm`);
    else if (fc < 60) annotations.push(`BRADICARDIA: ${Math.round(fc)} bpm`);

    if (fr > 25) annotations.push(`TAQUIPNEA: ${Math.round(fr)} rpm`);
    else if (fr < 12) annotations.push(`BRADIPNEA: ${Math.round(fr)} rpm`);

    if (conciencia < 70) annotations.push(`ALTERACIÓN CONCIENCIA: ${Math.round(conciencia)}%`);
    if (hidratacion < 50) annotations.push(`DESHIDRATACIÓN: ${Math.round(hidratacion)}%`);

    if (annotations.length > 0) {
      p.textSize(12);
      p.textAlign(p.LEFT, p.TOP);
      p.noStroke();

      let yOffset = 20;
      for (const ann of annotations) {
        p.fill(dark ? 255 : 240, 100, 80, 200);
        p.text(ann, 20, yOffset);
        yOffset += 20;
      }
    }
  }

  // ── WINDOW RESIZE ──────────────────────────────────────
  p.windowResized = function () {
    // Handled by P5Canvas wrapper via ResizeObserver
  };
};

// ── Module export ────────────────────────────────────────────

const displayName = 'Cartografía del Cuerpo';
const description =
  'Semiología General — Terreno topográfico de signos vitales con 3 capas de ruido Perlin (térmica/hídrica/rítmica), mapeo de color por temperatura, partículas de flujo y niebla de conciencia.';

const semiologiaGeneralEngine: EngineModule = {
  sketch,
  paramSchema,
  presets,
  displayName,
  description,
};

export default semiologiaGeneralEngine;
