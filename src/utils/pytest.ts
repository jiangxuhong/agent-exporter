/**
 * Pytest output parsing utilities
 */

const COVERAGE_REGEX = /TOTAL\s+\d+\s+\d+\s+(\d+)%/;

/**
 * Parse test coverage from pytest output
 */
export function parseCoverage(output: string): number | null {
  const match = output.match(COVERAGE_REGEX);
  return match ? parseInt(match[1]) : null;
}

/**
 * Parse test counts from pytest output
 */
export function parseTestCounts(output: string): { passed: number; failed: number; total: number } {
  const passedMatch = output.match(/(\d+) passed/);
  const failedMatch = output.match(/(\d+) failed/);
  const totalMatch = output.match(/(\d+) total/);

  const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
  const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
  const total = totalMatch ? parseInt(totalMatch[1]) : passed + failed;

  return { passed, failed, total };
}
