/**
 * Service Validator
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { execAsync } from '../utils/exec.js';
import { parseCoverage } from '../utils/pytest.js';
import type { ValidationResult } from '../types.js';

export class ServiceValidator {
  private servicePath: string;

  constructor(servicePath: string) {
    this.servicePath = servicePath;
  }

  /**
   * Run all validation checks in parallel
   */
  async validate(options?: {
    skipLint?: boolean;
    skipSecurity?: boolean;
    skipTests?: boolean;
    skipDocker?: boolean;
  }): Promise<ValidationResult> {
    const result: ValidationResult = {
      success: true,
      errors: [],
      warnings: [],
      metrics: {},
    };

    await this.checkRequiredFiles(result);

    // Run independent checks in parallel
    await Promise.all([
      !options?.skipLint ? this.runLinting(result) : Promise.resolve(),
      !options?.skipSecurity ? this.runSecurityScan(result) : Promise.resolve(),
      !options?.skipTests ? this.runTests(result) : Promise.resolve(),
      !options?.skipDocker ? this.validateDocker(result) : Promise.resolve(),
    ]);

    result.success = result.errors.length === 0;

    return result;
  }

  /**
   * Check required files exist
   */
  private async checkRequiredFiles(result: ValidationResult): Promise<void> {
    const requiredFiles = [
      'main.py',
      'requirements.txt',
      'agent/__init__.py',
      'agent/config.py',
      'agent/prompts.py',
      'llm/__init__.py',
      'llm/providers.py',
      'api/__init__.py',
      'api/rest.py',
      'config/agent.yaml',
      'config/llm.yaml',
    ];

    await Promise.all(
      requiredFiles.map(async (file) => {
        if (!(await fs.pathExists(path.join(this.servicePath, file)))) {
          result.errors.push({ type: 'missing-file', message: `Required file missing: ${file}`, file });
        }
      })
    );
  }

  /**
   * Run code linting
   */
  private async runLinting(result: ValidationResult): Promise<void> {
    try {
      // Run flake8
      await execAsync('flake8 agent api llm core --max-line-length=100', {
        cwd: this.servicePath,
      });

      result.metrics.lintErrors = 0;

    } catch (error: any) {
      // Parse lint errors
      const lines = (error.stdout || error.message).split('\n').filter((l: string) => l.trim());

      result.metrics.lintErrors = lines.length;

      lines.forEach((line: string) => {
        const match = line.match(/^(.+):(\d+):\d+: (\w+) (.+)$/);
        if (match) {
          result.errors.push({
            type: 'lint-error',
            message: match[4],
            file: match[1],
            line: parseInt(match[2]),
          });
        }
      });
    }
  }

  /**
   * Run security scan
   */
  private async runSecurityScan(result: ValidationResult): Promise<void> {
    // bandit exits with non-zero when issues are found, so results always arrive via catch
    try {
      await execAsync('bandit -r agent api llm core -f json', {
        cwd: this.servicePath,
      });
      result.metrics.securityIssues = 0;
    } catch (error: unknown) {
      try {
        const err = error as { stdout?: string };
        const report = JSON.parse(err.stdout ?? '{}');
        const issues: any[] = report.results || [];

        result.metrics.securityIssues = issues.length;

        for (const issue of issues) {
          const severity = issue.issue_severity;
          if (severity === 'HIGH' || severity === 'MEDIUM') {
            result.errors.push({
              type: 'security-issue',
              message: issue.issue_text,
              file: issue.filename,
              line: issue.line_number,
            });
          } else {
            result.warnings.push({
              type: 'security-issue',
              message: issue.issue_text,
              file: issue.filename,
            });
          }
        }
      } catch {
        result.warnings.push({
          type: 'security-scan',
          message: 'Failed to run security scan',
        });
      }
    }
  }

  /**
   * Run tests and check coverage
   */
  private async runTests(result: ValidationResult): Promise<void> {
    try {
      const testsDir = path.join(this.servicePath, 'tests');
      if (!(await fs.pathExists(testsDir))) {
        result.warnings.push({
          type: 'tests',
          message: 'No tests directory found',
        });
        return;
      }

      const { stdout } = await execAsync(
        'pytest --cov=agent --cov=api --cov=llm --cov-report=term --tb=no -q',
        { cwd: this.servicePath }
      );

      const coverage = parseCoverage(stdout);
      if (coverage !== null) {
        result.metrics.testCoverage = coverage;
      }

    } catch (error: unknown) {
      const err = error as { stdout?: string };
      result.warnings.push({
        type: 'tests',
        message: 'Tests failed or coverage threshold not met',
      });

      if (err.stdout) {
        const coverage = parseCoverage(err.stdout);
        if (coverage !== null) {
          result.metrics.testCoverage = coverage;
        }
      }
    }
  }

  /**
   * Validate Docker configuration
   */
  private async validateDocker(result: ValidationResult): Promise<void> {
    // Check if Dockerfile exists
    const dockerfilePath = path.join(this.servicePath, 'docker', 'Dockerfile');
    if (!(await fs.pathExists(dockerfilePath))) {
      result.warnings.push({
        type: 'docker',
        message: 'Dockerfile not found',
        file: 'docker/Dockerfile',
      });
      return;
    }

    // Try to build Docker image
    try {
      await execAsync(`docker build -t validation-test -f ${dockerfilePath} .`, {
        cwd: this.servicePath,
      });

      // Clean up
      await execAsync('docker rmi validation-test');

    } catch (error: any) {
      result.errors.push({
        type: 'docker-build',
        message: 'Docker build failed',
        file: 'docker/Dockerfile',
      });
    }
  }
}
