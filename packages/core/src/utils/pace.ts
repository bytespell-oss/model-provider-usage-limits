/**
 * Pace calculation utilities
 */

/**
 * Parse window string to milliseconds
 */
function parseWindowToMs(window: string): number | null {
  const match = window.match(/^(\d+)([hd])$/);
  if (!match) {
    return null;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  if (unit === "h") {
    return value * 60 * 60 * 1000;
  } else if (unit === "d") {
    return value * 24 * 60 * 60 * 1000;
  }

  return null;
}

/**
 * Calculate pace delta for a usage window.
 *
 * @param usedPercent - Current usage percentage (0-100)
 * @param window - Window description (e.g., "5h", "7d", "30d")
 * @param resetsAt - ISO 8601 timestamp when the window resets
 * @returns Pace delta (positive = ahead/slow down, negative = behind/speed up), or null if cannot calculate
 */
export function calculatePaceDelta(
  usedPercent: number,
  window: string,
  resetsAt: string | null,
): number | null {
  if (resetsAt === null) {
    return null;
  }

  const windowDurationMs = parseWindowToMs(window);
  if (windowDurationMs === null) {
    return null;
  }

  const now = Date.now();
  const resetTime = new Date(resetsAt).getTime();

  // Calculate time remaining and elapsed
  const timeRemainingMs = resetTime - now;
  const timeElapsedMs = windowDurationMs - timeRemainingMs;

  // Handle edge cases
  if (timeElapsedMs <= 0 || timeRemainingMs <= 0) {
    // Window just reset or about to reset - skip pace calculation
    return null;
  }

  // Calculate expected usage at this point (linear pace)
  const percentThroughWindow = (timeElapsedMs / windowDurationMs) * 100;
  const expectedUsedPercent = percentThroughWindow;

  // Calculate delta: positive = ahead of pace, negative = behind pace
  const delta = usedPercent - expectedUsedPercent;

  return Math.round(delta);
}
