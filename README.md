# Model Provider Usage Limits
Never leave tokens on the table. 

Zero config - uses auth from env/config for current user.


**Track** usage limits for your AI subscriptions. 

`npx @bytespell/model-provider-usage-limits`

```yaml
anthropic:
  5h: 45% used
  7d: 30% used

github-copilot:
  monthly: 60% used
```

Route your AI requests to squeeze all the value out of your subscriptions

`npx @bytespell/model-provider-usage-limits --route claude-sonnet-4-5`

```yaml
github-copilot has most headroom (-15% pace)
  - github-copilot: score -15 (pace: -15%)
  - anthropic: score 8 (pace: +8%)
```

Supported providers:
- Claude Pro / Max
- GitHub Copilot
- ChatGPT Plus
- Codex

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

## License

MIT
