/**
 * Provider-based router logic for picking best provider based on usage limits.
 * 
 * Instead of maintaining a hardcoded list of routable models, this router:
 * 1. Defines which providers can serve each other's models (provider groups)
 * 2. Transforms model names between providers automatically
 * 3. Always routes to the best provider to naturally balance usage
 */

import type { ProviderID, UsageResult } from './types.js';

/**
 * Provider groups that can serve each other's models.
 * Each group contains providers that have overlapping model availability.
 */
const ROUTABLE_PROVIDER_GROUPS: ProviderID[][] = [
  ['anthropic', 'github-copilot'],  // Claude models
  ['openai', 'github-copilot'],     // GPT/Codex/o-series models
];

/** Input for routing decision */
export interface RoutingInput {
  /** Current provider ID */
  providerID: ProviderID;
  /** Current model ID (provider-specific) */
  modelID: string;
}

/** Candidate provider with scoring info */
export interface RouterCandidate {
  providerID: ProviderID;
  modelID: string;
  available: boolean;
  paceDelta: number | null;
  usedPercent: number | null;
  score: number;
}

/** Result of routing decision */
export interface RouterResult {
  /** Selected provider */
  providerID: ProviderID;
  /** Provider-specific model ID to use */
  modelID: string;
  /** Why this provider was chosen */
  reason: string;
  /** All candidates considered with their scores */
  candidates: RouterCandidate[];
  /** Whether the result is different from input (switch needed) */
  switched: boolean;
}

/**
 * Get alternate providers that might serve the same model.
 * 
 * @param providerID - Current provider
 * @returns Array of alternate provider IDs (excluding the input provider)
 */
export function getAlternateProviders(providerID: ProviderID): ProviderID[] {
  const alternates: ProviderID[] = [];
  
  for (const group of ROUTABLE_PROVIDER_GROUPS) {
    if (group.includes(providerID)) {
      for (const p of group) {
        if (p !== providerID && !alternates.includes(p)) {
          alternates.push(p);
        }
      }
    }
  }
  
  return alternates;
}

/**
 * Normalize model ID by stripping date suffixes and -latest.
 * 
 * Examples:
 * - "claude-sonnet-4-5-20250929" -> "claude-sonnet-4-5"
 * - "claude-3-7-sonnet-latest" -> "claude-3-7-sonnet"
 * - "gpt-5.1-codex" -> "gpt-5.1-codex" (unchanged)
 * 
 * @param modelID - Model ID to normalize
 * @returns Normalized model ID
 */
export function normalizeModelID(modelID: string): string {
  return modelID
    // Remove date suffix like -20250929, -20241022, etc.
    .replace(/-\d{8}$/, '')
    // Remove -latest suffix
    .replace(/-latest$/, '');
}

/**
 * Transform model ID between providers.
 * Returns null if the model is not transformable (not supported on target provider).
 * 
 * Transformation rules:
 * - anthropic <-> github-copilot: Claude models, convert version format (4-5 <-> 4.5)
 * - openai <-> github-copilot: GPT/Codex/o-series models, names are identical
 * 
 * @param modelID - Source model ID
 * @param fromProvider - Source provider
 * @param toProvider - Target provider
 * @returns Transformed model ID or null if not transformable
 */
export function transformModelID(
  modelID: string,
  fromProvider: ProviderID,
  toProvider: ProviderID,
): string | null {
  // Same provider = no transformation needed
  if (fromProvider === toProvider) {
    return modelID;
  }
  
  // Normalize first (strip dates, -latest)
  const normalized = normalizeModelID(modelID);
  
  // anthropic <-> github-copilot: Claude models
  if (
    (fromProvider === 'anthropic' && toProvider === 'github-copilot') ||
    (fromProvider === 'github-copilot' && toProvider === 'anthropic')
  ) {
    // Only transform Claude models
    if (!normalized.toLowerCase().startsWith('claude')) {
      return null;
    }
    
    if (fromProvider === 'anthropic' && toProvider === 'github-copilot') {
      // anthropic -> github-copilot
      // claude-sonnet-4-5 -> claude-sonnet-4.5
      // claude-opus-4-5 -> claude-opus-4.5
      // claude-3-7-sonnet -> claude-3.7-sonnet
      // claude-haiku-4-5 -> claude-haiku-4.5
      
      // Pattern: convert X-Y to X.Y for version numbers at the end or in the middle
      // Handle patterns like "claude-sonnet-4-5", "claude-3-7-sonnet", "claude-opus-4-1"
      return normalized
        // Convert version patterns like -4-5, -3-7, -4-1 to dots
        .replace(/-(\d+)-(\d+)(-|$)/g, '-$1.$2$3')
        // Clean up any trailing dash
        .replace(/-$/, '');
    } else {
      // github-copilot -> anthropic
      // claude-sonnet-4.5 -> claude-sonnet-4-5
      // claude-3.7-sonnet -> claude-3-7-sonnet
      return normalized.replace(/\.(\d+)/g, '-$1');
    }
  }
  
  // openai <-> github-copilot: GPT/Codex/o-series models
  if (
    (fromProvider === 'openai' && toProvider === 'github-copilot') ||
    (fromProvider === 'github-copilot' && toProvider === 'openai')
  ) {
    const lower = normalized.toLowerCase();
    
    // Route GPT models (gpt-4, gpt-4o, gpt-5, gpt-5.1, gpt-5.1-codex, etc.)
    if (lower.startsWith('gpt-')) {
      return normalized;
    }
    
    // Route o-series models (o1, o3, o3-mini, o4-mini, etc.)
    if (/^o\d/.test(lower)) {
      return normalized;
    }
    
    // Route standalone codex models (codex-mini-latest, etc.)
    if (lower.startsWith('codex')) {
      return normalized;
    }
    
    // Not a routable model type
    return null;
  }
  
  // No transformation available for this provider pair
  return null;
}

