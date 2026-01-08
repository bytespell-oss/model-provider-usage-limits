#!/usr/bin/env node
/**
 * CLI for model-provider-usage-limits
 */

import { parseArgs } from "node:util";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { getUsage, listSupportedProviders, pickBestProvider } from "./index.js";
import type { ProviderID, UsageResult, UsageSnapshot } from "./types.js";

/**
 * Sample data for demo mode
 */
function getDemoResults(): Partial<Record<ProviderID, UsageResult>> {
  const anthropicSnapshot: UsageSnapshot = {
    provider: "anthropic",
    primary: {
      usedPercent: 45,
      window: "5h",
      resetsAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      paceDelta: 8,
    },
    secondary: {
      usedPercent: 30,
      window: "7d",
      resetsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      paceDelta: -5,
    },
    metadata: { plan: "pro" },
  };

  const copilotSnapshot: UsageSnapshot = {
    provider: "github-copilot",
    primary: {
      usedPercent: 60,
      window: "30d",
      resetsAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      paceDelta: -15,
    },
    secondary: null,
  };

  return {
    anthropic: {
      provider: "anthropic",
      data: anthropicSnapshot,
      cache: {
        age: 5000,
        timestamp: Date.now() - 5000,
        updatedAt: new Date(Date.now() - 5000).toISOString(),
        stale: false,
      },
    },
    "github-copilot": {
      provider: "github-copilot",
      data: copilotSnapshot,
      cache: {
        age: 5000,
        timestamp: Date.now() - 5000,
        updatedAt: new Date(Date.now() - 5000).toISOString(),
        stale: false,
      },
    },
  };
}

/**
 * Get color function based on usage percentage (green = good/low, red = bad/high)
 */
function colorByUsage(percent: number, text: string): string {
  if (percent >= 80) return pc.red(text);
  if (percent >= 50) return pc.yellow(text);
  return pc.green(text);
}

/**
 * Get color function based on pace delta (green = under pace, red = over pace)
 */
function colorByPace(pace: number, text: string): string {
  if (pace > 10) return pc.red(text);
  if (pace > 0) return pc.yellow(text);
  return pc.green(text);
}

function printHelp(): void {
  console.log(`
${pc.bold("usage-limits")} - Fetch AI provider usage limits

${pc.dim("Usage:")}
  npx @bytespell/model-provider-usage-limits [options]

${pc.dim("Options:")}
  --provider <id>     Query specific provider (anthropic, github-copilot, openai)
  --route <model>     Pick best provider for a model
  --json              Output JSON format
  --no-cache          Bypass cache
  --demo              Show demo with sample data (no auth required)
  --help              Show this help
`);
}

