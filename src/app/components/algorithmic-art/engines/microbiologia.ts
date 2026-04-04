// ============================================================
// Axon — Algorithmic Art: Microbiología · Colonias en Conflicto
//
// Ported from microbiologia_colonias_conflicto.html to TypeScript
//
// Simulates an autonomous bacterial ecosystem: bacteria with 3
// morphologies (cocci/rod/spiral) navigate via Perlin noise,
// consume nutrients, face antibiotic effects, form biofilms,
// and interact with white blood cells. Resistance mechanics
// create selective survival pressure.
//
// Params:
//   populationSize         — Initial bacteria count (50–500)
//   reproductionRate       — Reproduction multiplier (0.1–3.0)
//   antibioticResistance   — % resistant bacteria (0–100)
//   antibioticConcentration — Antibiotic presence (0–100)
//   immuneResponse         — WBC activity (0–100)
//   nutrients              — Nutrient field density (0–100)
//   biofilmFormation       — Biofilm tendency (0–100)
//
// Presets: Flora Normal, Infección Aguda, Resistencia ATB,
//          Sepsis, Post-ATB, Biofilm Crónico
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
  return dark ? [20, 20, 19] : [240, 245, 240];
}

// ── Param Schema ─────────────────────────────────────────────

export const paramSchema: ParamSchema = {
  populationSize: {
    type: 'slider',
    label: 'Población Bacteriana',
    min: 50,
    max: 500,
    step: 10,
    default: 200,
  },
  reproductionRate: {
    type: 'slider',
    label: 'Tasa de Reproducción',
    min: 0.1,
    max: 3.0,
    step: 0.1,
    default: 1.0,
    unit: 'x',
  },
  antibioticResistance: {
    type: 'slider',
    label: 'Resistencia ATB',
    min: 0,
    max: 100,
    step: 5,
    default: 10,
    unit: '%',
  },
  antibioticConcentration: {
    type: 'slider',
    label: 'Concentración ATB',
    min: 0,
    max: 100,
    step: 5,
    default: 0,
    unit: '%',
  },
  immuneResponse: {
    type: 'slider',
    label: 'Respuesta Inmune',
    min: 0,
    max: 100,
    step: 5,
    default: 50,
    unit: '%',
  },
  nutrients: {
    type: 'slider',
    label: 'Nutrientes',
    min: 0,
    max: 100,
    step: 5,
    default: 70,
    unit: '%',
  },
  biofilmFormation: {
    type: 'slider',
    label: 'Formación de Biofilm',
    min: 0,
    max: 100,
    step: 5,
    default: 20,
    unit: '%',
  },
};

// ── Presets ───────────────────────────────────────────────────

export const presets: PresetDefinition[] = [
  {
    key: 'normal',
    label: '🟢 Flora Normal',
    description: 'Microbiota equilibrada, baja virulencia',
    params: {
      populationSize: 200,
      reproductionRate: 1.0,
      antibioticResistance: 10,
      antibioticConcentration: 0,
      immuneResponse: 50,
      nutrients: 70,
      biofilmFormation: 20,
    },
  },
  {
    key: 'acute',
    label: '🔴 Infección Aguda',
    description: 'Alta reproducción con respuesta inmune activa',
    params: {
      populationSize: 400,
      reproductionRate: 2.5,
      antibioticResistance: 10,
      antibioticConcentration: 0,
      immuneResponse: 80,
      nutrients: 70,
      biofilmFormation: 10,
    },
  },
  {
    key: 'resistance',
    label: '🟠 Resistencia ATB',
    description: 'Cepas resistentes sobreviviendo al antibiótico',
    params: {
      populationSize: 250,
      reproductionRate: 1.0,
      antibioticResistance: 80,
      antibioticConcentration: 60,
      immuneResponse: 50,
      nutrients: 70,
      biofilmFormation: 15,
    },
  },
  {
    key: 'sepsis',
    label: '🟡 Sepsis',
    description: 'Invasión masiva con respuesta inmune deprimida',
    params: {
      populationSize: 500,
      reproductionRate: 3.0,
      antibioticResistance: 10,
      antibioticConcentration: 0,
      immuneResponse: 30,
      nutrients: 100,
      biofilmFormation: 5,
    },
  },
  {
    key: 'postantibiotic',
    label: '🔵 Post-ATB',
    description: 'Después del tratamiento: bacterias resistentes residuales',
    params: {
      populationSize: 50,
      reproductionRate: 0.3,
      antibioticResistance: 90,
      antibioticConcentration: 90,
      immuneResponse: 30,
      nutrients: 40,
      biofilmFormation: 10,
    },
  },
  {
    key: 'biofilm',
    label: '🟣 Biofilm Crónico',
    description: 'Colonias protegidas con alta formación de biofilm',
    params: {
      populationSize: 200,
      reproductionRate: 0.5,
      antibioticResistance: 60,
      antibioticConcentration: 0,
      immuneResponse: 50,
      nutrients: 50,
      biofilmFormation: 90,
    },
  },
];

