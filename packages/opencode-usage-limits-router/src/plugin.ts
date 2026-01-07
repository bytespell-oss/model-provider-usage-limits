/**
 * OpenCode Plugin for Usage Limits Router
 * 
 * Advisory mode: shows toast notifications when user should switch providers.
 * - Listens on session.idle event (after assistant response completes)
 * - Checks if a different provider has better capacity
 * - Shows warning toast advising user to switch (they must switch manually via model picker)
 * - Silent when current provider is already the best choice
 */

import type { Plugin } from '@opencode-ai/plugin';
import type { Event } from '@opencode-ai/sdk';
import { 
  getUsage, 
  pickBestProvider,
  isRoutableModel,
  isTestModeEnabled,
  getTestScenario,
  type UsageResult,
  type ProviderID,
} from '@bytespell/model-provider-usage-limits';
import { getProviderTokens } from './auth.js';
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Debug mode - set via environment variable
 * When enabled, shows notifications after every response with detailed info
 */
const DEBUG_MODE = process.env.USAGE_LIMITS_DEBUG === 'true' || 
                   process.env.USAGE_LIMITS_DEBUG === '1';

/**
 * Debug log file path - writes to project root
 */
const DEBUG_LOG_PATH = join(process.cwd(), 'plugin-debug.log');

/**
 * Write debug log entry (always writes when DEBUG_MODE is enabled)
 */
function debugLog(message: string): void {
  if (!DEBUG_MODE) return;
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  try {
    appendFileSync(DEBUG_LOG_PATH, logEntry);
  } catch {
    // Ignore write errors
  }
}

/**
 * Write info log entry (always writes, for important events)
 */
