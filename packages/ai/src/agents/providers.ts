/**
 * AI Providers - Unified interface for different AI providers
 * 
 * Supports:
 * - OpenAI (GPT-4, GPT-3.5)
 * - Anthropic (Claude)
 * - Mock (for testing)
 */

import type { ModelConfig, ToolCall } from '@framework/core/types';
import { getConfig } from '@framework/config/env';
import { createLogger } from '@framework/config/logger';
import { AIProviderError } from '@framework/core/errors';

const logger = createLogger('ai-providers');

// =============================================================================
// TYPES
// =============================================================================

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  tools?: AIToolDefinition[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
}

export interface AIResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
}

export interface AIClient {
  complete(request: AICompletionRequest): Promise<AIResponse>;
  completeStream(request: AICompletionRequest): AsyncGenerator<string, AIResponse>;
}

// =============================================================================
// OPENAI PROVIDER
// =============================================================================

class OpenAIClient implements AIClient {
  private client: any; // OpenAI client
  private model: string;
  
  constructor(config: ModelConfig) {
    this.model = config.model;
  }
  
  private async getClient() {
    if (!this.client) {
      const { default: OpenAI } = await import('openai');
      const config = getConfig();
      
      this.client = new OpenAI({
        apiKey: config.ai.openai.apiKey,
        organization: config.ai.openai.orgId,
      });
    }
    return this.client;
  }
  
  async complete(request: AICompletionRequest): Promise<AIResponse> {
    const client = await this.getClient();
    
    try {
      const response = await client.chat.completions.create({
        model: this.model,
        messages: this.formatMessages(request.messages),
        tools: request.tools ? this.formatTools(request.tools) : undefined,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        top_p: request.topP,
        stop: request.stop,
      });
      
      const choice = response.choices[0];
      
      return {
        content: choice.message.content || '',
        toolCalls: choice.message.tool_calls?.map((tc: any) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        })),
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
        },
        finishReason: this.mapFinishReason(choice.finish_reason),
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'OpenAI API error');
      throw new AIProviderError('OpenAI', error.message);
    }
  }
  
  async *completeStream(request: AICompletionRequest): AsyncGenerator<string, AIResponse> {
    const client = await this.getClient();
    
    const stream = await client.chat.completions.create({
      model: this.model,
      messages: this.formatMessages(request.messages),
      tools: request.tools ? this.formatTools(request.tools) : undefined,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      stream: true,
    });
    
    let content = '';
    let usage = { inputTokens: 0, outputTokens: 0 };
    
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      content += delta;
      yield delta;
    }
    
    return {
      content,
      usage,
      finishReason: 'stop',
    };
  }
  
  private formatMessages(messages: AIMessage[]) {
    return messages.map(msg => {
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          content: msg.content,
          tool_call_id: msg.toolCallId,
        };
      }
      
      if (msg.toolCalls) {
        return {
          role: msg.role,
          content: msg.content,
          tool_calls: msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        };
      }
      
      return {
        role: msg.role,
        content: msg.content,
      };
    });
  }
  
  private formatTools(tools: AIToolDefinition[]) {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }
  
  private mapFinishReason(reason: string): AIResponse['finishReason'] {
    switch (reason) {
      case 'stop': return 'stop';
      case 'tool_calls': return 'tool_calls';
      case 'length': return 'length';
      case 'content_filter': return 'content_filter';
      default: return 'stop';
    }
  }
}

// =============================================================================
// ANTHROPIC PROVIDER
// =============================================================================

class AnthropicClient implements AIClient {
  private client: any; // Anthropic client
  private model: string;
  
  constructor(config: ModelConfig) {
    this.model = config.model;
  }
  
