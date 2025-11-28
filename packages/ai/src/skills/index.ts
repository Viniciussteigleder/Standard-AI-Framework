/**
 * Skills Module
 * 
 * Provides a registry for loading and managing AI skills.
 * Skills are defined in markdown files with metadata and implemented in TypeScript.
 */

import { ToolDefinition } from '@framework/core';
import { createLogger } from '@framework/config';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { parse as parseYaml } from 'yaml';

const logger = createLogger('skills');

// =============================================================================
// TYPES
// =============================================================================

export interface SkillMetadata {
  id: string;
  name: string;
  category: string;
  version: string;
  description: string;
  author?: string;
  tags?: string[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  codePath: string;
  testPath?: string;
  dependencies?: string[];
  rateLimits?: {
    maxCallsPerMinute?: number;
    maxCallsPerHour?: number;
  };
  systemPromptAddition?: string;
}

export interface Skill extends SkillMetadata {
  tool: ToolDefinition;
  markdownPath: string;
}

// =============================================================================
// SKILL REGISTRY
// =============================================================================

class SkillRegistry {
  private skills = new Map<string, Skill>();
  private loaded = false;
  
  /**
   * Load all skills from the skills directory
   */
  async loadSkills(skillsDir: string = './skills'): Promise<void> {
    if (!existsSync(skillsDir)) {
      logger.warn({ skillsDir }, 'Skills directory not found');
      return;
    }
    
    const categories = readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    
    for (const category of categories) {
      const categoryPath = join(skillsDir, category);
      const files = readdirSync(categoryPath)
        .filter(f => f.endsWith('.md'));
      
      for (const file of files) {
        try {
          const skill = await this.loadSkill(join(categoryPath, file));
          if (skill) {
            this.skills.set(skill.id, skill);
            logger.info({ skillId: skill.id, category }, 'Skill loaded');
          }
        } catch (error: any) {
          logger.error({ file, error: error.message }, 'Failed to load skill');
        }
      }
    }
    
    this.loaded = true;
    logger.info({ count: this.skills.size }, 'Skills loaded');
  }
  
  /**
   * Load a single skill from a markdown file
   */
  private async loadSkill(markdownPath: string): Promise<Skill | null> {
    const content = readFileSync(markdownPath, 'utf-8');
    
    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      logger.warn({ markdownPath }, 'No frontmatter found in skill file');
      return null;
    }
    
    const metadata = parseYaml(frontmatterMatch[1]) as SkillMetadata;
    
    if (!metadata.id || !metadata.codePath) {
      logger.warn({ markdownPath }, 'Skill missing required fields (id, codePath)');
      return null;
    }
    
    // Load the tool implementation
    try {
      const toolModule = await import(join(process.cwd(), metadata.codePath));
      const tool = toolModule.default || toolModule[`${metadata.id.replace(/-/g, '')}Tool`];
      
      if (!tool) {
        logger.warn({ markdownPath, codePath: metadata.codePath }, 'No tool export found');
        return null;
      }
      
      return {
        ...metadata,
        tool,
        markdownPath,
      };
    } catch (error: any) {
      logger.error({ codePath: metadata.codePath, error: error.message }, 'Failed to load skill implementation');
      return null;
    }
  }
  
  /**
   * Get a skill by ID
   */
  get(id: string): Skill | undefined {
    return this.skills.get(id);
  }
  
  /**
   * Get all skills
   */
  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }
  
  /**
   * Get skills by category
   */
  getByCategory(category: string): Skill[] {
    return this.getAll().filter(s => s.category === category);
  }
  
  /**
   * Get skills by tag
   */
  getByTag(tag: string): Skill[] {
    return this.getAll().filter(s => s.tags?.includes(tag));
  }
  
  /**
   * Get all tool definitions for use with agents
   */
  getTools(): ToolDefinition[] {
    return this.getAll().map(s => s.tool);
  }
  
  /**
   * Get tools for specific skill IDs
   */
  getToolsById(ids: string[]): ToolDefinition[] {
    return ids
      .map(id => this.skills.get(id)?.tool)
      .filter((t): t is ToolDefinition => t !== undefined);
  }
  
  /**
   * Get system prompt additions for skills
   */
  getSystemPromptAdditions(skillIds?: string[]): string {
    const skills = skillIds 
      ? skillIds.map(id => this.skills.get(id)).filter((s): s is Skill => s !== undefined)
      : this.getAll();
    
    return skills
      .map(s => s.systemPromptAddition)
      .filter((p): p is string => !!p)
      .join('\n\n');
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const skillRegistry = new SkillRegistry();

export async function loadSkills(skillsDir?: string): Promise<void> {
  await skillRegistry.loadSkills(skillsDir);
}

export function getSkill(id: string): Skill | undefined {
  return skillRegistry.get(id);
}

export function getAllSkills(): Skill[] {
  return skillRegistry.getAll();
}

export function getSkillTools(skillIds?: string[]): ToolDefinition[] {
  return skillIds 
    ? skillRegistry.getToolsById(skillIds)
    : skillRegistry.getTools();
}

// Re-export individual skills
export { priceCheckerTool } from './price-checker';
