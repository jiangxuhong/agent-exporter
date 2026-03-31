/**
 * LangChain Service Generator
 *
 * Generates production-ready LangChain service
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as fsExtra from 'fs-extra';
import type { ExportOptions, AgentConfig, LLMProviderConfig, SkillConfig } from '../../types.js';
import { getApiKeyEnvVar } from '../../utils/llm-providers.js';

export class LangChainGenerator {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
  }

  /**
   * Generate complete LangChain service
   */
  async generate(
    agentConfig: AgentConfig,
    llmConfig: LLMProviderConfig[],
    skills: SkillConfig[],
    options: ExportOptions
  ): Promise<number> {
    await this.createDirectoryStructure();

    // Generate independent modules in parallel
    const [core, agent, llm, api, skillsModule, config] = await Promise.all([
      this.generateCoreFiles(options, llmConfig),
      this.generateAgentModule(agentConfig),
      this.generateLLMModule(llmConfig),
      this.generateAPIModule(options),
      this.generateSkillsModule(skills),
      this.generateConfigFiles(agentConfig, llmConfig, options),
    ]);

    const filesGenerated = core + agent + llm + api + skillsModule + config;

    // Conditional modules
    const [memory, tests, docker, docs] = await Promise.all([
      options.includeMemory ? this.generateMemoryFiles(agentConfig) : Promise.resolve(0),
      options.withTests ? this.generateTests(agentConfig, options) : Promise.resolve(0),
      options.withDockerfile ? this.generateDockerFiles(options) : Promise.resolve(0),
      this.generateDocumentation(options, llmConfig),
    ]);

    return filesGenerated + memory + tests + docker + docs;
  }

  /**
   * Create directory structure
   */
  private async createDirectoryStructure(): Promise<void> {
    const directories = [
      'agent',
      'skills',
      'llm',
      'api',
      'core',
      'monitoring',
      'config',
      'memory/daily',
      'tests/unit',
      'tests/integration',
      'tests/e2e',
      'tests/fixtures',
      'scripts',
      'docker',
    ];

    await Promise.all(
      directories.map(dir => fsExtra.ensureDir(path.join(this.outputDir, dir)))
    );
  }

  /**
   * Generate core files (main.py, requirements.txt, etc.)
   */
  private async generateCoreFiles(options: ExportOptions, llmConfig?: LLMProviderConfig[]): Promise<number> {
    const o = this.outputDir;
    await Promise.all([
      fsExtra.outputFile(path.join(o, 'main.py'),               this.generateMainPy(options)),
      fsExtra.outputFile(path.join(o, 'config.py'),             this.generateConfigPy()),
      fsExtra.outputFile(path.join(o, 'requirements.txt'),      this.generateRequirementsTxt()),
      fsExtra.outputFile(path.join(o, 'requirements-dev.txt'),  this.generateRequirementsDevTxt()),
      fsExtra.outputFile(path.join(o, 'pyproject.toml'),        this.generatePyprojectToml(options)),
      fsExtra.outputFile(path.join(o, 'pytest.ini'),            this.generatePytestIni()),
      fsExtra.outputFile(path.join(o, '.env.example'),          this.generateEnvExample(llmConfig || [])),
      fsExtra.outputFile(path.join(o, '.gitignore'),            this.generateGitignore()),
    ]);
    return 8;
  }

  /**
   * Generate agent module
   */
  private async generateAgentModule(agentConfig: AgentConfig): Promise<number> {
    const o = this.outputDir;
    await Promise.all([
      fsExtra.outputFile(path.join(o, 'agent/__init__.py'), '"""Agent module."""\n'),
      fsExtra.outputFile(path.join(o, 'agent/config.py'),   this.generateAgentConfigPy(agentConfig)),
      fsExtra.outputFile(path.join(o, 'agent/prompts.py'),  this.generateAgentPromptsPy(agentConfig)),
      fsExtra.outputFile(path.join(o, 'agent/memory.py'),   this.generateAgentMemoryPy()),
    ]);
    return 4;
  }

  /**
   * Generate LLM module
   */
  private async generateLLMModule(llmConfig: LLMProviderConfig[]): Promise<number> {
    const o = this.outputDir;
    await Promise.all([
      fsExtra.outputFile(path.join(o, 'llm/__init__.py'),   '"""LLM module."""\n'),
      fsExtra.outputFile(path.join(o, 'llm/providers.py'),  this.generateLLMProvidersPy(llmConfig)),
      fsExtra.outputFile(path.join(o, 'llm/config.py'),     this.generateLLMConfigPy()),
    ]);
    return 3;
  }

  /**
   * Generate API module
   */
  private async generateAPIModule(options: ExportOptions): Promise<number> {
    const o = this.outputDir;
    const writes = [
      fsExtra.outputFile(path.join(o, 'api/__init__.py'), '"""API module."""\n'),
      fsExtra.outputFile(path.join(o, 'api/rest.py'),     this.generateAPIRestPy(options)),
      fsExtra.outputFile(path.join(o, 'api/models.py'),   this.generateAPIModelsPy()),
      fsExtra.outputFile(path.join(o, 'api/errors.py'),   this.generateAPIErrorsPy()),
    ];
    let count = 4;

    if (options.apiTypes.includes('websocket')) {
      writes.push(fsExtra.outputFile(path.join(o, 'api/websocket.py'), this.generateAPIWebsocketPy()));
      count++;
    }

    await Promise.all(writes);
    return count;
  }

  /**
   * Generate skills module
   */
  private async generateSkillsModule(skills: SkillConfig[]): Promise<number> {
    // skills/__init__.py + each skill's two files in parallel
    await Promise.all([
      fsExtra.outputFile(path.join(this.outputDir, 'skills/__init__.py'), '"""Skills module."""\n'),
      ...skills.map(skill => {
        const skillDir = path.join(this.outputDir, 'skills', skill.name);
        return Promise.all([
          // outputFile creates intermediate dirs automatically
          fsExtra.outputFile(path.join(skillDir, '__init__.py'), `"""${skill.name} skill."""\n`),
          fsExtra.outputFile(path.join(skillDir, 'tool.py'), this.generateSkillToolPy(skill)),
        ]);
      }),
    ]);

    return 1 + skills.length * 2;
  }

  /**
   * Generate config files
   */
  private async generateConfigFiles(
    agentConfig: AgentConfig,
    llmConfig: LLMProviderConfig[],
    options: ExportOptions
  ): Promise<number> {
    const o = this.outputDir;
    await Promise.all([
      fsExtra.outputFile(path.join(o, 'config/agent.yaml'), this.generateAgentYaml(agentConfig)),
      fsExtra.outputFile(path.join(o, 'config/llm.yaml'),   this.generateLLMYaml(llmConfig)),
      fsExtra.outputFile(path.join(o, 'config/api.yaml'),   this.generateApiYaml(options)),
    ]);
    return 3;
  }

  /**
   * Generate memory files
   */
  private async generateMemoryFiles(agentConfig: AgentConfig): Promise<number> {
    const writes: Promise<void>[] = [];
    let count = 0;

    if (agentConfig.memoryMd) {
      writes.push(fsExtra.outputFile(path.join(this.outputDir, 'memory/long_term.md'), agentConfig.memoryMd));
      count++;
    }

    if (agentConfig.dailyMemory) {
      for (const [filename, content] of Object.entries(agentConfig.dailyMemory)) {
        writes.push(fsExtra.outputFile(path.join(this.outputDir, 'memory/daily', filename), content));
        count++;
      }
    }

    await Promise.all(writes);
    return count;
  }

  /**
   * Generate tests
   */
  private async generateTests(agentConfig: AgentConfig, options: ExportOptions): Promise<number> {
    // TODO: Implement test generation
    // This will be in a separate file to keep this one manageable
    return 0;
  }

  /**
   * Generate Docker files
   */
  private async generateDockerFiles(options: ExportOptions): Promise<number> {
    const o = this.outputDir;
    await Promise.all([
      fsExtra.outputFile(path.join(o, 'docker/Dockerfile'),      this.generateDockerfile()),
      fsExtra.outputFile(path.join(o, 'docker/Dockerfile.prod'), this.generateDockerfileProd()),
      fsExtra.outputFile(path.join(o, 'docker/.dockerignore'),   this.generateDockerignore()),
      fsExtra.outputFile(path.join(o, 'docker-compose.yml'),     this.generateDockerComposeYml(options)),
    ]);
    return 4;
  }

  /**
   * Generate documentation
   */
  private async generateDocumentation(options: ExportOptions, llmConfig?: LLMProviderConfig[]): Promise<number> {
    // README.md
    await fsExtra.outputFile(
      path.join(this.outputDir, 'README.md'),
      this.generateReadmeMd(options, llmConfig)
    );
    return 1;
  }


  private generateMainPy(options: ExportOptions): string {
    return `"""
Agent Service - Auto-generated from OpenClaw

Production-ready agent service with REST and WebSocket APIs
"""

# Load environment variables from .env file FIRST
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import structlog

from api.rest import router as rest_router
from api.websocket import router as ws_router
from config import load_config
# from monitoring.metrics import setup_metrics  # TODO: Implement

# Configure logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

# Create FastAPI app
app = FastAPI(
    title="Agent Service",
    description="Production-ready agent service exported from OpenClaw",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup metrics
# setup_metrics(app)  # TODO: Implement metrics

# Include routers
app.include_router(rest_router, prefix="/api/v1", tags=["chat"])
app.include_router(ws_router, prefix="/ws", tags=["websocket"])


@app.get("/health")
async def health_check():
    """Basic health check."""
    return {"status": "healthy"}


@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with dependencies."""
    # TODO: Check LLM provider, memory, etc.
    return {
        "status": "healthy",
        "llm_provider": {"status": "ok"},
        "memory": {"status": "ok"},
    }


@app.on_event("startup")
async def startup_event():
    """Initialize service on startup."""
    logger.info("Agent service starting up")
    config = load_config()
    logger.info("Configuration loaded", port=config.api.port)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Agent service shutting down")


if __name__ == "__main__":
    config = load_config()
    uvicorn.run(
        "main:app",
        host=config.api.host,
        port=config.api.port,
        reload=False,
        log_level="info",
    )
`;
  }

  // Placeholder methods for other generators
  private generateConfigPy(): string {
    return `"""
Configuration Loader

Auto-generated from OpenClaw
"""

from pathlib import Path
from typing import Any, Dict, Optional
import yaml
from pydantic import BaseModel, Field


class APIConfig(BaseModel):
    """API configuration."""
    host: str = "0.0.0.0"
    port: int = 8000


class Config(BaseModel):
    """Main configuration."""
    api: APIConfig = Field(default_factory=APIConfig)
    llm: Optional[Dict[str, Any]] = Field(default_factory=dict)
    agent: Optional[Dict[str, Any]] = Field(default_factory=dict)


def load_config(config_dir: str = "config") -> Config:
    """Load configuration from YAML files."""
    config_path = Path(config_dir)

    config_data = {}

    # Load API config
    api_config_file = config_path / "api.yaml"
    if api_config_file.exists():
        with open(api_config_file) as f:
            config_data["api"] = yaml.safe_load(f)

    # Load LLM config
    llm_config_file = config_path / "llm.yaml"
    if llm_config_file.exists():
        with open(llm_config_file) as f:
            config_data["llm"] = yaml.safe_load(f) or {}

    # Load Agent config
    agent_config_file = config_path / "agent.yaml"
    if agent_config_file.exists():
        with open(agent_config_file) as f:
            config_data["agent"] = yaml.safe_load(f) or {}

    return Config(**config_data)
`;
  }
  // These will be fully implemented in separate files

  private generateRequirementsTxt(): string {
    return `# Core
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic>=2.5.0
pydantic-settings>=2.1.0

# LLM
langchain>=0.1.0
langchain-openai>=0.0.5
langchain-anthropic>=0.1.0
openai>=1.10.0
anthropic>=0.18.0

# WebSocket
websockets>=12.0
python-multipart>=0.0.6

# Utilities
python-dotenv>=1.0.0
pyyaml>=6.0.1
httpx>=0.26.0
tenacity>=8.2.0

# Monitoring
prometheus-client>=0.19.0
structlog>=24.1.0

# Caching
redis>=5.0.0
`;
  }

  private generateRequirementsDevTxt(): string {
    return `# Testing
pytest>=8.0.0
pytest-asyncio>=0.23.0
pytest-cov>=4.1.0
pytest-mock>=3.12.0
pytest-timeout>=2.2.0
httpx>=0.26.0

# Code Quality
flake8>=7.0.0
black>=24.1.0
mypy>=1.8.0
isort>=5.13.0

# Security
bandit>=1.7.0
safety>=3.0.0

# Performance
locust>=2.23.0
`;
  }

  private generatePyprojectToml(options: ExportOptions): string {
    return `[tool.black]
line-length = 100
target-version = ['py311']

[tool.isort]
profile = "black"
line_length = 100

[tool.mypy]
python_version = "3.11"
strict = true
`;
  }

  private generatePytestIni(): string {
    return `[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --strict-markers --tb=short
markers =
    unit: Unit tests
    integration: Integration tests
    e2e: End-to-end tests
`;
  }

  /**
   * Generate .env.example with correct API key variable for the provider
   */
  private generateEnvExample(llmConfig: LLMProviderConfig[]): string {
    const provider = llmConfig[0];
    const apiKeyEnv = provider ? getApiKeyEnvVar(provider.id) : 'OPENAI_API_KEY';

    return `# LLM Provider API Keys
# Configure the API key for your provider
${apiKeyEnv}=your-api-key-here

# Alternative providers (uncomment if needed)
# OPENAI_API_KEY=your-openai-api-key
# ANTHROPIC_API_KEY=your-anthropic-api-key

# Service Configuration
SERVICE_NAME=agent-service
SERVICE_PORT=8000

# Redis (optional, for caching)
REDIS_URL=redis://localhost:6379/0

# Logging
LOG_LEVEL=info
`;
  }

  private generateGitignore(): string {
    return `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
venv/
env/
ENV/

# IDE
.vscode/
.idea/
*.swp
*.swo

# Environment
.env
.env.local

# Testing
.pytest_cache/
.coverage
htmlcov/
.tox/

# MyPy
.mypy_cache/
`;
  }

  // Placeholder methods - to be implemented
  private generateAgentConfigPy(agentConfig: AgentConfig): string {
    return `"""Agent configuration."""\n\n# TODO: Implement\n`;
  }

  private generateAgentPromptsPy(agentConfig: AgentConfig): string {
    const soulContent = agentConfig.soulMd || '';
    const userContent = agentConfig.userMd || '';
    const agentsContent = agentConfig.agentsMd || '';

    // Escape triple quotes in content (for Python docstrings)
    const escapeContent = (content: string) => {
      return content.replace(/"""/g, '\\"\\"\\"');
    };

    return `"""
Agent Prompts

Auto-generated from OpenClaw agent workspace
"""


class SystemPrompt:
    """System prompt loaded from agent configuration."""

    # From SOUL.md - Persona and boundaries
    SOUL_PROMPT = """
${escapeContent(soulContent)}
"""

    # From USER.md - User context
    USER_CONTEXT = """
${escapeContent(userContent)}
"""

    # From AGENTS.md - Operating instructions
    OPERATING_INSTRUCTIONS = """
${escapeContent(agentsContent)}
"""

    @classmethod
    def build_system_prompt(cls) -> str:
        """Build complete system prompt."""
        parts = []

        if cls.SOUL_PROMPT.strip():
            parts.append("# Persona\\n" + cls.SOUL_PROMPT.strip())

        if cls.USER_CONTEXT.strip():
            parts.append("# User Context\\n" + cls.USER_CONTEXT.strip())

        if cls.OPERATING_INSTRUCTIONS.strip():
            parts.append("# Operating Instructions\\n" + cls.OPERATING_INSTRUCTIONS.strip())

        return "\\n\\n---\\n\\n".join(parts)


class PromptTemplates:
    """Prompt templates for different scenarios."""

    CHAT_TEMPLATE = """You are an AI assistant with the following characteristics:

{system_prompt}

---

Current conversation:
{chat_history}

Human: {input}

Assistant:"""

    @classmethod
    def format_chat_prompt(
        cls,
        system_prompt: str,
        chat_history: str,
        input: str
    ) -> str:
        """Format chat prompt."""
        return cls.CHAT_TEMPLATE.format(
            system_prompt=system_prompt,
            chat_history=chat_history,
            input=input
        )


# Pre-built system prompt
SYSTEM_PROMPT = SystemPrompt.build_system_prompt()
`;
  }

  private generateAgentMemoryPy(): string {
    return `"""
Agent Memory Management

Auto-generated from OpenClaw agent workspace
"""

from typing import List, Optional
from pathlib import Path
from datetime import datetime
import structlog

logger = structlog.get_logger()


class AgentMemory:
    """Manage agent memory: long-term and daily memories."""

    def __init__(self, memory_dir: str = "memory"):
        """Initialize memory manager."""
        self.memory_dir = Path(memory_dir)
        self.long_term_file = self.memory_dir / "long_term.md"
        self.daily_dir = self.memory_dir / "daily"

        self._long_term_cache: Optional[str] = None
        self._daily_cache: dict = {}

    def load_long_term_memory(self) -> str:
        """Load long-term memory from MEMORY.md."""
        if self._long_term_cache is not None:
            return self._long_term_cache

        try:
            if self.long_term_file.exists():
                content = self.long_term_file.read_text(encoding='utf-8')
                self._long_term_cache = content
                logger.info("Loaded long-term memory", chars=len(content))
                return content
        except Exception as e:
            logger.error("Failed to load long-term memory", error=str(e))

        return ""

    def load_daily_memories(self, limit: int = 7) -> List[str]:
        """Load recent daily memories."""
        memories = []

        try:
            if not self.daily_dir.exists():
                return memories

            files = sorted(
                self.daily_dir.glob("*.md"),
                key=lambda f: f.name,
                reverse=True
            )[:limit]

            for file in files:
                try:
                    content = file.read_text(encoding='utf-8')
                    memories.append(content)
                except Exception as e:
                    logger.warning("Failed to load daily memory",
                                  file=file.name,
                                  error=str(e))

        except Exception as e:
            logger.error("Failed to load daily memories", error=str(e))

        return memories

    def get_context_window(self, max_chars: int = 8000) -> str:
        """Get memory context within character limit."""
        parts = []

        long_term = self.load_long_term_memory()
        if long_term:
            parts.append(f"# Long-term Memory\\n\\n{long_term}")

        daily_memories = self.load_daily_memories(limit=5)
        if daily_memories:
            daily_text = "\\n\\n---\\n\\n".join(daily_memories)
            parts.append(f"# Recent Memories\\n\\n{daily_text}")

        context = "\\n\\n".join(parts)

        if len(context) > max_chars:
            context = context[:max_chars] + "\\n\\n... [truncated]"

        return context

    def clear_cache(self) -> None:
        """Clear memory cache."""
        self._long_term_cache = None
        self._daily_cache.clear()
`;
  }

  private generateLLMProvidersPy(llmConfig: LLMProviderConfig[]): string {
    // Extract provider info
    const provider = llmConfig[0] || { id: 'openai', type: 'openai', defaultModel: 'gpt-4', baseUrl: null };
    const providerId = provider.id;
    const providerType = provider.type;
    const defaultModel = provider.defaultModel;
    const baseUrl = provider.baseUrl;

    // Determine environment variable for API key
    const apiKeyEnv = getApiKeyEnvVar(providerId);
    // Escape baseUrl for Python string
    const baseUrlStr = baseUrl ? `"${baseUrl}"` : 'None';

    return `"""
LLM Providers

Auto-generated from OpenClaw configuration

Provider: ${providerId}
Model: ${defaultModel}
"""

import os
from typing import Optional, Dict, Any
import structlog

logger = structlog.get_logger()


class LLMClient:
    """LLM client that uses configured provider."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize LLM client with configuration."""
        self.config = config or {}
        self.provider_id = self.config.get("provider_id", "${providerId}")
        self.model = self.config.get("model", "${defaultModel}")
        self.base_url = self.config.get("base_url", ${baseUrlStr})
        self.temperature = self.config.get("temperature", 0.7)
        self.max_tokens = self.config.get("max_tokens", 4096)

        # Get API key from environment
        self.api_key = os.environ.get("${apiKeyEnv}")
        if not self.api_key:
            raise ValueError(
                "API key not found. Please set ${apiKeyEnv} environment variable."
            )

        # Initialize the actual client
        self._client = None
        self._init_client()

    def _init_client(self):
        """Initialize the underlying LLM client."""
        try:
            from openai import OpenAI

            client_kwargs = {
                "api_key": self.api_key,
            }
            if self.base_url:
                client_kwargs["base_url"] = self.base_url

            self._client = OpenAI(**client_kwargs)
            logger.info(
                "LLM client initialized",
                provider=self.provider_id,
                model=self.model,
                base_url=self.base_url or "default"
            )
        except ImportError:
            raise ImportError(
                "openai package not installed. Run: pip install openai"
            )

    def chat(
        self,
        message: str,
        system_prompt: Optional[str] = None,
        history: Optional[list] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        Send a chat message and get response.

        Args:
            message: User message
            system_prompt: System prompt (optional)
            history: Chat history as list of dicts with 'role' and 'content'
            temperature: Override default temperature
            max_tokens: Override default max tokens

        Returns:
            Assistant response text
        """
        messages = []

        # Add system prompt if provided
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        # Add chat history if provided
        if history:
            for msg in history:
                messages.append(msg)

        # Add current message
        messages.append({"role": "user", "content": message})

        try:
            response = self._client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature if temperature is not None else self.temperature,
                max_tokens=max_tokens if max_tokens is not None else self.max_tokens,
            )

            result = response.choices[0].message.content
            logger.info(
                "Chat completed",
                model=self.model,
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
            )
            return result

        except Exception as e:
            logger.error("Chat failed", error=str(e))
            raise

    def chat_stream(
        self,
        message: str,
        system_prompt: Optional[str] = None,
        history: Optional[list] = None,
    ):
        """
        Stream chat response.

        Yields chunks of the response.
        """
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        if history:
            for msg in history:
                messages.append(msg)

        messages.append({"role": "user", "content": message})

        try:
            stream = self._client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                stream=True,
            )

            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error("Stream chat failed", error=str(e))
            raise


# Global LLM client instance
_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """Get or create the global LLM client."""
    global _llm_client
    if _llm_client is None:
        from config import load_config
        config = load_config()
        llm_config = config.llm or {}
        _llm_client = LLMClient(llm_config)
    return _llm_client
`;
  }

  private generateLLMConfigPy(): string {
    return `"""LLM configuration."""\n\n# TODO: Implement\n`;
  }

  private generateAPIRestPy(options: ExportOptions): string {
    return `"""
REST API Endpoints

Auto-generated from OpenClaw agent workspace
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any, List
from datetime import datetime
from api.models import ChatRequest, ChatResponse, SessionInfo
from llm.providers import get_llm_client
from agent.prompts import SYSTEM_PROMPT
from agent.memory import AgentMemory
import structlog

logger = structlog.get_logger()
router = APIRouter()


# Session storage
sessions: Dict[str, Dict[str, Any]] = {}

# Memory manager
memory = AgentMemory()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Process a chat message using the configured LLM.

    This endpoint:
    1. Loads agent memory for context
    2. Builds conversation history
    3. Calls the LLM with system prompt
    4. Returns the response
    """
    try:
        message = request.message
        session_id = request.session_id or f"session-{hash(message) % 1000000}"

        # Get or create session
        if session_id not in sessions:
            sessions[session_id] = {
                "messages": [],
                "created_at": datetime.now().isoformat(),
                "last_active": datetime.now().isoformat()
            }
            logger.info("New session created", session_id=session_id)

        session = sessions[session_id]
        session["last_active"] = datetime.now().isoformat()

        # Build chat history from session
        history: List[Dict[str, str]] = []
        for msg in session["messages"][-10:]:  # Last 10 messages for context
            history.append({"role": "user", "content": msg["human"]})
            history.append({"role": "assistant", "content": msg["assistant"]})

        # Get memory context
        memory_context = memory.get_context_window(max_chars=4000)

        # Build full system prompt
        full_system_prompt = SYSTEM_PROMPT
        if memory_context:
            full_system_prompt += f"\\n\\n# Memory\\n\\n{memory_context}"

        # Get LLM client and make request
        try:
            llm = get_llm_client()
            response_text = llm.chat(
                message=message,
                system_prompt=full_system_prompt,
                history=history,
            )
        except ValueError as e:
            # API key not configured
            logger.error("LLM configuration error", error=str(e))
            raise HTTPException(
                status_code=503,
                detail=f"LLM service not configured: {str(e)}"
            )
        except Exception as e:
            logger.error("LLM request failed", error=str(e))
            raise HTTPException(
                status_code=500,
                detail=f"LLM request failed: {str(e)}"
            )

        # Update session
        session["messages"].append({
            "human": message,
            "assistant": response_text,
            "timestamp": datetime.now().isoformat()
        })

        logger.info(
            "Chat processed",
            session_id=session_id,
            message_count=len(session["messages"])
        )

        return ChatResponse(
            response=response_text,
            session_id=session_id,
            metadata={
                "message_count": len(session["messages"]),
                "model": llm.model if 'llm' in dir() else "unknown"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Chat processing failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Stream chat response.

    Returns Server-Sent Events (SSE) stream.
    """
    from fastapi.responses import StreamingResponse
    import json

    async def generate():
        try:
            message = request.message
            session_id = request.session_id or f"session-{hash(message) % 1000000}"

            # Get or create session
            if session_id not in sessions:
                sessions[session_id] = {
                    "messages": [],
                    "created_at": datetime.now().isoformat(),
                    "last_active": datetime.now().isoformat()
                }

            session = sessions[session_id]
            session["last_active"] = datetime.now().isoformat()

            # Build history
            history = []
            for msg in session["messages"][-10:]:
                history.append({"role": "user", "content": msg["human"]})
                history.append({"role": "assistant", "content": msg["assistant"]})

            # Get memory context
            memory_context = memory.get_context_window(max_chars=4000)
            full_system_prompt = SYSTEM_PROMPT
            if memory_context:
                full_system_prompt += f"\\n\\n# Memory\\n\\n{memory_context}"

            # Stream response
            llm = get_llm_client()
            full_response = ""

            for chunk in llm.chat_stream(
                message=message,
                system_prompt=full_system_prompt,
                history=history,
            ):
                full_response += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\\n\\n"

            # Update session with complete response
            session["messages"].append({
                "human": message,
                "assistant": full_response,
                "timestamp": datetime.now().isoformat()
            })

            yield f"data: {json.dumps({'done': True, 'session_id': session_id})}\\n\\n"

        except Exception as e:
            logger.error("Stream chat failed", error=str(e))
            yield f"data: {json.dumps({'error': str(e)})}\\n\\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )


@router.get("/sessions/{session_id}", response_model=SessionInfo)
async def get_session(session_id: str) -> SessionInfo:
    """Get session information."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]

    return SessionInfo(
        session_id=session_id,
        message_count=len(session["messages"]),
        created_at=session["created_at"],
        last_active=session["last_active"]
    )


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str) -> dict:
    """Delete a session."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    del sessions[session_id]
    logger.info("Session deleted", session_id=session_id)

    return {"status": "deleted", "session_id": session_id}


@router.get("/sessions")
async def list_sessions() -> dict:
    """List all active sessions."""
    return {
        "sessions": [
            {
                "session_id": sid,
                "message_count": len(session["messages"]),
                "last_active": session["last_active"]
            }
            for sid, session in sessions.items()
        ],
        "total": len(sessions)
    }
`;
  }

  private generateAPIWebsocketPy(): string {
    return `"""
WebSocket API Handler

Auto-generated from OpenClaw agent workspace
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Any, List
import json
import structlog

from llm.providers import get_llm_client
from agent.prompts import SYSTEM_PROMPT
from agent.memory import AgentMemory

logger = structlog.get_logger()
router = APIRouter()


class ConnectionManager:
    """Manage WebSocket connections."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.sessions: Dict[str, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                "messages": [],
                "created_at": None,
            }
        logger.info("WebSocket connected", session_id=session_id)

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info("WebSocket disconnected", session_id=session_id)

    async def send_message(self, session_id: str, message: Dict[str, Any]):
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            await websocket.send_json(message)


manager = ConnectionManager()
memory = AgentMemory()


@router.websocket("")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time chat."""
    session_id = None

    try:
        await websocket.accept()
        session_id = f"ws-{id(websocket)}"
        await manager.connect(websocket, session_id)

        logger.info("WebSocket session started", session_id=session_id)

        while True:
            try:
                data = await websocket.receive_json()

                if data.get("type") == "message":
                    user_message = data.get("content", "")

                    # Get session and build history
                    session = manager.sessions.get(session_id, {"messages": []})
                    history: List[Dict[str, str]] = []
                    for msg in session["messages"][-10:]:
                        history.append({"role": "user", "content": msg["human"]})
                        history.append({"role": "assistant", "content": msg["assistant"]})

                    # Get memory context
                    memory_context = memory.get_context_window(max_chars=4000)
                    full_system_prompt = SYSTEM_PROMPT
                    if memory_context:
                        full_system_prompt += f"\\n\\n# Memory\\n\\n{memory_context}"

                    # Stream LLM response
                    try:
                        llm = get_llm_client()
                        full_response = ""

                        for chunk in llm.chat_stream(
                            message=user_message,
                            system_prompt=full_system_prompt,
                            history=history,
                        ):
                            full_response += chunk
                            await manager.send_message(session_id, {
                                "type": "chunk",
                                "content": chunk,
                                "session_id": session_id
                            })

                        # Update session
                        session["messages"].append({
                            "human": user_message,
                            "assistant": full_response
                        })

                        # Send completion
                        await manager.send_message(session_id, {
                            "type": "complete",
                            "session_id": session_id
                        })

                    except ValueError as e:
                        await manager.send_message(session_id, {
                            "type": "error",
                            "message": f"LLM configuration error: {str(e)}"
                        })
                    except Exception as e:
                        await manager.send_message(session_id, {
                            "type": "error",
                            "message": f"LLM request failed: {str(e)}"
                        })

                elif data.get("type") == "ping":
                    await manager.send_message(session_id, {
                        "type": "pong",
                        "session_id": session_id
                    })

            except json.JSONDecodeError:
                await manager.send_message(session_id, {
                    "type": "error",
                    "message": "Invalid JSON format"
                })

            except WebSocketDisconnect:
                logger.info("WebSocket disconnected by client", session_id=session_id)
                break

    except Exception as e:
        logger.error("WebSocket error", session_id=session_id, error=str(e))

    finally:
        if session_id:
            manager.disconnect(session_id)
`;
  }

  private generateAPIModelsPy(): string {
    return `"""
API Models

Auto-generated from OpenClaw
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Chat request model."""
    message: str = Field(..., description="User message", min_length=1)
    session_id: Optional[str] = Field(None, description="Session identifier")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")


class ChatResponse(BaseModel):
    """Chat response model."""
    response: str = Field(..., description="Agent response")
    session_id: str = Field(..., description="Session identifier")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Response metadata")


class SessionInfo(BaseModel):
    """Session information model."""
    session_id: str
    message_count: int
    created_at: str
    last_active: str
`;
  }

  private generateAPIErrorsPy(): string {
    return `"""
API Error Handling

Auto-generated from OpenClaw
"""

from fastapi import HTTPException, status


class AgentServiceException(Exception):
    """Base exception for agent service."""
    pass


class LLMProviderError(AgentServiceException):
    """LLM provider error."""
    pass


class MemoryError(AgentServiceException):
    """Memory management error."""
    pass


def raise_not_found(message: str = "Resource not found"):
    """Raise 404 error."""
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=message
    )


def raise_bad_request(message: str):
    """Raise 400 error."""
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=message
    )


def raise_internal_error(message: str = "Internal server error"):
    """Raise 500 error."""
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=message
    )
`;
  }

  private generateSkillToolPy(skill: SkillConfig): string {
    return `"""${skill.name} skill."""\n\n# TODO: Implement\n`;
  }

  private generateAgentYaml(agentConfig: AgentConfig): string {
    return `# Agent configuration\n# TODO: Implement\n`;
  }

  private generateLLMYaml(llmConfig: LLMProviderConfig[]): string {
    const provider = llmConfig[0] || { id: 'openai', type: 'openai', defaultModel: 'gpt-4', baseUrl: null };

    return `# LLM Configuration
# Auto-generated from OpenClaw

provider_id: "${provider.id}"
model: "${provider.defaultModel}"
base_url: ${provider.baseUrl ? `"${provider.baseUrl}"` : 'null'}
temperature: 0.7
max_tokens: 4096

# Model information
${provider.models && provider.models.length > 0 ? `available_models:
${provider.models.map(m => `  - id: "${m.id}"
    name: "${m.name}"
    context_window: ${m.contextWindow}
    max_tokens: ${m.maxTokens}`).join('\n')}` : 'available_models: []'}
`;
  }

  private generateApiYaml(options: ExportOptions): string {
    return `# API configuration\nport: ${options.port ?? 8000}\n`;
  }

  private generateDockerfile(): string {
    return `FROM python:3.11-slim\n\n# TODO: Implement\n`;
  }

  private generateDockerfileProd(): string {
    return `FROM python:3.11-slim\n\n# TODO: Implement production version\n`;
  }

  private generateDockerignore(): string {
    return `**/__pycache__\n**/*.pyc\n**/*.pyo\n**/*.pyd\n.git\n.gitignore\n.env\nvenv/\n`;
  }

  private generateDockerComposeYml(options: ExportOptions): string {
    const port = options.port ?? 8000;
    return `version: '3.8'\nservices:\n  agent:\n    build: .\n    ports:\n      - "${port}:${port}"\n`;
  }

  private generateReadmeMd(options: ExportOptions, llmConfig?: LLMProviderConfig[]): string {
    const provider = llmConfig?.[0];
    const providerName = provider?.name || provider?.id || 'OpenAI';
    const modelName = provider?.defaultModel || 'gpt-4';
    const apiKeyEnv = provider ? getApiKeyEnvVar(provider.id) : 'OPENAI_API_KEY';
    const port = options.port ?? 8000;

    return `# Agent Service

Production-ready agent service exported from OpenClaw.

## Configuration

- **Provider:** ${providerName}
- **Model:** ${modelName}
${provider?.baseUrl ? `- **Base URL:** ${provider.baseUrl}` : ''}

## Quick Start

### 1. Install Dependencies

\`\`\`bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
\`\`\`

### 2. Configure API Key

\`\`\`bash
cp .env.example .env
\`\`\`

Edit \`.env\` and set your API key:

\`\`\`
${apiKeyEnv}=your-actual-api-key-here
\`\`\`

### 3. Run the Service

\`\`\`bash
source venv/bin/activate  # if not already activated
python main.py
\`\`\`

The service will start on http://localhost:${port}

## API Endpoints

### Health Check

\`\`\`bash
curl http://localhost:${port}/health
\`\`\`

### Chat (REST)

\`\`\`bash
curl -X POST http://localhost:${port}/api/v1/chat \\
  -H 'Content-Type: application/json' \\
  -d '{"message": "Hello, how are you?"}'
\`\`\`

### Chat (WebSocket)

\`\`\`python
import websockets
import json
import asyncio

async def chat():
    async with websockets.connect('ws://localhost:${port}/ws') as ws:
        await ws.send(json.dumps({
            'type': 'message',
            'content': 'Hello!'
        }))
        response = await ws.recv()
        print(json.loads(response))

asyncio.run(chat())
\`\`\`

## Session Management

Sessions are automatically created and maintained. To continue a conversation:

\`\`\`bash
curl -X POST http://localhost:${port}/api/v1/chat \\
  -H 'Content-Type: application/json' \\
  -d '{"message": "Follow up question", "session_id": "your-session-id"}'
\`\`\`

## Docker

Build and run with Docker:

\`\`\`bash
docker build -f docker/Dockerfile -t agent-service .
docker run -p ${port}:${port} -e ${apiKeyEnv}=your-key agent-service
\`\`\`

## Architecture

\`\`\`
.
├── main.py              # FastAPI application entry point
├── config.py            # Configuration loader
├── agent/
│   ├── prompts.py       # System prompts (SOUL.md, USER.md, AGENTS.md)
│   └── memory.py        # Memory management
├── llm/
│   └── providers.py     # LLM client with provider configuration
├── api/
│   ├── rest.py          # REST API endpoints
│   ├── websocket.py     # WebSocket handler
│   └── models.py        # Pydantic models
├── config/
│   ├── agent.yaml       # Agent configuration
│   ├── llm.yaml         # LLM configuration
│   └── api.yaml         # API configuration
└── memory/
    ├── long_term.md     # Long-term memory
    └── daily/           # Daily memory files
\`\`\`

## License

Generated by OpenClaw Agent Exporter
`;
  }
}
