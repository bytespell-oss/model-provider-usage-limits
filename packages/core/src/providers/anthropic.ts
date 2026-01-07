/**
 * Anthropic provider usage adapter
 */

import type { UsageSnapshot, UsageOptions, UsageResult } from '../types.js';
import { ProviderUsageError } from '../types.js';
import {
  readCentralizedCache,
  isCacheFresh,
  getCacheMetadata,
  updateProviderInCache,
  DEFAULT_CACHE_TTL_MS,
} from '../utils/cache.js';
import { fetchWithTimeout } from '../utils/fetch.js';
import { calculatePaceDelta } from '../utils/pace.js';

const PROVIDER_ID = 'anthropic' as const;

interface AnthropicUsageResponse {
  five_hour?: {
    utilization?: number;
    resets_at?: string;
  };
  seven_day?: {
    utilization?: number;
    resets_at?: string;
  };
}

/**
 * Fetch Anthropic usage from OAuth API
 */
async function fetchAnthropicUsage(
  token: string,
  timeout?: number,
): Promise<AnthropicUsageResponse> {
  const response = await fetchWithTimeout(
    'https://api.anthropic.com/api/oauth/usage',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20',
      },
      timeout,
    },
    PROVIDER_ID,
  );

  if (!response.ok) {
    throw new ProviderUsageError(
      `Anthropic API returned ${response.status}`,
      PROVIDER_ID,
      'API_ERROR',
    );
  }

  return response.json() as Promise<AnthropicUsageResponse>;
}

/**
 * Normalize Anthropic API response to UsageSnapshot
 */
function normalizeAnthropicUsage(data: AnthropicUsageResponse): UsageSnapshot {
  const fiveHourUsed = data.five_hour?.utilization ?? 0;
  const fiveHourResets = data.five_hour?.resets_at ?? null;
  const sevenDayUsed = data.seven_day?.utilization ?? 0;
  const sevenDayResets = data.seven_day?.resets_at ?? null;
  
  return {
    provider: PROVIDER_ID,
    primary: data.five_hour
      ? {
          usedPercent: fiveHourUsed,
          window: '5h',
          resetsAt: fiveHourResets,
          paceDelta: calculatePaceDelta(fiveHourUsed, '5h', fiveHourResets),
        }
      : null,
    secondary: data.seven_day
      ? {
          usedPercent: sevenDayUsed,
          window: '7d',
          resetsAt: sevenDayResets,
          paceDelta: calculatePaceDelta(sevenDayUsed, '7d', sevenDayResets),
        }
      : null,
  };
}

/**
 * Get Anthropic usage with caching
 * 
 * @param token - Anthropic access token (null if not authenticated)
 * @param options - Cache and fetch options
 */
export async function getAnthropicUsage(
  token: string | null,
  options?: UsageOptions,
): Promise<UsageResult> {
  if (!token) {
    return {
      provider: PROVIDER_ID,
      data: null,
    };
  }

  const cacheTTL = options?.cacheTTL ?? DEFAULT_CACHE_TTL_MS;
  const bypassCache = options?.bypassCache ?? false;

  // Read centralized cache
  const cache = bypassCache ? null : readCentralizedCache();
  const cachedEntry = cache?.[PROVIDER_ID];

  // Return fresh cache if available
  if (cachedEntry && isCacheFresh(cachedEntry, cacheTTL)) {
    const cacheMetadata = getCacheMetadata(cachedEntry);
    return {
      provider: PROVIDER_ID,
      data: cachedEntry.data,
      cache: cacheMetadata ?? undefined,
    };
  }

  // Fetch fresh data
  try {
    const data = await fetchAnthropicUsage(token, options?.timeout);
    const snapshot = normalizeAnthropicUsage(data);
    updateProviderInCache(PROVIDER_ID, snapshot);
    return {
      provider: PROVIDER_ID,
      data: snapshot,
    };
  } catch (error) {
    const providerError = error instanceof ProviderUsageError
      ? error
      : new ProviderUsageError(
          `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
          PROVIDER_ID,
          'UNKNOWN',
          error,
        );

    // Try to return stale cache as fallback
    const staleCache = readCentralizedCache()?.[PROVIDER_ID];
    if (staleCache) {
      const cacheMetadata = getCacheMetadata(staleCache);
      return {
        provider: PROVIDER_ID,
        data: staleCache.data,
        error: providerError,
        cache: cacheMetadata ?? undefined,
      };
    }

    // No cache available, return error only
    return {
      provider: PROVIDER_ID,
      data: null,
      error: providerError,
    };
  }
}
