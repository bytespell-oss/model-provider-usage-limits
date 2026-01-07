#!/usr/bin/env node
/**
 * CLI entrypoint for usage-limits
 */

import { parseArgs } from 'node:util';
import { listSupportedProviders, getUsage, getAllUsage } from './index.js';
import type { ProviderID, UsageResult } from './types.js';

function printUsage(): void {
  console.log(`
model-provider-usage-limits - Fetch AI provider usage limits

Usage:
  model-provider-usage-limits [options]

Options:
  --provider <id>     Query specific provider (anthropic, github-copilot, openai)
  --json              Output JSON format (default: human-readable text)
  --no-cache          Bypass cache and force fresh fetch
  --help              Show this help message

Examples:
  model-provider-usage-limits --provider anthropic
  model-provider-usage-limits --json
  model-provider-usage-limits --provider github-copilot --no-cache
`);
}

function formatUsageText(result: UsageResult): string {
  const { provider, data, error, cache } = result;
  
  // Not authenticated
  if (data === null && !error) {
    return `${provider}: Not authenticated`;
  }
  
  // Error with no fallback data
  if (data === null && error) {
    return `${provider}: Error - ${error.message} (${error.code})`;
  }
  
  // Has data (fresh or cached/fallback)
  const lines: string[] = [`${provider}:`];
  
  // Show error if present (data is stale fallback)
  if (error) {
    lines.push(`  [WARNING] API Error: ${error.message} (${error.code})`);
    lines.push(`  [WARNING] Showing last known data as fallback`);
  }
  
  // Show stale cache warning
  if (cache?.stale) {
    const ageMinutes = Math.floor(cache.age / 60000);
    const ageHours = Math.floor(ageMinutes / 60);
    const ageStr = ageHours > 0 
      ? `${ageHours}h ${ageMinutes % 60}m`
      : `${ageMinutes}m`;
    lines.push(`  [WARNING] Data is stale (${ageStr} old)`);
  }
  
  // Show last update time if cached
  if (cache) {
    lines.push(`  Last updated: ${cache.updatedAt}`);
  }

  // Show usage data (data is guaranteed non-null here)
  if (data!.primary) {
    const remaining = 100 - data!.primary.usedPercent;
    const pace = data!.primary.paceDelta;
    const paceStr = pace !== null && Math.abs(pace) > 15 
      ? (pace > 0 ? ` 🔥 +${pace}%` : ` ⚡ ${pace}%`)
      : '';
    lines.push(`  ${data!.primary.window}: ${remaining}% remaining (used ${data!.primary.usedPercent}%)${paceStr}`);
    if (data!.primary.resetsAt) {
      lines.push(`    resets at ${data!.primary.resetsAt}`);
    }
  }

  if (data!.secondary) {
    const remaining = 100 - data!.secondary.usedPercent;
    const pace = data!.secondary.paceDelta;
    const paceStr = pace !== null && Math.abs(pace) > 15 
      ? (pace > 0 ? ` 🔥 +${pace}%` : ` ⚡ ${pace}%`)
      : '';
    lines.push(`  ${data!.secondary.window}: ${remaining}% remaining (used ${data!.secondary.usedPercent}%)${paceStr}`);
    if (data!.secondary.resetsAt) {
      lines.push(`    resets at ${data!.secondary.resetsAt}`);
    }
  }

  if (data!.metadata?.plan) {
    lines.push(`  plan: ${data!.metadata.plan}`);
  }

  if (data!.metadata?.credits) {
    const { balance, unlimited } = data!.metadata.credits;
    if (unlimited) {
      lines.push(`  credits: unlimited`);
    } else if (balance !== null) {
      lines.push(`  credits: ${balance}`);
    }
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  try {
    const { values } = parseArgs({
      options: {
        provider: { type: 'string' },
        json: { type: 'boolean', default: false },
        'no-cache': { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
      },
      allowPositionals: false,
    });

    if (values.help) {
      printUsage();
      process.exit(0);
    }

    const bypassCache = values['no-cache'] ?? false;
    const outputJson = values.json ?? false;

    // Single provider query
    if (values.provider) {
      const provider = values.provider as ProviderID;
      const supported = listSupportedProviders();
      
      if (!supported.includes(provider)) {
        console.error(`Error: Unknown provider "${provider}"`);
        console.error(`Supported providers: ${supported.join(', ')}`);
        process.exit(1);
      }

      const result = await getUsage(provider, { bypassCache });

      if (outputJson) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatUsageText(result));
      }
      return;
    }

    // All providers query
    const results = await getAllUsage({ bypassCache });

    if (outputJson) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      for (const result of Object.values(results)) {
        console.log(formatUsageText(result));
        console.log(''); // blank line between providers
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Error: ${String(error)}`);
    }
    process.exit(1);
  }
}

main();
