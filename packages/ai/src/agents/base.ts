/**
 * Agent Base - Core agent implementation with tool support
 * 
 * Usage:
 *   import { createAgent, Agent } from '@framework/ai/agents';
 *   
 *   const agent = createAgent({
 *     id: 'my-agent',
 *     name: 'My Agent',
 *     systemPrompt: 'You are a helpful assistant.',
 *     tools: [searchTool, calculatorTool],
 *   });
 *   
 *   const response = await agent.chat('Hello!');
 */

import type { 
  Message, 
  ToolDefinition, 
  ToolCall, 
  ToolResult,
  AgentConfig,
  ModelConfig,
} from '@framework/core/types';
import { MaxIterationsError } from '@framework/core/errors';
import { generateId, now } from '@framework/core/utils';
import { createLogger, logAICompletion, logToolCall } from '@framework/config/logger';
import { createAIClient, AIClient, AIMessage } from './providers';

const logger = createLogger('agent');

// =============================================================================
// TYPES
// =============================================================================

export interface AgentOptions {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  model?: Partial<ModelConfig>;
  tools?: ToolDefinition[];
  maxIterations?: number;
  onToolCall?: (toolCall: ToolCall, result: ToolResult) => void;
  onMessage?: (message: Message) => void;
}

export interface ChatOptions {
  conversationId?: string;
  context?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResult {
  message: Message;
  toolResults: ToolResult[];
  conversationId: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface Agent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tools: ToolDefinition[];
  
  chat(input: string, options?: ChatOptions): Promise<ChatResult>;
  chatStream(input: string, options?: ChatOptions): AsyncGenerator<string, ChatResult>;
  addTool(tool: ToolDefinition): void;
  removeTool(toolName: string): void;
}

// =============================================================================
// AGENT IMPLEMENTATION
// =============================================================================

class AgentImpl implements Agent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  
  private systemPrompt: string;
  private modelConfig: ModelConfig;
  private _tools: Map<string, ToolDefinition>;
  private maxIterations: number;
  private aiClient: AIClient;
  private onToolCall?: (toolCall: ToolCall, result: ToolResult) => void;
  private onMessage?: (message: Message) => void;
  
  constructor(options: AgentOptions) {
    this.id = options.id;
    this.name = options.name;
    this.description = options.description || '';
    this.systemPrompt = options.systemPrompt;
    this.maxIterations = options.maxIterations || 10;
    this.onToolCall = options.onToolCall;
    this.onMessage = options.onMessage;
    
    // Set up tools
    this._tools = new Map();
    for (const tool of options.tools || []) {
      this._tools.set(tool.name, tool);
    }
    
    // Set up model config with defaults
    this.modelConfig = {
      provider: options.model?.provider || 'anthropic',
      model: options.model?.model || 'claude-3-5-sonnet-20241022',
      temperature: options.model?.temperature ?? 0.7,
      maxTokens: options.model?.maxTokens,
      topP: options.model?.topP,
    };
    
    // Create AI client
    this.aiClient = createAIClient(this.modelConfig);
    
    logger.debug({ agentId: this.id, tools: Array.from(this._tools.keys()) }, 'Agent initialized');
  }
  
  get tools(): ToolDefinition[] {
    return Array.from(this._tools.values());
  }
  
  addTool(tool: ToolDefinition): void {
    this._tools.set(tool.name, tool);
    logger.debug({ agentId: this.id, tool: tool.name }, 'Tool added to agent');
  }
  
  removeTool(toolName: string): void {
    this._tools.delete(toolName);
    logger.debug({ agentId: this.id, tool: toolName }, 'Tool removed from agent');
  }
  
