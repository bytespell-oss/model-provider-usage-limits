# @bytespell/opencode-usage-limits-router

[![npm version](https://img.shields.io/npm/v/@bytespell/opencode-usage-limits-router.svg)](https://www.npmjs.com/package/@bytespell/opencode-usage-limits-router)

OpenCode integration for AI provider usage limits. Includes CLI and plugin.

Reads tokens from OpenCode's `auth.json` and uses [@bytespell/model-provider-usage-limits](https://www.npmjs.com/package/@bytespell/model-provider-usage-limits) for fetching usage data and routing logic.

## Installation

Add to your `opencode.json`:

```json
{
  "plugin": ["@bytespell/opencode-usage-limits-router"]
}
```

Or for project-level setup, create `.opencode/package.json`:

```json
{
  "type": "module",
  "dependencies": {
    "@opencode-ai/plugin": "^1.1.4",
    "@bytespell/opencode-usage-limits-router": "^0.0.1"
  }
}
```

And `.opencode/plugin/usage-limits.ts`:

```typescript
export { UsageLimitsPlugin } from '@bytespell/opencode-usage-limits-router';
```

## Plugin Features

The plugin shows usage information via toast notifications:
- On `session.idle` (after each model response): Shows compact usage summary
- Listens for `/usage` and `/route` commands

## CLI Usage

```bash
npx @bytespell/opencode-usage-limits-router
```

```
anthropic:
  5h: 84% remaining (used 16%) [-73%]
    resets at 2026-01-07T06:00:00Z
  7d: 59% remaining (used 41%)
    resets at 2026-01-11T09:00:00Z

github-copilot:
  monthly: 98% remaining (used 2%) [-87%]
  plan: individual
  credits: 293
```

### CLI Options

```bash
opencode-usage-limits --provider anthropic     # Query specific provider
opencode-usage-limits --json                   # Output JSON format
opencode-usage-limits --no-cache               # Bypass cache
opencode-usage-limits --help                   # Show help
```

### Pace Indicators

- **[+X%]** = Using faster than pace (slow down!)
- **[-X%]** = Using slower than pace (speed up!)

## Library Usage

```typescript
import { getProviderTokens, getUsage, pickBestProvider } from '@bytespell/opencode-usage-limits-router';

// Get tokens from OpenCode auth
const tokens = getProviderTokens();

// Fetch usage
const results = await getUsage({ tokens });

// Smart routing
const best = pickBestProvider('claude-sonnet-4-5', results);
console.log(best.reason);
// "github-copilot has most headroom (-29% behind pace)"
```

## Authentication

Reads tokens from OpenCode's auth file (cross-platform):
- Linux: `~/.local/share/opencode/auth.json`
- macOS: `~/Library/Application Support/opencode/auth.json`
- Windows: `%APPDATA%\opencode\auth.json`

Run `opencode auth login` to authenticate with providers.

## License

MIT
