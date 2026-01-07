/**
 * OpenCode Plugin for Usage Limits Router
 * 
 * Provides:
 * - Shows usage toast on session idle (when model responds)
 * - Registers /usage and /route commands via config hook
 */

import type { Plugin } from '@opencode-ai/plugin';
import { getUsage, type UsageResult } from '@bytespell/model-provider-usage-limits';
import { getProviderTokens } from './auth.js';

/**
 * Format usage result for display (compact format for toast)
 */
function formatUsageCompact(result: UsageResult): string {
  const { provider, data } = result;
  
  if (!data) {
    return `${provider}: --`;
  }
  
  const parts: string[] = [];
  
  if (data.primary) {
    const remaining = 100 - data.primary.usedPercent;
    parts.push(`${data.primary.window}: ${remaining}%`);
  }
  
  if (data.secondary) {
    const remaining = 100 - data.secondary.usedPercent;
    parts.push(`${data.secondary.window}: ${remaining}%`);
  }
  
  return `${provider}: ${parts.join(', ')}`;
}

/**
 * OpenCode Usage Limits Router Plugin
 * 
 * Shows provider usage information after each model response.
 */
export const UsageLimitsPlugin: Plugin = async ({ client }) => {
  return {
    // Listen to events
    event: async ({ event }) => {
      // Show usage when session becomes idle (after model responds)
      if (event.type === 'session.idle') {
        const tokens = getProviderTokens();
        
        if (Object.keys(tokens).length === 0) {
          return; // Silently skip if no tokens
        }
        
        try {
          const results = await getUsage({ tokens });
          const lines = Object.values(results)
            .filter((r): r is UsageResult => r !== undefined)
            .map(formatUsageCompact);
          
          if (lines.length > 0) {
            await client.tui.showToast({
              body: {
                message: lines.join('\n'), 
                variant: 'info',
                duration: 5000,
              },
            });
          }
        } catch {
          // Silently ignore errors for background usage display
        }
      }
    },

    // Register commands via config hook
    config: async (config) => {
      config.command = config.command ?? {};
      
      // /usage command
      config.command['usage'] = {
        description: 'Show current AI provider usage limits',
        template: `Show current usage limits for all authenticated AI providers.

Run this command to check usage:
!\`node -e "
const { getUsage } = require('@bytespell/model-provider-usage-limits');
const { getProviderTokens } = require('@bytespell/opencode-usage-limits-router');
const tokens = getProviderTokens();
if (Object.keys(tokens).length === 0) {
  console.log('No provider tokens found. Run opencode auth login first.');
} else {
  getUsage({ tokens }).then(results => {
    for (const [provider, result] of Object.entries(results)) {
      if (result && result.data) {
        const d = result.data;
        console.log(provider + ':');
        if (d.primary) {
          const remaining = 100 - d.primary.usedPercent;
          const pace = d.primary.paceDelta;
          const paceStr = pace !== null ? ' [' + (pace > 0 ? '+' : '') + pace + '%]' : '';
          console.log('  ' + d.primary.window + ': ' + remaining + '% remaining' + paceStr);
          if (d.primary.resetsAt) console.log('    resets at ' + d.primary.resetsAt);
        }
        if (d.secondary) {
          const remaining = 100 - d.secondary.usedPercent;
          console.log('  ' + d.secondary.window + ': ' + remaining + '% remaining');
        }
      }
    }
  }).catch(e => console.error('Error:', e.message));
}
"\``,
      };

      // /route command  
      config.command['route'] = {
        description: 'Pick best provider for a model based on usage limits',
        template: `Pick the best provider for the model "$ARGUMENTS" based on current usage limits.

Available routable models:
- claude-sonnet-4-5: available on anthropic, github-copilot
- claude-opus-4-5: available on anthropic, github-copilot

Analyze the current usage and recommend which provider has the most remaining capacity.
Then use /model to switch to the recommended provider.`,
      };
    },
  };
};

export default UsageLimitsPlugin;
