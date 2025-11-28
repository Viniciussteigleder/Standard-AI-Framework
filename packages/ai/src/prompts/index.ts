/**
 * Prompts Module - System prompts, templates, and prompt engineering utilities
 * 
 * Usage:
 *   import { createPrompt, systemPrompts } from '@framework/ai/prompts';
 *   
 *   const prompt = createPrompt(systemPrompts.assistant, {
 *     name: 'My Assistant',
 *     expertise: ['coding', 'data analysis'],
 *   });
 */

// =============================================================================
// PROMPT TEMPLATES
// =============================================================================

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
}

/**
 * Create a prompt from a template and variables
 */
export function createPrompt(
  template: string | PromptTemplate,
  variables: Record<string, unknown> = {}
): string {
  const templateStr = typeof template === 'string' ? template : template.template;
  
  let result = templateStr;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    const valueStr = Array.isArray(value) 
      ? value.map(v => `- ${v}`).join('\n')
      : String(value);
    result = result.replace(new RegExp(placeholder, 'g'), valueStr);
  }
  
  // Remove any unused placeholders
  result = result.replace(/\{\{[^}]+\}\}/g, '');
  
  return result.trim();
}

// =============================================================================
// BUILT-IN SYSTEM PROMPTS
// =============================================================================

export const systemPrompts = {
  /**
   * General-purpose assistant
   */
  assistant: `You are {{name}}, a helpful AI assistant.

Your expertise includes:
{{expertise}}

Guidelines:
- Be concise and direct
- Provide accurate information
- Ask clarifying questions when needed
- Admit when you don't know something`,

  /**
   * Coding assistant
   */
  coder: `You are {{name}}, an expert software engineer and coding assistant.

Your specialties:
{{languages}}

Guidelines:
- Write clean, well-documented code
- Follow best practices and design patterns
- Explain your reasoning when helpful
- Consider edge cases and error handling
- Suggest tests when appropriate`,

  /**
   * Data analyst
   */
  analyst: `You are {{name}}, a data analysis expert.

Your capabilities:
- Statistical analysis
- Data visualization recommendations
- Pattern recognition
- Report generation

Guidelines:
- Be precise with numbers and statistics
- Explain your methodology
- Highlight key insights
- Acknowledge limitations in the data`,

  /**
   * Task-focused agent
   */
  taskAgent: `You are {{name}}, a focused task execution agent.

Your goal: {{goal}}

Available tools:
{{tools}}

Guidelines:
- Focus on completing the assigned task
- Use tools efficiently
- Report progress and results clearly
- Handle errors gracefully`,

  /**
   * RAG-powered Q&A
   */
  ragAssistant: `You are {{name}}, an AI assistant that answers questions based on provided context.

CONTEXT:
{{context}}

Guidelines:
- Answer based ONLY on the provided context
- If the answer isn't in the context, say so
- Quote relevant parts when helpful
- Be concise and accurate`,

  /**
   * Multi-agent coordinator
   */
  coordinator: `You are {{name}}, an agent coordinator.

Your role is to:
1. Analyze incoming requests
2. Break them into sub-tasks
3. Delegate to appropriate agents
4. Synthesize results

Available agents:
{{agents}}

Guidelines:
- Delegate efficiently
- Monitor progress
- Handle failures gracefully
- Provide unified responses`,
};

// =============================================================================
// PROMPT BUILDERS
// =============================================================================

export class PromptBuilder {
  private sections: string[] = [];
  
  addSection(title: string, content: string): this {
    this.sections.push(`## ${title}\n\n${content}`);
    return this;
  }
  
  addList(title: string, items: string[]): this {
    const content = items.map(item => `- ${item}`).join('\n');
    return this.addSection(title, content);
  }
  
  addContext(context: Record<string, unknown>): this {
    const content = Object.entries(context)
      .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
      .join('\n');
    return this.addSection('Context', content);
  }
  
  addGuidelines(guidelines: string[]): this {
    return this.addList('Guidelines', guidelines);
  }
  
  addConstraints(constraints: string[]): this {
    return this.addList('Constraints', constraints);
  }
  
  addExamples(examples: Array<{ input: string; output: string }>): this {
    const content = examples
      .map((ex, i) => `### Example ${i + 1}\n\nInput: ${ex.input}\n\nOutput: ${ex.output}`)
      .join('\n\n');
    return this.addSection('Examples', content);
  }
  
  build(): string {
    return this.sections.join('\n\n');
  }
}

/**
 * Create a new prompt builder
 */
export function promptBuilder(): PromptBuilder {
  return new PromptBuilder();
}

// =============================================================================
// PROMPT UTILITIES
// =============================================================================

/**
 * Count approximate tokens in a string (rough estimate)
 * For accurate counts, use the tiktoken library
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token on average
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within a token limit
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedChars = maxTokens * 4;
  
  if (text.length <= estimatedChars) {
    return text;
  }
  
  return text.slice(0, estimatedChars - 3) + '...';
}

/**
 * Format context for RAG
 */
export function formatContext(documents: Array<{ content: string; source?: string }>): string {
  return documents
    .map((doc, i) => {
      const source = doc.source ? ` (Source: ${doc.source})` : '';
      return `[Document ${i + 1}]${source}\n${doc.content}`;
    })
    .join('\n\n---\n\n');
}

/**
 * Create a structured output prompt addition
 */
export function structuredOutputPrompt(schema: Record<string, unknown>): string {
  return `
Respond with valid JSON matching this schema:
\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`

Important:
- Return ONLY valid JSON, no additional text
- Follow the schema exactly
- Use null for missing optional fields`;
}

// =============================================================================
// PROMPT LIBRARY
// =============================================================================

const promptLibrary = new Map<string, PromptTemplate>();

/**
 * Register a prompt template
 */
export function registerPrompt(template: PromptTemplate): void {
  promptLibrary.set(template.id, template);
}

/**
 * Get a prompt template by ID
 */
export function getPrompt(id: string): PromptTemplate | undefined {
  return promptLibrary.get(id);
}

/**
 * List all registered prompts
 */
export function listPrompts(): PromptTemplate[] {
  return Array.from(promptLibrary.values());
}

// Register built-in prompts
registerPrompt({
  id: 'assistant',
  name: 'General Assistant',
  description: 'A helpful general-purpose AI assistant',
  template: systemPrompts.assistant,
  variables: ['name', 'expertise'],
});

registerPrompt({
  id: 'coder',
  name: 'Coding Assistant',
  description: 'An expert software engineering assistant',
  template: systemPrompts.coder,
  variables: ['name', 'languages'],
});

registerPrompt({
  id: 'analyst',
  name: 'Data Analyst',
  description: 'A data analysis expert',
  template: systemPrompts.analyst,
  variables: ['name'],
});