/**
 * Check if a model can be routed to alternate providers.
 * 
 * @param modelID - Model ID to check
 * @param providerID - Current provider
 * @returns True if the model can potentially be served by alternate providers
 */
export function isRoutableModel(modelID: string, providerID: ProviderID): boolean {
  const alternates = getAlternateProviders(providerID);
  
  for (const alt of alternates) {
    if (transformModelID(modelID, providerID, alt) !== null) {
      return true;
    }
  }
  
  return false;
}

/**
 * Pick the best provider for a model based on current usage limits.
 * 
 * Always routes to the provider with the most remaining capacity to naturally
 * balance usage across providers over time.
 * 
 * Scoring: Lower is better. Uses paceDelta as primary signal.
 * - Negative paceDelta = behind pace = more headroom = better choice
 * - Positive paceDelta = ahead of pace = less headroom = worse choice
 * - Unavailable providers get Infinity score
 * 
 * @param current - Current provider and model ID
 * @param usageData - Current usage data from getUsage()
 * @returns Router result with selected provider, or null if model is not routable
 */
export function pickBestProvider(
  current: RoutingInput,
  usageData: Partial<Record<ProviderID, UsageResult>>,
): RouterResult | null {
  const { providerID: currentProvider, modelID: currentModelID } = current;
  
  // Build list of all candidate providers (current + alternates)
  const alternates = getAlternateProviders(currentProvider);
  
  // Check if model is routable at all
  const hasAlternates = alternates.some(
    alt => transformModelID(currentModelID, currentProvider, alt) !== null
  );
  
  if (!hasAlternates) {
    // Model only available on current provider, not routable
    return null;
  }
  
  // Build candidates list
  const candidates: RouterCandidate[] = [];
  
  // Add current provider as a candidate
  const currentUsage = usageData[currentProvider];
  const currentAvailable = currentUsage?.data !== null;
  const currentPaceDelta = currentUsage?.data?.secondary?.paceDelta ?? 
                           currentUsage?.data?.primary?.paceDelta ?? null;
  const currentUsedPercent = currentUsage?.data?.secondary?.usedPercent ?? 
                             currentUsage?.data?.primary?.usedPercent ?? null;
  
  candidates.push({
    providerID: currentProvider,
    modelID: normalizeModelID(currentModelID),
    available: currentAvailable,
    paceDelta: currentPaceDelta,
    usedPercent: currentUsedPercent,
    score: currentAvailable ? (currentPaceDelta ?? 0) : Infinity,
  });
  
  // Add alternate providers as candidates
  for (const altProvider of alternates) {
    const altModelID = transformModelID(currentModelID, currentProvider, altProvider);
    
    if (altModelID === null) {
      // Model not transformable to this provider
      continue;
    }
    
    const altUsage = usageData[altProvider];
    const altAvailable = altUsage?.data !== null;
    
    // Prefer secondary (longer window like 7d) over primary (shorter like 5h)
    // for routing decisions since it's more representative of overall capacity
    const altPaceDelta = altUsage?.data?.secondary?.paceDelta ?? 
                         altUsage?.data?.primary?.paceDelta ?? null;
    const altUsedPercent = altUsage?.data?.secondary?.usedPercent ?? 
                           altUsage?.data?.primary?.usedPercent ?? null;
    
    // Score: lower is better
    // - Negative paceDelta = behind pace = good (use this provider)
    // - Positive paceDelta = ahead of pace = bad (avoid this provider)
    // - Unavailable = worst
    const score = altAvailable ? (altPaceDelta ?? 0) : Infinity;
    
    candidates.push({
      providerID: altProvider,
      modelID: altModelID,
      available: altAvailable,
      paceDelta: altPaceDelta,
      usedPercent: altUsedPercent,
      score,
    });
  }
  
  // Sort by score (lowest first)
  candidates.sort((a, b) => a.score - b.score);
  const best = candidates[0];
  
  // If no available providers, return null (can't route anywhere)
  if (!best.available) {
    return null;
  }
  
  // Determine if we're switching
  const switched = best.providerID !== currentProvider;
  
  // Generate human-readable reason
  let reason: string;
  if (best.paceDelta !== null) {
    if (best.paceDelta < 0) {
      reason = `${best.providerID} has most headroom (${best.paceDelta}% pace)`;
    } else if (best.paceDelta > 0) {
      reason = `${best.providerID} selected (+${best.paceDelta}% pace, but best available)`;
    } else {
      reason = `${best.providerID} is on pace (0%)`;
    }
  } else {
    reason = `${best.providerID} selected (no pace data)`;
  }
  
  if (!switched) {
    reason = `staying on ${best.providerID} (already best)`;
  }
  
  return {
    providerID: best.providerID,
    modelID: best.modelID,
    reason,
    candidates,
    switched,
  };
}
