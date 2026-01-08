#!/usr/bin/env node
/**
 * CLI for model-provider-usage-limits
 */

import { parseArgs } from 'node:util';
import { getUsage, listSupportedProviders, pickBestProvider } from './index.js';
import type { ProviderID, UsageResult } from './types.js';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

const useColor = process.stdout.isTTY !== false;

function c(color: keyof typeof colors, text: string): string {
  return useColor ? `${colors[color]}${text}${colors.reset}` : text;
}

/**
 * Get color based on usage percentage (green = good/low, red = bad/high)
 */
function getUsageColor(percent: number): keyof typeof colors {
  if (percent >= 80) return 'red';
  if (percent >= 50) return 'yellow';
  return 'green';
}

/**
 * Get color based on pace delta (green = under pace, red = over pace)
 */
function getPaceColor(pace: number): keyof typeof colors {
  if (pace > 10) return 'red';
  if (pace > 0) return 'yellow';
  return 'green';
}

function printHelp(): void {
  console.log(`
usage-limits - Fetch AI provider usage limits

Usage:
  npx @bytespell/model-provider-usage-limits [options]

Options:
  --provider <id>     Query specific provider (anthropic, github-copilot, openai)
  --route <model>     Pick best provider for a model
  --json              Output JSON format
  --no-cache          Bypass cache
  --help              Show this help
`);
}

function formatUsageText(result: UsageResult): string {
  const { provider, data, error } = result;
  
  if (data === null && !error) {
    return `${c('bold', provider)}: ${c('dim', 'Not authenticated')}`;
  }
  
  if (data === null && error) {
    return `${c('bold', provider)}: ${c('red', `Error - ${error.message}`)}`;
  }
  
  const lines: string[] = [`${c('bold', provider)}:`];

  if (data!.primary) {
    const percent = data!.primary.usedPercent;
    const color = getUsageColor(percent);
    lines.push(`  ${c('dim', data!.primary.window + ':')} ${c(color, `${percent}%`)} used`);
  }

  if (data!.secondary) {
    const percent = data!.secondary.usedPercent;
    const color = getUsageColor(percent);
    lines.push(`  ${c('dim', data!.secondary.window + ':')} ${c(color, `${percent}%`)} used`);
  }

  if (data!.metadata?.plan) {
    lines.push(`  ${c('dim', 'plan:')} ${data!.metadata.plan}`);
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  try {
    const { values } = parseArgs({
      options: {
        provider: { type: 'string' },
        route: { type: 'string' },
        json: { type: 'boolean', default: false },
        'no-cache': { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
      },
      allowPositionals: false,
    });

    if (values.help) {
      printHelp();
      process.exit(0);
    }

    const bypassCache = values['no-cache'] ?? false;
    const outputJson = values.json ?? false;

    // Auto-detect tokens
    const results = await getUsage({ autoDetectAuthTokens: true, bypassCache });
    
    if (Object.keys(results).length === 0) {
      console.error('Error: No provider tokens found.');
      console.error('Set up authentication with your AI providers.');
      process.exit(1);
    }

    // Route mode
    if (values.route) {
      const modelID = values.route;
      
      // Try to find which provider has this model
      let currentProvider: ProviderID = 'anthropic';
      if (modelID.includes('gpt') || modelID.includes('o1') || modelID.includes('o3')) {
        currentProvider = 'openai';
      } else if (modelID.includes('claude')) {
        currentProvider = 'anthropic';
      }
      
      const routeResult = pickBestProvider({ providerID: currentProvider, modelID }, results);
      
      if (!routeResult) {
        console.log(`${modelID}: Not routable (only available on ${currentProvider})`);
        process.exit(0);
      }
      
      if (outputJson) {
        console.log(JSON.stringify(routeResult, null, 2));
      } else {
        console.log(c('bold', routeResult.reason));
        for (const candidate of routeResult.candidates) {
          const pace = candidate.paceDelta;
          const paceColor = pace !== null ? getPaceColor(pace) : 'dim';
          const paceStr = pace !== null 
            ? ` ${c('dim', '(pace:')} ${c(paceColor, `${pace > 0 ? '+' : ''}${pace}%`)}${c('dim', ')')}` 
            : '';
          const isWinner = candidate.providerID === routeResult.providerID;
          const prefix = isWinner ? c('green', '→') : ' ';
          console.log(`  ${prefix} ${c('cyan', candidate.providerID)}: score ${candidate.score}${paceStr}`);
        }
      }
      
      process.exit(0);
    }

    // Filter to specific provider if requested
    let filteredResults = results;
    if (values.provider) {
      const provider = values.provider as ProviderID;
      const supported = listSupportedProviders();
      
      if (!supported.includes(provider)) {
        console.error(`Error: Unknown provider "${provider}"`);
        console.error(`Supported: ${supported.join(', ')}`);
        process.exit(1);
      }

      if (!results[provider]) {
        console.error(`Error: No data for provider "${provider}"`);
        process.exit(1);
      }

      filteredResults = { [provider]: results[provider] };
    }

    if (outputJson) {
      console.log(JSON.stringify(filteredResults, null, 2));
    } else {
      for (const result of Object.values(filteredResults)) {
        if (result) {
          console.log(formatUsageText(result));
        }
      }
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
