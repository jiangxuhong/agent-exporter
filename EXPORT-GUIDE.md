# 导出指定 Agent 使用指南

## 🎯 快速开始

### 1. 列出所有可用的 Agents

```bash
cd ~/.agents/plugins/agent-exporter
node export-specific-agent.mjs --list
```

**输出示例：**
```
可用的 Agents:
• main (默认)
  身份: 🤖 老王
  工作空间: /Users/jxh/.openclaw/workspace

• architect-expert
  身份: 🏗️ 架构专家
  工作空间: /Users/jxh/.openclaw/workspace/architect-expert

• food-supply-product-expert
  身份: 🍽️ 餐饮供应链产品专家
  工作空间: /Users/jxh/.openclaw/workspace/food-supply-product-expert
```

---

### 2. 交互式选择（推荐）

```bash
cd ~/.agents/plugins/agent-exporter
node export-specific-agent.mjs
```

**交互流程：**
```
🦞 导出指定的 OpenClaw Agent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

正在获取 agent 列表...

找到 3 个 agents:

  [1] main (默认)
      身份: 🤖 老王

  [2] architect-expert
      身份: 🏗️ 架构专家

  [3] food-supply-product-expert
      身份: 🍽️ 餐饮供应链产品专家

请选择要导出的 agent [1-3]: 2

✓ 已选择: architect-expert

导出中...
✔ Agent 配置已加载
✔ LLM 配置已加载
✔ Skills 已转换 (0 个)
✔ 服务代码已生成 (29 个文件)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 导出成功！

Agent: architect-expert
输出目录: ./exported-architect-expert
生成文件: 29 个

下一步:
  cd ./exported-architect-expert
  pip install -r requirements.txt
  python main.py
```

---

### 3. 直接指定 Agent

```bash
# 导出 main agent
node export-specific-agent.mjs --agent main

# 导出 architect-expert
node export-specific-agent.mjs --agent architect-expert

# 导出并指定输出目录
node export-specific-agent.mjs --agent food-supply-product-expert --output ~/my-services/food-expert
```

---

## 📋 支持的 Agents

当前你的 OpenClaw 中有以下 agents：

| Agent ID | 身份 | 描述 |
|----------|------|------|
| main | 🤖 老王 | 默认 agent |
| architect-expert | 🏗️ | 架构专家 |
| food-supply-product-expert | 🍽️ | 餐饮供应链产品专家 |

---

## 🎨 自定义导出选项

如果你想修改导出选项，编辑 `export-specific-agent.mjs` 中的 `exportAgent` 函数：

```javascript
const result = await exporter.export({
  framework: 'langchain',        // 可选: langgraph, crewai
  language: 'python',            // 可选: java
  output: outputPath,
  name: selectedAgent.id,
  includeMemory: true,           // 是否包含记忆
  includeSkills: true,           // 是否包含 skills
  apiTypes: ['rest', 'websocket'],
  port: 8000,
  withTests: true,               // 是否生成测试
  withDockerfile: true,          // 是否生成 Docker
  overwrite: true,
  verbose: true,
});
```

---

## 🚀 导出后如何使用

### 方式 1: 本地运行

```bash
# 1. 进入导出的服务
cd ./exported-architect-expert

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 API keys

# 4. 运行服务
python main.py

# 5. 测试 API
curl http://localhost:8000/health
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好"}'
```

### 方式 2: Docker 部署

```bash
# 1. 构建 Docker 镜像
cd ./exported-architect-expert
docker build -t architect-expert -f docker/Dockerfile.prod .

# 2. 运行容器
docker run -d \
  -p 8000:8000 \
  -e OPENAI_API_KEY=your-key \
  --name architect-expert-service \
  architect-expert

# 3. 查看日志
docker logs -f architect-expert-service
```

---

## 🔧 故障排除

### 问题 1: 找不到 agent

**原因:** Agent ID 不正确

**解决:**
```bash
# 先列出所有 agents
node export-specific-agent.mjs --list

# 确认正确的 agent ID
```

### 问题 2: 工作空间路径错误

**原因:** Agent 的工作空间配置不正确

**解决:**
```bash
# 检查 agent 配置
openclaw agents list

# 确认工作空间路径存在
ls -la ~/.openclaw/workspace/architect-expert
```

### 问题 3: 权限错误

**原因:** 没有写入权限

**解决:**
```bash
# 使用有权限的输出目录
node export-specific-agent.mjs --output ~/Documents/my-agent
```

---

## 💡 提示

1. **默认 agent**: 如果不指定 `--agent`，会进入交互式选择模式
2. **输出目录**: 默认导出到当前目录的 `./exported-{agent-id}`
3. **覆盖**: 默认会覆盖已存在的目录
4. **验证**: 导出后会自动验证生成的文件

---

## 📚 更多信息

- Plugin 文档: `~/.agents/plugins/agent-exporter/README.md`
- 设计文档: `~/.agents/plugins/agent-exporter/PLAN.md`
- 进度跟踪: `~/.agents/plugins/agent-exporter/PROGRESS.md`