  async chat(input: string, options: ChatOptions = {}): Promise<ChatResult> {
    const conversationId = options.conversationId || generateId();
    const startTime = Date.now();
    
    logger.debug({ agentId: this.id, conversationId, inputLength: input.length }, 'Starting chat');
    
    // Build messages
    const messages: AIMessage[] = [
      { role: 'system', content: this.buildSystemPrompt(options.context) },
      { role: 'user', content: input },
    ];
    
    // Prepare tools for the AI client
    const toolDefinitions = this.tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
    
    let iteration = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const allToolResults: ToolResult[] = [];
    
    // Agent loop - continues until no more tool calls
    while (iteration < this.maxIterations) {
      iteration++;
      
      const response = await this.aiClient.complete({
        messages,
        tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
        maxTokens: options.maxTokens || this.modelConfig.maxTokens,
        temperature: options.temperature ?? this.modelConfig.temperature,
      });
      
      totalInputTokens += response.usage.inputTokens;
      totalOutputTokens += response.usage.outputTokens;
      
      // Log the completion
      logAICompletion(logger, {
        agentId: this.id,
        conversationId,
        model: this.modelConfig.model,
        provider: this.modelConfig.provider,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        durationMs: Date.now() - startTime,
        success: true,
      });
      
      // If no tool calls, we're done
      if (!response.toolCalls || response.toolCalls.length === 0) {
        const message: Message = {
          role: 'assistant',
          content: response.content,
          metadata: {
            timestamp: now(),
            model: this.modelConfig.model,
            tokens: { input: totalInputTokens, output: totalOutputTokens },
          },
        };
        
        this.onMessage?.(message);
        
        return {
          message,
          toolResults: allToolResults,
          conversationId,
          usage: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            totalTokens: totalInputTokens + totalOutputTokens,
          },
        };
      }
      
      // Execute tool calls
      const toolResults = await this.executeToolCalls(response.toolCalls, conversationId);
      allToolResults.push(...toolResults);
      
      // Add assistant message with tool calls to history
      messages.push({
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls,
      });
      
      // Add tool results to history
      for (const result of toolResults) {
        messages.push({
          role: 'tool',
          content: JSON.stringify(result.result),
          toolCallId: result.toolCallId,
        });
      }
    }
    
    // Max iterations reached
    throw new MaxIterationsError(this.id, this.maxIterations);
  }
  
  async *chatStream(input: string, options: ChatOptions = {}): AsyncGenerator<string, ChatResult> {
    // For now, just yield the full response
    // In a full implementation, this would use streaming APIs
    const result = await this.chat(input, options);
    yield result.message.content;
    return result;
  }
  
  private buildSystemPrompt(context?: Record<string, unknown>): string {
    let prompt = this.systemPrompt;
    
    if (context) {
      prompt += '\n\n## Current Context\n';
      for (const [key, value] of Object.entries(context)) {
        prompt += `- ${key}: ${JSON.stringify(value)}\n`;
      }
    }
    
    return prompt;
  }
  
  private async executeToolCalls(
    toolCalls: ToolCall[],
    conversationId: string
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    
    for (const toolCall of toolCalls) {
      const startTime = Date.now();
      const tool = this._tools.get(toolCall.name);
      
      if (!tool) {
        const result: ToolResult = {
          toolCallId: toolCall.id,
          result: null,
          error: `Unknown tool: ${toolCall.name}`,
        };
        results.push(result);
        
        logToolCall(logger, {
          agentId: this.id,
          conversationId,
          toolName: toolCall.name,
          durationMs: Date.now() - startTime,
          success: false,
          error: result.error,
        });
        
        continue;
      }
      
      try {
        const toolResult = await tool.execute(toolCall.arguments);
        const result: ToolResult = {
          toolCallId: toolCall.id,
          result: toolResult,
        };
        
        results.push(result);
        this.onToolCall?.(toolCall, result);
        
        logToolCall(logger, {
          agentId: this.id,
          conversationId,
          toolName: toolCall.name,
          durationMs: Date.now() - startTime,
          success: true,
        });
      } catch (error: any) {
        const result: ToolResult = {
          toolCallId: toolCall.id,
          result: null,
          error: error.message,
        };
        
        results.push(result);
        
        logToolCall(logger, {
          agentId: this.id,
          conversationId,
          toolName: toolCall.name,
          durationMs: Date.now() - startTime,
          success: false,
          error: error.message,
        });
      }
    }
    
    return results;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a new agent instance
 */
export function createAgent(options: AgentOptions): Agent {
  return new AgentImpl(options);
}

/**
 * Create an agent from a config object
 */
export function createAgentFromConfig(config: AgentConfig): Agent {
  return new AgentImpl({
    id: config.id,
    name: config.name,
    description: config.description,
    systemPrompt: config.systemPrompt,
    model: config.model,
    tools: config.tools,
    maxIterations: config.maxIterations,
  });
}
