/**
 * GitHub Copilot provider usage adapter
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

const PROVIDER_ID = 'github-copilot' as const;

interface CopilotQuotaSnapshot {
  entitlement: number;
  remaining: number;
  percent_remaining: number;
  unlimited: boolean;
}

interface CopilotUsageResponse {
  copilot_plan: string;
  quota_reset_date: string;
  quota_snapshots: {
    chat: CopilotQuotaSnapshot;
    completions: CopilotQuotaSnapshot;
    premium_interactions: CopilotQuotaSnapshot;
  };
}

/**
 * Fetch Copilot usage from GitHub internal API
 */
async function fetchCopilotUsage(
  token: string,
  timeout?: number,
): Promise<CopilotUsageResponse> {
  const response = await fetchWithTimeout(
    'https://api.github.com/copilot_internal/user',
    {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/json',
        'User-Agent': 'opencode-provider-usage-limits/1.0',
      },
      timeout,
    },
    PROVIDER_ID,
  );

  if (!response.ok) {
    throw new ProviderUsageError(
      `GitHub Copilot API returned ${response.status}`,
      PROVIDER_ID,
      'API_ERROR',
    );
  }

  return response.json() as Promise<CopilotUsageResponse>;
}

/**
 * Normalize Copilot API response to UsageSnapshot
 */
function normalizeCopilotUsage(data: CopilotUsageResponse): UsageSnapshot {
  const premium = data.quota_snapshots.premium_interactions;
  const usedPercent = Math.round(100 - premium.percent_remaining);
  const resetsAt = data.quota_reset_date;

  return {
    provider: PROVIDER_ID,
    primary: {
      usedPercent,
      window: 'monthly',
      resetsAt,
      paceDelta: calculatePaceDelta(usedPercent, 'monthly', resetsAt),
    },
    secondary: null, // Copilot only has monthly quota
    metadata: {
      plan: data.copilot_plan,
      credits: {
        balance: premium.remaining,
        unlimited: premium.unlimited,
      },
      entitlement: premium.entitlement,
    },
  };
}

/**
 * Get Copilot usage with caching
 * 
 * @param token - GitHub Copilot token (null if not authenticated)
 * @param options - Cache and fetch options
 */
export async function getCopilotUsage(
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
    const data = await fetchCopilotUsage(token, options?.timeout);
    const snapshot = normalizeCopilotUsage(data);
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
