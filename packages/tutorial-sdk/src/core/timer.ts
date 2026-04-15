/**
 * Step timeout timer.
 * Ticks every second and fires a callback when the timeout expires.
 */

export interface TimerCallbacks {
  /** Called every ~1s with remaining milliseconds */
  onTick: (remaining: number) => void;
  /** Called when the timer reaches zero */
  onTimeout: () => void;
}

/**
 * Start a countdown timer.
 * @param durationMs - Total duration in milliseconds
 * @param callbacks - Tick and timeout callbacks
 * @returns Cleanup function to stop the timer
 */
export function startTimer(
  durationMs: number,
  callbacks: TimerCallbacks
): () => void {
  let remaining = durationMs;
  const interval = setInterval(() => {
    remaining -= 1000;
    if (remaining <= 0) {
      clearInterval(interval);
      callbacks.onTick(0);
      callbacks.onTimeout();
    } else {
      callbacks.onTick(remaining);
    }
  }, 1000);

  // Fire initial tick
  callbacks.onTick(remaining);

  return () => clearInterval(interval);
}
