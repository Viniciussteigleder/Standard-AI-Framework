/**
 * Tools Module - Tool definitions and utilities for agents
 * 
 * Usage:
 *   import { createTool, webSearchTool } from '@framework/ai/tools';
 *   
 *   const myTool = createTool({
 *     name: 'my_tool',
 *     description: 'Does something useful',
 *     parameters: {
 *       type: 'object',
 *       properties: { query: { type: 'string' } },
 *       required: ['query'],
 *     },
 *     execute: async (args) => {
 *       return `Result for ${args.query}`;
 *     },
 *   });
 */

import type { ToolDefinition, ToolCall, ToolResult } from '@framework/core/types';
import { createLogger } from '@framework/config/logger';

const logger = createLogger('tools');

// =============================================================================
// TOOL CREATION
// =============================================================================

export interface ToolOptions<TArgs = Record<string, unknown>, TResult = unknown> {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  execute: (args: TArgs) => Promise<TResult>;
  validate?: (args: unknown) => TArgs;
  timeout?: number;
}

/**
 * Create a typed tool definition
 */
export function createTool<TArgs = Record<string, unknown>, TResult = unknown>(
  options: ToolOptions<TArgs, TResult>
): ToolDefinition {
  const { name, description, parameters, execute, validate, timeout = 30000 } = options;
  
  return {
    name,
    description,
    parameters,
    execute: async (rawArgs: Record<string, unknown>): Promise<TResult> => {
      const startTime = Date.now();
      
      try {
        // Validate arguments if validator provided
        const args = validate ? validate(rawArgs) : (rawArgs as TArgs);
        
        // Execute with timeout
        const result = await Promise.race([
          execute(args),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`Tool '${name}' timed out after ${timeout}ms`)), timeout)
          ),
        ]);
        
        logger.debug({ 
          tool: name, 
          durationMs: Date.now() - startTime 
        }, 'Tool executed successfully');
        
        return result;
      } catch (error: any) {
        logger.error({ 
          tool: name, 
          error: error.message,
          durationMs: Date.now() - startTime 
        }, 'Tool execution failed');
        throw error;
      }
    },
  };
}

// =============================================================================
// BUILT-IN TOOLS
// =============================================================================

/**
 * Calculator tool - performs mathematical calculations
 */
export const calculatorTool = createTool<{ expression: string }, number>({
  name: 'calculator',
  description: 'Evaluates mathematical expressions. Use for any calculations.',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate (e.g., "2 + 2 * 3")',
      },
    },
    required: ['expression'],
  },
  execute: async ({ expression }) => {
    // Safe math evaluation (using Function instead of eval for slightly better safety)
    // In production, use a proper math parser like mathjs
    const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
    const result = new Function(`return ${sanitized}`)();
    
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error(`Invalid result: ${result}`);
    }
    
    return result;
  },
});

/**
 * Current time tool
 */
export const currentTimeTool = createTool<{ timezone?: string }, string>({
  name: 'current_time',
  description: 'Gets the current date and time.',
  parameters: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'Optional timezone (e.g., "America/New_York", "Europe/London")',
      },
    },
  },
  execute: async ({ timezone }) => {
    const options: Intl.DateTimeFormatOptions = {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: timezone || undefined,
    };
    
    return new Date().toLocaleString('en-US', options);
  },
});

/**
 * JSON parser tool
 */
export const jsonParseTool = createTool<{ json: string }, unknown>({
  name: 'json_parse',
  description: 'Parses a JSON string and returns the structured data.',
  parameters: {
    type: 'object',
    properties: {
      json: {
        type: 'string',
        description: 'The JSON string to parse',
      },
    },
    required: ['json'],
  },
  execute: async ({ json }) => {
    return JSON.parse(json);
  },
});

/**
 * Wait/delay tool
 */
export const waitTool = createTool<{ seconds: number }, string>({
  name: 'wait',
  description: 'Waits for a specified number of seconds.',
  parameters: {
    type: 'object',
    properties: {
      seconds: {
        type: 'number',
        description: 'Number of seconds to wait (max 30)',
        maximum: 30,
      },
    },
    required: ['seconds'],
  },
  execute: async ({ seconds }) => {
    const waitTime = Math.min(seconds, 30);
    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    return `Waited ${waitTime} seconds`;
  },
});

// =============================================================================
// TOOL UTILITIES
// =============================================================================

/**
 * Combine multiple tools into a single array
 */
export function combineTools(...tools: ToolDefinition[]): ToolDefinition[] {
  // Check for duplicate names
  const names = new Set<string>();
  for (const tool of tools) {
    if (names.has(tool.name)) {
      throw new Error(`Duplicate tool name: ${tool.name}`);
    }
    names.add(tool.name);
  }
  return tools;
}

/**
 * Create a tool registry for dynamic tool management
 */
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      logger.warn({ tool: tool.name }, 'Overwriting existing tool');
    }
    this.tools.set(tool.name, tool);
  }
  
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }
  
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }
  
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
  
  has(name: string): boolean {
    return this.tools.has(name);
  }
  
  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const tool = this.get(toolCall.name);
    
    if (!tool) {
      return {
        toolCallId: toolCall.id,
        result: null,
        error: `Unknown tool: ${toolCall.name}`,
      };
    }
    
    try {
      const result = await tool.execute(toolCall.arguments);
      return {
        toolCallId: toolCall.id,
        result,
      };
    } catch (error: any) {
      return {
        toolCallId: toolCall.id,
        result: null,
        error: error.message,
      };
    }
  }
}

/**
 * Create a default tool registry with common tools
 */
export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(calculatorTool);
  registry.register(currentTimeTool);
  registry.register(jsonParseTool);
  registry.register(waitTool);
  return registry;
}
