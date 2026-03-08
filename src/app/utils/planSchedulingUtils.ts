// ============================================================
// Axon — Plan Scheduling Utilities (shared)
//
// Pure functions used by both the StudyOrganizerWizard (initial
// plan generation) and the rescheduleEngine (dynamic rescheduling).
//
// Extracted to eliminate DT-03 (triplicated logic).
// ============================================================

import type { TopicMasteryInfo } from '@/app/hooks/useTopicMastery';
import { HIGH_PRIORITY_THRESHOLD } from './constants';

// ── Time Multiplier ──────────────────────────────────────────
// Adjusts estimated time based on student's mastery of a topic.
// Weak topics get more time, strong topics get less.

export function getTimeMultiplier(
  topicId: string,
  mastery: Map<string, TopicMasteryInfo>,
): number {
  const m = mastery.get(topicId);
  if (!m || m.totalAttempts === 0) return 1.0;
  if (m.masteryPercent < 30) return 1.5;
  if (m.masteryPercent < 50) return 1.3;
  if (m.masteryPercent >= 80) return 0.7;
  if (m.masteryPercent >= 65) return 0.85;
  return 1.0;
}

// ── Interleave ───────────────────────────────────────────────
// Merges high-priority and normal-priority items in a 2:1 ratio.
// This ensures weak topics get more attention while keeping variety.

export function interleaveByPriority<T>(
  items: T[],
  getPriority: (item: T) => number,
): T[] {
  const highPrio = items.filter(item => getPriority(item) >= HIGH_PRIORITY_THRESHOLD);
  const normalPrio = items.filter(item => getPriority(item) < HIGH_PRIORITY_THRESHOLD);

  const result: T[] = [];
  let hi = 0;
  let lo = 0;

  while (hi < highPrio.length || lo < normalPrio.length) {
    if (hi < highPrio.length) result.push(highPrio[hi++]);
    if (hi < highPrio.length) result.push(highPrio[hi++]);
    if (lo < normalPrio.length) result.push(normalPrio[lo++]);
  }

  return result;
}

// ── Day Distribution ─────────────────────────────────────────
// Distributes items across available days based on weeklyHours budget.
// Returns items with their assigned dates.

export interface DistributableItem {
  minutes: number;
}

export interface DistributedItem<T> {
  item: T;
  date: Date;
}

/**
 * Distributes items across days from `startDate` to `endDate`,
 * respecting the daily hour budget from `weeklyHours`.
 *
 * @param items - Items to distribute (must have `.minutes`)
 * @param startDate - First available day
 * @param endDate - Last available day (deadline)
 * @param weeklyHours - [mon, tue, wed, thu, fri, sat, sun] hours per day
 * @param tolerance - Minutes of tolerance over budget (default: 10)
 * @returns Distributed items with dates. Overflow items get endDate.
 */
export function distributeAcrossDays<T extends DistributableItem>(
  items: T[],
  startDate: Date,
  endDate: Date,
  weeklyHours: number[],
  tolerance: number = 10,
): DistributedItem<T>[] {
  const result: DistributedItem<T>[] = [];
  const currentDay = new Date(startDate);
  let itemIdx = 0;

  while (currentDay <= endDate && itemIdx < items.length) {
    const dayOfWeek = currentDay.getDay(); // 0=Sun ... 6=Sat
    const hoursIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0 ... Sun=6
    const availableMinutes = weeklyHours[hoursIdx] * 60;

    if (availableMinutes > 0) {
      let usedMinutes = 0;
      while (usedMinutes < availableMinutes && itemIdx < items.length) {
        const item = items[itemIdx];
        if (usedMinutes + item.minutes <= availableMinutes + tolerance) {
          result.push({
            item,
            date: new Date(currentDay),
          });
          usedMinutes += item.minutes;
          itemIdx++;
        } else {
          break;
        }
      }
    }

    currentDay.setDate(currentDay.getDate() + 1);
  }

  // Overflow: items that don't fit go to the end date
  while (itemIdx < items.length) {
    result.push({
      item: items[itemIdx],
      date: new Date(endDate),
    });
    itemIdx++;
  }

  return result;
}
