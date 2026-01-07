/**
 * Headless router logic for picking best provider based on usage limits.
 */

import type { ProviderID, UsageResult } from './types.js';

/** Model that can be routed across providers */
export interface RoutableModel {
  /** Canonical model name (e.g., "claude-sonnet-4-5") */
  name: string;
  /** Provider-specific model IDs */
  providers: {
    providerID: ProviderID;
    modelID: string;
  }[];
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
}

/** Hardcoded routable models (Phase 1) */
export const ROUTABLE_MODELS: RoutableModel[] = [
  {
    name: 'claude-opus-4-5',
    providers: [
      { providerID: 'anthropic', modelID: 'claude-opus-4-5-20250929' },
      { providerID: 'github-copilot', modelID: 'claude-opus-4.5' },
    ],
  },
  {
    name: 'claude-sonnet-4-5',
    providers: [
      { providerID: 'anthropic', modelID: 'claude-sonnet-4-5-20250929' },
      { providerID: 'github-copilot', modelID: 'claude-sonnet-4.5' },
    ],
  },
];

/**
 * Pick the best provider for a model based on current usage limits.
 * 
 * Scoring: Lower is better. Uses paceDelta as primary signal.
 * - Negative paceDelta = behind pace = more headroom = better choice
 * - Positive paceDelta = ahead of pace = less headroom = worse choice
 * - Unavailable providers get Infinity score
 * 
 * @param modelName - Canonical model name (e.g., "claude-sonnet-4-5")
 * @param usageData - Current usage data from getAllUsage()
 * @returns Router result with selected provider and reasoning
 */
export function pickBestProvider(
  modelName: string,
  usageData: Record<ProviderID, UsageResult>,
): RouterResult {
  const model = ROUTABLE_MODELS.find(m => m.name === modelName);
  if (!model) {
    throw new Error(`Unknown routable model: ${modelName}. Available: ${ROUTABLE_MODELS.map(m => m.name).join(', ')}`);
  }

  const candidates: RouterCandidate[] = model.providers.map(p => {
    const usage = usageData[p.providerID];
    const available = usage?.data !== null;
    
    // Prefer secondary (longer window like 7d) over primary (shorter like 5h)
    // for routing decisions since it's more representative of overall capacity
    const paceDelta = usage?.data?.secondary?.paceDelta ?? 
                      usage?.data?.primary?.paceDelta ?? null;
    const usedPercent = usage?.data?.secondary?.usedPercent ?? 
                        usage?.data?.primary?.usedPercent ?? null;
    
    // Score: lower is better
    // - Negative paceDelta = behind pace = good (use this provider)
    // - Positive paceDelta = ahead of pace = bad (avoid this provider)
    // - Unavailable = worst
    const score = available ? (paceDelta ?? 0) : Infinity;

    return {
      providerID: p.providerID,
      modelID: p.modelID,
      available,
      paceDelta,
      usedPercent,
      score,
    };
  });

  // Sort by score (lowest first)
  candidates.sort((a, b) => a.score - b.score);
  const best = candidates[0];

  if (!best.available) {
    throw new Error(`No authenticated providers available for ${modelName}. Tried: ${model.providers.map(p => p.providerID).join(', ')}`);
  }

  // Generate human-readable reason
  let reason: string;
  if (best.paceDelta !== null) {
    if (best.paceDelta < 0) {
      reason = `${best.providerID} has most headroom (${best.paceDelta}% behind pace)`;
    } else if (best.paceDelta > 0) {
      reason = `${best.providerID} selected (${best.paceDelta}% ahead of pace, but best available)`;
    } else {
      reason = `${best.providerID} is on pace`;
    }
  } else {
    reason = `${best.providerID} is available (no pace data)`;
  }

  return {
    providerID: best.providerID,
    modelID: best.modelID,
    reason,
    candidates,
  };
}

/**
 * List available routable models.
 */
export function listRoutableModels(): RoutableModel[] {
  return ROUTABLE_MODELS;
}
