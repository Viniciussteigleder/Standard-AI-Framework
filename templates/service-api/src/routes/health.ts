/**
 * Health Check Routes
 * 
 * Provides health and readiness endpoints for load balancers and k8s.
 */

import { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Liveness probe - is the service running?
  fastify.get('/live', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
  
  // Readiness probe - is the service ready to accept traffic?
  fastify.get('/ready', async () => {
    // Add checks for dependencies (DB, Redis, etc.)
    const checks = {
      database: await checkDatabase(),
      // redis: await checkRedis(),
    };
    
    const allHealthy = Object.values(checks).every(c => c.healthy);
    
    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  });
  
  // Detailed health - for debugging
  fastify.get('/', async () => {
    return {
      status: 'ok',
      version: process.env.npm_package_version || '0.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  });
};

// Health check helpers
async function checkDatabase(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  
  try {
    // TODO: Replace with actual DB check
    // const prisma = getPrismaClient();
    // await prisma.$queryRaw`SELECT 1`;
    
    return {
      healthy: true,
      latencyMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error.message,
    };
  }
}
