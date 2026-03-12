// ============================================================
// Axon — Student Quiz: localStorage Backup for Answers
//
// Provides safe, non-throwing functions to persist and recover
// quiz answers across browser crashes, tab closures, and
// network drops.
//
// Design decisions (P1-S02):
//   - Every function is wrapped in try/catch → NEVER throws
//   - Key format: `axon_qb_{quizId}` → no tab conflicts
//   - TTL: 24h → stale backups auto-cleaned lazily
//   - Does NOT store question content or correct_answer
//   - Immutable saves (input object is never mutated)
//
// Security: SavedAnswer only contains the student's own
// answer + a boolean `correct` flag computed client-side.
// No answer keys or question text touch localStorage.
// ============================================================

import type { SavedAnswer } from '@/app/components/student/quiz-types';
import { logger } from '@/app/lib/logger';

// ── Types ────────────────────────────────────────────────

/** Shape persisted to localStorage. Intentionally excludes question content. */
export interface QuizBackupData {
  quizId: string;
  quizTitle: string;
  questionIds: string[];                    // ordered — used to validate against fresh load
  savedAnswers: Record<number, SavedAnswer>;
  currentIdx: number;
  savedAt: number;                          // Date.now() — used for TTL expiry
}

// ── Constants ──────────────────────────────────────────────

const KEY_PREFIX = 'axon_qb_';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Public API ───────────────────────────────────────────

/** Build the localStorage key for a given quizId. Pure, no I/O. */
export function getBackupKey(quizId: string): string {
  return `${KEY_PREFIX}${quizId}`;
}

/** Persist quiz answers. Never throws. Never mutates `data`. */
export function saveQuizBackup(data: QuizBackupData): void {
  try {
    const payload: QuizBackupData = { ...data, savedAt: Date.now() };
    localStorage.setItem(getBackupKey(data.quizId), JSON.stringify(payload));
    const answeredCount = Object.values(payload.savedAnswers).filter(a => a.answered).length;
    logger.debug('[QuizBackup] saved', payload.quizId, `${answeredCount}/${payload.questionIds.length} answers`);
  } catch {
    logger.warn('[QuizBackup] save failed \u2014 localStorage may be unavailable or full');
  }
}

/** Load backup if it exists, is valid, and hasn't expired. Never throws. */
export function loadQuizBackup(quizId: string): QuizBackupData | null {
  try {
    const raw = localStorage.getItem(getBackupKey(quizId));
    if (!raw) return null;

    const data = JSON.parse(raw) as QuizBackupData;

    // Shape validation — reject corrupted or foreign data
    if (
      !data ||
      typeof data !== 'object' ||
      typeof data.quizId !== 'string' ||
      typeof data.savedAt !== 'number' ||
      !Array.isArray(data.questionIds)
    ) {
      logger.warn('[QuizBackup] invalid shape, clearing', quizId);
      clearQuizBackup(quizId);
      return null;
    }

    // TTL check — auto-expire after 24 hours
    if (Date.now() - data.savedAt > TTL_MS) {
      logger.debug('[QuizBackup] expired (>24h), clearing', quizId);
      clearQuizBackup(quizId);
      return null;
    }

    return data;
  } catch {
    logger.warn('[QuizBackup] load parse failed for', quizId);
    clearQuizBackup(quizId); // corrupted → clean up
    return null;
  }
}

/** Remove a specific quiz backup. Never throws. */
export function clearQuizBackup(quizId: string): void {
  try {
    localStorage.removeItem(getBackupKey(quizId));
    logger.debug('[QuizBackup] cleared', quizId);
  } catch {
    // localStorage.removeItem can throw in edge cases (e.g. SecurityError)
    logger.warn('[QuizBackup] clear failed for', quizId);
  }
}

/**
 * Remove ALL expired backups (keys with our prefix where TTL exceeded).
 * Also removes entries with corrupted JSON. Called lazily on quiz load.
 * Never throws.
 */
export function cleanExpiredBackups(): void {
  try {
    const now = Date.now();
    const keysToCheck = Object.keys(localStorage).filter(k => k.startsWith(KEY_PREFIX));

    let cleaned = 0;
    for (const key of keysToCheck) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) { localStorage.removeItem(key); cleaned++; continue; }

        const data = JSON.parse(raw);
        if (!data?.savedAt || typeof data.savedAt !== 'number' || now - data.savedAt > TTL_MS) {
          localStorage.removeItem(key);
          cleaned++;
        }
      } catch {
        // Corrupted JSON → remove silently
        localStorage.removeItem(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('[QuizBackup] cleaned', cleaned, 'expired/corrupted entries');
    }
  } catch {
    logger.warn('[QuizBackup] cleanExpiredBackups failed \u2014 localStorage may be unavailable');
  }
}

// ── Backup validation & reorder ──────────────────────────

/** Minimum overlap ratio to consider a backup valid (50%) */
const MIN_MATCH_RATIO = 0.5;

/**
 * Validate a backup against freshly loaded question IDs.
 * If valid: reorders items to match backup order, remaps savedAnswers
 * indices, and finds the first unanswered question.
 *
 * Returns null if backup doesn't match (stale / quiz heavily edited).
 * This function is pure — no side effects, no localStorage writes.
 */
export function validateAndReorderBackup(
  backup: QuizBackupData,
  freshItems: Array<{ id: string }>,
): { reorderedIds: string[]; remappedAnswers: Record<number, SavedAnswer>; recoveryIdx: number } | null {
  if (!backup.questionIds.length || !freshItems.length) return null;

  const freshIdSet = new Set(freshItems.map(q => q.id));
  const matchCount = backup.questionIds.filter(id => freshIdSet.has(id)).length;
  const matchRatio = matchCount / backup.questionIds.length;

  if (matchRatio < MIN_MATCH_RATIO || matchCount === 0) return null;

  // Rebuild ordered question ID list: backup order first, then new questions
  const freshMap = new Map(freshItems.map(q => [q.id, q]));
  const reorderedIds: string[] = [];
  const remappedAnswers: Record<number, SavedAnswer> = {};
  let newIdx = 0;

  for (let oldIdx = 0; oldIdx < backup.questionIds.length; oldIdx++) {
    const qId = backup.questionIds[oldIdx];
    if (freshMap.has(qId)) {
      reorderedIds.push(qId);
      freshMap.delete(qId);
      if (backup.savedAnswers[oldIdx]) {
        remappedAnswers[newIdx] = backup.savedAnswers[oldIdx];
      }
      newIdx++;
    }
  }
  // Append new questions not in backup
  for (const q of freshMap.values()) {
    reorderedIds.push(q.id);
  }

  // Find first unanswered question for recovery position
  let recoveryIdx = 0;
  for (let i = 0; i < reorderedIds.length; i++) {
    if (!remappedAnswers[i]) { recoveryIdx = i; break; }
    if (i === reorderedIds.length - 1) recoveryIdx = i;
  }

  logger.debug(
    '[QuizBackup] validated:',
    `${Object.values(remappedAnswers).filter(a => a.answered).length}/${reorderedIds.length} answered,`,
    `match ${(matchRatio * 100).toFixed(0)}%`,
  );

  return { reorderedIds, remappedAnswers, recoveryIdx };
}