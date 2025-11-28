/**
 * Database Package - Prisma Client & Utilities
 * 
 * Provides type-safe database access with connection pooling,
 * soft deletes, and query helpers.
 */

import { PrismaClient, Prisma } from '@prisma/client';

// =============================================================================
// PRISMA CLIENT SINGLETON
// =============================================================================

declare global {
  var __prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    errorFormat: 'pretty',
  });
};

// Use global in development to prevent connection exhaustion during hot reload
export const prisma = globalThis.__prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  User,
  Account,
  Session,
  ApiKey,
  Tenant,
  Agent,
  Conversation,
  Message,
  Document,
  Embedding,
  Workflow,
  WorkflowExecution,
  Integration,
  AuditLog,
} from '@prisma/client';

export {
  UserRole,
  UserStatus,
  ConversationStatus,
  MessageRole,
  WorkflowStatus,
  ExecutionStatus,
  IntegrationType,
} from '@prisma/client';

export { Prisma } from '@prisma/client';

// =============================================================================
// CONNECTION UTILITIES
// =============================================================================

/**
 * Connect to database (call at startup)
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✓ Database connected');
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw error;
  }
}

/**
 * Disconnect from database (call at shutdown)
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('✓ Database disconnected');
}

/**
 * Health check for database
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      connected: true,
      latencyMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      error: error.message,
    };
  }
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Pagination helper
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

export function getPaginationParams(options: PaginationOptions) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip, take: limit };
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  options: { page: number; limit: number }
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / options.limit);
  
  return {
    data,
    pagination: {
      total,
      page: options.page,
      limit: options.limit,
      totalPages,
      hasMore: options.page < totalPages,
    },
  };
}

// =============================================================================
// SOFT DELETE HELPERS
// =============================================================================

/**
 * Soft delete a record by setting deletedAt
 */
export async function softDeleteUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { 
      deletedAt: new Date(),
      status: 'DELETED',
    },
  });
}

// =============================================================================
// TRANSACTION HELPER
// =============================================================================

export type TransactionClient = Prisma.TransactionClient;

/**
 * Execute operations in a transaction
 */
export async function transaction<T>(
  fn: (tx: TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
  }
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: options?.maxWait || 5000,
    timeout: options?.timeout || 10000,
  });
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

export interface CreateAuditLogInput {
  action: string;
  resourceType: string;
  resourceId?: string;
  userId?: string;
  tenantId?: string;
  outcome: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      userId: input.userId,
      tenantId: input.tenantId,
      outcome: input.outcome,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      details: input.details || {},
    },
  });
}

// =============================================================================
// REPOSITORY PATTERN HELPERS
// =============================================================================

/**
 * Base repository with common CRUD operations
 */
export function createRepository<
  T extends { id: string },
  CreateInput,
  UpdateInput
>(modelName: Prisma.ModelName) {
  const model = (prisma as any)[modelName.toLowerCase()];
  
  return {
    async findById(id: string): Promise<T | null> {
      return model.findUnique({ where: { id } });
    },
    
    async findMany(options?: {
      where?: Record<string, any>;
      orderBy?: Record<string, 'asc' | 'desc'>;
      take?: number;
      skip?: number;
    }): Promise<T[]> {
      return model.findMany(options);
    },
    
    async create(data: CreateInput): Promise<T> {
      return model.create({ data });
    },
    
    async update(id: string, data: UpdateInput): Promise<T> {
      return model.update({ where: { id }, data });
    },
    
    async delete(id: string): Promise<void> {
      await model.delete({ where: { id } });
    },
    
    async count(where?: Record<string, any>): Promise<number> {
      return model.count({ where });
    },
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default prisma;
