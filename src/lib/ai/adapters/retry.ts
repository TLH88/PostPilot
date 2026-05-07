/**
 * Bounded exponential-backoff retry, used by adapters when calling a
 * provider's models endpoint.
 *
 * Owner direction 2026-05-07: when fetchModels fails, keep the existing
 * ai_models rows untouched and retry up to 3 times with backoff before
 * giving up and surfacing a non-blocking warning.
 *
 * `shouldRetry` lets adapters distinguish transient errors (5xx, rate
 * limits, timeouts) from permanent ones (401 invalid key, 403 perms) —
 * we only retry the transient class.
 */

export interface RetryOptions {
  attempts?: number;
  /** Base delay in ms for exponential backoff (delay = base * 2^attempt). */
  baseDelayMs?: number;
  /** Override transient-error detection. Default: any thrown error retries. */
  shouldRetry?: (err: unknown) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseDelay = opts.baseDelayMs ?? 250;
  const shouldRetry = opts.shouldRetry ?? (() => true);

  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1 || !shouldRetry(err)) {
        throw err;
      }
      // Backoff: 250ms, 500ms, 1000ms (jitter optional, kept simple here)
      await new Promise((r) => setTimeout(r, baseDelay * 2 ** i));
    }
  }
  // Unreachable — the loop either returns or throws on the last attempt.
  throw lastErr;
}
