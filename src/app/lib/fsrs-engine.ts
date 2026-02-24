// ============================================================
// FSRS simplificado — card-level scheduling
//
// Complementa BKT (concept-level mastery)
// BKT = "cuanto sabe del concepto"
// FSRS = "cuando repasar esta card"
// ============================================================

export interface FsrsState {
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  state: string; // "new" | "learning" | "review" | "relearning"
}

export interface FsrsUpdate extends FsrsState {
  due_at: string; // ISO timestamp de proxima revision
}

export function computeFsrsUpdate(
  currentState: FsrsState,
  grade: 1 | 2 | 3 | 4 // 1=Again, 2=Hard, 3=Good, 4=Easy
): FsrsUpdate {
  let { stability, difficulty, reps, lapses, state } = currentState;

  // Ajustar dificultad (0-10 scale)
  difficulty = Math.min(10, Math.max(0, difficulty + (grade < 3 ? 0.5 : -0.3)));

  if (grade === 1) {
    lapses += 1;
    stability = Math.max(0.5, stability * 0.5);
    state = 'relearning';
    reps = 0;
  } else if (grade === 2) {
    stability = stability * 1.2;
    reps += 1;
    state = 'review';
  } else if (grade === 3) {
    stability = stability * (2.5 - 0.15 * difficulty);
    reps += 1;
    state = 'review';
  } else {
    stability = stability * (2.5 - 0.15 * difficulty) * 1.3;
    reps += 1;
    state = 'review';
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + Math.max(1, Math.round(stability)));

  return {
    stability: Math.round(stability * 100) / 100,
    difficulty: Math.round(difficulty * 100) / 100,
    reps,
    lapses,
    state,
    due_at: dueDate.toISOString(),
  };
}

export function getInitialFsrsState(): FsrsState {
  return { stability: 1, difficulty: 5, reps: 0, lapses: 0, state: 'new' };
}
