# OpenCode Configuration for model-provider-usage-limits

This directory contains OpenCode configuration and plugins for the model-provider-usage-limits project.

## Structure

```
.opencode/
├── package.json          # Dependencies (model-provider-usage-limits packages)
├── plugin/
│   └── usage-limits.ts   # Usage limits router plugin (runs plugin hooks)
└── command/
    ├── usage.md          # /usage command - show current provider limits
    └── route.md          # /route <model> - pick best provider and switch
```

## Commands

### `/usage`

Shows current usage limits across all authenticated providers.

Output example:
```
anthropic:
  5h: 98% remaining (used 2%)
  7d: 57% remaining (used 43%)
```

### `/route <model>`

Analyzes current usage and recommends the best provider for a model.

Example:
```
/route claude-sonnet-4-5
```

The command will:
1. Fetch current usage for all providers
2. Compare usage percentages and pace deltas
3. Recommend switching to the provider with most headroom
4. Suggest using the `/model` command to switch

## How It Works

- The CLI (`opencode-usage-limits`) fetches usage from OpenCode's auth tokens
- Commands are defined as markdown templates that call the CLI with `!(shell command)` syntax
- The plugin file provides hooks for potential future enhancements
