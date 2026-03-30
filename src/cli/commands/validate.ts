/**
 * Validate Command
 */

import chalk from 'chalk';
import ora from 'ora';
import type { ValidationResult } from '../../types.js';
import { ServiceValidator } from '../../testing/service-validator.js';
import { getCoverageColor, printSectionHeader } from '../../utils/display.js';
import { DEFAULT_TEST_COVERAGE_THRESHOLD } from '../../utils/llm-providers.js';

interface ValidateArgs {
  servicePath: string;
  skipLint?: boolean;
  skipSecurity?: boolean;
  skipTests?: boolean;
  skipDocker?: boolean;
  fix?: boolean;
}

/**
 * Run validate command
 */
export async function runValidateCommand(args: ValidateArgs): Promise<void> {
  console.log(chalk.bold.cyan('\n🔍 Service Validation\n'));

  try {
    const validator = new ServiceValidator(args.servicePath);

    console.log(`Validating service at: ${chalk.cyan(args.servicePath)}\n`);

    const spinner = ora('Running validation...').start();
    const result = await validator.validate({
      skipLint: args.skipLint,
      skipSecurity: args.skipSecurity,
      skipTests: args.skipTests,
      skipDocker: args.skipDocker,
    });
    spinner.stop();

    showValidationResult(result);

    // Exit with error if validation failed
    if (!result.success) {
      process.exit(1);
    }

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Show validation result
 */
function showValidationResult(result: ValidationResult): void {
  printSectionHeader('Validation Results');

  if (result.success) {
    console.log(chalk.green('✅ All validation checks passed!\n'));
  } else {
    console.log(chalk.red('❌ Validation failed!\n'));
  }

  console.log(chalk.bold('Metrics:'));
  if (result.metrics.testCoverage !== undefined) {
    const color = getCoverageColor(result.metrics.testCoverage, DEFAULT_TEST_COVERAGE_THRESHOLD);
    console.log(`  Test coverage: ${color(result.metrics.testCoverage + '%')}`);
  }
  if (result.metrics.lintErrors !== undefined) {
    const lintColor = result.metrics.lintErrors === 0 ? chalk.green : chalk.red;
    console.log(`  Lint errors: ${lintColor(result.metrics.lintErrors.toString())}`);
  }
  if (result.metrics.securityIssues !== undefined) {
    const secColor = result.metrics.securityIssues === 0 ? chalk.green : chalk.red;
    console.log(`  Security issues: ${secColor(result.metrics.securityIssues.toString())}`);
  }

  if (result.errors.length > 0) {
    console.log(chalk.red(`\n❌ Errors (${result.errors.length}):`));
    result.errors.forEach((error, i) => {
      console.log(chalk.red(`  ${i + 1}. [${error.type}] ${error.message}`));
      if (error.file) {
        console.log(chalk.gray(`     File: ${error.file}${error.line ? `:${error.line}` : ''}`));
      }
    });
  }

  if (result.warnings.length > 0) {
    console.log(chalk.yellow(`\n⚠️  Warnings (${result.warnings.length}):`));
    result.warnings.forEach((warning, i) => {
      console.log(chalk.yellow(`  ${i + 1}. [${warning.type}] ${warning.message}`));
      if (warning.file) {
        console.log(chalk.gray(`     File: ${warning.file}`));
      }
    });
  }

  console.log();
}
