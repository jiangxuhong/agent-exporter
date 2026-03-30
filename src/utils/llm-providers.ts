/**
 * LLM Provider utilities
 */

import type { LLMProviderConfig } from '../types.js';

export const PROVIDER_API_KEY_MAP: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  gemini: 'GOOGLE_API_KEY',
  azure: 'AZURE_OPENAI_API_KEY',
  zai: 'ZHIPU_API_KEY',
};

export const DEFAULT_PORT = 8000;
export const DEFAULT_TEST_COVERAGE_THRESHOLD = 80;

/**
 * Get API key environment variable name for provider
 */
export function getApiKeyEnvVar(providerId: string): string {
  return PROVIDER_API_KEY_MAP[providerId.toLowerCase()] ||
         `${providerId.toUpperCase()}_API_KEY`;
}

/**
 * Detect provider type from provider ID
 */
export function detectProviderType(providerId: string): 'openai' | 'anthropic' | 'google' | 'azure' | 'custom' {
  const typeMap: Record<string, 'openai' | 'anthropic' | 'google' | 'azure' | 'custom'> = {
    openai: 'openai',
    anthropic: 'anthropic',
    google: 'google',
    gemini: 'google',
    azure: 'azure',
    zai: 'custom',
  };

  return typeMap[providerId.toLowerCase()] || 'custom';
}

/**
 * Get default provider configuration (OpenAI)
 */
export function getDefaultProvider(): LLMProviderConfig {
  return {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai',
    defaultModel: 'gpt-4',
    models: [
      { id: 'gpt-4', name: 'GPT-4', contextWindow: 8192, maxTokens: 4096 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, maxTokens: 4096 },
    ],
  };
}

/**
 * Read file content, return fallback if not found
 */
export async function readOptionalFile(
  readFile: (path: string) => Promise<string>,
  filePath: string,
  fallback = ''
): Promise<string> {
  try {
    return await readFile(filePath);
  } catch {
    return fallback;
  }
}
