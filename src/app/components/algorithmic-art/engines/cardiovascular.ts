// ============================================================
// Axon — Algorithmic Art: Cardiovascular Engine
// "Ritmos Vitales" — Cardiac cycle simulation with blood flow
//
// Ported from cardiovascular_ritmos_vitales.html → instance-mode p5
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
  heartRate: {
    type: 'slider',
    label: 'Frecuencia Cardíaca (bpm)',
    min: 40,
    max: 180,
    step: 5,
    default: 72,
    unit: 'bpm',
  },
  contractility: {
    type: 'slider',
    label: 'Contractilidad VI (%)',
    min: 10,
    max: 100,
    step: 5,
    default: 65,
    unit: '%',
  },
  resistance: {
    type: 'slider',
    label: 'Resistencia Periférica (%)',
    min: 20,
    max: 200,
    step: 10,
    default: 100,
    unit: '%',
  },
  regurgMitral: {
    type: 'slider',
    label: 'Regurgitación Mitral (%)',
    min: 0,
    max: 80,
    step: 5,
    default: 0,
    unit: '%',
  },
  regurgAortic: {
    type: 'slider',
    label: 'Regurgitación Aórtica (%)',
    min: 0,
    max: 80,
    step: 5,
    default: 0,
    unit: '%',
  },
  stenoMitral: {
    type: 'slider',
    label: 'Estenosis Mitral (%)',
    min: 0,
    max: 90,
    step: 5,
    default: 0,
    unit: '%',
  },
  stenoAortic: {
    type: 'slider',
    label: 'Estenosis Aórtica (%)',
    min: 0,
    max: 90,
    step: 5,
    default: 0,
    unit: '%',
  },
  volume: {
    type: 'slider',
    label: 'Volumen Circulante (%)',
    min: 50,
    max: 150,
    step: 5,
    default: 100,
    unit: '%',
  },
};

// ── Presets ───────────────────────────────────────────────────

const presets: PresetDefinition[] = [
  {
    key: 'normal',
    label: 'Normal',
    description: 'Fisiología cardíaca normal',
    params: {
      heartRate: 72,
      contractility: 65,
      resistance: 100,
      regurgMitral: 0,
      regurgAortic: 0,
      stenoMitral: 0,
      stenoAortic: 0,
      volume: 100,
    },
  },
  {
    key: 'ic-sistolica',
    label: 'IC Sistólica',
    description: 'Insuficiencia cardíaca con fracción de eyección reducida',
    params: {
      heartRate: 100,
      contractility: 30,
      resistance: 100,
      regurgMitral: 0,
      regurgAortic: 0,
      stenoMitral: 0,
      stenoAortic: 0,
      volume: 100,
    },
  },
  {
    key: 'sca-iamcest',
    label: 'SCA IAMCEST',
    description: 'Síndrome coronario agudo con elevación del ST',
    params: {
      heartRate: 110,
      contractility: 25,
      resistance: 130,
      regurgMitral: 0,
      regurgAortic: 0,
      stenoMitral: 0,
      stenoAortic: 0,
      volume: 100,
    },
  },
  {
    key: 'estenosis-aortica',
    label: 'Estenosis Aórtica Severa',
    description: 'Obstrucción severa del tracto de salida del VI',
    params: {
      heartRate: 72,
      contractility: 80,
      resistance: 100,
      regurgMitral: 0,
      regurgAortic: 0,
      stenoMitral: 0,
      stenoAortic: 80,
      volume: 100,
    },
  },
  {
    key: 'im-aguda',
    label: 'IM Aguda',
    description: 'Insuficiencia mitral aguda severa',
    params: {
      heartRate: 110,
      contractility: 65,
      resistance: 100,
      regurgMitral: 60,
      regurgAortic: 0,
      stenoMitral: 0,
      stenoAortic: 0,
      volume: 100,
    },
  },
  {
    key: 'shock-hipovolemico',
    label: 'Shock Hipovolémico',
    description: 'Pérdida aguda de volumen circulante',
    params: {
      heartRate: 130,
      contractility: 65,
      resistance: 160,
      regurgMitral: 0,
      regurgAortic: 0,
      stenoMitral: 0,
      stenoAortic: 0,
      volume: 40,
    },
  },
];

// ── Seeded RNG ───────────────────────────────────────────────

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
}

// ── Particle type ────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  chamber: 'ra' | 'rv' | 'lungs' | 'la' | 'lv' | 'systemic';
  life: number;
  size: number;
}

// ── Sketch factory ───────────────────────────────────────────

