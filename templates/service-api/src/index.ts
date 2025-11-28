/**
 * API Service Entry Point
 * 
 * This is the main entry point for the API service.
 * It sets up Fastify with all plugins and routes.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import { loadConfig, getConfig } from '@framework/config';
import { createLogger } from '@framework/config/logger';
import { loadSecrets } from '@framework/config/secrets';

// Import routes
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
// import { userRoutes } from './routes/users';

// Initialize
async function main() {
  // Load configuration
  loadConfig();
  await loadSecrets();
  
  const config = getConfig();
  const logger = createLogger('api');
  
  // Create Fastify instance
  const app = Fastify({
    logger: false, // We use our own logger
    trustProxy: true,
  });
  
  // Register plugins
  await app.register(cors, {
    origin: config.env === 'production' 
      ? [config.services.web]
      : true,
    credentials: true,
  });
  
  await app.register(helmet);
  
  if (config.auth.jwtSecret) {
    await app.register(jwt, {
      secret: config.auth.jwtSecret,
    });
  }
  
  // Request logging
  app.addHook('onRequest', async (request) => {
    request.startTime = Date.now();
    logger.debug({
      method: request.method,
      url: request.url,
    }, 'Request started');
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
      method: request.method,
      url: request.url,
    }, 'Request error');
    
    // Check if it's a framework error
    if ('statusCode' in error && 'code' in error) {
      return reply.status(error.statusCode as number).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    
    // Generic error
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
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  // await app.register(userRoutes, { prefix: '/api/users' });
  
  // Start server
  const port = parseInt(process.env.PORT || '4000', 10);
  const host = process.env.HOST || '0.0.0.0';
  
  try {
    await app.listen({ port, host });
    logger.info({ port, host, env: config.env }, 'API server started');
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
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

// Run
main().catch(console.error);
