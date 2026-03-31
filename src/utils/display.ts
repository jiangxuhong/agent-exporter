/**
 * CLI display utilities
 */

import chalk from 'chalk';

export const SEPARATOR_WIDTH = 50;

/**
 * Get color for coverage percentage
 */
export function getCoverageColor(coverage: number, threshold = 80): typeof chalk.green {
  return coverage >= threshold ? chalk.green :
         coverage >= 60 ? chalk.yellow : chalk.red;
}

/**
 * Print section header with separator
 */
export function printSectionHeader(title: string): void {
  console.log('');
  console.log(chalk.bold(title));
  console.log(chalk.gray('─'.repeat(SEPARATOR_WIDTH)));
}

/**
 * Print error and exit
 */
export function handleCliError(error: unknown, context?: string): never {
  const message = error instanceof Error ? error.message : String(error);
  const prefix = context ? `${context}: ` : '';
  console.error(chalk.red(`\n❌ Error: ${prefix}${message}`));
  process.exit(1);
}
