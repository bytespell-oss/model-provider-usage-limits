# Model Provider Usage Limits

Monorepo for managing AI provider usage limits and smart routing.

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [@bytespell/model-provider-usage-limits](./packages/core) | Headless library: fetch usage, pace tracking, router logic | [![npm](https://img.shields.io/npm/v/@bytespell/model-provider-usage-limits)](https://www.npmjs.com/package/@bytespell/model-provider-usage-limits) |
| [@bytespell/opencode-usage-limits-router](./packages/opencode-usage-limits-router) | OpenCode integration: CLI + plugin | [![npm](https://img.shields.io/npm/v/@bytespell/opencode-usage-limits-router)](https://www.npmjs.com/package/@bytespell/opencode-usage-limits-router) |

## Quick Start

### For OpenCode Users (CLI)

```bash
npx @bytespell/opencode-usage-limits-router
```

Reads tokens from OpenCode's auth file automatically.

### As a Library

```bash
npm install @bytespell/model-provider-usage-limits
```

```typescript
import { getUsage, pickBestProvider } from '@bytespell/model-provider-usage-limits';

const results = await getUsage({
  tokens: {
    anthropic: 'your-token',
    'github-copilot': 'your-token',
  }
});

const best = pickBestProvider('claude-sonnet-4-5', results);
```

### As an OpenCode Plugin

> **Note:** This project is not built by the OpenCode team and is not affiliated with OpenCode in any way.

Add to `.opencode/package.json`:

```json
{
  "type": "module",
  "dependencies": {
    "@opencode-ai/plugin": "^1.1.4",
    "@bytespell/opencode-usage-limits-router": "^0.0.1"
  }
}
```

Create `.opencode/plugin/usage-limits.ts`:

```typescript
export { UsageLimitsPlugin } from '@bytespell/opencode-usage-limits-router';
```

## Development

```bash
npm install
npm run build
node packages/opencode-usage-limits-router/dist/cli.js
```

## License

MIT
