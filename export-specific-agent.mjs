#!/usr/bin/env node

/**
 * 导出指定的 OpenClaw Agent
 * 
 * 使用方式：
 * node export-specific-agent.mjs                    # 交互式选择
 * node export-specific-agent.mjs --agent main       # 直接指定
 * node export-specific-agent.mjs --list             # 列出所有 agent
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { AgentExporter } from './dist/core/exporter.js';

// ANSI 颜色
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

/**
 * 获取所有 OpenClaw agents
 */
async function listAgents() {
  return new Promise((resolve, reject) => {
    const proc = spawn('openclaw', ['agents', 'list'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Failed to list agents'));
        return;
      }

      // 解析输出
      const agents = [];
      const lines = output.split('\n');
      let currentAgent = null;

      for (const line of lines) {
        const agentMatch = line.match(/^- (\w+)(?:\s+\(default\))?/);
        if (agentMatch) {
          if (currentAgent) agents.push(currentAgent);
          currentAgent = {
            id: agentMatch[1],
            isDefault: line.includes('(default)'),
          };
          continue;
        }

        if (currentAgent) {
          const identityMatch = line.match(/Identity:\s+(.+)/);
          const workspaceMatch = line.match(/Workspace:\s+(.+)/);
          const modelMatch = line.match(/Model:\s+(.+)/);

          if (identityMatch) currentAgent.identity = identityMatch[1].trim();
          if (workspaceMatch) currentAgent.workspace = workspaceMatch[1].trim();
          if (modelMatch) currentAgent.model = modelMatch[1].trim();
        }
      }

      if (currentAgent) agents.push(currentAgent);
      resolve(agents);
    });
  });
}

/**
 * 交互式选择 agent
 */
async function selectAgent(agents) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    log(colors.bright + colors.cyan, '\n可用的 Agents:');
    log(colors.dim, '─'.repeat(60));

    agents.forEach((agent, index) => {
      const defaultMark = agent.isDefault ? ' (默认)' : '';
      const identity = agent.identity || '无身份';
      console.log(`  ${index + 1}. ${colors.green}${agent.id}${colors.reset}${defaultMark}`);
      console.log(`     ${colors.dim}身份: ${identity}${colors.reset}`);
      console.log(`     ${colors.dim}模型: ${agent.model || '未知'}${colors.reset}`);
      console.log();
    });

    rl.question(`${colors.cyan}请选择要导出的 agent (输入编号或 ID): ${colors.reset}`, (answer) => {
      rl.close();

      // 尝试解析为数字
      const num = parseInt(answer);
      if (!isNaN(num) && num >= 1 && num <= agents.length) {
        resolve(agents[num - 1]);
      } else {
        // 尝试匹配 ID
        const agent = agents.find(a => a.id === answer.trim());
        resolve(agent || null);
      }
    });
  });
}

/**
 * 导出 agent
 */
async function exportAgent(agent, outputPath) {
  log(colors.bright + colors.cyan, `\n开始导出 Agent: ${agent.id}`);
  log(colors.dim, '─'.repeat(60));

  // Expand ~ to home directory
  const workspace = agent.workspace.replace(/^~/, process.env.HOME);
  log(colors.yellow, `工作空间: ${workspace}`);
  log(colors.yellow, `模型: ${agent.model || '默认'}`);
  log(colors.yellow, `输出目录: ${outputPath}`);
  console.log();

  const exporter = new AgentExporter(workspace, agent.id);

  const result = await exporter.export({
    framework: 'langchain',
    language: 'python',
    output: outputPath,
    name: agent.id,
    includeMemory: true,
    includeSkills: true,
    apiTypes: ['rest', 'websocket'],
    port: 8000,
    withTests: true,
    withDockerfile: true,
    overwrite: true,
    verbose: true,
  });

  return result;
}

/**
 * 显示成功信息和后续步骤
 */
