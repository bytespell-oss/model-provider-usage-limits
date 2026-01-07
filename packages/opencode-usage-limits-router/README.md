# @bytespell/opencode-usage-limits-router

[![npm version](https://img.shields.io/npm/v/@bytespell/opencode-usage-limits-router.svg)](https://www.npmjs.com/package/@bytespell/opencode-usage-limits-router)

> **Note:** This is a community project. It is not built by the OpenCode team and is not affiliated with OpenCode.

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

### Auto-Routing

The plugin automatically switches providers when you're over pace:

- **Monitors usage after each response**: Listens for `session.idle` events (after assistant completes)
- **Checks pace thresholds**: If current provider is ≥ +5% over pace, looks for alternatives
- **Auto-switches providers**: Switches to provider with ≤ -5% pace (has headroom)
- **Shows notifications**: Toast alerts when switching providers or when over pace

**Example flow:**
1. You send a message using Anthropic
2. Assistant responds (Anthropic is +8% over pace)
3. Plugin checks GitHub Copilot (-15% under pace)
4. Toast: "Switched to github-copilot (-15% pace)\nanthropic was +8% over pace"
5. Next message automatically uses GitHub Copilot

### Commands

- `/usage` - Show current usage for all providers
- `/route <model>` - Get routing recommendation for a specific model

### Debug Mode

Enable verbose logging and usage toasts after every response:

```bash
export USAGE_LIMITS_DEBUG=1
opencode
```

Creates `plugin-debug.log` in your project directory with detailed routing decisions.

## Important Considerations

### Model Persistence

**The plugin writes to your project's `config.json` when switching providers.** This means:

- ✅ Model changes persist across sessions in the same project
- ✅ Each project can have different provider preferences
- ⚠️ Changes are written to disk (not in-memory only)
- ⚠️ Triggers instance disposal and TUI reload (usually transparent)

If you manually switch providers using `/model`, the plugin will respect your choice until it detects you're over pace again.

### When Auto-Switching Happens

The plugin only switches when:
1. Current provider is ≥ +5% over pace
2. Alternative provider exists for the same model
3. Alternative provider is ≤ -5% under pace (has headroom)

Otherwise, it shows a warning toast but doesn't switch.

### Supported Models

Auto-routing works for models available on multiple providers:
- `claude-sonnet-4-5`: anthropic, github-copilot
- `claude-opus-4-5`: anthropic, github-copilot

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
