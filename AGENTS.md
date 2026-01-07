# AGENTS.md - Coding Agent Guidelines

This file contains build instructions, code style guidelines, and conventions for AI coding agents working in this repository.

## Project Overview

**model-provider-usage-limits** - Monorepo containing:

1. **`model-provider-usage-limits`** (packages/core) - Headless TypeScript library for fetching AI provider usage/quota data (Anthropic, GitHub Copilot, OpenAI). Includes pace tracking and smart routing logic.

2. **`opencode-usage-limits-router`** (packages/opencode-router) - OpenCode plugin that wraps the core library to provide auto-routing in the model picker.

## Build & Development Commands

### Monorepo Commands (from root)

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Build specific package
npm run build --workspace=packages/core
npm run build --workspace=packages/opencode-router

# Watch mode (core only)
npm run watch

# Clean all
npm run clean
```

### Package-specific Commands

```bash
# Work on core package
cd packages/core
npm run build
npm run watch

# Work on router package  
cd packages/opencode-router
npm run build
```

### Testing Locally

```bash
# Test core CLI
node packages/core/dist/cli.js --provider anthropic
node packages/core/dist/cli.js --json --no-cache

# Link packages for local testing
npm link --workspace=packages/core
npm link --workspace=packages/opencode-router

# After making changes, rebuild to update linked packages
npm run build
```

**Important**: When developing with linked packages, always run `npm run build` after making changes to ensure consuming projects get the updated code.

## Code Style Guidelines

### TypeScript Configuration

- **Target**: ES2022
- **Module**: ES2022 (ESM only, `.js` extensions required in imports)
- **Strict mode**: Enabled with all strict checks
- **Compiler flags**: `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`

### Import Conventions

```typescript
// ALWAYS include .js extension for local imports (ESM requirement)
import { getUsage } from './index.js';
import type { ProviderID } from './types.js';

// Type-only imports use 'import type'
import type { UsageResult, UsageOptions } from './types.js';

// Named imports for specific values
import { ProviderUsageError } from './types.js';

// NEVER omit .js extension
import { getUsage } from './index';  // WRONG

// NEVER use default exports (use named exports)
export default function() {}  // WRONG
```

**Import order**:
1. Type imports from local modules
2. Value imports from local modules
3. Node.js built-in modules (node: prefix)

### Naming Conventions

- **Files**: lowercase with hyphens (e.g., `fetch-utils.ts`, `anthropic.ts`)
- **Functions**: camelCase (e.g., `getUsage`, `fetchAnthropicUsage`)
- **Types/Interfaces**: PascalCase (e.g., `UsageResult`, `ProviderID`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_CACHE_TTL_MS`, `PROVIDER_ID`)
- **Private helpers**: Prefix with `_` only if needed for clarity (generally avoid)

### Type Definitions

```typescript
// Use type for unions and simple aliases
export type ProviderID = 'anthropic' | 'github-copilot' | 'openai';

// Use interface for object shapes
export interface UsageOptions {
  bypassCache?: boolean;
  cacheTTL?: number;
}

// Use satisfies for exhaustiveness checks
default:
  throw new Error(`Unknown provider: ${providerID satisfies never}`);

// Explicit return types for public functions
export async function getUsage(
  providerID: ProviderID,
  options?: UsageOptions,
): Promise<UsageResult> {
  // ...
}

// Readonly modifiers for error classes
constructor(
  message: string,
  public readonly provider: ProviderID,
  public readonly code: 'AUTH_MISSING' | 'API_ERROR',
) {}
```

### Error Handling

**Philosophy**: Return errors in results instead of throwing (except for programmer errors).

```typescript
// Return errors in result objects
export interface UsageResult {
  provider: ProviderID;
  data: UsageSnapshot | null;
  error?: ProviderUsageError;  // Present if fetch failed
}

// Custom error class with structured data
export class ProviderUsageError extends Error {
  constructor(
    message: string,
    public readonly provider: ProviderID,
    public readonly code: 'AUTH_MISSING' | 'API_ERROR' | 'TIMEOUT' | 'UNKNOWN',
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ProviderUsageError';
    Object.setPrototypeOf(this, ProviderUsageError.prototype);
  }
}

// Stale cache fallback on API errors
catch (error) {
  const providerError = error instanceof ProviderUsageError
    ? error
    : new ProviderUsageError('Unexpected error', PROVIDER_ID, 'UNKNOWN', error);
  
  const staleCache = readCache<UsageSnapshot>(cachePath);
  if (staleCache) {
    return { provider: PROVIDER_ID, data: staleCache.data, error: providerError };
  }
  
  return { provider: PROVIDER_ID, data: null, error: providerError };
}

// Silent failures for non-critical operations (cache writes)
try {
  writeFileSync(cachePath, JSON.stringify(entry), 'utf-8');
} catch {
  // Ignore cache write failures (non-critical)
}
```

### Function Documentation

```typescript
/**
 * Single-line description for simple functions
 */
export function isCacheFresh<T>(entry: CacheEntry<T>, ttlMs: number): boolean {
  // ...
}

/**
 * Multi-line JSDoc for complex functions.
 * 
 * @param providerID - Provider to query
 * @param options - Cache and fetch options
 * @returns UsageResult with data, optional error, and cache metadata
 */
export async function getUsage(
  providerID: ProviderID,
  options?: UsageOptions,
): Promise<UsageResult> {
  // ...
}
```

### Architecture Patterns

**Core Package** (`packages/core/src/`):

- **Provider Adapters** (`providers/`): Each provider has its own module
- **Utilities** (`utils/`): Pure, reusable functions
- **Router** (`router.ts`): Headless routing logic
- **Public API** (`index.ts`): Export types and main functions

**OpenCode Router Package** (`packages/opencode-router/src/`):

- Thin wrapper around core
- OpenCode plugin hooks and integration
- No business logic (delegates to core)

### Caching Strategy

```typescript
// 1. Check auth first (fail fast if missing)
const token = getToken();
if (!token) return { provider, data: null };

// 2. Try fresh cache if not bypassed
const cached = bypassCache ? null : readCache(cachePath);
if (cached && isCacheFresh(cached, cacheTTL)) {
  return { provider, data: cached.data, cache: getCacheMetadata(cached) };
}

// 3. Fetch fresh data, write cache
try {
  const data = await fetchAPI(token);
  writeCache(cachePath, data);
  return { provider, data };
} catch (error) {
  // 4. Fallback to stale cache on error
  const stale = readCache(cachePath);
  if (stale) {
    return { provider, data: stale.data, error, cache: getCacheMetadata(stale) };
  }
  return { provider, data: null, error };
}
```

## CLI Development

- CLI entry point: `packages/core/src/cli.ts` with shebang `#!/usr/bin/env node`
- Use `node:util` parseArgs for argument parsing (no external deps)
- Support `--help`, `--provider`, `--json`, `--no-cache` flags
- Human-readable output by default, JSON with `--json`
- Exit code 1 on errors, 0 on success

## Pull Request Checklist

- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] All imports use `.js` extension
- [ ] Public functions have JSDoc comments
- [ ] Error handling follows result pattern (no thrown errors for API failures)
- [ ] Cache writes are non-blocking and silently fail
- [ ] Provider adapters return consistent `UsageResult` structure
- [ ] Update README.md if adding new features
- [ ] No unused imports or variables (strict mode catches these)
