export interface RetryOptions {
  retries?: number
  baseDelayMs?: number
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// Exponential backoff with full jitter.
function backoffMs(attempt: number, base: number): number {
  return base * 2 ** attempt + Math.random() * base
}

// fetch() that retries on transient failures only: network errors, HTTP 429,
// and 5xx. 4xx (bad token, deleted media, etc.) is returned immediately so
// callers can handle it without burning retries.
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  opts: RetryOptions = {}
): Promise<Response> {
  const retries = opts.retries ?? 3
  const baseDelayMs = opts.baseDelayMs ?? 500
  let attempt = 0

  while (true) {
    try {
      const res = await fetch(url, init)
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await sleep(backoffMs(attempt, baseDelayMs))
        attempt++
        continue
      }
      return res
    } catch (err) {
      if (attempt >= retries) throw err
      await sleep(backoffMs(attempt, baseDelayMs))
      attempt++
    }
  }
}
