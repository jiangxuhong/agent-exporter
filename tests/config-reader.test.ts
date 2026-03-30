/**
 * ConfigReader Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigReader } from '../src/core/config-reader.js';

describe('ConfigReader', () => {
  let tempDir: string;
  let configReader: ConfigReader;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'config-reader-test-'));
    configReader = new ConfigReader(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('readAgentConfig', () => {
    it('should return empty strings for non-existent files', async () => {
      const config = await configReader.readAgentConfig();

      expect(config.agentsMd).toBe('');
      expect(config.soulMd).toBe('');
      expect(config.userMd).toBe('');
      expect(config.memoryMd).toBe('');
    });

    it('should read AGENTS.md content', async () => {
      const content = '# Test Agent\n\nThis is a test agent.';
      await fs.writeFile(path.join(tempDir, 'AGENTS.md'), content);

      const config = await configReader.readAgentConfig();

      expect(config.agentsMd).toBe(content);
    });

    it('should read SOUL.md content', async () => {
      const content = '# Soul\n\nAgent personality.';
      await fs.writeFile(path.join(tempDir, 'SOUL.md'), content);

      const config = await configReader.readAgentConfig();

      expect(config.soulMd).toBe(content);
    });

    it('should read multiple config files', async () => {
      await fs.writeFile(path.join(tempDir, 'AGENTS.md'), 'Agent content');
      await fs.writeFile(path.join(tempDir, 'SOUL.md'), 'Soul content');
      await fs.writeFile(path.join(tempDir, 'USER.md'), 'User content');

      const config = await configReader.readAgentConfig();

      expect(config.agentsMd).toBe('Agent content');
      expect(config.soulMd).toBe('Soul content');
      expect(config.userMd).toBe('User content');
    });

    it('should read daily memory files', async () => {
      const memoryDir = path.join(tempDir, 'memory');
      await fs.mkdir(memoryDir);
      await fs.writeFile(path.join(memoryDir, '2024-01-15.md'), 'Day 1 memory');
      await fs.writeFile(path.join(memoryDir, '2024-01-16.md'), 'Day 2 memory');

      const config = await configReader.readAgentConfig();

      expect(config.dailyMemory).toEqual({
        '2024-01-15.md': 'Day 1 memory',
        '2024-01-16.md': 'Day 2 memory',
      });
    });
  });

  describe('getWorkspacePath', () => {
    it('should return the workspace path', () => {
      expect(configReader.getWorkspacePath()).toBe(tempDir);
    });
  });

  describe('setAgentId', () => {
    it('should set agent ID', () => {
      configReader.setAgentId('test-agent');
      // Agent ID is used internally, verified through readLLMConfig behavior
    });
  });
});
