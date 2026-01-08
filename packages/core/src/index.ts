/**
 * Model Provider Usage Limits
 * 
 * Fetch AI provider usage limits with pace tracking and smart routing.
 * 
 * @packageDocumentation
 */

// Types
export type { ProviderID, UsageSnapshot, UsageOptions, UsageResult, ProviderTokens } from './types.js';
export { ProviderUsageError } from './types.js';

// Router types and functions
export type { RoutingInput, RouterCandidate, RouterResult } from './router.js';
export { 
  pickBestProvider, 
  getAlternateProviders, 
  transformModelID, 
  normalizeModelID,
  isRoutableModel,
} from './router.js';

// Utilities
export { calculatePaceDelta } from './utils/pace.js';

// Auth detection utilities
export { 
  detectAuthTokens,
  getOpenCodeAuthPath,
  readOpenCodeAuth,
  getAnthropicToken,
  getCopilotToken,
  getCodexToken,
} from './utils/auth.js';

// Test mode utilities
export type { TestScenario } from './utils/test-mode.js';
export { isTestModeEnabled, getTestScenario, generateTestUsage } from './utils/test-mode.js';

import type { ProviderID, UsageResult, UsageOptions, ProviderTokens } from './types.js';
import { detectAuthTokens } from './utils/auth.js';
import { getAnthropicUsage } from './providers/anthropic.js';
import { getCopilotUsage } from './providers/copilot.js';
import { getCodexUsage } from './providers/codex.js';
import { isTestModeEnabled, getTestScenario, generateTestUsage } from './utils/test-mode.js';

/**
 * List all supported provider IDs.
 */
export function listSupportedProviders(): ProviderID[] {
  return ['anthropic', 'github-copilot', 'openai'];
}

/**
 * Options for fetching usage data.
 */
export interface GetUsageOptions extends UsageOptions {
  /** 
   * Provider tokens - map of provider ID to auth token.
   * Optional when autoDetectAuthTokens is true.
   */
  tokens?: ProviderTokens;
}

/**
 * Get usage data for providers.
 * 
 * Pass a tokens object mapping provider IDs to their auth tokens,
 * or use autoDetectAuthTokens to automatically read tokens from known sources.
 * 
 * @example
 * ```typescript
 * // Auto-detect tokens from OpenCode auth.json
 * const results = await getUsage({ autoDetectAuthTokens: true });
 * 
 * // Single provider with explicit token
 * const result = await getUsage({ tokens: { anthropic: 'sk-...' } });
 * 
 * // Multiple providers with explicit tokens
 * const results = await getUsage({ 
 *   tokens: { 
 *     anthropic: 'sk-...',
 *     'github-copilot': 'gh-...' 
 *   }
 * });
 * 
 * // Auto-detect with explicit override (explicit takes priority)
 * const results = await getUsage({ 
 *   autoDetectAuthTokens: true,
 *   tokens: { anthropic: 'my-override-token' }
 * });
 * ```
 * 
 * @param options - Tokens and fetch options
 * @returns Map of provider IDs to usage results
 */
export async function getUsage(
  options: GetUsageOptions,
): Promise<Partial<Record<ProviderID, UsageResult>>> {
  const { tokens: explicitTokens, autoDetectAuthTokens, ...fetchOptions } = options;
  
  // Build final tokens: auto-detected (if enabled) merged with explicit (explicit wins)
  let tokens: ProviderTokens = {};
  
  if (autoDetectAuthTokens) {
    tokens = detectAuthTokens();
  }
  
  // Explicit tokens override auto-detected ones
  if (explicitTokens) {
    tokens = { ...tokens, ...explicitTokens };
  }
  
  // Test mode: return simulated data
  if (isTestModeEnabled()) {
    const scenario = getTestScenario();
    const testData = generateTestUsage(scenario);
    const results: Partial<Record<ProviderID, UsageResult>> = {};
    
    for (const [providerID, snapshot] of Object.entries(testData)) {
      results[providerID as ProviderID] = {
        provider: providerID as ProviderID,
        data: snapshot,
      };
    }
    
    return results;
  }
  
  // Normal mode: fetch from APIs
  const results: Partial<Record<ProviderID, UsageResult>> = {};

  const providerFetchers: Record<ProviderID, (token: string | null, opts?: UsageOptions) => Promise<UsageResult>> = {
    'anthropic': getAnthropicUsage,
    'github-copilot': getCopilotUsage,
    'openai': getCodexUsage,
  };

  // Build list of providers to fetch (only those with tokens provided)
  const providersToFetch = (Object.keys(tokens) as ProviderID[]).filter(
    (p) => tokens[p] !== undefined
  );

  // Fetch all providers in parallel
  const fetchPromises = providersToFetch.map(async (providerID) => {
    const token = tokens[providerID] ?? null;
    const fetcher = providerFetchers[providerID];
    if (fetcher) {
      const result = await fetcher(token, fetchOptions);
      return { providerID, result };
    }
    return null;
  });

  const fetchResults = await Promise.all(fetchPromises);
  
  for (const item of fetchResults) {
    if (item) {
      results[item.providerID] = item.result;
    }
  }

  return results;
}

/**
 * Get usage data for all providers with tokens.
 * 
 * @deprecated Use getUsage() instead - it handles single and multiple providers
 */
export async function getAllUsage(
  options: GetUsageOptions,
): Promise<Partial<Record<ProviderID, UsageResult>>> {
  return getUsage(options);
}
