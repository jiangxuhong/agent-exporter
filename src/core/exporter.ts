/**
 * Agent Exporter
 */

import * as fsExtra from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import type { Ora } from 'ora';
import type { ExportOptions, ExportResult, AgentConfig, LLMProviderConfig, SkillConfig } from '../types.js';
import { ConfigReader } from './config-reader.js';
import { SkillConverter } from './skill-converter.js';
import { LangChainGenerator } from '../generators/python/langchain.js';
import { ServiceValidator } from '../testing/service-validator.js';

export interface ExportOptionsExtended extends ExportOptions {
  agentId?: string;
}

export class AgentExporter {
  private configReader: ConfigReader;
  private skillConverter: SkillConverter;

  constructor(workspacePath: string, agentId?: string) {
    this.configReader = new ConfigReader(workspacePath);
    if (agentId) {
      this.configReader.setAgentId(agentId);
    }
    this.skillConverter = new SkillConverter();
  }

  /**
   * Export agent as standalone service
   */
  async export(options: ExportOptionsExtended): Promise<ExportResult> {
    const result: ExportResult = {
      success: false,
      outputDir: options.output,
      filesGenerated: 0,
      errors: [],
      warnings: [],
    };

    let spinner: Ora | null = null;

    try {
      spinner = ora('Loading configuration...').start();

      // Parallelize config reading
      const [agentConfig, llmConfig] = await Promise.all([
        this.configReader.readAgentConfig(),
        this.configReader.readLLMConfig(),
      ]);

      spinner.succeed('Configuration loaded');

      // Convert skills in parallel with directory setup
      const skillsPromise = options.includeSkills
        ? this.skillConverter.convertAllSkills(
            this.configReader.getWorkspacePath(),
            options.framework
          )
        : Promise.resolve([]);

      if (options.dryRun) {
        const skills = await skillsPromise;
        spinner!.info('Dry run - no files will be written');
        console.log('\nWould generate:');
        console.log(`  Framework: ${options.framework}`);
        console.log(`  Language: ${options.language}`);
        console.log(`  Output: ${options.output}`);
        console.log(`  LLM Provider: ${llmConfig[0]?.id || 'default'}`);
        console.log(`  LLM Model: ${llmConfig[0]?.defaultModel || 'default'}`);
        console.log(`  Skills: ${skills.length}`);
        result.success = true;
        return result;
      }

      // Setup output directory and get skills in parallel
      const [skills] = await Promise.all([
        skillsPromise,
        this.setupOutputDir(options),
      ]);

      spinner = ora('Generating service code...').start();

      // Generate based on framework
      let filesGenerated = 0;

      switch (options.framework) {
        case 'langchain':
          filesGenerated = await this.generateLangChainService(
            agentConfig,
            llmConfig,
            skills,
            options
          );
          break;

        case 'langgraph':
          throw new Error('LangGraph generator not yet implemented');

        case 'crewai':
          throw new Error('CrewAI generator not yet implemented');

        case 'langchain4j':
          throw new Error('Java generator not yet implemented');

        default:
          throw new Error(`Unsupported framework: ${options.framework}`);
      }

      spinner!.succeed(`Generated ${filesGenerated} files`);
      result.filesGenerated = filesGenerated;

      if (options.validate) {
        spinner = ora('Validating generated service...').start();
        const validator = new ServiceValidator(options.output);
        const validation = await validator.validate();

        result.validation = validation;

        if (validation.success) {
          spinner.succeed('Validation passed');
        } else {
          spinner.fail('Validation failed');
          result.errors.push(...validation.errors.map(e => e.message));
        }
      }

      if (options.runTests) {
        console.warn(chalk.yellow('⚠️  --run-tests is not yet implemented'));
      }

      result.success = true;
      return result;

    } catch (error: unknown) {
      if (spinner) {
        spinner.fail('Export failed');
      }

      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(message);
      console.error(chalk.red(`\n❌ Export failed: ${message}`));

      return result;
    }
  }

  /**
   * Setup output directory
   */
  private async setupOutputDir(options: ExportOptionsExtended): Promise<void> {
    if (await fsExtra.pathExists(options.output)) {
      if (options.overwrite) {
        await fsExtra.remove(options.output);
      } else {
        throw new Error(`Output directory already exists: ${options.output}. Use --overwrite to replace.`);
      }
    }
    await fsExtra.ensureDir(options.output);
  }

  /**
   * Generate LangChain service
   */
  private async generateLangChainService(
    agentConfig: AgentConfig,
    llmConfig: LLMProviderConfig[],
    skills: SkillConfig[],
    options: ExportOptions
  ): Promise<number> {
    const generator = new LangChainGenerator(options.output);
    return await generator.generate(agentConfig, llmConfig, skills, options);
  }
}
