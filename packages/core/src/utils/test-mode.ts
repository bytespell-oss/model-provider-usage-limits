/**
 * Test mode for simulating rate limit data
 * 
 * Enabled via environment variable: USAGE_LIMITS_TEST_MODE=true
 * Configure scenarios via: USAGE_LIMITS_TEST_SCENARIO=<scenario>
 */

import type { UsageSnapshot, ProviderID } from '../types.js';

/**
 * Test scenarios for simulating different rate limit situations
 */
export type TestScenario = 
  | 'over-pace'      // Anthropic over pace, Copilot under pace
  | 'under-pace'     // Anthropic under pace, Copilot over pace
  | 'balanced'       // Both on pace
  | 'anthropic-high' // Anthropic 80% used, Copilot 20% used
  | 'copilot-high';  // Copilot 80% used, Anthropic 20% used

/**
 * Check if test mode is enabled
 */
export function isTestModeEnabled(): boolean {
  return process.env.USAGE_LIMITS_TEST_MODE === 'true' || 
         process.env.USAGE_LIMITS_TEST_MODE === '1';
}

/**
 * Get current test scenario
 */
export function getTestScenario(): TestScenario {
  const scenario = process.env.USAGE_LIMITS_TEST_SCENARIO as TestScenario;
  return scenario || 'over-pace'; // Default scenario
}

/**
 * Generate test usage data for a scenario
 */
export function generateTestUsage(scenario: TestScenario): Partial<Record<ProviderID, UsageSnapshot>> {
  switch (scenario) {
    case 'over-pace':
      // Anthropic 60% used but +20% over pace (slow down!)
      // Copilot 40% used and -15% under pace (speed up!)
      return {
        anthropic: {
          provider: 'anthropic',
          primary: {
            usedPercent: 60,
            window: '5h',
            resetsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2h from now
            paceDelta: 20, // Over pace
          },
          secondary: {
            usedPercent: 55,
            window: '7d',
            resetsAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // 4d from now
            paceDelta: 15,
          },
        },
        'github-copilot': {
          provider: 'github-copilot',
          primary: {
            usedPercent: 40,
            window: '5h',
            resetsAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
            paceDelta: -15, // Under pace
          },
          secondary: {
            usedPercent: 35,
            window: '7d',
            resetsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            paceDelta: -10,
          },
        },
      };

    case 'under-pace':
      // Opposite: Anthropic under pace, Copilot over pace
      return {
        anthropic: {
          provider: 'anthropic',
          primary: {
            usedPercent: 30,
            window: '5h',
            resetsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            paceDelta: -10,
          },
          secondary: null,
        },
        'github-copilot': {
          provider: 'github-copilot',
          primary: {
            usedPercent: 70,
            window: '5h',
            resetsAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
            paceDelta: 25,
          },
          secondary: null,
        },
      };

    case 'balanced':
      // Both on pace (within ±5%)
      return {
        anthropic: {
          provider: 'anthropic',
          primary: {
            usedPercent: 50,
            window: '5h',
            resetsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            paceDelta: 2, // Slightly over but not enough to trigger
          },
          secondary: null,
        },
        'github-copilot': {
          provider: 'github-copilot',
          primary: {
            usedPercent: 45,
            window: '5h',
            resetsAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
            paceDelta: -3,
          },
          secondary: null,
        },
      };

    case 'anthropic-high':
      // Anthropic at 80%, Copilot at 20%
      return {
        anthropic: {
          provider: 'anthropic',
          primary: {
            usedPercent: 80,
            window: '5h',
            resetsAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
            paceDelta: 30,
          },
          secondary: null,
        },
        'github-copilot': {
          provider: 'github-copilot',
          primary: {
            usedPercent: 20,
            window: '5h',
            resetsAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            paceDelta: -20,
          },
          secondary: null,
        },
      };

    case 'copilot-high':
      // Copilot at 80%, Anthropic at 20%
      return {
        'github-copilot': {
          provider: 'github-copilot',
          primary: {
            usedPercent: 80,
            window: '5h',
            resetsAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
            paceDelta: 35,
          },
          secondary: null,
        },
        anthropic: {
          provider: 'anthropic',
          primary: {
            usedPercent: 20,
            window: '5h',
            resetsAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            paceDelta: -25,
          },
          secondary: null,
        },
      };

    default:
      return {};
  }
}
