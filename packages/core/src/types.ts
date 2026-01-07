/**
 * OpenCode provider usage limits library - Type definitions
 */

export type ProviderID = 'anthropic' | 'github-copilot' | 'openai';

/**
 * Normalized usage snapshot for a provider.
 * Null fields indicate data unavailable from the provider.
 */
export interface UsageSnapshot {
  /** Provider identifier */
  provider: ProviderID;
  
  /** Primary usage window (e.g., 5-hour for Anthropic, monthly for Copilot) */
  primary: {
    /** Percentage used (0-100) */
    usedPercent: number;
    /** Window description (e.g., "5h", "monthly") */
    window: string;
    /** ISO 8601 reset timestamp */
    resetsAt: string | null;
    /**
     * How far ahead (+) or behind (-) expected usage pace.
     * Positive = using faster than pace, will hit limits early (slow down)
     * Negative = using slower than pace, quota will go unused (speed up)
     * Null if pace cannot be calculated (e.g., missing reset time)
     */
    paceDelta: number | null;
  } | null;
  
  /** Secondary usage window (e.g., 7-day for Anthropic) */
  secondary: {
    /** Percentage used (0-100) */
    usedPercent: number;
    /** Window description (e.g., "7d") */
    window: string;
    /** ISO 8601 reset timestamp */
    resetsAt: string | null;
    /**
     * How far ahead (+) or behind (-) expected usage pace.
     * Positive = using faster than pace, will hit limits early (slow down)
     * Negative = using slower than pace, quota will go unused (speed up)
     * Null if pace cannot be calculated (e.g., missing reset time)
     */
    paceDelta: number | null;
  } | null;
  
  /** Additional provider-specific metadata */
  metadata?: {
    plan?: string;
    credits?: {
      balance: number | null;
      unlimited: boolean;
    };
    [key: string]: unknown;
  };
}

/**
 * Options for usage fetch operations.
 */
export interface UsageOptions {
  /** Bypass cache and force fresh fetch */
  bypassCache?: boolean;
  /** Cache TTL in milliseconds (default: 30000) */
  cacheTTL?: number;
  /** Fetch timeout in milliseconds (default: 5000) */
  timeout?: number;
}

/**
 * Result for a provider usage fetch.
 * Always includes consistent structure with data, optional error, and cache metadata.
 */
export interface UsageResult {
  /** The provider ID */
  provider: ProviderID;
  
  /** Usage snapshot data (null if not authenticated) */
  data: UsageSnapshot | null;
  
  /** Error information if the fetch failed (may have fallback data) */
  error?: ProviderUsageError;
  
  /** Cache metadata (always present when data is available) */
  cache?: {
    /** Age of cache in milliseconds */
    age: number;
    /** Timestamp when cache was created (milliseconds since epoch) */
    timestamp: number;
    /** ISO 8601 string of when cache was created */
    updatedAt: string;
    /** Whether cache is older than 10 minutes */
    stale: boolean;
  };
}

/**
 * Error thrown by provider usage operations.
 */
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
