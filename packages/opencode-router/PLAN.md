# Proposal: `opencode-usage-limits-router` Plugin

## Overview

A plugin that creates "smart" model entries in the model picker that auto-route to the best provider based on current usage limits. For example, selecting "Claude Sonnet 4.5 (limit-router)" would automatically use whichever provider (Anthropic, GitHub Copilot, or OpenRouter) has the most headroom.

## Architecture

This plugin is a thin wrapper around `model-provider-usage-limits` which contains all the headless routing logic.

```
┌─────────────────────────────────────┐
│  opencode-usage-limits-router       │
│  (OpenCode plugin)                  │
│  - Registers virtual models         │
│  - Intercepts requests              │
│  - Toast notifications              │
└─────────────────┬───────────────────┘
                  │ depends on
                  ▼
┌─────────────────────────────────────┐
│  model-provider-usage-limits        │
│  (headless core)                    │
│  - Fetch usage from providers       │
│  - Calculate paceDelta              │
│  - Router logic (pickBestProvider)  │
│  - CLI                              │
└─────────────────────────────────────┘
```

## The Problem

Users with multiple provider subscriptions (Anthropic Pro, GitHub Copilot Pro+, ChatGPT Plus, etc.) want to:
1. Maximize value from all their subscriptions
2. Avoid hitting rate limits on one provider when another has capacity
3. Not have to manually check usage and switch providers

Currently, `model-provider-usage-limits` tells you the state, but you still have to manually act on it.

## Proposed Solution

### Approach: Pseudo-Provider with Request Interception

Create a "virtual" provider called `limit-router` that:
1. Appears in the model picker as real models (e.g., `limit-router/claude-sonnet-4-5`)
2. When a request comes in, calls core's `pickBestProvider()` to get best real provider
3. Routes to the provider with best capacity

### Implementation Options

**Option A: Custom Provider (like codex-auth)**
```
┌─────────────┐
│  OpenCode   │ 
└──────┬──────┘
       │ User selects "limit-router/claude-sonnet-4-5"
       ▼
┌──────────────────────────────┐
│  limit-router provider       │
│  - Custom fetch()            │
│  - Calls pickBestProvider()  │
│  - Transforms request        │
└──────┬───────────────────────┘
       │ Forwards to anthropic/github-copilot/etc
       ▼
┌──────────────────────────────┐
│  Real Provider API           │
└──────────────────────────────┘
```

**Pros**: Full control over routing, clean abstraction
**Cons**: Complex (as seen in codex-auth), need to handle auth for multiple providers

**Option B: TUI Command + Model Variants**

Instead of a fake provider, create a `/route` command that:
1. Calls `getAllUsage()` and `pickBestProvider()` from core
2. Suggests the best model
3. Auto-switches to it

```typescript
import { getAllUsage, pickBestProvider } from 'model-provider-usage-limits';

return {
  "tui.command.execute": async (input, output) => {
    if (input.command === "route") {
      const usage = await getAllUsage();
      const best = pickBestProvider("claude-sonnet-4-5", usage);
      await client.tui.executeCommand({ 
        body: { command: `/model ${best.providerID}/${best.modelID}` }
      });
      await client.tui.showToast({
        body: { message: best.reason, variant: "info" }
      });
    }
  }
}
```

**Pros**: Simple, uses existing primitives
**Cons**: Manual step required (user must type `/route`)

### Recommended Approach: Option A (Custom Provider)

While more complex, a custom provider gives us:
- Seamless UX (just pick the model, routing is automatic)
- Per-request routing (can re-evaluate on each API call)
- Future flexibility (could add cost optimization, latency routing, etc.)

## Package Design

### Name
`opencode-usage-limits-router`

### Dependencies
```json
{
  "dependencies": {
    "model-provider-usage-limits": "^0.1.0"
  },
  "peerDependencies": {
    "@opencode-ai/plugin": "^1.0.0"
  }
}
```

### Hardcoded Models (Phase 1)

Uses `ROUTABLE_MODELS` from core:

| Virtual Model | Real Providers Available |
|---------------|-------------------------|
| `limit-router/claude-opus-4-5` | `anthropic`, `github-copilot` |
| `limit-router/claude-sonnet-4-5` | `anthropic`, `github-copilot` |

### Configuration

Users would add to `opencode.json`:
```json
{
  "plugin": ["opencode-usage-limits-router"],
  "provider": {
    "limit-router": {
      "models": {
        "claude-sonnet-4-5": {
          "name": "Claude Sonnet 4.5 (Auto-Route)",
          "providers": ["anthropic", "github-copilot"]
        }
      }
    }
  }
}
```

Or use defaults without config.

## Open Questions

1. **Auth access**: Can a plugin access auth tokens for multiple providers? The codex-auth example suggests yes (via `client.auth` or reading auth.json directly).

2. **Provider switching mid-stream**: If we start with provider A and it rate-limits mid-response, can we failover to provider B? Or do we commit upfront?

3. **Caching**: Should we cache the routing decision for a session, or re-evaluate on each request?

4. **UI feedback**: Should we show a toast notification when routing (e.g., "Routed to GitHub Copilot (Anthropic at 85% usage)")?

## File Structure

```
opencode-usage-limits-router/
├── package.json
├── README.md
├── PLAN.md
├── src/
│   ├── index.ts           # Plugin entry point
│   └── provider.ts        # Custom provider implementation (uses core's pickBestProvider)
└── tsconfig.json
```

## Phase 1 Scope

1. Support Claude Opus 4.5 and Claude Sonnet 4.5 only
2. Route between Anthropic and GitHub Copilot only (both use OAuth from OpenCode)
3. Use core's `pickBestProvider()` for routing decisions
4. No failover mid-request
5. Toast notification on routing decision

## Future Phases

- **Phase 2**: Add OpenRouter support, more models (GPT-5, Gemini)
- **Phase 3**: Auto-discover models available across providers
- **Phase 4**: Cost optimization mode (pick cheapest provider)
- **Phase 5**: Latency optimization mode (pick fastest provider)
- **Phase 6**: Failover and retry logic
