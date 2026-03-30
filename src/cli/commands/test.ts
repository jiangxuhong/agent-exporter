/**
 * Test Command
 */

import chalk from 'chalk';
import ora from 'ora';
import { execAsync } from '../../utils/exec.js';
import { getCoverageColor, printSectionHeader } from '../../utils/display.js';
import { parseCoverage, parseTestCounts } from '../../utils/pytest.js';
import { DEFAULT_TEST_COVERAGE_THRESHOLD } from '../../utils/llm-providers.js';

interface TestArgs {
  servicePath: string;
  type?: 'unit' | 'integration' | 'e2e' | 'all';
  coverage?: boolean;
  coverageThreshold?: number;
  verbose?: boolean;
}

interface TestResult {
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  coverage?: number;
  duration: number;
  errors: string[];
}

/**
 * Run test command
 */
export async function runTestCommand(args: TestArgs): Promise<void> {
  console.log(chalk.bold.cyan('\n🧪 Service Testing\n'));

  try {
    const testType = args.type || 'all';
    console.log(`Running ${chalk.cyan(testType)} tests for: ${chalk.cyan(args.servicePath)}\n`);

    const result = await runTests(args.servicePath, {
      type: testType,
      coverage: args.coverage,
      coverageThreshold: args.coverageThreshold,
      verbose: args.verbose,
    });

    showTestResult(result, args);

    if (!result.success) {
      process.exit(1);
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n❌ Error: ${message}`));
    process.exit(1);
  }
}

/**
 * Run tests using pytest
 */
async function runTests(
  servicePath: string,
  options: {
    type: string;
    coverage?: boolean;
    coverageThreshold?: number;
    verbose?: boolean;
  }
): Promise<TestResult> {
  const result: TestResult = {
    success: false,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    duration: 0,
    errors: [],
  };

  const startTime = Date.now();

  try {
    const cmd = buildPytestCommand(options);

    const spinner = ora('Running tests...').start();
    const { stdout, stderr } = await execAsync(cmd, { cwd: servicePath });
    spinner.stop();

    console.log(stdout);
    if (stderr) {
      console.error(stderr);
    }

    const counts = parseTestCounts(stdout);
    result.passedTests = counts.passed;
    result.failedTests = counts.failed;
    result.totalTests = counts.total;

    if (options.coverage) {
      result.coverage = parseCoverage(stdout) ?? undefined;
    }

    result.success = result.failedTests === 0;
    result.duration = Date.now() - startTime;

  } catch (error: unknown) {
    const err = error as { message: string; stdout?: string };
    result.errors.push(err.message);
    result.success = false;
    result.duration = Date.now() - startTime;

    if (err.stdout) {
      console.log(err.stdout);
      const counts = parseTestCounts(err.stdout);
      result.passedTests = counts.passed;
      result.failedTests = counts.failed;
      result.totalTests = counts.total;
      if (options.coverage) {
        result.coverage = parseCoverage(err.stdout) ?? undefined;
      }
    }
  }

  return result;
}

function buildPytestCommand(options: { type: string; coverage?: boolean; coverageThreshold?: number; verbose?: boolean }): string {
  let cmd = 'pytest';

  if (options.type !== 'all') {
    cmd += ` tests/${options.type}`;
  }

  if (options.coverage) {
    cmd += ' --cov=agent --cov=api --cov=llm --cov-report=term-missing';
  }

  if (options.coverageThreshold) {
    cmd += ` --cov-fail-under=${options.coverageThreshold}`;
  }

  if (options.verbose) {
    cmd += ' -v';
  }

  return cmd;
}

/**
 * Show test result
 */
function showTestResult(result: TestResult, args: TestArgs): void {
  printSectionHeader('Test Results');

  if (result.success) {
    console.log(chalk.green('✅ All tests passed!'));
  } else {
    console.log(chalk.red('❌ Tests failed!'));
  }

  console.log(`\nTotal tests: ${chalk.cyan(result.totalTests.toString())}`);
  console.log(`Passed: ${chalk.green(result.passedTests.toString())}`);
  console.log(`Failed: ${chalk.red(result.failedTests.toString())}`);
  console.log(`Duration: ${chalk.cyan((result.duration / 1000).toFixed(2) + 's')}`);

  if (result.coverage !== undefined) {
    const threshold = args.coverageThreshold ?? DEFAULT_TEST_COVERAGE_THRESHOLD;
    const color = getCoverageColor(result.coverage, threshold);
    console.log(`Coverage: ${color(result.coverage + '%')}`);
  }

  if (result.errors.length > 0) {
    console.log(chalk.red(`\nErrors:`));
    result.errors.forEach((error, i) => {
      console.log(chalk.red(`  ${i + 1}. ${error}`));
    });
  }

  console.log();
}
