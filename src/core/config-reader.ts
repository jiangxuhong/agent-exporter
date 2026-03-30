/**
 * Config Reader
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import type { AgentConfig, LLMProviderConfig } from '../types.js';
import { detectProviderType, getDefaultProvider } from '../utils/llm-providers.js';

// Extended type for internal use
interface LLMProviderConfigInternal extends LLMProviderConfig {
  apiType?: string;  // e.g., 'openai-completions'
}

interface OpenClawConfig {
  models?: {
    mode?: string;
    providers?: Record<string, {
      baseUrl?: string;
      api?: string;
      models?: Array<{
        id: string;
        name: string;
        contextWindow?: number;
        maxTokens?: number;
      }>;
    }>;
  };
  agents?: {
    defaults?: {
      model?: {
        primary?: string;
      };
    };
    list?: Array<{
      id: string;
      name?: string;
      workspace?: string;
      model?: string;
    }>;
  };
}

export class ConfigReader {
  private workspacePath: string;
  private openclawConfigPath: string;
  private agentId: string | null = null;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.openclawConfigPath = path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');
  }

  /**
   * Set agent ID for looking up agent-specific configuration
   */
  setAgentId(agentId: string): void {
    this.agentId = agentId;
  }

  /**
   * Read agent configuration from workspace
   */
  async readAgentConfig(): Promise<AgentConfig> {
    const config: AgentConfig = {
      agentsMd: '',
      soulMd: '',
      userMd: '',
      memoryMd: '',
      identityMd: '',
      toolsMd: '',
      dailyMemory: {},
    };

    const wp = this.workspacePath;
    const [agentsMd, soulMd, userMd, memoryMd, identityMd, toolsMd, dailyMemory] = await Promise.all([
      this.readFile(path.join(wp, 'AGENTS.md')),
      this.readFile(path.join(wp, 'SOUL.md')),
      this.readFile(path.join(wp, 'USER.md')),
      this.readFile(path.join(wp, 'MEMORY.md')),
      this.readFile(path.join(wp, 'IDENTITY.md')),
      this.readFile(path.join(wp, 'TOOLS.md')),
      this.readDailyMemory(path.join(wp, 'memory')),
    ]);

    config.agentsMd = agentsMd;
    config.soulMd = soulMd;
    config.userMd = userMd;
    config.memoryMd = memoryMd;
    config.identityMd = identityMd;
    config.toolsMd = toolsMd;
    config.dailyMemory = dailyMemory;

    return config;
  }

  /**
   * Read LLM provider configuration from OpenClaw config
   */
  async readLLMConfig(): Promise<LLMProviderConfig[]> {
    try {
      const configContent = await fs.readFile(this.openclawConfigPath, 'utf-8');
      const config: OpenClawConfig = JSON.parse(configContent);

      const agentModel = this.getAgentModel(config);
      const parts = agentModel ? agentModel.split('/') : ['openai', 'gpt-4'];
      const providerId = parts[0];
      const modelId = parts[1] ?? 'gpt-4';

      const providerConfig = config.models?.providers?.[providerId];

      if (!providerConfig) {
        console.warn(`Provider "${providerId}" not found in config, using defaults`);
        return [getDefaultProvider()];
      }

      const provider: LLMProviderConfigInternal = {
        id: providerId,
        name: providerId,
        type: detectProviderType(providerId),
        baseUrl: providerConfig.baseUrl,
        apiType: providerConfig.api,
        defaultModel: modelId,
        models: (providerConfig.models || []).map(m => ({
          id: m.id,
          name: m.name,
          contextWindow: m.contextWindow || 4096,
          maxTokens: m.maxTokens || 2048,
        })),
      };

      return [provider];
    } catch (error) {
      console.warn('Failed to read LLM config, using defaults:', error);
      return [getDefaultProvider()];
    }
  }

  /**
   * Get the model configured for this agent
   */
  private getAgentModel(config: OpenClawConfig): string | null {
    if (this.agentId && config.agents?.list) {
      const agentConfig = config.agents.list.find(a => a.id === this.agentId);
      if (agentConfig?.model) {
        return agentConfig.model;
      }
    }
    return config.agents?.defaults?.model?.primary || null;
  }

  /**
   * Get workspace path
   */
  getWorkspacePath(): string {
    return this.workspacePath;
  }

  /**
   * Read a single file, return empty string if not found
   */
  private async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Read daily memory files
   */
  private async readDailyMemory(memoryDir: string): Promise<Record<string, string>> {
    try {
      const files = await fs.readdir(memoryDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const contents = await Promise.all(
        mdFiles.map(f => fs.readFile(path.join(memoryDir, f), 'utf-8'))
      );

      return Object.fromEntries(mdFiles.map((f, i) => [f, contents[i]]));
    } catch {
      return {};
    }
  }
}
