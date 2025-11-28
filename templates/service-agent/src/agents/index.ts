/**
 * Agent Initialization
 * 
 * Define and initialize all agents for this service.
 */

import { createAgent, Agent } from '@framework/ai';
import { calculatorTool, currentTimeTool } from '@framework/ai/tools';
import { createPrompt, systemPrompts } from '@framework/ai/prompts';
import { getConfig } from '@framework/config';
import { createLogger } from '@framework/config/logger';

const logger = createLogger('agents');

// =============================================================================
// AGENT DEFINITIONS
// =============================================================================

/**
 * Default assistant agent
 */
function createAssistantAgent(): Agent {
  const config = getConfig();
  
  return createAgent({
    id: 'assistant',
    name: 'AI Assistant',
    description: 'A helpful general-purpose AI assistant',
    systemPrompt: createPrompt(systemPrompts.assistant, {
      name: 'AI Assistant',
      expertise: [
        'Answering questions',
        'Providing information',
        'Helping with tasks',
        'Problem solving',
      ],
    }),
    model: {
      provider: config.ai.defaultProvider,
      model: config.ai.defaultProvider === 'anthropic'
        ? config.ai.anthropic.model
        : config.ai.openai.model,
      temperature: 0.7,
    },
    tools: [calculatorTool, currentTimeTool],
    maxIterations: 10,
    onToolCall: (call, result) => {
      logger.debug({
        tool: call.name,
        success: !result.error,
      }, 'Tool executed');
    },
  });
}

/**
 * Code assistant agent
 */
function createCoderAgent(): Agent {
  const config = getConfig();
  
  return createAgent({
    id: 'coder',
    name: 'Code Assistant',
    description: 'An expert coding and software engineering assistant',
    systemPrompt: createPrompt(systemPrompts.coder, {
      name: 'Code Assistant',
      languages: [
        'TypeScript / JavaScript',
        'Python',
        'SQL',
        'Shell scripting',
        'HTML / CSS',
      ],
    }),
    model: {
      provider: config.ai.defaultProvider,
      model: config.ai.defaultProvider === 'anthropic'
        ? config.ai.anthropic.model
        : config.ai.openai.model,
      temperature: 0.3, // Lower temperature for more precise code
    },
    tools: [calculatorTool],
    maxIterations: 15,
  });
}

/**
 * Data analyst agent
 */
function createAnalystAgent(): Agent {
  const config = getConfig();
  
  return createAgent({
    id: 'analyst',
    name: 'Data Analyst',
    description: 'A data analysis and insights expert',
    systemPrompt: createPrompt(systemPrompts.analyst, {
      name: 'Data Analyst',
    }),
    model: {
      provider: config.ai.defaultProvider,
      model: config.ai.defaultProvider === 'anthropic'
        ? config.ai.anthropic.model
        : config.ai.openai.model,
      temperature: 0.5,
    },
    tools: [calculatorTool],
    maxIterations: 10,
  });
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize all agents
 * Returns a map of agent ID to agent instance
 */
export async function initializeAgents(): Promise<Map<string, Agent>> {
  const agents = new Map<string, Agent>();
  
  // Create agents
  const agentDefinitions = [
    createAssistantAgent,
    createCoderAgent,
    createAnalystAgent,
  ];
  
  for (const createFn of agentDefinitions) {
    try {
      const agent = createFn();
      agents.set(agent.id, agent);
      logger.info({ agentId: agent.id, name: agent.name }, 'Agent initialized');
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to initialize agent');
    }
  }
  
  return agents;
}

/**
 * Get a specific agent by ID
 */
export function getAgent(agents: Map<string, Agent>, id: string): Agent | undefined {
  return agents.get(id);
}

/**
 * List all available agents
 */
export function listAgents(agents: Map<string, Agent>): Array<{ id: string; name: string; description: string }> {
  return Array.from(agents.values()).map(agent => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
  }));
}