// ── Sketch Factory ───────────────────────────────────────────

type BacteriumType = 'cocci' | 'rod' | 'spiral';

interface Bacterium {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: BacteriumType;
  size: number;
  energy: number;
  age: number;
  generation: number;
  isResistant: boolean;
  inBiofilm: boolean;
  color: [number, number, number];
}

interface WhiteCell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  energy: number;
}

interface BiofilmCluster {
  x: number;
  y: number;
  size: number;
  strength: number;
}

export const sketch: SketchFactory = (
  p: p5,
  paramsRef: React.MutableRefObject<ParamValues>,
) => {
  let bacteria: Bacterium[] = [];
  let whiteCells: WhiteCell[] = [];
  let nutrientField: number[][] = [];
  let antibioticField: number[][] = [];
  let biofilmClusters: BiofilmCluster[] = [];
  let simTime = 0;
  let sr: SeededRandom;
  const GRID_SIZE = 20;

  function param<T>(key: string): T {
    return paramsRef.current[key] as T;
  }

  function getSeed(): number {
    return (paramsRef.current._seed as number) ?? 12345;
  }

  function isDark(): boolean {
    return (paramsRef.current._darkMode as boolean) ?? false;
  }

  function createBacterium(x: number, y: number, type: BacteriumType): Bacterium {
    const resistance = param<number>('antibioticResistance');
    const isResistant = sr.next() * 100 < resistance;
    return {
      x,
      y,
      vx: sr.range(-2, 2),
      vy: sr.range(-2, 2),
      type,
      size: sr.range(3, 6),
      energy: 80,
      age: 0,
      generation: 0,
      isResistant,
      inBiofilm: false,
      color: isResistant ? [200, 100, 255] : [255, 100, 100],
    };
  }

  function createWhiteCell(x: number, y: number): WhiteCell {
    return {
      x,
      y,
      vx: sr.range(-1.5, 1.5),
      vy: sr.range(-1.5, 1.5),
      size: 12,
      energy: 100,
    };
  }

  function getNutrientLevel(x: number, y: number): number {
    const gridX = Math.floor(x / GRID_SIZE);
    const gridY = Math.floor(y / GRID_SIZE);
    if (
      gridX >= 0 &&
      gridX < nutrientField.length &&
      nutrientField[gridX] &&
      gridY >= 0 &&
      gridY < nutrientField[gridX].length
    ) {
      return nutrientField[gridX][gridY] / 100;
    }
    return 0;
  }

  function getAntibioticLevel(x: number, y: number): number {
    const gridX = Math.floor(x / GRID_SIZE);
    const gridY = Math.floor(y / GRID_SIZE);
    if (
      gridX >= 0 &&
      gridX < antibioticField.length &&
      antibioticField[gridX] &&
      gridY >= 0 &&
      gridY < antibioticField[gridX].length
    ) {
      return antibioticField[gridX][gridY] / 100;
    }
    return 0;
  }

  function initializeSystem(): void {
    sr = new SeededRandom(getSeed());
    p.randomSeed(getSeed());
    p.noiseSeed(getSeed());

    const populationSize = param<number>('populationSize');
    const nutrients = param<number>('nutrients');
    const antibioticConc = param<number>('antibioticConcentration');
    const immuneResp = param<number>('immuneResponse');

    // Initialize nutrient and antibiotic fields
    const gridCols = Math.ceil(p.width / GRID_SIZE);
    const gridRows = Math.ceil(p.height / GRID_SIZE);
    nutrientField = [];
    antibioticField = [];

    for (let i = 0; i < gridCols; i++) {
      nutrientField[i] = [];
      antibioticField[i] = [];
      for (let j = 0; j < gridRows; j++) {
        nutrientField[i][j] = p.noise(i * 0.3, j * 0.3) * 100 * (nutrients / 100);
        antibioticField[i][j] = antibioticConc;
      }
    }

    // Initialize bacteria
    bacteria = [];
    const types: BacteriumType[] = ['cocci', 'rod', 'spiral'];
    for (let i = 0; i < populationSize; i++) {
      const type = types[sr.int(0, 2)];
      bacteria.push(createBacterium(sr.range(0, p.width), sr.range(0, p.height), type));
    }

    // Initialize white cells
    whiteCells = [];
    const numWBC = Math.floor(immuneResp / 10);
    for (let i = 0; i < numWBC; i++) {
      whiteCells.push(createWhiteCell(sr.range(0, p.width), sr.range(0, p.height)));
    }

    simTime = 0;
    biofilmClusters = [];
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

    const reproRate = param<number>('reproductionRate');
    const antibioticConc = param<number>('antibioticConcentration');
    const immuneResp = param<number>('immuneResponse');
    const biofilmParam = param<number>('biofilmFormation');

    // Draw nutrient gradient
    drawNutrientField(dark);

    // Update bacteria
    for (let i = bacteria.length - 1; i >= 0; i--) {
      const bact = bacteria[i];

      // Perlin noise-based movement
      const angle = p.noise(bact.x * 0.01, bact.y * 0.01, simTime * 0.01) * p.TWO_PI;
      bact.vx = Math.cos(angle) * 2;
      bact.vy = Math.sin(angle) * 2;
      bact.x += bact.vx;
      bact.y += bact.vy;

      // Wrap around edges
      bact.x = ((bact.x % p.width) + p.width) % p.width;
      bact.y = ((bact.y % p.height) + p.height) % p.height;

      // Consume nutrients
      const nutrientHere = getNutrientLevel(bact.x, bact.y);
      bact.energy += nutrientHere * 0.5 - 0.3;
      bact.energy = p.constrain(bact.energy, 0, 100);

      // Antibiotic damage
      const abxHere = getAntibioticLevel(bact.x, bact.y);
      if (abxHere > 0 && !bact.isResistant) {
        bact.energy -= abxHere * 0.3;
      } else if (abxHere > 0 && bact.isResistant) {
        bact.energy -= abxHere * 0.05;
      }

      // Biofilm protection
      if (bact.inBiofilm) {
        bact.energy += 5;
      }

      bact.age++;

      // Death
      if (bact.energy <= 0 || bact.age > 500) {
        bacteria.splice(i, 1);
        continue;
      }

      // Reproduction
      if (Math.random() < reproRate * 0.01 && bact.energy > 60) {
        bact.energy = 40;
        const child: Bacterium = {
          x: bact.x + (Math.random() - 0.5) * 20,
          y: bact.y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          type: bact.type,
          size: bact.size,
          energy: 40,
          age: 0,
          generation: bact.generation + 1,
          isResistant: bact.isResistant || Math.random() * 100 < param<number>('antibioticResistance') * 0.1,
          inBiofilm: false,
          color: bact.color,
        };
        bacteria.push(child);
      }

      // Display bacterium
      displayBacterium(bact, dark);
    }

    // Biofilm formation
    updateBiofilms(biofilmParam);
    drawBiofilms(dark);

    // Antibiotic wave visualization
    if (antibioticConc > 0) {
      drawAntibioticWave(antibioticConc, dark);
    }

    // White cells
    const targetWBC = Math.floor(immuneResp / 10);
    while (whiteCells.length < targetWBC) {
      whiteCells.push(createWhiteCell(Math.random() * p.width, Math.random() * p.height));
    }
    while (whiteCells.length > targetWBC) {
      whiteCells.pop();
    }

    for (let i = whiteCells.length - 1; i >= 0; i--) {
      const wbc = whiteCells[i];

      // Movement
      wbc.x += wbc.vx;
      wbc.y += wbc.vy;
      wbc.x = ((wbc.x % p.width) + p.width) % p.width;
      wbc.y = ((wbc.y % p.height) + p.height) % p.height;

      // Random direction change
      if (Math.random() < 0.1) {
        wbc.vx = (Math.random() - 0.5) * 3;
        wbc.vy = (Math.random() - 0.5) * 3;
      }

      wbc.energy -= 0.2;

      // Remove dead WBC
      if (wbc.energy <= 0) {
        whiteCells.splice(i, 1);
        continue;
      }

      // Phagocytosis — eat nearby bacteria
      for (let j = bacteria.length - 1; j >= 0; j--) {
        const b = bacteria[j];
        const d = p.dist(wbc.x, wbc.y, b.x, b.y);
        if (d < wbc.size + 5) {
          bacteria.splice(j, 1);
          wbc.energy += 10;
        }
      }

      // Display WBC
      displayWhiteCell(wbc, dark);
    }

    // Info text
    p.fill(dark ? 200 : 20);
    p.noStroke();
    p.textSize(12);
    p.textAlign(p.LEFT, p.BOTTOM);
    p.text(`Bacteria: ${bacteria.length}  |  WBC: ${whiteCells.length}`, 10, p.height - 8);

    simTime++;
  };

  // ── Drawing Functions ─────────────────────────────────────

  function drawNutrientField(dark: boolean): void {
    const gridCols = nutrientField.length;
    if (gridCols === 0) return;

    p.noStroke();
    for (let i = 0; i < gridCols; i++) {
      const rows = nutrientField[i].length;
      for (let j = 0; j < rows; j++) {
        const level = nutrientField[i][j];
        if (level < 5) continue; // skip nearly empty cells

        const alpha = p.map(level, 0, 100, 0, 40);
        if (dark) {
          p.fill(40, 60, 40, alpha);
        } else {
          p.fill(100, 150, 80, alpha);
        }
        p.rect(i * GRID_SIZE, j * GRID_SIZE, GRID_SIZE, GRID_SIZE);
      }
    }
  }

  function displayBacterium(bact: Bacterium, dark: boolean): void {
    p.fill(bact.color[0], bact.color[1], bact.color[2], 200);

    if (bact.isResistant) {
      p.stroke(200, 100, 255, 100);
      p.strokeWeight(1);
    } else {
      p.noStroke();
    }

    if (bact.type === 'cocci') {
      p.circle(bact.x, bact.y, bact.size);
    } else if (bact.type === 'rod') {
      p.push();
      p.translate(bact.x, bact.y);
      p.rotate(Math.atan2(bact.vy, bact.vx));
      p.rect(
        -bact.size * 1.5,
        -bact.size * 0.6,
        bact.size * 3,
        bact.size * 1.2,
      );
      p.pop();
    } else if (bact.type === 'spiral') {
      p.push();
      p.translate(bact.x, bact.y);
      p.rotate(Math.atan2(bact.vy, bact.vx));
      p.noFill();
      p.stroke(bact.color[0], bact.color[1], bact.color[2], 200);
      p.strokeWeight(1.5);
      p.arc(0, 0, bact.size * 2, bact.size * 2, 0, p.PI);
      p.pop();
    }
  }

  function displayWhiteCell(wbc: WhiteCell, dark: boolean): void {
    p.fill(dark ? 200 : 255, dark ? 200 : 255, dark ? 200 : 255, 180);
    p.stroke(dark ? 150 : 200, dark ? 150 : 200, dark ? 150 : 200);
    p.strokeWeight(1);
    p.circle(wbc.x, wbc.y, wbc.size);

    // Pseudopodia
    p.noFill();
    p.stroke(dark ? 120 : 200, dark ? 120 : 200, dark ? 120 : 200, 100);
    p.strokeWeight(1);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * p.TWO_PI + simTime * 0.05;
      const px = wbc.x + Math.cos(angle) * wbc.size * 1.2;
      const py = wbc.y + Math.sin(angle) * wbc.size * 1.2;
      p.line(wbc.x, wbc.y, px, py);
    }
  }

  function updateBiofilms(biofilmParam: number): void {
    biofilmClusters = [];
    if (biofilmParam < 20) return;

    const threshold = 30;
    for (let i = 0; i < bacteria.length; i++) {
      let nearbyCount = 0;
      for (let j = 0; j < bacteria.length; j++) {
        if (i !== j) {
          const d = p.dist(bacteria[i].x, bacteria[i].y, bacteria[j].x, bacteria[j].y);
          if (d < threshold) nearbyCount++;
        }
      }

      if (nearbyCount > 3) {
        bacteria[i].inBiofilm = true;
        biofilmClusters.push({
          x: bacteria[i].x,
          y: bacteria[i].y,
          size: nearbyCount * 5,
          strength: biofilmParam / 100,
        });
      } else {
        bacteria[i].inBiofilm = false;
      }
    }
  }

  function drawBiofilms(dark: boolean): void {
    for (let i = 0; i < biofilmClusters.length; i++) {
      const cluster = biofilmClusters[i];
      p.fill(
        dark ? 80 : 150,
        dark ? 120 : 200,
        dark ? 80 : 150,
        cluster.strength * 60,
      );
      p.stroke(
        dark ? 60 : 100,
        dark ? 100 : 150,
        dark ? 60 : 100,
        cluster.strength * 100,
      );
      p.strokeWeight(2);
      p.circle(cluster.x, cluster.y, cluster.size);
    }
  }

  function drawAntibioticWave(concentration: number, dark: boolean): void {
    const waveIntensity = concentration / 100;
    const waveCenter = p.width / 2;
    const waveWidth = 50 + Math.sin(simTime * 0.05) * 30;

    p.fill(
      dark ? 100 : 150,
      dark ? 60 : 100,
      dark ? 160 : 200,
      waveIntensity * 30,
    );
    p.noStroke();
    p.circle(waveCenter, p.height / 2, waveWidth);
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

const displayName = 'Colonias en Conflicto';
const description =
  'Microbiología — Ecosistema autónomo de bacterias con 3 morfologías, campo de nutrientes, antibióticos, resistencia, fagocitosis por leucocitos y formación de biofilm.';

const microbiologiaEngine: EngineModule = {
  sketch,
  paramSchema,
  presets,
  displayName,
  description,
};

export default microbiologiaEngine;
