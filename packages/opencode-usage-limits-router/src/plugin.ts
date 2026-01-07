/**
 * OpenCode Plugin for Usage Limits Router
 * 
 * Provides:
 * - Shows usage toast on session idle (when model responds)
 * - Listens for /usage and /route commands
 */

import { 
  getUsage, 
  pickBestProvider, 
  listRoutableModels,
  type UsageResult,
} from '@bytespell/model-provider-usage-limits';
import { getProviderTokens } from './auth.js';

/** Plugin context type */
interface PluginContext {
  client: {
    tui: {
      showToast: (opts: { body: { title?: string; message: string; variant: 'info' | 'success' | 'warning' | 'error'; duration?: number } }) => Promise<unknown>;
      executeCommand: (opts: { body: { command: string } }) => Promise<unknown>;
    };
    app: {
      log: (opts: { body: { service: string; level: 'debug' | 'info' | 'warn' | 'error'; message: string } }) => Promise<unknown>;
    };
  };
}

/** Event type */
interface PluginEvent {
  type: string;
  properties?: Record<string, unknown>;
}

/** Plugin hook input for command execution */
interface CommandInput {
  command?: string;
}

/** Plugin function type */
type PluginFn = (ctx: PluginContext) => Promise<{
  event?: (input: { event: PluginEvent }) => Promise<void>;
  'tui.command.execute'?: (input: CommandInput, output: unknown) => Promise<void>;
}>;

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
 * Format usage result for display (detailed format)
 */
function formatUsageDetailed(result: UsageResult): string {
  const { provider, data } = result;
  
  if (!data) {
    return `${provider}: not authenticated`;
  }
  
  const parts: string[] = [`${provider}:`];
  
  if (data.primary) {
    const remaining = 100 - data.primary.usedPercent;
    const pace = data.primary.paceDelta;
    const paceStr = pace !== null && Math.abs(pace) > 10 
      ? ` (${pace > 0 ? '+' : ''}${pace}%)` 
      : '';
    parts.push(`${data.primary.window}: ${remaining}% left${paceStr}`);
  }
  
  if (data.secondary) {
    const remaining = 100 - data.secondary.usedPercent;
    const pace = data.secondary.paceDelta;
    const paceStr = pace !== null && Math.abs(pace) > 10 
      ? ` (${pace > 0 ? '+' : ''}${pace}%)` 
      : '';
    parts.push(`${data.secondary.window}: ${remaining}% left${paceStr}`);
  }
  
  return parts.join(' ');
}

/**
 * Fetch and show usage toast
 */
async function showUsageToast(client: PluginContext['client'], detailed: boolean = false): Promise<void> {
  const tokens = getProviderTokens();
  
  if (Object.keys(tokens).length === 0) {
    return; // Silently skip if no tokens
  }
  
  try {
    const results = await getUsage({ tokens });
    const formatter = detailed ? formatUsageDetailed : formatUsageCompact;
    const lines = Object.values(results)
      .filter((r): r is UsageResult => r !== undefined)
      .map(formatter);
    
    if (lines.length > 0) {
      await client.tui.showToast({
        body: { 
          title: 'Provider Usage',
          message: lines.join('\n'), 
          variant: 'info',
          duration: detailed ? 8000 : 5000,
        },
      });
    }
  } catch {
    // Silently ignore errors for background usage display
  }
}

/**
 * OpenCode Usage Limits Router Plugin
 */
export const UsageLimitsPlugin: PluginFn = async ({ client }) => {
  // Log that plugin loaded
  await client.app.log({
    body: {
      service: 'usage-limits-router',
      level: 'info',
      message: 'Plugin loaded',
    },
  });

  return {
    // Listen to events
    event: async ({ event }) => {
      // Show usage when session becomes idle (after model responds)
      if (event.type === 'session.idle') {
        await showUsageToast(client, false);
      }
    },

    // Listen to commands
    'tui.command.execute': async (input, _output) => {
      const command = input.command?.trim() ?? '';
      
      // /usage - Show detailed usage for all providers
      if (command === 'usage' || command === 'limits') {
        await showUsageToast(client, true);
        return;
      }
      
      // /route [model] - Pick best provider and switch to it
      if (command.startsWith('route')) {
        const args = command.slice(5).trim();
        const routableModels = listRoutableModels();
        
        // If no model specified, show available models
        if (!args) {
          const modelNames = routableModels.map(m => m.name).join(', ');
          await client.tui.showToast({
            body: { 
              title: 'Route Command',
              message: `Usage: /route <model>\nAvailable: ${modelNames}`, 
              variant: 'info',
              duration: 6000,
            },
          });
          return;
        }
        
        // Find matching model
        const modelName = args;
        const model = routableModels.find(m => 
          m.name === modelName || 
          m.name.includes(modelName) ||
          modelName.includes(m.name)
        );
        
        if (!model) {
          const modelNames = routableModels.map(m => m.name).join(', ');
          await client.tui.showToast({
            body: { 
              title: 'Unknown Model',
              message: `"${modelName}" not found.\nAvailable: ${modelNames}`, 
              variant: 'error',
            },
          });
          return;
        }
        
        // Get tokens and fetch usage
        const tokens = getProviderTokens();
        if (Object.keys(tokens).length === 0) {
          await client.tui.showToast({
            body: { 
              title: 'Auth Required',
              message: 'No provider tokens found.\nRun "opencode auth login" first.', 
              variant: 'error',
            },
          });
          return;
        }
        
        try {
          const results = await getUsage({ tokens });
          const best = pickBestProvider(model.name, results);
          
          // Switch to the best model
          await client.tui.executeCommand({
            body: { command: `/model ${best.providerID}/${best.modelID}` },
          });
          
          // Show toast with reason
          await client.tui.showToast({
            body: { 
              title: 'Model Switched',
              message: `${best.providerID}/${best.modelID}\n${best.reason}`, 
              variant: 'success',
            },
          });
        } catch (error) {
          await client.tui.showToast({
            body: { 
              title: 'Routing Failed',
              message: error instanceof Error ? error.message : String(error), 
              variant: 'error',
            },
          });
        }
        return;
      }
    },
  };
};

export default UsageLimitsPlugin;
