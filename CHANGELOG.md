# Changelog

本文件记录项目所有重要变更，遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 规范。

## [0.1.0] - 2026-03-31

### 新增

- **核心导出功能**：将 OpenClaw 框架中定义的 AI Agent 导出为独立 Python 服务
- **LangChain 代码生成器**（`src/generators/python/langchain.ts`）：生成完整 Python 项目结构，包含：
  - `agent/`：核心逻辑（config、memory、prompts）
  - `api/`：FastAPI REST 接口与 WebSocket 支持
  - `llm/`：多 LLM 提供者集成（OpenAI、Anthropic、Ollama 等）
  - `skills/`：Skill 模块集成
  - `config/`：YAML 配置
  - `tests/`：单元测试与集成测试
  - `docker/`：Docker 及 docker-compose 配置
  - `scripts/`：启动与部署脚本
- **CLI 命令**（`src/cli/commands/`）：
  - `agent export`：导出 Agent 为独立服务
  - `agent validate`：验证导出结果的完整性与质量
  - `agent test`：运行服务测试套件
- **配置读取器**（`src/core/config-reader.ts`）：从工作空间读取 `AGENTS.md`、`SOUL.md`、`USER.md`、`MEMORY.md`；从 `~/.openclaw/openclaw.json` 读取 LLM 配置
- **Skill 转换器**（`src/core/skill-converter.ts`）：扫描并解析工作空间及 `~/.agents/skills` 中的 `SKILL.md` 文件，转换为 LangChain Tool 格式
- **服务验证器**（`src/testing/service-validator.ts`）：校验文件完整性、linting、安全扫描、测试运行、Docker 构建
- **插件清单**（`openclaw.plugin.json`）：注册 3 个 OpenClaw 插件命令
- **Handlebars 模板**（`src/generators/templates/python/`）：覆盖所有生成文件
- **类型系统**（`src/types.ts`）：基于 Zod schema 定义 `Framework`、`AgentConfig`、`ExportOptions`、`ExportResult`、`ValidationResult` 等核心类型
- **工具函数**（`src/utils/`）：`display`、`exec`、`llm-providers`、`pytest` 等辅助模块
- **使用示例脚本**：`export-my-agent.mjs`、`export-specific-agent.mjs`

### 变更（代码优化 - 2026-03-30）

- 添加 ESLint 配置（`.eslintrc.cjs`），引入代码规范检查
- 新增 Vitest 测试框架配置（`vitest.config.ts`）
- 新增单元测试套件（`tests/`）：
  - `config-reader.test.ts`：ConfigReader 核心逻辑测试
  - `exporter.test.ts`：AgentExporter 编排逻辑测试
  - `skill-converter.test.ts`：SkillConverter 解析逻辑测试
- `langchain.ts`：代码质量优化，修复 `let` 应为 `const` 的规范问题
- 优化 README 文档内容

### 修复（2026-03-31）

- 修复 CLI 输出格式问题，改善命令行交互体验，涉及以下模块：
  - `export.ts`、`validate.ts`：命令输出格式修正
  - `config-reader.ts`、`exporter.ts`、`skill-converter.ts`：内部逻辑格式规范
  - `langchain.ts`：代码生成模板格式修复
  - `service-validator.ts`：验证结果输出格式修正
  - `display.ts`：显示工具函数优化
  - `types.ts`：类型定义清理
  - `package.json`：依赖配置调整

---

[0.1.0]: https://github.com/openclaw/agent-exporter/releases/tag/v0.1.0
