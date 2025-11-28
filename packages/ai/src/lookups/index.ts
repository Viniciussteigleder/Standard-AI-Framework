/**
 * Lookups Module
 * 
 * Provides a system for loading and querying reference data from markdown files.
 * Lookups are static or semi-static data that agents can reference during execution.
 */

import { createLogger } from '@framework/config';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

const logger = createLogger('lookups');

// =============================================================================
// TYPES
// =============================================================================

export interface LookupMetadata {
  id: string;
  domain: string;
  type: 'reference' | 'rules' | 'mapping' | 'config';
  version: string;
  lastUpdated: string;
  author?: string;
  tags?: string[];
  schema?: Record<string, unknown>;
}

export interface Lookup extends LookupMetadata {
  content: string;
  structuredData?: unknown;
  filePath: string;
}

// =============================================================================
// LOOKUP REGISTRY
// =============================================================================

class LookupRegistry {
  private lookups = new Map<string, Lookup>();
  private byDomain = new Map<string, Lookup[]>();
  private byTag = new Map<string, Lookup[]>();
  
  /**
   * Load all lookups from the lookups directory
   */
  async loadLookups(lookupsDir: string = './lookups'): Promise<void> {
    if (!existsSync(lookupsDir)) {
      logger.warn({ lookupsDir }, 'Lookups directory not found');
      return;
    }
    
    const domains = readdirSync(lookupsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    
    for (const domain of domains) {
      const domainPath = join(lookupsDir, domain);
      const files = readdirSync(domainPath)
        .filter(f => f.endsWith('.md'));
      
      for (const file of files) {
        try {
          const lookup = this.loadLookup(join(domainPath, file));
          if (lookup) {
            this.register(lookup);
          }
        } catch (error: any) {
          logger.error({ file, error: error.message }, 'Failed to load lookup');
        }
      }
    }
    
    logger.info({ count: this.lookups.size }, 'Lookups loaded');
  }
  
  /**
   * Load a single lookup from a markdown file
   */
  private loadLookup(filePath: string): Lookup | null {
    const content = readFileSync(filePath, 'utf-8');
    
    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      logger.warn({ filePath }, 'No frontmatter found in lookup file');
      return null;
    }
    
    const metadata = parseYaml(frontmatterMatch[1]) as LookupMetadata;
    
    if (!metadata.id || !metadata.domain) {
      logger.warn({ filePath }, 'Lookup missing required fields (id, domain)');
      return null;
    }
    
    // Extract markdown content (after frontmatter)
    const markdownContent = content.slice(frontmatterMatch[0].length).trim();
    
    // Try to extract structured data from code blocks
    let structuredData: unknown = undefined;
    const jsonMatch = markdownContent.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        structuredData = JSON.parse(jsonMatch[1]);
      } catch {
        logger.warn({ filePath }, 'Failed to parse JSON in lookup');
      }
    }
    
    return {
      ...metadata,
      content: markdownContent,
      structuredData,
      filePath,
    };
  }
  
  /**
   * Register a lookup in all indexes
   */
  private register(lookup: Lookup): void {
    this.lookups.set(lookup.id, lookup);
    
    // Index by domain
    const domainLookups = this.byDomain.get(lookup.domain) || [];
    domainLookups.push(lookup);
    this.byDomain.set(lookup.domain, domainLookups);
    
    // Index by tags
    for (const tag of lookup.tags || []) {
      const tagLookups = this.byTag.get(tag) || [];
      tagLookups.push(lookup);
      this.byTag.set(tag, tagLookups);
    }
    
    logger.debug({ lookupId: lookup.id, domain: lookup.domain }, 'Lookup registered');
  }
  
  /**
   * Get a lookup by ID
   */
  get(id: string): Lookup | undefined {
    return this.lookups.get(id);
  }
  
  /**
   * Get all lookups
   */
  getAll(): Lookup[] {
    return Array.from(this.lookups.values());
  }
  
  /**
   * Get lookups by domain
   */
  getByDomain(domain: string): Lookup[] {
    return this.byDomain.get(domain) || [];
  }
  
  /**
   * Get lookups by tag
   */
  getByTag(tag: string): Lookup[] {
    return this.byTag.get(tag) || [];
  }
  
  /**
   * Search lookups by content
   */
  search(query: string): Lookup[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(lookup => 
      lookup.content.toLowerCase().includes(lowerQuery) ||
      lookup.id.toLowerCase().includes(lowerQuery) ||
      lookup.tags?.some(t => t.toLowerCase().includes(lowerQuery))
    );
  }
  
  /**
   * Get structured data from a lookup
   */
  getData<T = unknown>(id: string): T | undefined {
    return this.lookups.get(id)?.structuredData as T | undefined;
  }
  
  /**
   * Format lookups as context for agents
   */
  formatForContext(lookupIds: string[]): string {
    const lookups = lookupIds
      .map(id => this.lookups.get(id))
      .filter((l): l is Lookup => l !== undefined);
    
    if (lookups.length === 0) return '';
    
    return lookups.map(lookup => {
      return `## Reference: ${lookup.id}\n\n${lookup.content}`;
    }).join('\n\n---\n\n');
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const lookupRegistry = new LookupRegistry();

export async function loadLookups(lookupsDir?: string): Promise<void> {
  await lookupRegistry.loadLookups(lookupsDir);
}

export function getLookup(id: string): Lookup | undefined {
  return lookupRegistry.get(id);
}

export function getLookupData<T = unknown>(id: string): T | undefined {
  return lookupRegistry.getData<T>(id);
}

export function searchLookups(query: string): Lookup[] {
  return lookupRegistry.search(query);
}

export function formatLookupsForContext(lookupIds: string[]): string {
  return lookupRegistry.formatForContext(lookupIds);
}
