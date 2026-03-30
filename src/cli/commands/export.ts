/**
 * Export Command
 *
 * CLI command for exporting OpenClaw agents
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import type { ExportOptions, ExportResult } from '../../types.js';
import { AgentExporter } from '../../core/exporter.js';

interface ExportArgs {
  agent?: string;
  framework?: string;
  language?: string;
  output?: string;
  name?: string;
  includeMemory?: boolean;
  includeSkills?: boolean;
  skills?: string;
  apiTypes?: string;
  port?: number;
  withTests?: boolean;
  testCoverageThreshold?: number;
  validate?: boolean;
  runTests?: boolean;
  withDockerfile?: boolean;
  withKubernetes?: boolean;
  withMonitoring?: boolean;
  overwrite?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * Run export command
 */
export async function runExportCommand(args: ExportArgs): Promise<void> {
  console.log(chalk.bold.cyan('\n🦞 Agent Exporter\n'));
  console.log('Export OpenClaw agent as production-ready standalone service\n');

  try {
    // Get workspace path from openclaw config file
    let workspacePath = process.env.OPENCLAW_WORKSPACE || '';

    const configPath = path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');
    let openclawConfig: any = {};
    try {
      const raw = await fs.readFile(configPath, 'utf-8');
      openclawConfig = JSON.parse(raw);
    } catch {
      // Config file not found or invalid
    }

    if (args.agent && !workspacePath) {
      // agents.list is an array, find by id
      const agentEntry = (openclawConfig.agents?.list || []).find((a: any) => a.id === args.agent);
      if (agentEntry?.workspace) {
        workspacePath = agentEntry.workspace;
      }
    }

    if (!workspacePath) {
      workspacePath = openclawConfig.agents?.defaults?.workspace || '';
    }

    if (!workspacePath) {
      console.error(chalk.red('❌ Workspace path not found. Please run "openclaw setup" first.'));
      process.exit(1);
    }

    // Interactive prompts if options not provided
    const answers = await promptForOptions(args);

    // Build export options
    const options: ExportOptions = {
      framework: answers.framework as any,
      language: answers.language as any,
      output: answers.output || './agent-service',
      name: answers.name,
      includeMemory: answers.includeMemory,
      includeSkills: answers.includeSkills,
      skills: answers.skills ? answers.skills.split(',').map(s => s.trim()) : undefined,
      apiTypes: (Array.isArray(answers.apiTypes)
        ? answers.apiTypes
        : answers.apiTypes.split(',').map((s: string) => s.trim())) as any,
      port: answers.port ?? 8000,
      withTests: answers.withTests,
      testCoverageThreshold: answers.testCoverageThreshold,
      validate: answers.validate,
      runTests: answers.runTests,
      withDockerfile: answers.withDockerfile,
      withKubernetes: answers.withKubernetes,
      withMonitoring: answers.withMonitoring,
      overwrite: answers.overwrite,
      dryRun: answers.dryRun,
      verbose: answers.verbose,
    };

    // Run export
    const exporter = new AgentExporter(workspacePath, args.agent);
    const result = await exporter.export(options);

    // Show results
    showExportResult(result, options);

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Prompt for missing options
 */
async function promptForOptions(args: ExportArgs): Promise<ExportArgs> {
  const questions = [];

  if (!args.framework) {
    questions.push({
      type: 'list',
      name: 'framework',
      message: 'Select framework:',
      choices: [
        { name: 'LangChain (Python)', value: 'langchain' },
        { name: 'LangGraph (Python)', value: 'langgraph' },
        { name: 'CrewAI (Python)', value: 'crewai' },
        { name: 'LangChain4j (Java)', value: 'langchain4j' },
      ],
      default: 'langchain',
    });
  }

  if (!args.language) {
    questions.push({
      type: 'list',
      name: 'language',
      message: 'Select language:',
      choices: [
        { name: 'Python', value: 'python' },
        { name: 'Java', value: 'java' },
      ],
      default: 'python',
    });
  }

  if (!args.output) {
    questions.push({
      type: 'input',
      name: 'output',
      message: 'Output directory:',
      default: './agent-service',
    });
  }

  if (!args.apiTypes) {
    questions.push({
      type: 'checkbox',
      name: 'apiTypes',
      message: 'Select API types:',
      choices: [
        { name: 'REST API', value: 'rest', checked: true },
        { name: 'WebSocket API', value: 'websocket', checked: true },
      ],
    });
  }

  if (args.includeMemory === undefined) {
    questions.push({
      type: 'confirm',
      name: 'includeMemory',
      message: 'Include memory files?',
      default: true,
    });
  }

  if (args.includeSkills === undefined) {
    questions.push({
      type: 'confirm',
      name: 'includeSkills',
      message: 'Include skills?',
      default: true,
    });
  }

  if (args.withTests === undefined) {
    questions.push({
      type: 'confirm',
      name: 'withTests',
      message: 'Generate test suite?',
      default: true,
    });
  }

  if (args.validate === undefined) {
    questions.push({
      type: 'confirm',
      name: 'validate',
      message: 'Validate after export?',
      default: true,
    });
  }

  if (args.withDockerfile === undefined) {
    questions.push({
      type: 'confirm',
      name: 'withDockerfile',
      message: 'Generate Dockerfile?',
      default: true,
    });
  }

  // Return args as-is if no questions needed
  if (questions.length === 0) {
    return args;
  }

  // In non-interactive mode, apply defaults instead of prompting
  if (!process.stdin.isTTY) {
    const defaults: Partial<ExportArgs> = {
      framework: 'langchain',
      language: 'python',
      output: './agent-service',
      apiTypes: 'rest,websocket',
      includeMemory: true,
      includeSkills: true,
      withTests: true,
      validate: true,
      withDockerfile: true,
    };
    return { ...defaults, ...args };
  }

  // Prompt and merge answers
  const answers = await inquirer.prompt(questions);
  return { ...args, ...answers };
}

/**
 * Show export result
 */
function showExportResult(result: ExportResult, options: ExportOptions): void {
  console.log('\n' + chalk.bold('Export Results'));
  console.log(chalk.gray('─'.repeat(50)));

  if (result.success) {
    console.log(chalk.green('✅ Export successful!'));
  } else {
    console.log(chalk.red('❌ Export failed!'));
  }

  console.log(`\nOutput directory: ${chalk.cyan(result.outputDir)}`);
  console.log(`Files generated: ${chalk.cyan(result.filesGenerated.toString())}`);

  if (result.validation) {
    console.log(`\nValidation:`);
    console.log(`  Status: ${result.validation.success ? chalk.green('passed') : chalk.red('failed')}`);

    if (result.validation.metrics.testCoverage !== undefined) {
      console.log(`  Test coverage: ${chalk.cyan(result.validation.metrics.testCoverage + '%')}`);
    }

    if (result.validation.errors.length > 0) {
      console.log(chalk.red(`  Errors: ${result.validation.errors.length}`));
      result.validation.errors.forEach(error => {
        console.log(chalk.red(`    - ${error.message}`));
      });
    }

    if (result.validation.warnings.length > 0) {
      console.log(chalk.yellow(`  Warnings: ${result.validation.warnings.length}`));
      result.validation.warnings.forEach(warning => {
        console.log(chalk.yellow(`    - ${warning.message}`));
      });
    }
  }

  console.log('\n' + chalk.bold('Next Steps'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`1. Navigate to the service:`);
  console.log(chalk.cyan(`   cd ${result.outputDir}`));
  console.log(`\n2. Install dependencies:`);
  console.log(chalk.cyan(`   python3 -m venv venv`));
  console.log(chalk.cyan(`   source venv/bin/activate`));
  console.log(chalk.cyan(`   pip install -r requirements.txt`));
  console.log(`\n3. Configure environment:`);
  console.log(chalk.cyan(`   cp .env.example .env`));
  console.log(chalk.cyan(`   # Edit .env with your API keys`));
  console.log(`\n4. Run the service:`);
  console.log(chalk.cyan(`   python main.py`));
  console.log(`\n5. Test the API:`);
  console.log(chalk.cyan(`   curl http://localhost:${options.port ?? 8000}/health`));
  console.log(`\n6. Run tests:`);
  console.log(chalk.cyan(`   pytest`));
  console.log(`\n7. Build Docker image:`);
  console.log(chalk.cyan(`   docker build -t agent-service -f docker/Dockerfile.prod .`));
  console.log();
}
