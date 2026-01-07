/**
 * Cross-platform path utilities for cache storage
 */

import { homedir, platform } from 'node:os';
import { join } from 'node:path';

/**
 * Get the platform-appropriate cache directory.
 * 
 * - Linux: ~/.cache (or $XDG_CACHE_HOME)
 * - macOS: ~/Library/Caches
 * - Windows: %LOCALAPPDATA% (e.g., C:\Users\X\AppData\Local)
 */
export function getCacheHome(): string {
  // Respect XDG_CACHE_HOME on any platform if set
  if (process.env.XDG_CACHE_HOME) {
    return process.env.XDG_CACHE_HOME;
  }

  const home = homedir();
  const os = platform();

  switch (os) {
    case 'win32':
      return process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local');
    case 'darwin':
      return join(home, 'Library', 'Caches');
    default:
      // Linux and others: XDG default
      return join(home, '.cache');
  }
}

/**
 * Get cache directory for provider usage limits
 */
export function getUsageCacheDir(): string {
  return join(getCacheHome(), 'model-provider-usage-limits');
}

/**
 * Get centralized cache file path
 */
export function getCentralizedCachePath(): string {
  return join(getUsageCacheDir(), 'usage.json');
}