function infoLog(message: string): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [INFO] ${message}\n`;
  try {
    appendFileSync(DEBUG_LOG_PATH, logEntry);
  } catch {
    // Ignore write errors
  }
}

/**
 * Get pace delta for a provider from usage results
 */
function getPaceDelta(results: Partial<Record<ProviderID, UsageResult>>, providerID: ProviderID): number | null {
  const usage = results[providerID];
  if (!usage?.data?.primary) return null;
  return usage.data.primary.paceDelta;
}

/**
 * Format pace delta as string with +/- prefix
 */
function formatPace(pace: number | null): string {
  if (pace === null) return 'n/a';
  const sign = pace > 0 ? '+' : '';
  return `${sign}${pace}%`;
}

/**
 * Format debug info for all providers
 */
function formatDebugInfo(
  currentProvider: string,
  currentModel: string,
  results: Partial<Record<ProviderID, UsageResult>>,
  routable: boolean,
): string {
  const lines: string[] = [
    `Model: ${currentProvider}/${currentModel}`,
    `Routable: ${routable ? 'yes' : 'no'}`,
  ];
  
  for (const [provider, result] of Object.entries(results)) {
    if (!result?.data?.primary) {
      lines.push(`${provider}: no data`);
      continue;
    }
    const { usedPercent, paceDelta, window } = result.data.primary;
    const remaining = 100 - usedPercent;
    const paceStr = formatPace(paceDelta);
    lines.push(`${provider}: ${remaining.toFixed(0)}% left [${window}] pace: ${paceStr}`);
  }
  
  return lines.join('\n');
}

/**
 * OpenCode Usage Limits Router Plugin
 */
export const UsageLimitsPlugin: Plugin = async ({ client }) => {
  // Track last processed session to avoid duplicate processing
  let lastProcessedSessionId: string | undefined;
  let lastProcessedTime = 0;
  
  return {
    /**
     * Listen for events - specifically session.idle which fires after assistant response completes
     */
    event: async ({ event }: { event: Event }) => {
      // Only process session.idle events
      if (event.type !== 'session.idle') {
        return;
      }
      
      const { sessionID } = event.properties;
      debugLog(`=== session.idle event received for session ${sessionID} ===`);
      
      // Debounce: skip if same session processed within last 2 seconds
      const now = Date.now();
      if (sessionID === lastProcessedSessionId && (now - lastProcessedTime) < 2000) {
        debugLog('Skipping duplicate session.idle event (debounce)');
        return;
      }
      
      lastProcessedSessionId = sessionID;
      lastProcessedTime = now;
      
      try {
        // Get messages from the session to find the last assistant message
        debugLog('Fetching session messages...');
        const messagesResponse = await client.session.messages({
          path: { id: sessionID },
          query: { limit: 10 },
        });
        
        if (!messagesResponse.data) {
          debugLog('No messages data returned');
          return;
        }
        
        // Find the last assistant message to get the model that was used
        const lastAssistant = messagesResponse.data
          .filter(m => m.info.role === 'assistant')
          .sort((a, b) => b.info.id.localeCompare(a.info.id))[0];
        
        if (!lastAssistant) {
          debugLog('No assistant message found');
          return;
        }
        
        const assistantInfo = lastAssistant.info as { 
          providerID: string; 
          modelID: string;
          id: string;
        };
        
        const { providerID, modelID } = assistantInfo;
        debugLog(`Last assistant message used: ${providerID}/${modelID}`);
        infoLog(`Session ${sessionID}: Assistant response completed using ${providerID}/${modelID}`);
        
        // Get tokens and check if we can fetch usage
        const tokens = getProviderTokens();
        debugLog(`Tokens available: ${Object.keys(tokens).join(', ') || 'none'}`);
        
        if (Object.keys(tokens).length === 0) {
          debugLog('No tokens available, skipping usage check');
          return;
        }
        
        // Log test mode status
        if (isTestModeEnabled()) {
          const scenario = getTestScenario();
          debugLog(`TEST MODE ENABLED - Scenario: ${scenario}`);
          infoLog(`TEST MODE: Using scenario "${scenario}"`);
        }
        
        // Fetch usage data
        debugLog('Fetching usage data...');
        const results = await getUsage({ tokens });
        debugLog(`Usage data fetched for: ${Object.keys(results).join(', ')}`);
        
        const currentProviderID = providerID as ProviderID;
        const currentPace = getPaceDelta(results, currentProviderID);
        debugLog(`Current provider ${currentProviderID} pace: ${formatPace(currentPace)}`);
        
        // Check if model is routable
        const routable = isRoutableModel(modelID, currentProviderID);
        debugLog(`Model ${modelID} routable: ${routable}`);
        
        // Debug mode: always show usage info after response completes
        if (DEBUG_MODE) {
          debugLog('Showing debug toast with usage info...');
          await client.tui.showToast({
            body: {
              message: formatDebugInfo(providerID, modelID, results, routable),
              variant: 'info',
              duration: 8000,
            },
          });
        }
        
        // If model is not routable, nothing to do (silent unless DEBUG)
        if (!routable) {
          debugLog(`Model ${providerID}/${modelID} is not routable, skipping`);
          return;
        }
        
        // Use router to pick best provider
        debugLog(`Picking best provider for: ${providerID}/${modelID}`);
        const routerResult = pickBestProvider(
          { providerID: currentProviderID, modelID },
          results,
        );
        
        if (!routerResult) {
          // Shouldn't happen since we checked isRoutableModel, but handle gracefully
          debugLog('Router returned null (unexpected)');
          return;
        }
        
        debugLog(`Router result: ${routerResult.providerID}/${routerResult.modelID} - ${routerResult.reason}`);
        debugLog(`Candidates: ${routerResult.candidates.map(c => `${c.providerID}(${c.score})`).join(', ')}`);
        
        // If current provider is already best, stay silent (less noise)
        if (!routerResult.switched) {
          debugLog(`Current provider ${providerID} is already best, no advisory needed`);
          infoLog(`Staying on ${providerID}/${modelID} (already best provider)`);
          return;
        }
        
        // Show advisory toast - user should switch to a better provider
        const bestProvider = routerResult.providerID;
        const bestPace = getPaceDelta(results, bestProvider);
        
        debugLog(`Advising switch to: ${bestProvider}`);
        infoLog(`ADVISORY: Consider switching from ${providerID} (${formatPace(currentPace)}) to ${bestProvider} (${formatPace(bestPace)})`);
        
        // Format advisory message (medium verbosity)
        const message = `Consider switching to ${bestProvider}\n` +
          `Current: ${providerID} (${formatPace(currentPace)} pace)\n` +
          `Better: ${bestProvider} (${formatPace(bestPace)} pace)`;
        
        await client.tui.showToast({
          body: {
            message,
            variant: 'warning',
            duration: 8000,
          },
        });
        
        debugLog('=== session.idle processing complete ===');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : '';
        debugLog(`ERROR: ${errorMsg}`);
        debugLog(`Stack: ${errorStack}`);
        infoLog(`ERROR in session.idle handler: ${errorMsg}`);
        
        if (DEBUG_MODE) {
          await client.tui.showToast({
            body: {
              message: `Router error: ${errorMsg}`,
              variant: 'error',
              duration: 5000,
            },
          });
        }
        // Silently ignore errors in normal mode to avoid disrupting user
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
        description: 'Get advice on which provider to use based on usage limits',
        template: `Get advice on which provider to use based on current usage limits.

The router analyzes alternate providers that can serve the same model
and recommends the one with the most remaining capacity.

Routable provider groups:
- Claude models: anthropic <-> github-copilot
- GPT/Codex/o-series: openai <-> github-copilot

The plugin automatically shows advisories after each response when a better
provider is available. Use /usage to see current usage across all providers.`,
      };
    },
  };
};

export default UsageLimitsPlugin;