function showSuccessMessage(result, agent) {
  console.log();
  log(colors.bright + colors.green, '✅ 导出成功！');
  log(colors.dim, '─'.repeat(60));
  console.log();
  log(colors.cyan, `📁 输出目录: ${result.outputDir}`);
  log(colors.cyan, `📄 生成文件: ${result.filesGenerated} 个`);
  console.log();
  log(colors.bright, '后续步骤:');
  log(colors.dim, '─'.repeat(60));
  console.log();
  console.log(`1. 进入服务目录:`);
  log(colors.green, `   cd ${result.outputDir}`);
  console.log();
  console.log(`2. 安装依赖:`);
  log(colors.green, `   pip install -r requirements.txt`);
  console.log();
  console.log(`3. 配置环境变量:`);
  log(colors.green, `   cp .env.example .env`);
  log(colors.dim, `   # 编辑 .env 填入你的 API keys`);
  console.log();
  console.log(`4. 运行服务:`);
  log(colors.green, `   python main.py`);
  console.log();
  console.log(`5. 测试 API:`);
  log(colors.green, `   curl http://localhost:8000/health`);
  log(colors.green, `   curl -X POST http://localhost:8000/api/v1/chat \\`);
  log(colors.green, `     -H 'Content-Type: application/json' \\`);
  log(colors.green, `     -d '{"message": "Hello"}'`);
  console.log();
  log(colors.dim, '─'.repeat(60));
  log(colors.bright + colors.cyan, `🎉 你的 ${agent.id} agent 已准备就绪！`);
  console.log();
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  console.log();
  log(colors.bright + colors.cyan, '🦞 OpenClaw Agent Exporter');
  log(colors.dim, '─'.repeat(60));

  try {
    // 列出所有 agents
    if (args.includes('--list')) {
      const agents = await listAgents();
      log(colors.bright, '\n所有可用的 Agents:');
      log(colors.dim, '─'.repeat(60));
      agents.forEach(agent => {
        const defaultMark = agent.isDefault ? ' (默认)' : '';
        console.log(`  • ${agent.id}${defaultMark}`);
        console.log(`    身份: ${agent.identity || '无'}`);
        console.log(`    工作空间: ${agent.workspace}`);
        console.log();
      });
      process.exit(0);
    }

    // 获取所有 agents
    log(colors.dim, '正在获取 agent 列表...');
    const agents = await listAgents();

    if (agents.length === 0) {
      log(colors.red, '❌ 没有找到任何 agent');
      process.exit(1);
    }

    // 确定要导出的 agent
    let selectedAgent = null;

    // 检查命令行参数
    const agentIndex = args.indexOf('--agent');
    if (agentIndex !== -1 && args[agentIndex + 1]) {
      const agentId = args[agentIndex + 1];
      selectedAgent = agents.find(a => a.id === agentId);
      
      if (!selectedAgent) {
        log(colors.red, `❌ 找不到 agent: ${agentId}`);
        log(colors.yellow, '\n可用的 agents:');
        agents.forEach(a => console.log(`  • ${a.id}`));
        process.exit(1);
      }
    } else {
      // 交互式选择
      selectedAgent = await selectAgent(agents);
      
      if (!selectedAgent) {
        log(colors.red, '❌ 无效的选择');
        process.exit(1);
      }
    }

    // 确定输出路径
    const outputIndex = args.indexOf('--output');
    const outputPath = outputIndex !== -1 && args[outputIndex + 1]
      ? args[outputIndex + 1]
      : `./exported-${selectedAgent.id}`;

    // 执行导出
    const result = await exportAgent(selectedAgent, outputPath);

    if (result.success) {
      showSuccessMessage(result, selectedAgent);
      process.exit(0);
    } else {
      log(colors.red, '\n❌ 导出失败！');
      result.errors.forEach(err => {
        log(colors.red, `  • ${err}`);
      });
      process.exit(1);
    }

  } catch (error) {
    log(colors.red, `\n❌ 错误: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
