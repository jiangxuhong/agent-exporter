# Agent Exporter Plugin

🦞 Export OpenClaw agents as production-ready standalone services.

## Overview

This plugin exports your configured OpenClaw agent into a standalone service that can run independently without OpenClaw Gateway. The exported service is **production-ready** with comprehensive testing and validation.

## Features

- ✅ **LangChain Support**: Full Python LangChain code generation
- 🚧 **More Frameworks**: LangGraph, CrewAI (planned), LangChain4j (planned)
- ✅ **Dual API**: REST API + WebSocket API
- ✅ **Complete Migration**: Agent config, skills, memory, LLM providers
- ✅ **Production Quality**: Monitoring, logging, error handling
- 🚧 **Testing Suite**: Test generation (in development)
- ✅ **Quality Validation**: Linting, security scanning, coverage checks
- ✅ **Docker Support**: Production-optimized Dockerfiles
- 🚧 **Kubernetes Ready**: K8s manifests (planned)

## Installation

```bash
# Install from ClawHub (recommended)
openclaw plugins install agent-exporter

# Or from npm
openclaw plugins install @openclaw/agent-exporter
```

## Quick Start

### 1. Export Agent

```bash
# Interactive mode (guided prompts)
openclaw agent export

# With options
openclaw agent export \
  --framework langchain \
  --language python \
  --output ./my-agent-service \
  --validate
```

### 2. Run Exported Service

```bash
cd my-agent-service

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run service
python main.py
```

### 3. Test API

```bash
# Health check
curl http://localhost:8000/health

# Chat endpoint
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

## CLI Commands

### `openclaw agent export`

Export agent as standalone service.

**Options:**

```
-f, --framework <framework>     Framework: langchain, langgraph, crewai, langchain4j
-l, --language <language>       Language: python, java
-o, --output <path>             Output directory (default: ./agent-service)
-n, --name <name>               Service name

--include-memory                Include memory files (default: true)
--include-skills                Include skills (default: true)
--api-types <types>             API types: rest,websocket (default: rest,websocket)
--port <port>                   Service port (default: 8000)

--with-tests                    Generate test suite (default: true)
--test-coverage-threshold <n>   Minimum test coverage (default: 80)
--validate                      Run validation after export (default: true)
--run-tests                     Run generated tests (default: false)

--with-dockerfile               Generate Dockerfile (default: true)
--with-kubernetes               Generate K8s manifests (default: false)
--with-monitoring               Generate monitoring config (default: false)

--overwrite                     Overwrite existing output directory
--dry-run                       Show what would be generated without writing
--verbose                       Verbose output
```

**Examples:**

```bash
# Basic export
openclaw agent export

# Full production export
openclaw agent export \
  --framework langchain \
  --output ./production-agent \
  --with-tests \
  --test-coverage-threshold 80 \
  --validate \
  --with-dockerfile \
  --with-kubernetes \
  --with-monitoring

# Dry run to see what will be generated
openclaw agent export --dry-run

# Export with specific skills only
openclaw agent export \
  --include-skills \
  --skills weather,calendar,email
```

### `openclaw agent validate <service-path>`

Validate an exported service.

**Options:**

```
--skip-lint                     Skip code linting
--skip-security                 Skip security scan
--skip-tests                    Skip running tests
--skip-docker                   Skip Docker build test
--fix                           Auto-fix issues where possible
```

**Example:**

```bash
# Validate exported service
openclaw agent validate ./my-agent-service

# Validate without running tests
openclaw agent validate ./my-agent-service --skip-tests
```

### `openclaw agent test <service-path>`

Run tests for an exported service.

**Options:**

```
--type <type>                   Test type: unit, integration, e2e, all (default: all)
--coverage                      Generate coverage report
--coverage-threshold <n>        Fail if coverage below threshold (default: 80)
--verbose                       Verbose test output
```

**Example:**

```bash
# Run all tests with coverage
openclaw agent test ./my-agent-service --coverage

# Run only unit tests
openclaw agent test ./my-agent-service --type unit

