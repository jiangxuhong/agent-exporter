/**
 * Skill Converter
 *
 * Converts OpenClaw skills to framework-specific format
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'yaml';
import type { SkillConfig, Framework } from '../types.js';

export class SkillConverter {
  /**
   * Convert OpenClaw skill to framework-specific format
   */
  async convertSkill(
    skillPath: string,
    framework: Framework
  ): Promise<SkillConfig> {
    // Read SKILL.md
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    const content = await fs.readFile(skillMdPath, 'utf-8');

    // Parse frontmatter and content
    const { frontmatter, body } = this.parseFrontmatter(content);

    const skillConfig: SkillConfig = {
      name: frontmatter.name || path.basename(skillPath),
      description: frontmatter.description || '',
      content: body,
      path: skillPath,
    };

    return skillConfig;
  }

  /**
   * Convert all skills from workspace and global skills directory
   */
  async convertAllSkills(
    workspacePath: string,
    framework: Framework
  ): Promise<SkillConfig[]> {
    const skills: SkillConfig[] = [];

    // Convert workspace skills
    const workspaceSkillsDir = path.join(workspacePath, 'skills');
    const workspaceSkills = await this.convertSkillsFromDir(workspaceSkillsDir, framework);
    skills.push(...workspaceSkills);

    // Convert global skills
    const globalSkillsDir = path.join(process.env.HOME || '', '.agents', 'skills');
    const globalSkills = await this.convertSkillsFromDir(globalSkillsDir, framework);
    skills.push(...globalSkills);

    return skills;
  }

  /**
   * Convert skills from a directory
   */
  private async convertSkillsFromDir(
    skillsDir: string,
    framework: Framework
  ): Promise<SkillConfig[]> {
    try {
      const entries = await fs.readdir(skillsDir, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory());

      const results = await Promise.all(
        dirs.map(async (entry) => {
          try {
            return await this.convertSkill(path.join(skillsDir, entry.name), framework);
          } catch {
            return null;
          }
        })
      );

      return results.filter((s): s is SkillConfig => s !== null);
    } catch {
      return [];
    }
  }

  /**
   * Parse YAML frontmatter from markdown content
   */
  private parseFrontmatter(content: string): { frontmatter: any; body: string } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (match) {
      try {
        const frontmatter = yaml.parse(match[1]);
        const body = match[2];
        return { frontmatter, body };
      } catch (error) {
        console.warn('Failed to parse frontmatter, using defaults');
      }
    }

    return {
      frontmatter: {},
      body: content,
    };
  }

  /**
   * Generate LangChain tool code from skill config
   */
  generateLangChainTool(skill: SkillConfig): string {
    return `"""
${skill.name} - ${skill.description}

Auto-generated from OpenClaw skill
"""

from langchain.tools import Tool
from typing import Optional


def ${this.toFunctionName(skill.name)}(input: str) -> str:
    """
    ${skill.description}

    Args:
        input: Input to process

    Returns:
        Processed result
    """
    # Skill implementation based on:
    # ${skill.content}
    # TODO: Implement skill logic
    return f"Skill ${skill.name} executed with input: {input}"


# LangChain Tool wrapper
${this.toFunctionName(skill.name)}_tool = Tool(
    name="${skill.name}",
    description="${skill.description}",
    func=${this.toFunctionName(skill.name)}
)
`;
  }

  /**
   * Generate CrewAI tool code from skill config
   */
  generateCrewAITool(skill: SkillConfig): string {
    return `"""
${skill.name} - ${skill.description}

Auto-generated from OpenClaw skill
"""

from crewai_tools import tool
from typing import Optional


@tool("${skill.name}")
def ${this.toFunctionName(skill.name)}(input: str) -> str:
    """
    ${skill.description}

    Args:
        input: Input to process

    Returns:
        Processed result
    """
    # Skill implementation based on:
    # ${skill.content}
    # TODO: Implement skill logic
    return f"Skill ${skill.name} executed with input: {input}"
`;
  }

  /**
   * Convert skill name to valid Python function name
   */
  private toFunctionName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }
}
