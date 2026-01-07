# Model Provider Usage Limits

Monorepo for managing AI provider usage limits and smart routing.

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [model-provider-usage-limits](./packages/core) | Fetch usage limits, pace tracking, router logic | [![npm](https://img.shields.io/npm/v/model-provider-usage-limits)](https://www.npmjs.com/package/model-provider-usage-limits) |
| [opencode-usage-limits-router](./packages/opencode-router) | OpenCode plugin for auto-routing | [![npm](https://img.shields.io/npm/v/opencode-usage-limits-router)](https://www.npmjs.com/package/opencode-usage-limits-router) |

## Quick Start

```bash
# CLI
npx model-provider-usage-limits

# Library
npm install model-provider-usage-limits
```

## Development

```bash
npm install
npm run build
node packages/core/dist/cli.js
```

## License

MIT
