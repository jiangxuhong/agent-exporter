/**
 * Type definitions for Agent Exporter
 */

import { z } from 'zod';

// Framework options
export const FrameworkSchema = z.enum(['langchain', 'langgraph', 'crewai', 'langchain4j', 'spring-ai']);
export type Framework = z.infer<typeof FrameworkSchema>;

// Language options
export const LanguageSchema = z.enum(['python', 'java']);
export type Language = z.infer<typeof LanguageSchema>;

// API types
export const ApiTypeSchema = z.enum(['rest', 'websocket']);
export type ApiType = z.infer<typeof ApiTypeSchema>;

// Test types
export const TestTypeSchema = z.enum(['unit', 'integration', 'e2e', 'performance', 'security', 'all']);
export type TestType = z.infer<typeof TestTypeSchema>;

// Export options
export const ExportOptionsSchema = z.object({
  framework: FrameworkSchema,
  language: LanguageSchema,
  output: z.string(),
  name: z.string().optional(),
  includeMemory: z.boolean().default(true),
  includeSkills: z.boolean().default(true),
  skills: z.array(z.string()).optional(),
  apiTypes: z.array(ApiTypeSchema).default(['rest', 'websocket']),
  port: z.number().default(8000),
  withTests: z.boolean().default(true),
  testCoverageThreshold: z.number().default(80),
  validate: z.boolean().default(true),
  runTests: z.boolean().default(false),
  withDockerfile: z.boolean().default(true),
  withKubernetes: z.boolean().default(false),
  withMonitoring: z.boolean().default(false),
  overwrite: z.boolean().default(false),
  dryRun: z.boolean().default(false),
  verbose: z.boolean().default(false),
});
export type ExportOptions = z.infer<typeof ExportOptionsSchema>;

// Agent configuration
export const AgentConfigSchema = z.object({
  agentsMd: z.string(),
  soulMd: z.string().optional(),
  userMd: z.string().optional(),
  memoryMd: z.string().optional(),
  identityMd: z.string().optional(),
  toolsMd: z.string().optional(),
  dailyMemory: z.record(z.string(), z.string()).optional(),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Skill configuration
export const SkillConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  content: z.string(),
  path: z.string(),
});
export type SkillConfig = z.infer<typeof SkillConfigSchema>;

// LLM Provider configuration
export const LLMProviderConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['openai', 'anthropic', 'google', 'azure', 'custom']),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  defaultModel: z.string(),
  models: z.array(z.object({
    id: z.string(),
    name: z.string(),
    contextWindow: z.number(),
    maxTokens: z.number(),
  })),
});
export type LLMProviderConfig = z.infer<typeof LLMProviderConfigSchema>;

// Validation result
export const ValidationResultSchema = z.object({
  success: z.boolean(),
  errors: z.array(z.object({
    type: z.string(),
    message: z.string(),
    file: z.string().optional(),
    line: z.number().optional(),
  })),
  warnings: z.array(z.object({
    type: z.string(),
    message: z.string(),
    file: z.string().optional(),
  })),
  metrics: z.object({
    testCoverage: z.number().optional(),
    lintErrors: z.number().optional(),
    securityIssues: z.number().optional(),
  }),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// Export result
export const ExportResultSchema = z.object({
  success: z.boolean(),
  outputDir: z.string(),
  filesGenerated: z.number(),
  validation: ValidationResultSchema.optional(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});
export type ExportResult = z.infer<typeof ExportResultSchema>;
