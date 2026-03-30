/**
 * AgentExporter Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AgentExporter } from '../src/core/exporter.js';
import type { ExportOptionsExtended } from '../src/core/exporter.js';

// Mock external dependencies
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn(() => ({ succeed: vi.fn(), fail: vi.fn(), info: vi.fn() })),
    succeed: vi.fn(),
    fail: vi.fn(),
    info: vi.fn(),
  })),
}));

vi.mock('chalk', () => ({
  default: {
    red: vi.fn((s) => s),
    green: vi.fn((s) => s),
    yellow: vi.fn((s) => s),
  },
}));

describe('AgentExporter', () => {
  let tempDir: string;
  let outputDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'exporter-test-'));
    outputDir = path.join(tempDir, 'output');

    // Create minimal workspace files
    await fs.writeFile(path.join(tempDir, 'AGENTS.md'), '# Test Agent');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create exporter with workspace path', () => {
      const exporter = new AgentExporter(tempDir);
      expect(exporter).toBeDefined();
    });

    it('should create exporter with agent ID', () => {
      const exporter = new AgentExporter(tempDir, 'test-agent');
      expect(exporter).toBeDefined();
    });
  });

  describe('export', () => {
    it('should fail for unsupported framework (langgraph)', async () => {
      const exporter = new AgentExporter(tempDir);
      const options: ExportOptionsExtended = {
        framework: 'langgraph' as any,
        language: 'python',
        output: outputDir,
        overwrite: true,
      };

      const result = await exporter.export(options);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('not yet implemented');
    });

    it('should fail for unsupported framework (crewai)', async () => {
      const exporter = new AgentExporter(tempDir);
      const options: ExportOptionsExtended = {
        framework: 'crewai' as any,
        language: 'python',
        output: outputDir,
        overwrite: true,
      };

      const result = await exporter.export(options);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('not yet implemented');
    });

    it('should fail if output directory exists without overwrite', async () => {
      await fs.mkdir(outputDir, { recursive: true });

      const exporter = new AgentExporter(tempDir);
      const options: ExportOptionsExtended = {
        framework: 'langchain',
        language: 'python',
        output: outputDir,
        overwrite: false,
      };

      const result = await exporter.export(options);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('already exists');
    });

    it('should perform dry run without writing files', async () => {
      const exporter = new AgentExporter(tempDir);
      const options: ExportOptionsExtended = {
        framework: 'langchain',
        language: 'python',
        output: outputDir,
        dryRun: true,
        validate: false,
      };

      const result = await exporter.export(options);

      expect(result.success).toBe(true);
      // Output directory should not exist after dry run
      const exists = await fs.stat(outputDir).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('should return correct result structure on failure', async () => {
      const exporter = new AgentExporter(tempDir);
      const options: ExportOptionsExtended = {
        framework: 'langgraph' as any,
        language: 'python',
        output: outputDir,
        overwrite: true,
      };

      const result = await exporter.export(options);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('outputDir');
      expect(result).toHaveProperty('filesGenerated');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });
  });
});
