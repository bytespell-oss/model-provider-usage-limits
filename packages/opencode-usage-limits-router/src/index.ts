/**
 * OpenCode Usage Limits Router
 * 
 * OpenCode integration for AI provider usage limits.
 * Reads authentication from OpenCode's auth.json.
 * 
 * @packageDocumentation
 */

export const VERSION = '0.1.0';

// Re-export core types and functions for convenience
export type {
  ProviderID,
  UsageResult,
  UsageSnapshot,
  UsageOptions,
  ProviderTokens,
  GetUsageOptions,
  RoutableModel,
  RouterResult,
  RouterCandidate,
} from '@bytespell/model-provider-usage-limits';

export {
  getUsage,
  getAllUsage,
  listSupportedProviders,
  pickBestProvider,
  listRoutableModels,
  ROUTABLE_MODELS,
  calculatePaceDelta,
  ProviderUsageError,
} from '@bytespell/model-provider-usage-limits';

// Export auth utilities
export {
  getProviderTokens,
  readOpenCodeAuth,
  getOpenCodeAuthPath,
  getAnthropicToken,
  getCopilotToken,
  getCodexToken,
} from './auth.js';

// Export OpenCode plugin
export { UsageLimitsPlugin, UsageLimitsPlugin as default } from './plugin.js';
