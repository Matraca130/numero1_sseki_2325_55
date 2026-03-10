// ============================================================
// Axon — Shared Concurrency Utilities
//
// Extracted from keywordMasteryApi.ts and adaptiveGenerationApi.ts
// where it was duplicated identically. Single source of truth.
//
// Used by:
//   - keywordMasteryApi.ts (keyword fetching with 4 concurrent)
//   - adaptiveGenerationApi.ts (AI generation with 3 concurrent)
// ============================================================

/**
 * Run an array of async task factories with a concurrency limit.
 *
 * WHY NOT Promise.all with chunking:
 * Chunking waits for ALL items in a chunk to finish before starting
 * the next chunk. With varying latencies (2-8s), a slow call
 * blocks the next chunk. parallelWithLimit fills slots immediately
 * when one completes, maximizing throughput.
 *
 * @returns Results in the SAME ORDER as the input tasks array,
 *          matching Promise.allSettled semantics.
 */
export async function parallelWithLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;
      try {
        const value = await tasks[idx]();
        results[idx] = { status: 'fulfilled', value };
      } catch (reason: any) {
        results[idx] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => runNext()
  );
  await Promise.all(workers);
  return results;
}
