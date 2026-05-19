// Runs `fn` over `items` with at most `limit` promises in flight at once.
// Results preserve input order. Used to parallelise the per-post Instagram
// insights fetches so the sync cron completes inside the function timeout
// instead of doing ~125 serial round-trips.
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0

  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++
      if (i >= items.length) return
      results[i] = await fn(items[i], i)
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: workerCount }, worker))
  return results
}
