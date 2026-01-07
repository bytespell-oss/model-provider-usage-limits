/**
 * Fetch utilities with timeout support
 */

import type { ProviderID } from '../types.js';
import { ProviderUsageError } from '../types.js';

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Fetch with timeout and error handling
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {},
  provider: ProviderID,
): Promise<Response> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ProviderUsageError(
        `Request timed out after ${timeout}ms`,
        provider,
        'TIMEOUT',
        error,
      );
    }

    throw new ProviderUsageError(
      `Fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      provider,
      'API_ERROR',
      error,
    );
  }
}
