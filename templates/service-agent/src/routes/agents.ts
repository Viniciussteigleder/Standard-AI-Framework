/**
 * Agent Management Routes
 * 
 * Endpoints for listing and managing agents.
 */

import { FastifyPluginAsync } from 'fastify';
import { NotFoundError } from '@framework/core/errors';
import { listAgents, getAgent } from '../agents';

export const agentRoutes: FastifyPluginAsync = async (fastify) => {
  // List all agents
  fastify.get('/', async () => {
    const agents = listAgents(fastify.agents);
    
    return {
      success: true,
      data: {
        agents,
        count: agents.length,
      },
    };
  });
  
  // Get agent details
  fastify.get('/:agentId', async (request) => {
    const { agentId } = request.params as { agentId: string };
    const agent = getAgent(fastify.agents, agentId);
    
    if (!agent) {
      throw new NotFoundError('Agent', agentId);
    }
    
    return {
      success: true,
      data: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        tools: agent.tools.map(t => ({
          name: t.name,
          description: t.description,
        })),
      },
    };
  });
  
  // Get agent's available tools
  fastify.get('/:agentId/tools', async (request) => {
    const { agentId } = request.params as { agentId: string };
    const agent = getAgent(fastify.agents, agentId);
    
    if (!agent) {
      throw new NotFoundError('Agent', agentId);
    }
    
    return {
      success: true,
      data: {
        tools: agent.tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      },
    };
  });
};
