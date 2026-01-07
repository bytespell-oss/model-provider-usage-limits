/**
 * Model Provider Usage Limits
 * 
 * Fetch AI provider usage limits with pace tracking and smart routing.
 * 
 * @packageDocumentation
 */

// Types
export type { ProviderID, UsageSnapshot, UsageOptions, UsageResult } from './types.js';
export { ProviderUsageError } from './types.js';

// Router types and functions
export type { RoutableModel, RouterCandidate, RouterResult } from './router.js';
export { pickBestProvider, listRoutableModels, ROUTABLE_MODELS } from './router.js';

// Utilities
export { calculatePaceDelta } from './utils/pace.js';

import type { ProviderID, UsageResult, UsageOptions } from './types.js';
import { getAnthropicUsage } from './providers/anthropic.js';
import { getCopilotUsage } from './providers/copilot.js';
import { getCodexUsage } from './providers/codex.js';

/**
 * List all supported provider IDs.
 */
export function listSupportedProviders(): ProviderID[] {
  return ['anthropic', 'github-copilot', 'openai'];
}

/**
 * Get usage data for a specific provider.
 * 
 * @param providerID - Provider to query
 * @param options - Cache and fetch options
 * @returns UsageResult with data, optional error, and cache metadata
 */
export async function getUsage(
  providerID: ProviderID,
  options?: UsageOptions,
): Promise<UsageResult> {
  switch (providerID) {
    case 'anthropic':
      return getAnthropicUsage(options);
    case 'github-copilot':
      return getCopilotUsage(options);
    case 'openai':
      return getCodexUsage(options);
    default:
      throw new Error(`Unknown provider: ${providerID satisfies never}`);
  }
}

/**
 * Get usage data for all supported providers.
 * 
 * @param options - Cache and fetch options
 * @returns Map of provider IDs to usage results with data, errors, and cache metadata
 */
export async function getAllUsage(
  options?: UsageOptions,
): Promise<Record<ProviderID, UsageResult>> {
  const providers = listSupportedProviders();
  const results = await Promise.all(
    providers.map((p) => getUsage(p, options)),
  );

  const output: Record<string, UsageResult> = {};
  for (let i = 0; i < providers.length; i++) {
    output[providers[i]] = results[i];
  }

  return output as Record<ProviderID, UsageResult>;
}
