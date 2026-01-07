/**
 * OpenCode authentication utilities
 */

import { existsSync, readFileSync } from 'node:fs';
import { getOpenCodeAuthPath } from './paths.js';

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
