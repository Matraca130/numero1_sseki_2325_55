// ============================================================
// BKT v3.1 — Parametros REALES del Granular Evaluation System
// (verificados 24/Feb/2026)
//
// IMPORTANTE: Este archivo es IDENTICO en todos los agentes.
// NO cambiar parametros.
//
// BKT = concept-level mastery (per subtopic)
// Complementa FSRS (card-level scheduling)
// ============================================================

const P_LEARN = 0.18;
const P_FORGET = 0.25;
const RECOVERY_FACTOR = 3.0;
const QUIZ_MULTIPLIER = 0.70;
const FLASHCARD_MULTIPLIER = 1.00;

export interface BktParams {
  currentMastery: number;
  isCorrect: boolean;
  instrumentType: 'flashcard' | 'quiz';
  previousMaxMastery?: number;
}

export function updateBKT(
  currentMastery: number,
  isCorrect: boolean,
  instrumentType: 'flashcard' | 'quiz',
  previousMaxMastery?: number
): number {
  const typeMultiplier = instrumentType === 'quiz' ? QUIZ_MULTIPLIER : FLASHCARD_MULTIPLIER;
  const recoveryMultiplier =
    previousMaxMastery && previousMaxMastery > currentMastery
      ? RECOVERY_FACTOR
      : 1.0;

  let newMastery: number;
  if (isCorrect) {
    newMastery =
      currentMastery +
      (1 - currentMastery) * P_LEARN * typeMultiplier * recoveryMultiplier;
  } else {
    newMastery = currentMastery * (1 - P_FORGET);
  }

  return Math.min(1, Math.max(0, newMastery));
}