const createSketch: SketchFactory = (p, paramsRef) => {
  let particles: Particle[] = [];
  let cyclePhase = 0;
  let cycleTime = 0;
  let lastSeed = -1;

  /** Read a numeric param with fallback */
  const num = (key: string, fallback: number): number => {
    const v = paramsRef.current[key];
    return typeof v === 'number' ? v : fallback;
  };

  function resetParticles(seed: number) {
    particles = [];
    const rng = new SeededRandom(seed);
    const vol = num('volume', 100);
    const baseCount = Math.floor(1500 * vol / 100);

    for (let i = 0; i < baseCount; i++) {
      particles.push({
        x: 450,
        y: 350,
        vx: 0,
        vy: 0,
        chamber: 'ra',
        life: rng.next(),
        size: rng.range(2, 4),
      });
    }
  }

  function updateParticles() {
    const hr = num('heartRate', 72);
    const contractility = num('contractility', 65);
    const resistance = num('resistance', 100);
    const regurgMitral = num('regurgMitral', 0);
    const regurgAortic = num('regurgAortic', 0);
    const stenoAortic = num('stenoAortic', 0);

    for (const particle of particles) {
      let speed = 0.5;

      // Diastole (0.0–0.5): filling, Systole (0.5–1.0): ejection
      if (cyclePhase < 0.5) {
        speed = p.lerp(0.2, 0.3, cyclePhase / 0.5);
      } else {
        speed = p.lerp(0.3, 0.8, (cyclePhase - 0.5) / 0.5);
      }

      // Apply resistance
      speed *= 100 / resistance;

      // Chamber flow logic
      if (particle.chamber === 'ra') {
        particle.x += 1.5 * speed;
        particle.y += p.sin(cyclePhase * p.PI * 2) * 0.5;
        if (particle.x > 520) {
          particle.chamber = 'rv';
          particle.x = 520;
        }
      } else if (particle.chamber === 'rv') {
        particle.x += 1.5 * speed;
        particle.y += p.cos(cyclePhase * p.PI * 2) * 0.8;
        if (particle.x > 560) {
          if (p.random() > 1 - regurgAortic / 100) {
            particle.chamber = 'systemic';
          } else if (p.random() < stenoAortic / 100) {
            particle.x -= 2 * speed; // backflow
          } else {
            particle.chamber = 'lungs';
          }
        }
      } else if (particle.chamber === 'lungs') {
        particle.y -= 2 * speed;
        particle.x += p.sin(cyclePhase * p.PI) * 0.5;
        if (particle.y < 150) {
          particle.chamber = 'la';
          particle.y = 150;
        }
      } else if (particle.chamber === 'la') {
        particle.x -= 1.5 * speed;
        particle.y -= p.sin(cyclePhase * p.PI * 2) * 0.5;
        if (particle.x < 350) {
          particle.chamber = 'lv';
          particle.x = 350;
        }
      } else if (particle.chamber === 'lv') {
        particle.x -= 1.5 * speed;
        particle.y -= p.cos(cyclePhase * p.PI * 2) * 0.8;

        // LV ejection with contractility
        if (cyclePhase > 0.5 && contractility > 30) {
          particle.y -= 3 * (contractility / 65) * speed;
          if (particle.y < 50) {
            particle.chamber = 'systemic';
            particle.y = 50;
          }
        }

        // Mitral regurgitation
        if (p.random() < regurgMitral / 100) {
          particle.chamber = 'la';
        }
      } else if (particle.chamber === 'systemic') {
        particle.x += p.sin(particle.life * 10) * speed;
        particle.y += p.cos(particle.life * 8) * speed;

        // Return to RA after systemic loop
        const dist = p.dist(particle.x, particle.y, 380, 450);
        if (dist < 80 || particle.y > 650) {
          particle.chamber = 'ra';
          particle.x = 380;
          particle.y = 450;
        }
      }

      particle.life += 0.001;
    }
  }

  function drawParticles() {
    p.noStroke();
    for (const particle of particles) {
      let r: number, g: number, b: number;

      if (particle.chamber === 'ra' || particle.chamber === 'rv') {
        r = 68; g = 119; b = 187; // blue – deoxygenated
      } else if (particle.chamber === 'lungs') {
        const t = (450 - particle.y) / 300;
        r = p.lerp(68, 204, t);
        g = p.lerp(119, 51, t);
        b = p.lerp(187, 68, t);
      } else {
        r = 204; g = 51; b = 68; // red – oxygenated
      }

      const col = p.color(r, g, b, 200);
      p.fill(col);
      p.ellipse(particle.x, particle.y, particle.size);
    }
  }

  function drawChamber(x: number, y: number, w: number, h: number) {
    const pulseFactor = 0.9 + 0.1 * p.sin(cyclePhase * p.PI * 2);
    p.ellipse(x, y, w * pulseFactor, h * pulseFactor);
  }

  function getHealthColor(): [number, number, number] {
    const contractility = num('contractility', 65);
    const resistance = num('resistance', 100);
    const regurgMitral = num('regurgMitral', 0);
    const regurgAortic = num('regurgAortic', 0);
    const stenoMitral = num('stenoMitral', 0);
    const stenoAortic = num('stenoAortic', 0);

    const pathologyScore =
      ((100 - contractility) / 90 +
        Math.abs(resistance - 100) / 100 +
        (regurgMitral + regurgAortic) / 160 +
        (stenoMitral + stenoAortic) / 180) /
      4;

    if (pathologyScore > 0.7) return [220, 50, 50];
    if (pathologyScore > 0.3) return [220, 150, 50];
    return [120, 140, 90];
  }

  function drawAnatomy() {
    p.strokeWeight(2);
    p.stroke(100);

    // Right Atrium
    p.fill(200, 230, 255, 30);
    drawChamber(420, 150, 100, 120);

    // Right Ventricle
    p.fill(200, 230, 255, 30);
    drawChamber(500, 400, 120, 150);

    // Left Atrium
    p.fill(255, 200, 200, 30);
    drawChamber(300, 150, 100, 120);

    // Left Ventricle
    p.fill(255, 200, 200, 30);
    drawChamber(280, 400, 120, 160);

    // Valves
    p.strokeWeight(1.5);
    p.stroke(150, 100, 100);
    p.line(420, 200, 480, 350); // Tricuspid
    p.line(530, 280, 570, 200); // Pulmonary
    p.line(340, 200, 280, 350); // Mitral
    p.line(250, 280, 200, 200); // Aortic

    // Aorta
    p.strokeWeight(3);
    p.stroke(180, 80, 80);
    p.line(200, 180, 150, 80);
    p.line(150, 80, 150, 30);

    // Pulmonary artery
    p.stroke(80, 180, 180);
    p.line(570, 200, 620, 100);

    // Lungs region indicator
    p.fill(200, 220, 240, 15);
    p.noStroke();
    p.rect(200, 30, 500, 130);

    // Systemic circulation indicator
    p.fill(240, 200, 200, 15);
    p.rect(150, 550, 600, 120);

    // Heart outline with health color
    const hc = getHealthColor();
    p.strokeWeight(3);
    p.stroke(hc[0], hc[1], hc[2]);
    p.noFill();
    p.bezier(250, 280, 220, 320, 220, 420, 280, 480);
    p.bezier(280, 480, 320, 520, 480, 520, 530, 480);
    p.bezier(530, 480, 580, 420, 580, 320, 550, 280);
    p.bezier(550, 280, 520, 200, 420, 180, 350, 180);

    // Pulse glow during systole
    if (cyclePhase > 0.4 && cyclePhase < 0.7) {
      const glowAlpha = p.sin((cyclePhase - 0.4) * p.PI) * 100;
      p.stroke(hc[0], hc[1], hc[2], glowAlpha);
      p.strokeWeight(4);
      p.noFill();
      p.bezier(250, 280, 210, 320, 210, 420, 280, 480);
      p.bezier(280, 480, 320, 530, 480, 530, 530, 480);
      p.bezier(530, 480, 590, 420, 590, 320, 550, 280);
      p.bezier(550, 280, 530, 200, 420, 170, 350, 170);
    }
  }

  function drawInfo() {
    const hr = num('heartRate', 72);
    const contractility = num('contractility', 65);
    const resistance = num('resistance', 100);

    p.fill(100);
    p.textSize(12);
    p.textAlign(p.RIGHT);
    p.noStroke();
    p.text(`HR: ${hr} bpm`, 870, 30);
    p.text(`Contractilidad: ${contractility}%`, 870, 50);
    p.text(`Resistencia: ${resistance}%`, 870, 70);

    const cyclePercentage = Math.floor(cyclePhase * 100);
    const phaseName = cyclePhase < 0.5 ? 'Diástole' : 'Sístole';
    p.text(`${phaseName} (${cyclePercentage}%)`, 870, 90);
  }

  // ── p5 lifecycle ─────────────────────────────────────────

  p.setup = () => {
    p.createCanvas(900, 700);
    p.pixelDensity(1);
    resetParticles(42);
  };

  p.draw = () => {
    // Seed change detection (stored in params as 'seed')
    const seed = num('seed', 42);
    if (seed !== lastSeed) {
      lastSeed = seed;
      resetParticles(seed);
    }

    // Update cardiac cycle
    const hr = num('heartRate', 72);
    const cycleDuration = 60000 / hr;
    cycleTime = (cycleTime + p.deltaTime) % cycleDuration;
    cyclePhase = cycleTime / cycleDuration;

    // Background
    const dark = paramsRef.current.darkMode;
    if (dark) {
      p.background(20, 20, 19);
    } else {
      p.background(245, 244, 241);
    }

    drawAnatomy();
    updateParticles();
    drawParticles();
    drawInfo();
  };
};

// ── Module export ────────────────────────────────────────────

const cardiovascularEngine: EngineModule = {
  sketch: createSketch,
  paramSchema,
  presets,
  displayName: 'Ritmos Vitales',
  description: 'Sistema Cardiovascular — Flujo y Presión',
};

export default cardiovascularEngine;
export { createSketch as sketch, paramSchema, presets };
export const displayName = cardiovascularEngine.displayName;
export const description = cardiovascularEngine.description;
