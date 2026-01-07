/**
 * Cache utilities with TTL support
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ProviderID, UsageSnapshot } from '../types.js';
import { getCentralizedCachePath } from './paths.js';

export const DEFAULT_CACHE_TTL_MS = 60_000; // 1 minute
const STALE_THRESHOLD_MS = 600_000; // 10 minutes

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface CacheMetadata {
  age: number;
  timestamp: number;
  updatedAt: string;
  stale: boolean;
}

interface CentralizedCache {
  [provider: string]: CacheEntry<UsageSnapshot>;
}

/**
 * Read cache entry from file
 */
export function readCache<T>(path: string): CacheEntry<T> | null {
  if (!existsSync(path)) return null;

  try {
    const content = readFileSync(path, 'utf-8');
    const entry = JSON.parse(content) as CacheEntry<T>;
    
    if (typeof entry.timestamp !== 'number' || !entry.data) {
      return null;
    }

    return entry;
  } catch {
    return null;
  }
}

/**
 * Write cache entry to file
 */
export function writeCache<T>(path: string, data: T): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  };

  try {
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(path, JSON.stringify(entry), 'utf-8');
  } catch {
    // Ignore cache write failures (non-critical)
  }
}

/**
 * Read centralized cache with all providers
 */
export function readCentralizedCache(): Record<ProviderID, CacheEntry<UsageSnapshot>> | null {
  const path = getCentralizedCachePath();
  if (!existsSync(path)) return null;

  try {
    const content = readFileSync(path, 'utf-8');
    const cache = JSON.parse(content) as CentralizedCache;
    
  // Validate structure
  for (const [, entry] of Object.entries(cache)) {
    if (typeof entry.timestamp !== 'number' || !entry.data) {
      return null;
    }
  }

    return cache as Record<ProviderID, CacheEntry<UsageSnapshot>>;
  } catch {
    return null;
  }
}

/**
 * Write centralized cache with all providers
 */
export function writeCentralizedCache(
  cache: Record<ProviderID, CacheEntry<UsageSnapshot>>,
): void {
  const path = getCentralizedCachePath();

  try {
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(path, JSON.stringify(cache), 'utf-8');
  } catch {
    // Ignore cache write failures (non-critical)
  }
}

/**
 * Update a single provider in centralized cache
 */
export function updateProviderInCache(
  provider: ProviderID,
  snapshot: UsageSnapshot,
): void {
  const cache = readCentralizedCache();
  if (cache) {
    cache[provider] = {
      data: snapshot,
      timestamp: Date.now(),
    };
    writeCentralizedCache(cache);
  } else {
    // Create new cache with this provider
    const newCache: Record<string, CacheEntry<UsageSnapshot>> = {
      [provider]: {
        data: snapshot,
        timestamp: Date.now(),
      },
    };
    writeCentralizedCache(newCache as Record<ProviderID, CacheEntry<UsageSnapshot>>);
  }
}

/**
 * Check if cache is still fresh based on TTL
 */
export function isCacheFresh<T>(
  entry: CacheEntry<T> | null,
  ttlMs: number,
): entry is CacheEntry<T> {
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttlMs;
}

/**
 * Get cache metadata (age, staleness, update time)
 */
export function getCacheMetadata<T>(
  entry: CacheEntry<T> | null,
): CacheMetadata | null {
  if (!entry) return null;
  
  const age = Date.now() - entry.timestamp;
  return {
    age,
    timestamp: entry.timestamp,
    updatedAt: new Date(entry.timestamp).toISOString(),
    stale: age > STALE_THRESHOLD_MS,
  };
}
