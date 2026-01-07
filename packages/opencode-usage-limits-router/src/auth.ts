/**
 * OpenCode authentication utilities
 * 
 * Cross-platform support for reading OpenCode's auth.json
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import type { ProviderTokens } from '@bytespell/model-provider-usage-limits';

interface OpenCodeAuth {
  anthropic?: {
    type: string;
    refresh?: string;
    access?: string;
    expires?: number;
  };
  'github-copilot'?: {
    type: string;
    refresh: string;
    access: string;
    expires: number;
  };
  openai?: {
    type: string;
    refresh?: string;
    access?: string;
    expires?: number;
  };
}

/**
 * Get the platform-appropriate data directory.
 * 
 * - Linux: ~/.local/share (or $XDG_DATA_HOME)
 * - macOS: ~/Library/Application Support
 * - Windows: %APPDATA% (e.g., C:\Users\X\AppData\Roaming)
 */
function getDataHome(): string {
  // Respect XDG_DATA_HOME on any platform if set
  if (process.env.XDG_DATA_HOME) {
    return process.env.XDG_DATA_HOME;
  }

  const home = homedir();
  const os = platform();

  switch (os) {
    case 'win32':
      return process.env.APPDATA ?? join(home, 'AppData', 'Roaming');
    case 'darwin':
      return join(home, 'Library', 'Application Support');
    default:
      // Linux and others: XDG default
      return join(home, '.local', 'share');
  }
}

/**
 * Get OpenCode auth file path (cross-platform)
 */
export function getOpenCodeAuthPath(): string {
  return join(getDataHome(), 'opencode', 'auth.json');
}

/**
 * Read OpenCode auth.json file
 */
export function readOpenCodeAuth(): OpenCodeAuth | null {
  const authPath = getOpenCodeAuthPath();
  if (!existsSync(authPath)) return null;

  try {
    const content = readFileSync(authPath, 'utf-8');
    return JSON.parse(content) as OpenCodeAuth;
  } catch {
    return null;
  }
}

/**
 * Get all provider tokens from OpenCode auth.
 * Returns a tokens object suitable for passing to getUsage().
 */
export function getProviderTokens(): ProviderTokens {
  const auth = readOpenCodeAuth();
  if (!auth) return {};

  const tokens: ProviderTokens = {};

  if (auth.anthropic?.access) {
    tokens.anthropic = auth.anthropic.access;
  }

  if (auth['github-copilot']?.refresh) {
    tokens['github-copilot'] = auth['github-copilot'].refresh;
  }

  if (auth.openai?.access) {
    tokens.openai = auth.openai.access;
  }

  return tokens;
}

/**
 * Get Anthropic access token from OpenCode auth
 */
export function getAnthropicToken(): string | null {
  const auth = readOpenCodeAuth();
  return auth?.anthropic?.access ?? null;
}

/**
 * Get GitHub Copilot refresh token from OpenCode auth
 */
export function getCopilotToken(): string | null {
  const auth = readOpenCodeAuth();
  return auth?.['github-copilot']?.refresh ?? null;
}

/**
 * Get OpenAI Codex token from OpenCode auth
 */
export function getCodexToken(): string | null {
  const auth = readOpenCodeAuth();
  return auth?.openai?.access ?? null;
}
