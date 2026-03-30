# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 **OpenClaw 插件**，将 OpenClaw 框架中定义的 AI Agent 导出为生产级独立服务（含 REST/WebSocket API、测试套件、Docker 配置）。目前主要支持 Python + LangChain，计划支持 LangGraph、CrewAI、LangChain4j 等框架。

## 常用命令

```bash
npm run build    # 编译 TypeScript（tsc）
npm run dev      # 监听模式编译（tsc --watch）
npm run test     # 运行测试（vitest）
npm run lint     # ESLint 检查（eslint src --ext .ts）
```

运行单个测试：
```bash
npx vitest run <测试文件路径>
```

## 架构概览

### 数据流

```
CLI 命令 → AgentExporter（编排器）→ Generator（代码生成）→ ServiceValidator（验证）
```

1. **CLI 层** (`src/cli/commands/`): `export.ts`、`validate.ts`、`test.ts` 解析命令行参数并调用核心模块
2. **配置读取** (`src/core/config-reader.ts`): 从工作空间读取 `AGENTS.md`、`SOUL.md` 等文件；从 `~/.openclaw/openclaw.json` 读取 LLM 配置
3. **Skill 转换** (`src/core/skill-converter.ts`): 扫描并解析工作空间及 `~/.agents/skills` 中的 SKILL.md 文件，转换为框架格式
4. **代码生成** (`src/generators/python/langchain.ts`): 生成完整 Python 项目结构，使用 Handlebars 模板（`src/generators/templates/python/`）
5. **验证** (`src/testing/service-validator.ts`): 检查文件完整性、linting、安全扫描、测试、Docker 构建

### 类型系统

所有核心类型定义在 `src/types.ts`（使用 Zod schemas），包括：
- `Framework`: 支持的框架枚举（langchain、langgraph、crewai 等）
- `AgentConfig`: Agent 配置（含 AGENTS.md/SOUL.md 内容）
- `ExportOptions`: 导出参数
- `ExportResult` / `ValidationResult`: 操作结果

### 插件注册

`src/index.ts` 将 CLI 命令注册到 OpenClaw 框架；`openclaw.plugin.json` 是插件清单，定义了 3 个命令：`agent export`、`agent validate`、`agent test`。

## 代码生成模式

`src/generators/python/langchain.ts` 是最核心的文件，生成完整的 Python 项目，包含：
- `agent/`（核心逻辑）、`skills/`、`llm/`（提供者集成）、`api/`（FastAPI + WebSocket）
- `config/`（YAML）、`memory/`、`tests/`、`docker/`、`scripts/`

Handlebars 模板位于 `src/generators/templates/python/`，模板变量来自 `AgentConfig` 和 `LLMProviderConfig`。

## 扩展新框架

添加新框架支持需要：
1. 在 `src/types.ts` 的 `Framework` 枚举中添加新值
2. 在 `src/generators/` 下创建对应生成器
3. 在 `src/core/exporter.ts` 中路由到新生成器
4. 可选：在 `src/generators/templates/` 下添加对应模板
