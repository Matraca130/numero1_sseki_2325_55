/**
 * Topological sort of topics based on prerequisite relationships.
 * Uses Kahn's algorithm with cycle detection fallback.
 */

import { logger } from '@/app/lib/logger';

/**
 * @internal — not yet consumed, planned for future iteration
 *
 * Topological sort of topics based on prerequisite_topic_ids.
 * Topics with no prerequisites come first.
 * Falls back to original order if cycles are detected.
 */
export function orderByPrerequisites(
  topics: Array<{ topicId: string; prerequisiteIds: string[] }>,
): string[] {
  const graph = new Map<string, string[]>(); // topic -> prerequisites
  const allIds = new Set(topics.map(t => t.topicId));

  // Build dependency graph (only include prerequisites that are in our topic set)
  for (const t of topics) {
    const validPrereqs = t.prerequisiteIds.filter(id => allIds.has(id));
    graph.set(t.topicId, validPrereqs);
  }

  // Kahn's algorithm for topological sort
  // In-degree = number of prerequisites a topic has (not how many depend on it)
  const inDegree = new Map<string, number>();
  for (const [topicId, prereqs] of graph) {
    inDegree.set(topicId, prereqs.length);
  }
  // Ensure all topics have an entry (including those with 0 prerequisites)
  for (const id of allIds) {
    if (!inDegree.has(id)) inDegree.set(id, 0);
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  // Build reverse adjacency map: prerequisite -> topics that depend on it
  const dependents = new Map<string, string[]>();
  for (const [topicId, prereqs] of graph) {
    for (const prereq of prereqs) {
      if (!dependents.has(prereq)) dependents.set(prereq, []);
      dependents.get(prereq)!.push(topicId);
    }
  }

  const result: string[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    result.push(current);

    // Find topics that depend on this one (O(1) lookup via reverse map)
    for (const dep of dependents.get(current) ?? []) {
      if (!visited.has(dep)) {
        const newDegree = (inDegree.get(dep) ?? 0) - 1;
        inDegree.set(dep, newDegree);
        if (newDegree <= 0) {
          queue.push(dep);
        }
      }
    }
  }

  // If not all topics were visited (cycle detected), append remaining in original order
  if (result.length < allIds.size) {
    logger.warn('SchedulingIntelligence', 'Cycle detected in prerequisites, falling back to original order', { totalTopics: allIds.size, orderedCount: result.length });
    for (const t of topics) {
      if (!visited.has(t.topicId)) {
        result.push(t.topicId);
      }
    }
  }

  return result;
}
