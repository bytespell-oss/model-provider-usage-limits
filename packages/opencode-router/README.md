# opencode-usage-limits-router

OpenCode plugin that auto-routes to the best AI provider based on current usage limits.

## Installation

```json
{
  "plugin": ["opencode-usage-limits-router"]
}
```

## How it Works

This plugin adds virtual models to your model picker (e.g., "Claude Sonnet 4.5 (Auto-Route)") that automatically route requests to the provider with the most available quota.

Uses [model-provider-usage-limits](https://www.npmjs.com/package/model-provider-usage-limits) for usage data and routing logic.

## Status

Not yet implemented - See [PLAN.md](./PLAN.md) for roadmap.

## License

MIT
