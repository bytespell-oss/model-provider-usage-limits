# model-provider-usage-limits

Fetch AI provider usage quotas and limits from Anthropic, GitHub Copilot, and OpenAI. Includes pace tracking and smart routing logic.

```bash
$ npx model-provider-usage-limits
anthropic:
  5h: 12% remaining (used 88%) +45%
    resets at 2026-01-02T18:00:00Z
  7d: 59% remaining (used 41%)

github-copilot:
  monthly: 98% remaining (used 2%) -87%
  plan: individual
  credits: 293

openai:
  5h: 92% remaining (used 8%)
    resets at 2026-01-02T20:07:08Z
  7d: 87% remaining (used 13%) -29%
  plan: plus
```

## Why This Exists

Using your built-in credits from existing AI subscriptions (ChatGPT Plus, GitHub Copilot, Anthropic) is convenient, but **it's hard to know how to load balance between them**. Each provider has different rate limits, usage windows, and quotas. This library gives you clear visibility into your current usage so you can make informed decisions about which tokens to use from where and when.

### Pace Tracking

The library shows pace indicators to help you optimize usage:
- **+X%** = You're ahead of pace (using too fast, slow down!)
- **-X%** = You're behind pace (using too slow, speed up!)

For example, if you're 79% through a 7-day window but only used 41%, you'll see `-29%` telling you to speed up and use more from that provider.

### Smart Routing

The library includes headless routing logic to automatically pick the best provider for a model based on current usage limits:

```typescript
import { getAllUsage, pickBestProvider } from 'model-provider-usage-limits';

const usage = await getAllUsage();
const result = pickBestProvider('claude-sonnet-4-5', usage);
// { providerID: 'github-copilot', modelID: 'claude-sonnet-4.5', reason: '...' }
```

## Quick Start

```bash
npm install model-provider-usage-limits
```

**CLI usage:**
```bash
# All providers
model-provider-usage-limits

# Specific provider
model-provider-usage-limits --provider anthropic
model-provider-usage-limits --provider github-copilot

# Fresh fetch (bypass cache)
model-provider-usage-limits --provider openai --no-cache
```

**Library API:**
```typescript
import { getUsage, getAllUsage } from 'model-provider-usage-limits';

const result = await getUsage('anthropic');
// { provider: 'anthropic', data: { primary: { usedPercent: 88, paceDelta: 45, ... } }, cache: {...} }
```

## API Reference

### Usage Fetching

**`getUsage(provider, options?)`** - Fetch usage for a specific provider

**`getAllUsage(options?)`** - Fetch usage for all providers in parallel

**`listSupportedProviders()`** - List available provider IDs

### Routing

**`pickBestProvider(modelName, usageData)`** - Pick best provider for a model based on usage

**`listRoutableModels()`** - List models that can be routed across providers

### Options

```typescript
{
  bypassCache?: boolean;  // Force fresh fetch (default: false)
  cacheTTL?: number;      // Cache TTL in ms (default: 60000)
  timeout?: number;       // Request timeout in ms (default: 5000)
}
```

### Result Structure

```typescript
{
  provider: 'anthropic' | 'github-copilot' | 'openai';
  data: {
    provider: ProviderID;
    primary: { 
      usedPercent: number; 
      window: string; 
      resetsAt: string | null;
      paceDelta: number | null;  // +X = ahead (slow down), -X = behind (speed up)
    } | null;
    secondary: { 
      usedPercent: number; 
      window: string; 
      resetsAt: string | null;
      paceDelta: number | null;
    } | null;
    metadata?: { plan?: string; credits?: { balance: number | null; unlimited: boolean } };
  } | null;
  error?: { message: string; code: 'AUTH_MISSING' | 'API_ERROR' | 'TIMEOUT' | 'UNKNOWN' };
  cache?: { age: number; timestamp: number; updatedAt: string; stale: boolean };
}
```

### Router Result

```typescript
{
  providerID: ProviderID;
  modelID: string;
  reason: string;
  candidates: {
    providerID: ProviderID;
    modelID: string;
    available: boolean;
    paceDelta: number | null;
    usedPercent: number | null;
    score: number;
  }[];
}
```

## License

MIT