# Run integration tests with verbose output
openclaw agent test ./my-agent-service --type integration --verbose
```

## Generated Service Structure

```
my-agent-service/
├── agent/                        # Agent core
│   ├── config.py                 # Agent configuration
│   ├── prompts.py                # Prompts (from SOUL.md, AGENTS.md)
│   └── memory.py                 # Memory management
├── skills/                       # Converted skills
│   └── [skill-name]/
│       └── tool.py               # LangChain Tool
├── llm/                          # LLM layer
│   ├── providers.py              # Provider clients
│   └── config.py                 # Provider configuration
├── api/                          # API layer
│   ├── rest.py                   # REST endpoints
│   ├── websocket.py              # WebSocket handler
│   └── models.py                 # Pydantic models
├── config/                       # Configuration files
│   ├── agent.yaml
│   ├── llm.yaml
│   └── api.yaml
├── memory/                       # Memory files
│   ├── long_term.md
│   └── daily/
├── tests/                        # Test suite
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker/                       # Docker configuration
│   ├── Dockerfile
│   └── Dockerfile.prod
├── main.py                       # Application entry
├── requirements.txt
├── requirements-dev.txt
└── README.md
```

## API Documentation

### REST API

**POST /api/v1/chat**

Send a chat message to the agent.

```json
{
  "message": "Hello, how are you?",
  "session_id": "optional-session-id",
  "context": {
    "user": "john",
    "locale": "en-US"
  }
}
```

Response:

```json
{
  "response": "Hello! I'm doing well, thank you for asking.",
  "session_id": "session-123",
  "metadata": {
    "model": "gpt-4",
    "tokens_used": 42
  }
}
```

**GET /health**

Basic health check.

**GET /health/detailed**

Detailed health check with dependency status.

### WebSocket API

Connect to `ws://localhost:8000/ws`

Send message:

```json
{
  "type": "message",
  "content": "Hello!",
  "session_id": "optional-session-id"
}
```

Receive response:

```json
{
  "type": "response",
  "content": "Hello! How can I help you?",
  "session_id": "session-123"
}
```

## Testing

### Run Tests

```bash
# All tests
pytest

# With coverage
pytest --cov --cov-report=html

# Specific test type
pytest tests/unit/
pytest tests/integration/
pytest tests/e2e/

# Verbose
pytest -v
```

### Validation

```bash
# Run full validation
./scripts/validate_service.sh

# Run specific checks
./scripts/lint.sh
./scripts/security_scan.sh
```

## Deployment

### Docker

```bash
# Build
docker build -t agent-service -f docker/Dockerfile.prod .

# Run
docker run -p 8000:8000 --env-file .env agent-service
```

### Kubernetes

```bash
# Apply manifests
kubectl apply -f kubernetes/

# Check status
kubectl get pods -l app=agent-service
```

## Framework Support

### Python

| Framework | Status | Description |
|-----------|--------|-------------|
| LangChain | ✅ Ready | Most mature, extensive integrations |
| LangGraph | 🚧 Planned | Stateful agents, better control flow |
| CrewAI | 🚧 Planned | Multi-agent orchestration |

### Java

| Framework | Status | Description |
|-----------|--------|-------------|
| LangChain4j | 🚧 Planned | Java port of LangChain |
| Spring AI | 🚧 Planned | Spring ecosystem integration |

## Quality Standards

Generated services aim to meet these standards:

- 🚧 Test coverage ≥ 80% (test generation in development)
- ✅ No lint errors
- ✅ No security vulnerabilities
- ✅ Docker build successful
- ✅ Health check passing
- ✅ API documentation (OpenAPI)

## Development Status

### Phase 1: MVP (Current)
- [x] Plugin structure
- [x] CLI commands
- [x] LangChain generator (basic)
- [ ] Test generation
- [ ] Validation flow

### Phase 2: Enhancement
- [ ] LangGraph support
- [ ] CrewAI support
- [ ] Full test suite generation
- [ ] Docker/K8s deployment

### Phase 3: Java Support
- [ ] LangChain4j generator
- [ ] Spring AI support

## Contributing

Contributions are welcome! Please see the main OpenClaw repository for guidelines.

## License

MIT License - see LICENSE file for details.

## Support

- 📚 Documentation: https://docs.openclaw.ai
- 💬 Discord: https://discord.com/invite/clawd
- 🐛 Issues: https://github.com/openclaw/openclaw/issues
