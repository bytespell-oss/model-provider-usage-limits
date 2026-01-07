# @bytespell/model-provider-usage-limits

[![npm version](https://img.shields.io/npm/v/@bytespell/model-provider-usage-limits.svg)](https://www.npmjs.com/package/@bytespell/model-provider-usage-limits)

Headless library for fetching AI provider usage limits from Anthropic, GitHub Copilot, and OpenAI. Includes pace tracking and smart routing logic.

For OpenCode integration with automatic token reading, see [`@bytespell/opencode-usage-limits-router`](https://www.npmjs.com/package/@bytespell/opencode-usage-limits-router).

## Installation

```bash
npm install @bytespell/model-provider-usage-limits
```

## Usage

```typescript
import { getUsage, pickBestProvider } from '@bytespell/model-provider-usage-limits';

// Fetch usage for one or more providers
const results = await getUsage({
  tokens: {
    anthropic: 'your-anthropic-token',
    'github-copilot': 'your-copilot-token',
    openai: 'your-openai-token',
  }
});

// results = {
//   anthropic: { provider: 'anthropic', data: { primary: { usedPercent: 88, paceDelta: 45, ... } } },
//   'github-copilot': { provider: 'github-copilot', data: { ... } },
//   openai: { provider: 'openai', data: { ... } }
// }

// Smart routing: pick best provider for a model
const best = pickBestProvider('claude-sonnet-4-5', results);
// { providerID: 'github-copilot', modelID: 'claude-sonnet-4.5', reason: 'github-copilot has most headroom (-29% behind pace)' }
```

## Pace Tracking

The library calculates `paceDelta` for each usage window:
- **Positive (+X%)** = Using faster than pace, will hit limits early (slow down!)
- **Negative (-X%)** = Using slower than pace, quota will go unused (speed up!)

For example, if you're 79% through a 7-day window but only used 41%, `paceDelta` will be `-38%` telling you to speed up.

## API Reference

### `getUsage(options)`

Fetch usage data for providers.

```typescript
interface GetUsageOptions {
  tokens: Partial<Record<ProviderID, string>>;  // Required: provider tokens
  bypassCache?: boolean;  // Force fresh fetch (default: false)
  cacheTTL?: number;      // Cache TTL in ms (default: 60000)
  timeout?: number;       // Request timeout in ms (default: 5000)
}

const results = await getUsage({ tokens: { anthropic: '...' } });
// Returns: Partial<Record<ProviderID, UsageResult>>
```

### `pickBestProvider(modelName, usageData)`

Pick the best provider for a model based on current usage limits.

```typescript
const best = pickBestProvider('claude-sonnet-4-5', results);
// Returns: RouterResult
```

### `listSupportedProviders()`

List available provider IDs: `['anthropic', 'github-copilot', 'openai']`

### `listRoutableModels()`

List models that can be routed across providers.

## Types

### ProviderID

```typescript
type ProviderID = 'anthropic' | 'github-copilot' | 'openai';
```

### UsageResult

```typescript
interface UsageResult {
  provider: ProviderID;
  data: UsageSnapshot | null;
  error?: ProviderUsageError;
  cache?: { age: number; timestamp: number; updatedAt: string; stale: boolean };
}
```

### UsageSnapshot

```typescript
interface UsageSnapshot {
  provider: ProviderID;
  primary: {
    usedPercent: number;
    window: string;  // e.g., "5h", "7d", "monthly"
    resetsAt: string | null;
    paceDelta: number | null;
  } | null;
  secondary: { ... } | null;
  metadata?: { plan?: string; credits?: { balance: number | null; unlimited: boolean } };
}
```

### RouterResult

```typescript
interface RouterResult {
  providerID: ProviderID;
  modelID: string;
  reason: string;
  candidates: RouterCandidate[];
}
```

## License

MIT
