/**
 * Agent Exporter Plugin Entry Point
 *
 * Exports OpenClaw agents as production-ready standalone services
 */

export default {
  id: 'agent-exporter',
  name: 'Agent Exporter',
  description: 'Export OpenClaw agents as production-ready standalone services',

  register(api?: any) {
    if (!api?.registerCli) return;

    api.registerCli(({ program }: { program: any }) => {
      const exportCmd = program
        .command('export')
        .description('Export OpenClaw agent as standalone service');

      // Default action: export agent
      exportCmd
        .option('-a, --agent <id>', 'Agent ID to export')
        .option('-f, --framework <framework>', 'Framework: langchain, langgraph, crewai, langchain4j')
        .option('-l, --language <language>', 'Language: python, java')
        .option('-o, --output <path>', 'Output directory (default: ./agent-service)')
        .option('-n, --name <name>', 'Service name')
        .option('--include-memory', 'Include memory files (default: true)')
        .option('--include-skills', 'Include skills (default: true)')
        .option('--api-types <types>', 'API types: rest,websocket (default: rest,websocket)')
        .option('--port <port>', 'Service port (default: 8000)', parseInt)
        .option('--with-tests', 'Generate test suite (default: true)')
        .option('--test-coverage-threshold <n>', 'Minimum test coverage (default: 80)', parseInt)
        .option('--validate', 'Run validation after export (default: true)')
        .option('--run-tests', 'Run generated tests (default: false)')
        .option('--with-dockerfile', 'Generate Dockerfile (default: true)')
        .option('--with-kubernetes', 'Generate K8s manifests (default: false)')
        .option('--with-monitoring', 'Generate monitoring config (default: false)')
        .option('--overwrite', 'Overwrite existing output directory')
        .option('--dry-run', 'Show what would be generated without writing')
        .option('--verbose', 'Verbose output')
        .action(async (opts: any) => {
          const { runExportCommand } = await import('./cli/commands/export.js');
          await runExportCommand(opts);
        });

      exportCmd
        .command('validate <service-path>')
        .description('Validate an exported service')
        .option('--skip-lint', 'Skip code linting')
        .option('--skip-security', 'Skip security scan')
        .option('--skip-tests', 'Skip running tests')
        .option('--skip-docker', 'Skip Docker build test')
        .option('--fix', 'Auto-fix issues where possible')
        .action(async (servicePath: string, opts: any) => {
          const { runValidateCommand } = await import('./cli/commands/validate.js');
          await runValidateCommand({ ...opts, servicePath });
        });

      exportCmd
        .command('test <service-path>')
        .description('Run tests for an exported service')
        .option('--type <type>', 'Test type: unit, integration, e2e, all (default: all)')
        .option('--coverage', 'Generate coverage report')
        .option('--coverage-threshold <n>', 'Fail if coverage below threshold (default: 80)', parseInt)
        .option('--verbose', 'Verbose test output')
        .action(async (servicePath: string, opts: any) => {
          const { runTestCommand } = await import('./cli/commands/test.js');
          await runTestCommand({ ...opts, servicePath });
        });

    }, { commands: ['export'] });
  },
};
