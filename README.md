# Model Provider Usage Limits

**Never leave tokens on the table.** Track usage across all your AI subscriptions and route requests to the provider with the most headroom.

## Demo

![Demo](./assets/demo.svg)

## Quick Start
```bash
# Check current usage across all providers
npx @bytespell/model-provider-usage-limits

# Find the best provider for your next request
npx @bytespell/model-provider-usage-limits --route claude-sonnet-4-5
```

## Features

### 📊 Usage Tracking
Monitor consumption across multiple time windows:
```yaml
anthropic:
  5h: 45% used
  7d: 30% used

github-copilot:
  monthly: 60% used
```

### 🎯 Routing
Automatically route to the subscription with most available capacity:
```yaml
github-copilot has most headroom (-15% pace)
  - github-copilot: score -15 (pace: -15%)
  - anthropic: score 8 (pace: +8%)
```

## Supported Providers

- **Anthropic** - Claude Pro / Max
- **GitHub** - Copilot
- **OpenAI** - ChatGPT Plus
- **Codex**

---

## CLI

```bash
npx @bytespell/model-provider-usage-limits [options]
```

| Option | Description |
|--------|-------------|
| `--provider <id>` | Query specific provider (`anthropic`, `github-copilot`, `openai`) |
| `--route <model>` | Pick best provider for a model |
| `--json` | Output JSON |
| `--no-cache` | Bypass cache |

## Library

```bash
npm install @bytespell/model-provider-usage-limits
```

### getUsage()

```typescript
import { getUsage } from '@bytespell/model-provider-usage-limits';

// Auto-detect tokens
const results = await getUsage({ autoDetectAuthTokens: true });

// Or explicit tokens
const results = await getUsage({
  tokens: { anthropic: 'sk-...', 'github-copilot': 'ghu_...' }
});
```

| Option | Description |
|--------|-------------|
| `autoDetectAuthTokens` | Read tokens from known sources |
| `tokens` | Explicit token map (overrides auto-detected) |
| `bypassCache` | Skip cache |

### pickBestProvider()

```typescript
import { getUsage, pickBestProvider } from '@bytespell/model-provider-usage-limits';

const results = await getUsage({ autoDetectAuthTokens: true });
const best = pickBestProvider({ providerID: 'anthropic', modelID: 'claude-sonnet-4-5' }, results);

// best.providerID = 'github-copilot'
// best.modelID = 'claude-sonnet-4.5'  
// best.reason = 'github-copilot has most headroom (-15% pace)'
```


## Roadmap

- [ ] Add Gemini support
- [ ] Add open-code-router plugin to auto-route open-code requests based on current utilization

**Want to contribute?** We're looking for help with finalizing the open-code-router plugin! See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT
