/**
 * SkillConverter Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SkillConverter } from '../src/core/skill-converter.js';
import type { SkillConfig } from '../src/types.js';

// Mock HOME to prevent reading global skills
const originalHome = process.env.HOME;

describe('SkillConverter', () => {
  let tempDir: string;
  let skillConverter: SkillConverter;
  let fakeHome: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-converter-test-'));
    fakeHome = await fs.mkdtemp(path.join(os.tmpdir(), 'fake-home-'));
    process.env.HOME = fakeHome; // Isolate from global skills
    skillConverter = new SkillConverter();
  });

  afterEach(async () => {
    process.env.HOME = originalHome;
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.rm(fakeHome, { recursive: true, force: true });
  });

  describe('convertSkill', () => {
    it('should convert a skill with frontmatter', async () => {
      const skillDir = path.join(tempDir, 'test-skill');
      await fs.mkdir(skillDir);
      await fs.writeFile(
        path.join(skillDir, 'SKILL.md'),
        `---
name: Test Skill
description: A test skill for testing
---

# Test Skill

This is the skill content.
`
      );

      const skill = await skillConverter.convertSkill(skillDir, 'langchain');

      expect(skill.name).toBe('Test Skill');
      expect(skill.description).toBe('A test skill for testing');
      expect(skill.content).toContain('# Test Skill');
    });

    it('should use directory name if no name in frontmatter', async () => {
      const skillDir = path.join(tempDir, 'my-skill');
      await fs.mkdir(skillDir);
      await fs.writeFile(
        path.join(skillDir, 'SKILL.md'),
        `---
description: A skill without name
---

Content here.`
      );

      const skill = await skillConverter.convertSkill(skillDir, 'langchain');

      expect(skill.name).toBe('my-skill');
    });

    it('should handle SKILL.md without frontmatter', async () => {
      const skillDir = path.join(tempDir, 'simple-skill');
      await fs.mkdir(skillDir);
      await fs.writeFile(
        path.join(skillDir, 'SKILL.md'),
        'Just plain content without frontmatter.'
      );

      const skill = await skillConverter.convertSkill(skillDir, 'langchain');

      expect(skill.name).toBe('simple-skill');
      expect(skill.description).toBe('');
      expect(skill.content).toBe('Just plain content without frontmatter.');
    });
  });

  describe('generateLangChainTool', () => {
    it('should generate valid LangChain tool code', () => {
      const skill: SkillConfig = {
        name: 'Weather Lookup',
        description: 'Get weather information',
        content: 'Weather skill content',
        path: '/skills/weather',
      };

      const code = skillConverter.generateLangChainTool(skill);

      expect(code).toContain('from langchain.tools import Tool');
      expect(code).toContain('def weather_lookup');
      expect(code).toContain('name="Weather Lookup"');
      expect(code).toContain('description="Get weather information"');
    });

    it('should sanitize skill names for function names', () => {
      const skill: SkillConfig = {
        name: 'My-Cool Skill!@#',
        description: 'Test',
        content: 'Content',
        path: '/test',
      };

      const code = skillConverter.generateLangChainTool(skill);

      expect(code).toContain('def my_cool_skill');
    });
  });

  describe('generateCrewAITool', () => {
    it('should generate valid CrewAI tool code', () => {
      const skill: SkillConfig = {
        name: 'Data Processor',
        description: 'Process data',
        content: 'Processor content',
        path: '/skills/processor',
      };

      const code = skillConverter.generateCrewAITool(skill);

      expect(code).toContain('from crewai_tools import tool');
      expect(code).toContain('@tool');
      expect(code).toContain('def data_processor');
    });
  });

  describe('convertAllSkills', () => {
    it('should return empty array if no skills directory', async () => {
      const skills = await skillConverter.convertAllSkills(tempDir, 'langchain');
      expect(skills).toEqual([]);
    });

    it('should convert multiple skills from workspace', async () => {
      const skillsDir = path.join(tempDir, 'skills');
      await fs.mkdir(skillsDir);

      // Create skill 1
      const skill1Dir = path.join(skillsDir, 'skill-one');
      await fs.mkdir(skill1Dir);
      await fs.writeFile(
        path.join(skill1Dir, 'SKILL.md'),
        '---\nname: Skill One\n---\nContent 1'
      );

      // Create skill 2
      const skill2Dir = path.join(skillsDir, 'skill-two');
      await fs.mkdir(skill2Dir);
      await fs.writeFile(
        path.join(skill2Dir, 'SKILL.md'),
        '---\nname: Skill Two\n---\nContent 2'
      );

      const skills = await skillConverter.convertAllSkills(tempDir, 'langchain');

      expect(skills.length).toBe(2);
      expect(skills.map(s => s.name)).toContain('Skill One');
      expect(skills.map(s => s.name)).toContain('Skill Two');
    });

    it('should skip directories without SKILL.md', async () => {
      const skillsDir = path.join(tempDir, 'skills');
      await fs.mkdir(skillsDir);

      // Valid skill
      const validDir = path.join(skillsDir, 'valid-skill');
      await fs.mkdir(validDir);
      await fs.writeFile(path.join(validDir, 'SKILL.md'), '---\nname: Valid\n---\nContent');

      // Invalid skill (no SKILL.md)
      const invalidDir = path.join(skillsDir, 'invalid-skill');
      await fs.mkdir(invalidDir);
      await fs.writeFile(path.join(invalidDir, 'other.md'), 'Not a skill');

      const skills = await skillConverter.convertAllSkills(tempDir, 'langchain');

      expect(skills.length).toBe(1);
      expect(skills[0].name).toBe('Valid');
    });
  });
});
