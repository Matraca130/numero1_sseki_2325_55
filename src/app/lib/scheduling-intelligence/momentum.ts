/**
 * Study momentum scoring.
 * Computes a rolling momentum score based on recent study session completion
 * and time adherence over a 7-day window.
 */

/**
 * @internal — not yet consumed, planned for future iteration
 *
 * Compute a rolling study momentum score (0.5-1.5).
 *
 * - 1.0 = baseline (student is on track)
 * - > 1.0 = student is ahead, can push harder (max 1.5)
 * - < 1.0 = student is behind, ease back (min 0.5)
 *
 * Used as a multiplier on daily task count.
 */
export function computeStudyMomentum(
  recentSessions: Array<{
    date: string;        // ISO date (YYYY-MM-DD)
    completed: boolean;
    scheduledMinutes: number;
    actualMinutes: number;
  }>,
): { score: number; trend: 'rising' | 'stable' | 'falling'; streak: number } {
  // Edge case: no sessions at all
  if (recentSessions.length === 0) {
    return { score: 1.0, trend: 'stable', streak: 0 };
  }

  // Step 1: Take only the last 7 days of sessions
  const sorted = [...recentSessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const last7 = sorted.slice(-14);

  // Deduplicate by date, aggregating within each day
  const byDate = new Map<string, { completed: number; total: number; actualMin: number; scheduledMin: number }>();
  for (const s of last7) {
    const dateKey = s.date.slice(0, 10); // normalize to YYYY-MM-DD
    const existing = byDate.get(dateKey) ?? { completed: 0, total: 0, actualMin: 0, scheduledMin: 0 };
    existing.total += 1;
    if (s.completed) existing.completed += 1;
    existing.actualMin += s.actualMinutes;
    existing.scheduledMin += s.scheduledMinutes;
    byDate.set(dateKey, existing);
  }

  // Keep only last 7 unique dates
  const dateEntries = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7);

  if (dateEntries.length === 0) {
    return { score: 1.0, trend: 'stable', streak: 0 };
  }

  // Step 2: Compute completion rate
  let totalSessions = 0;
  let completedSessions = 0;
  for (const [, day] of dateEntries) {
    totalSessions += day.total;
    completedSessions += day.completed;
  }
  const completionRate = totalSessions > 0 ? completedSessions / totalSessions : 0;

  // Step 3: Compute time adherence (actual / scheduled)
  let totalScheduled = 0;
  let totalActual = 0;
  for (const [, day] of dateEntries) {
    totalScheduled += day.scheduledMin;
    totalActual += day.actualMin;
  }
  // Clamp time adherence to [0, 1.5] — studying 50% more than planned is the max bonus
  const rawTimeAdherence = totalScheduled > 0 ? totalActual / totalScheduled : 1.0;
  const timeAdherence = Math.min(rawTimeAdherence, 1.5);

  // Step 4: Combined score = 0.6 * completionRate + 0.4 * timeAdherence
  const rawScore = 0.6 * completionRate + 0.4 * timeAdherence;

  // Step 5: Clamp to [0.5, 1.5]
  const score = Math.round(Math.max(0.5, Math.min(1.5, rawScore)) * 100) / 100;

  // Step 6: Detect trend (first half vs second half of the window)
  const midpoint = Math.floor(dateEntries.length / 2);
  const firstHalf = dateEntries.slice(0, midpoint);
  const secondHalf = dateEntries.slice(midpoint);

  function halfCompletionRate(entries: Array<[string, { completed: number; total: number }]>): number {
    let t = 0, c = 0;
    for (const [, d] of entries) { t += d.total; c += d.completed; }
    return t > 0 ? c / t : 0;
  }

  const firstRate = halfCompletionRate(firstHalf);
  const secondRate = halfCompletionRate(secondHalf);
  const rateDelta = secondRate - firstRate;

  const TREND_THRESHOLD = 0.1; // 10% difference to register a trend
  const trend: 'rising' | 'stable' | 'falling' =
    rateDelta > TREND_THRESHOLD ? 'rising'
    : rateDelta < -TREND_THRESHOLD ? 'falling'
    : 'stable';

  // Step 7: Count current streak (consecutive days with at least 1 completed session, from most recent)
  let streak = 0;
  const reversedDates = [...dateEntries].reverse();
  for (const [, day] of reversedDates) {
    if (day.completed > 0) {
      streak++;
    } else {
      break;
    }
  }

  return { score, trend, streak };
}