function formatUsageNote(results: UsageResult[]): string {
  const lines: string[] = [];

  for (const result of results) {
    const { provider, data, error } = result;

    if (data === null && !error) {
      lines.push(`${pc.cyan(provider)}: ${pc.dim("Not authenticated")}`);
      continue;
    }

    if (data === null && error) {
      lines.push(`${pc.cyan(provider)}: ${pc.red(`Error - ${error.message}`)}`);
      continue;
    }

    lines.push(pc.cyan(provider));

    if (data!.primary) {
      const percent = data!.primary.usedPercent;
      lines.push(
        `  ${pc.dim(data!.primary.window + ":")}      ${colorByUsage(percent, `${percent}% used`)}`,
      );
    }

    if (data!.secondary) {
      const percent = data!.secondary.usedPercent;
      lines.push(
        `  ${pc.dim(data!.secondary.window + ":")}      ${colorByUsage(percent, `${percent}% used`)}`,
      );
    }

    if (data!.metadata?.plan) {
      lines.push(`  ${pc.dim("plan:")}    ${data!.metadata.plan}`);
    }

    lines.push("");
  }

  return lines.join("\n").trim();
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      provider: { type: "string" },
      route: { type: "string" },
      json: { type: "boolean", default: false },
      "no-cache": { type: "boolean", default: false },
      demo: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const bypassCache = values["no-cache"] ?? false;
  const outputJson = values.json ?? false;
  const demoMode = values.demo ?? false;

  // JSON mode - no fancy output
  if (outputJson) {
    const results = demoMode
      ? getDemoResults()
      : await getUsage({ autoDetectAuthTokens: true, bypassCache });

    if (values.route) {
      const modelID = values.route;
      let currentProvider: ProviderID = "anthropic";
      if (
        modelID.includes("gpt") ||
        modelID.includes("o1") ||
        modelID.includes("o3")
      ) {
        currentProvider = "openai";
      } else if (modelID.includes("claude")) {
        currentProvider = "anthropic";
      }
      const routeResult = pickBestProvider(
        { providerID: currentProvider, modelID },
        results,
      );
      console.log(JSON.stringify(routeResult, null, 2));
    } else {
      let filteredResults = results;
      if (values.provider) {
        const provider = values.provider as ProviderID;
        filteredResults = { [provider]: results[provider] };
      }
      console.log(JSON.stringify(filteredResults, null, 2));
    }
    process.exit(0);
  }

  // Interactive mode with clack
  p.intro(pc.bgCyan(pc.black(" model-provider-usage-limits ")));

  const s = p.spinner();
  s.start(demoMode ? "Loading demo data" : "Fetching usage limits");

  // Simulate network delay in demo mode
  if (demoMode) {
    await new Promise((r) => setTimeout(r, 800));
  }

  const results = demoMode
    ? getDemoResults()
    : await getUsage({ autoDetectAuthTokens: true, bypassCache });

  if (Object.keys(results).length === 0) {
    s.stop("No providers found");
    p.outro(
      pc.red(
        "No provider tokens found. Set up authentication with your AI providers.",
      ),
    );
    process.exit(1);
  }

  s.stop("Usage limits retrieved");

  // Filter to specific provider if requested
  let filteredResults = results;
  if (values.provider) {
    const provider = values.provider as ProviderID;
    const supported = listSupportedProviders();

    if (!supported.includes(provider)) {
      p.outro(
        pc.red(
          `Unknown provider "${provider}". Supported: ${supported.join(", ")}`,
        ),
      );
      process.exit(1);
    }

    if (!results[provider]) {
      p.outro(pc.red(`No data for provider "${provider}"`));
      process.exit(1);
    }

    filteredResults = { [provider]: results[provider] };
  }

  // Show usage
  const usageResults = Object.values(filteredResults).filter(
    (r): r is UsageResult => r !== undefined,
  );
  p.note(formatUsageNote(usageResults), "Current Usage");

  // Route mode
  if (values.route) {
    const modelID = values.route;

    s.start("Finding optimal provider");
    await new Promise((r) => setTimeout(r, 300)); // Brief pause for effect

    let currentProvider: ProviderID = "anthropic";
    if (
      modelID.includes("gpt") ||
      modelID.includes("o1") ||
      modelID.includes("o3")
    ) {
      currentProvider = "openai";
    } else if (modelID.includes("claude")) {
      currentProvider = "anthropic";
    }

    const routeResult = pickBestProvider(
      { providerID: currentProvider, modelID },
      results,
    );

    if (!routeResult) {
      s.stop("No route available");
      p.outro(
        pc.yellow(
          `${modelID}: Not routable (only available on ${currentProvider})`,
        ),
      );
      process.exit(0);
    }

    s.stop("Route calculated");

    const routeLines: string[] = [];
    for (const candidate of routeResult.candidates) {
      const pace = candidate.paceDelta;
      const paceStr =
        pace !== null ? pc.dim(` (pace: ${pace > 0 ? "+" : ""}${pace}%)`) : "";
      const isWinner = candidate.providerID === routeResult.providerID;
      const bullet = isWinner ? pc.green("●") : pc.dim("○");
      const name = isWinner
        ? pc.green(candidate.providerID)
        : pc.dim(candidate.providerID);
      const score = isWinner
        ? pc.green(`${candidate.score}`)
        : colorByPace(candidate.score, `${candidate.score}`);
      routeLines.push(`${bullet} ${name}  score ${score}${paceStr}`);
    }

    p.note(routeLines.join("\n"), pc.green(`✓ ${routeResult.reason}`));
  }

  p.outro(pc.green("Done!"));
}

main().catch((error) => {
  p.outro(
    pc.red(`Error: ${error instanceof Error ? error.message : String(error)}`),
  );
  process.exit(1);
});
