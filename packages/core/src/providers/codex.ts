/**
 * OpenAI Codex provider usage adapter
 */

import type { UsageSnapshot, UsageOptions, UsageResult } from '../types.js';
import { ProviderUsageError } from '../types.js';
import { getCodexToken } from '../utils/auth.js';
import {
  readCentralizedCache,
  isCacheFresh,
  getCacheMetadata,
  updateProviderInCache,
  DEFAULT_CACHE_TTL_MS,
} from '../utils/cache.js';
import { fetchWithTimeout } from '../utils/fetch.js';
import { calculatePaceDelta } from '../utils/pace.js';

const PROVIDER_ID = 'openai' as const;

interface CodexUsageResponse {
  plan_type?: string;
  rate_limit?: {
    allowed?: boolean;
    limit_reached?: boolean;
    primary_window?: {
      used_percent?: number;
      limit_window_seconds?: number;
      reset_after_seconds?: number;
      reset_at?: number;
    };
    secondary_window?: {
      used_percent?: number;
      limit_window_seconds?: number;
      reset_after_seconds?: number;
      reset_at?: number;
    } | null;
  };
  code_review_rate_limit?: {
    allowed?: boolean;
    limit_reached?: boolean;
    primary_window?: {
      used_percent?: number;
      limit_window_seconds?: number;
      reset_after_seconds?: number;
      reset_at?: number;
    };
    secondary_window?: null;
  };
  credits?: {
    has_credits?: boolean;
    unlimited?: boolean;
    balance?: string;
    approx_local_messages?: [number, number];
    approx_cloud_messages?: [number, number];
  };
}

/**
 * Fetch Codex usage from ChatGPT backend API
 */
async function fetchCodexUsage(
  token: string,
  timeout?: number,
): Promise<CodexUsageResponse> {
  const response = await fetchWithTimeout(
    'https://chatgpt.com/backend-api/wham/usage',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': '*/*',
      },
      timeout,
    },
    PROVIDER_ID,
  );

  if (!response.ok) {
    throw new ProviderUsageError(
      `Codex API returned ${response.status}`,
      PROVIDER_ID,
      'API_ERROR',
    );
  }

  return response.json() as Promise<CodexUsageResponse>;
}

/**
 * Convert seconds to human-readable window description
 */
function formatWindow(seconds: number): string {
  const hours = seconds / 3600;
  const days = seconds / 86400;
  
  if (days >= 1) {
    return `${Math.round(days)}d`;
  }
  return `${Math.round(hours)}h`;
}

/**
 * Normalize Codex API response to UsageSnapshot
 */
function normalizeCodexUsage(data: CodexUsageResponse): UsageSnapshot {
  const primary = data.rate_limit?.primary_window;
  const secondary = data.rate_limit?.secondary_window;
  
  const primaryUsed = primary?.used_percent ?? 0;
  const primaryWindow = formatWindow(primary?.limit_window_seconds ?? 0);
  const primaryResets = primary?.reset_at ? new Date(primary.reset_at * 1000).toISOString() : null;
  
  const secondaryUsed = secondary?.used_percent ?? 0;
  const secondaryWindow = formatWindow(secondary?.limit_window_seconds ?? 0);
  const secondaryResets = secondary?.reset_at ? new Date(secondary.reset_at * 1000).toISOString() : null;
  
  return {
    provider: PROVIDER_ID,
    primary: primary
      ? {
          usedPercent: primaryUsed,
          window: primaryWindow,
          resetsAt: primaryResets,
          paceDelta: calculatePaceDelta(primaryUsed, primaryWindow, primaryResets),
        }
      : null,
    secondary: secondary
      ? {
          usedPercent: secondaryUsed,
          window: secondaryWindow,
          resetsAt: secondaryResets,
          paceDelta: calculatePaceDelta(secondaryUsed, secondaryWindow, secondaryResets),
        }
      : null,
    metadata: {
      plan: data.plan_type,
      credits: {
        balance: data.credits?.balance ? parseFloat(data.credits.balance) : null,
        unlimited: data.credits?.unlimited ?? false,
      },
    },
  };
}

/**
 * Get Codex usage with caching
 */
export async function getCodexUsage(
  options?: UsageOptions,
): Promise<UsageResult> {
  const token = getCodexToken();
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
    const data = await fetchCodexUsage(token, options?.timeout);
    const snapshot = normalizeCodexUsage(data);
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
