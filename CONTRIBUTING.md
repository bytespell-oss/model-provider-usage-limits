# Contributing

## Overview

Monorepo with two packages:
- `packages/core` - Headless library for fetching provider usage data
- `packages/opencode-usage-limits-router` - CLI and OpenCode plugin (depends on core)

Build order matters: core must build before router.

## Development

```bash
npm install
npm run build
```

## Releasing

1. Bump version in the relevant `package.json` file(s)
2. Commit and push:
   ```bash
   git commit -am "chore: release vX.X.X" && git push
   ```
3. Publish:
   ```bash
   gh workflow run publish.yml
   ```
