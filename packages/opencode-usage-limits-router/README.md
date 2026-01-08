# OpenCode Usage Limits Plugin

OpenCode plugin for AI provider usage limit routing.

> **Note:** Not affiliated with OpenCode.

## Setup

`.opencode/package.json`:
```json
{
  "type": "module",
  "dependencies": {
    "@opencode-ai/plugin": "^1.1.4",
    "@bytespell/opencode-usage-limits-router": "^0.0.3"
  }
}
```

`.opencode/plugin/usage-limits.ts`:
```typescript
export { UsageLimitsPlugin } from '@bytespell/opencode-usage-limits-router';
```

The plugin shows toast notifications when you should switch providers.

## Debug

```bash
USAGE_LIMITS_DEBUG=1 opencode
```

## Testing

See `example-opencode-setup/` for a sample configuration.

## License

MIT
