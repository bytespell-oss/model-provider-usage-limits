/**
 * XDG path resolution utilities
 */

import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Get XDG data home path (defaults to ~/.local/share)
 */
export function getXdgDataHome(): string {
  return process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share');
}

/**
 * Get XDG cache home path (defaults to ~/.cache)
 */
export function getXdgCacheHome(): string {
  return process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache');
}

/**
 * Get OpenCode auth file path
 */
export function getOpenCodeAuthPath(): string {
  return join(getXdgDataHome(), 'opencode', 'auth.json');
}

/**
 * Get cache directory for provider usage limits
 */
export function getUsageCacheDir(): string {
  return join(getXdgCacheHome(), 'opencode', 'provider-usage-limits');
}

/**
 * Get centralized cache file path
 */
export function getCentralizedCachePath(): string {
  return join(getUsageCacheDir(), 'usage.json');
}

/**
 * Get cache file path for a specific provider (deprecated - use centralized cache)
 */
export function getProviderCachePath(provider: string): string {
  return join(getUsageCacheDir(), `${provider}-usage.json`);
}
