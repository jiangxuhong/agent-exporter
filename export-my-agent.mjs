#!/usr/bin/env node

/**
 * 自定义 Agent 导出脚本
 *
 * 使用方法：
 *   node export-my-agent.mjs
 */

import { AgentExporter } from './dist/core/exporter.js';

async function exportMyAgent() {
  console.log('🦞 导出我的 Agent\n');

  // 配置导出选项
  const options = {
    // 基本信息
    framework: 'langchain',          // 框架: langchain, langgraph, crewai
    language: 'python',              // 语言: python, java
    output: './my-agent-service',    // 输出目录
    name: 'my-agent',                // 服务名称

    // 包含内容
    includeMemory: true,             // 包含记忆文件
    includeSkills: true,             // 包含 skills

    // API 配置
    apiTypes: ['rest', 'websocket'], // API 类型
    port: 8000,                      // 服务端口

    // 测试配置
    withTests: true,                 // 生成测试
    testCoverageThreshold: 80,       // 测试覆盖率阈值

    // 验证
    validate: true,                  // 导出后验证
    runTests: false,                 // 是否运行测试

    // 部署
    withDockerfile: true,            // 生成 Dockerfile
    withKubernetes: false,           // 生成 K8s manifests
    withMonitoring: false,           // 生成监控配置

    // 其他
    overwrite: true,                 // 覆盖已存在的目录
    dryRun: false,                   // false = 真实导出
    verbose: true,                   // 详细输出
  };

  // Workspace 路径（你的 OpenClaw agent 配置）
  const workspacePath = process.env.OPENCLAW_WORKSPACE ||
    '/Users/jxh/.openclaw/workspace';  // 你的 workspace

  console.log('配置:');
  console.log('  Framework:', options.framework);
  console.log('  Language:', options.language);
  console.log('  Output:', options.output);
  console.log('  Workspace:', workspacePath);
  console.log();

  // 创建导出器
  const exporter = new AgentExporter(workspacePath);

  // 执行导出
  const result = await exporter.export(options);

  // 显示结果
  console.log('\n' + '='.repeat(60));
  console.log('导出结果');
  console.log('='.repeat(60));
  console.log('状态:', result.success ? '✅ 成功' : '❌ 失败');
  console.log('输出目录:', result.outputDir);
  console.log('生成文件数:', result.filesGenerated);

  if (result.errors.length > 0) {
    console.log('\n错误:');
    result.errors.forEach(err => console.log('  -', err));
  }

  if (result.warnings.length > 0) {
    console.log('\n警告:');
    result.warnings.forEach(warn => console.log('  -', warn));
  }

  if (result.success) {
    console.log('\n' + '='.repeat(60));
    console.log('下一步');
    console.log('='.repeat(60));
    console.log(`1. cd ${result.outputDir}`);
    console.log('2. pip install -r requirements.txt');
    console.log('3. 配置 .env 文件（API keys）');
    console.log('4. python main.py');
    console.log('5. 访问 http://localhost:8000/health');
    console.log();
  }

  process.exit(result.success ? 0 : 1);
}

exportMyAgent().catch(error => {
  console.error('\n❌ 导出失败:', error.message);
  console.error(error.stack);
  process.exit(1);
});
