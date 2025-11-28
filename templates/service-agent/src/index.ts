/**
 * Agent Service Entry Point
 * 
 * This service handles AI agent interactions and chat.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { loadConfig, getConfig } from '@framework/config';
import { createLogger } from '@framework/config/logger';
import { loadSecrets } from '@framework/config/secrets';

// Import routes
import { chatRoutes } from './routes/chat';
import { agentRoutes } from './routes/agents';

// Import agents
import { initializeAgents } from './agents';

async function main() {
  // Load configuration
  loadConfig();
  await loadSecrets();
  
  const config = getConfig();
  const logger = createLogger('agent-service');
  
  // Initialize agents
  const agents = await initializeAgents();
  logger.info({ agentCount: agents.size }, 'Agents initialized');
  
  // Create Fastify instance
  const app = Fastify({
    logger: false,
    trustProxy: true,
  });
  
  // Register plugins
  await app.register(cors, {
    origin: config.env === 'production'
      ? [config.services.web, config.services.api]
      : true,
    credentials: true,
  });
  
  await app.register(websocket);
  
  // Decorate with agents
  app.decorate('agents', agents);
  
  // Request logging
  app.addHook('onRequest', async (request) => {
    request.startTime = Date.now();
  });
  
  app.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - (request.startTime || Date.now());
    logger.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      durationMs: duration,
    }, 'Request completed');
  });
  
  // Error handler
  app.setErrorHandler((error, request, reply) => {
    logger.error({
      error: error.message,
      stack: error.stack,
    }, 'Request error');
    
    if ('statusCode' in error && 'code' in error) {
      return reply.status(error.statusCode as number).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: config.env === 'production'
          ? 'An internal error occurred'
          : error.message,
      },
    });
  });
  
  // Register routes
  await app.register(chatRoutes, { prefix: '/chat' });
  await app.register(agentRoutes, { prefix: '/agents' });
  
  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    agents: Array.from(agents.keys()),
    timestamp: new Date().toISOString(),
  }));
  
  // Start server
  const port = parseInt(process.env.PORT || '4001', 10);
  const host = process.env.HOST || '0.0.0.0';
  
  try {
    await app.listen({ port, host });
    logger.info({ port, host, env: config.env }, 'Agent service started');
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
  
  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    await app.close();
    process.exit(0);
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Extend Fastify types
import { Agent } from '@framework/ai';

declare module 'fastify' {
  interface FastifyInstance {
    agents: Map<string, Agent>;
  }
  interface FastifyRequest {
    startTime?: number;
  }
}

main().catch(console.error);
