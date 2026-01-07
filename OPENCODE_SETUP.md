# OpenCode Integration - Setup Complete

The `model-provider-usage-limits` project is now integrated with OpenCode.

## Available Commands

### `/usage`

Shows current usage limits for all authenticated providers.

**Usage:**
```
/usage
```

**Output:**
```
anthropic:
  5h: 98% remaining (used 2%)
    resets at 2026-01-07T10:59:59Z
  7d: 57% remaining (used 43%)
    resets at 2026-01-11T08:59:59Z

github-copilot:
  monthly: 98% remaining (used 2%)
  plan: individual
  credits: 293
```

### `/route <model>`

Analyzes current usage and picks the best provider for a model.

**Usage:**
```
/route claude-sonnet-4-5
```

**How it works:**
1. Fetches current usage from all providers
2. Analyzes remaining capacity and pace indicators
3. Recommends which provider has the most headroom
4. Suggests using `/model provider/modelID` to switch

## Configuration

The configuration is located in `.opencode/`:

```
.opencode/
├── package.json           # Local dependencies
├── plugin/
│   └── usage-limits.ts    # Plugin file (for future enhancements)
└── command/
    ├── usage.md           # /usage command
    └── route.md           # /route command
```

## How It Works

1. **Commands** are defined as markdown templates in `.opencode/command/`
2. When executed, they run the CLI (`opencode-usage-limits`) with `!(shell command)` syntax
3. The CLI reads tokens from OpenCode's `auth.json` 
4. Usage data is cached locally for performance

## Testing

To test locally:

```bash
# Build the packages
npm run build

# Run the CLI directly
npx opencode-usage-limits

# Or with specific options
npx opencode-usage-limits --provider anthropic --json
```

## Next Steps

Future enhancements:
- Create a virtual "limit-router" provider for automatic routing on every request
- Add support for more models (GPT, Gemini, etc.)
- Implement cost optimization mode
- Add latency-based routing

See `packages/opencode-usage-limits-router/PLAN.md` for the full roadmap.
