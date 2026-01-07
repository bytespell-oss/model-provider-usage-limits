# opencode-usage-limits-router Plugin

## Current Implementation (Phase 1)

### Commands

The plugin provides two TUI commands:

#### `/usage` or `/limits`
Shows current usage for all authenticated providers via toast notification.

#### `/route <model>`
Picks the best provider for a model based on usage limits and switches to it.

Example:
```
/route claude-sonnet-4-5
```

Shows toast: "Switched to github-copilot/claude-sonnet-4.5 - github-copilot has most headroom (-29% behind pace)"

### Supported Models

Uses `ROUTABLE_MODELS` from core:

| Model | Available Providers |
|-------|---------------------|
| `claude-opus-4-5` | `anthropic`, `github-copilot` |
| `claude-sonnet-4-5` | `anthropic`, `github-copilot` |

### Architecture

```
┌─────────────────────────────────────┐
│  opencode-usage-limits-router       │
│  (OpenCode plugin + CLI)            │
│  - /usage command                   │
│  - /route command                   │
│  - CLI: opencode-usage-limits       │
│  - Reads OpenCode auth.json         │
└─────────────────┬───────────────────┘
                  │ depends on
                  ▼
┌─────────────────────────────────────┐
│  model-provider-usage-limits        │
│  (headless core)                    │
│  - Fetch usage from providers       │
│  - Calculate paceDelta              │
│  - Router logic (pickBestProvider)  │
└─────────────────────────────────────┘
```

## Future Phases

### Phase 2: Virtual Provider
Create a "limit-router" provider that auto-routes on every request:
- Appears in model picker as `limit-router/claude-sonnet-4-5`
- Automatically picks best provider per-request
- No manual `/route` command needed

### Phase 3: More Models
- Add GPT models (if available across multiple providers)
- Add Gemini models
- Auto-discover models available across providers

### Phase 4: Advanced Routing
- Cost optimization mode (pick cheapest provider)
- Latency optimization mode (pick fastest provider)
- Failover and retry logic
- OpenRouter support