  private async getClient() {
    if (!this.client) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const config = getConfig();
      
      this.client = new Anthropic({
        apiKey: config.ai.anthropic.apiKey,
      });
    }
    return this.client;
  }
  
  async complete(request: AICompletionRequest): Promise<AIResponse> {
    const client = await this.getClient();
    
    try {
      // Extract system message
      const systemMessage = request.messages.find(m => m.role === 'system');
      const otherMessages = request.messages.filter(m => m.role !== 'system');
      
      const response = await client.messages.create({
        model: this.model,
        system: systemMessage?.content,
        messages: this.formatMessages(otherMessages),
        tools: request.tools ? this.formatTools(request.tools) : undefined,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature,
        top_p: request.topP,
        stop_sequences: request.stop,
      });
      
      // Extract content and tool calls
      let content = '';
      const toolCalls: ToolCall[] = [];
      
      for (const block of response.content) {
        if (block.type === 'text') {
          content += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            arguments: block.input as Record<string, unknown>,
          });
        }
      }
      
      return {
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
          inputTokens: response.usage?.input_tokens || 0,
          outputTokens: response.usage?.output_tokens || 0,
        },
        finishReason: this.mapStopReason(response.stop_reason),
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Anthropic API error');
      throw new AIProviderError('Anthropic', error.message);
    }
  }
  
  async *completeStream(request: AICompletionRequest): AsyncGenerator<string, AIResponse> {
    const client = await this.getClient();
    
    const systemMessage = request.messages.find(m => m.role === 'system');
    const otherMessages = request.messages.filter(m => m.role !== 'system');
    
    const stream = client.messages.stream({
      model: this.model,
      system: systemMessage?.content,
      messages: this.formatMessages(otherMessages),
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature,
    });
    
    let content = '';
    
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        content += event.delta.text;
        yield event.delta.text;
      }
    }
    
    const finalMessage = await stream.finalMessage();
    
    return {
      content,
      usage: {
        inputTokens: finalMessage.usage?.input_tokens || 0,
        outputTokens: finalMessage.usage?.output_tokens || 0,
      },
      finishReason: 'stop',
    };
  }
  
  private formatMessages(messages: AIMessage[]) {
    return messages.map(msg => {
      if (msg.role === 'tool') {
        return {
          role: 'user' as const,
          content: [{
            type: 'tool_result' as const,
            tool_use_id: msg.toolCallId,
            content: msg.content,
          }],
        };
      }
      
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        return {
          role: 'assistant' as const,
          content: [
            ...(msg.content ? [{ type: 'text' as const, text: msg.content }] : []),
            ...msg.toolCalls.map(tc => ({
              type: 'tool_use' as const,
              id: tc.id,
              name: tc.name,
              input: tc.arguments,
            })),
          ],
        };
      }
      
      return {
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      };
    });
  }
  
  private formatTools(tools: AIToolDefinition[]) {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  }
  
  private mapStopReason(reason: string): AIResponse['finishReason'] {
    switch (reason) {
      case 'end_turn': return 'stop';
      case 'tool_use': return 'tool_calls';
      case 'max_tokens': return 'length';
      default: return 'stop';
    }
  }
}

// =============================================================================
// MOCK PROVIDER (for testing)
// =============================================================================

class MockAIClient implements AIClient {
  private responses: Map<string, string> = new Map();
  
  setResponse(pattern: string, response: string): void {
    this.responses.set(pattern, response);
  }
  
  async complete(request: AICompletionRequest): Promise<AIResponse> {
    const lastUserMessage = request.messages
      .filter(m => m.role === 'user')
      .pop();
    
    const input = lastUserMessage?.content || '';
    
    // Check for matching patterns
    for (const [pattern, response] of this.responses) {
      if (input.toLowerCase().includes(pattern.toLowerCase())) {
        return {
          content: response,
          usage: { inputTokens: input.length, outputTokens: response.length },
          finishReason: 'stop',
        };
      }
    }
    
    // Default response
    return {
      content: `Mock response to: ${input.slice(0, 50)}...`,
      usage: { inputTokens: 10, outputTokens: 20 },
      finishReason: 'stop',
    };
  }
  
  async *completeStream(request: AICompletionRequest): AsyncGenerator<string, AIResponse> {
    const response = await this.complete(request);
    yield response.content;
    return response;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

const clientCache = new Map<string, AIClient>();

/**
 * Create an AI client for the given model configuration
 */
export function createAIClient(config: ModelConfig): AIClient {
  const cacheKey = `${config.provider}:${config.model}`;
  
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }
  
  let client: AIClient;
  
  // Check if we should use mock
  const appConfig = getConfig();
  if (appConfig.dev.mockAi) {
    logger.info('Using mock AI client');
    client = new MockAIClient();
  } else {
    switch (config.provider) {
      case 'openai':
        client = new OpenAIClient(config);
        break;
      case 'anthropic':
        client = new AnthropicClient(config);
        break;
      default:
        throw new Error(`Unknown AI provider: ${config.provider}`);
    }
  }
  
  clientCache.set(cacheKey, client);
  return client;
}

/**
 * Get a mock AI client for testing
 */
export function createMockAIClient(): MockAIClient {
  return new MockAIClient();
}
