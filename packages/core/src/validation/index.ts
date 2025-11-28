/**
 * Validation Schemas - Zod schemas for runtime validation
 * 
 * Usage:
 *   import { userSchema, chatRequestSchema } from '@framework/core/validation';
 *   const user = userSchema.parse(data);
 */

import { z } from 'zod';

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const uuidSchema = z.string().uuid();
export const timestampSchema = z.string().datetime();
export const emailSchema = z.string().email();

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// =============================================================================
// USER & AUTH SCHEMAS
// =============================================================================

export const userRoleSchema = z.enum(['admin', 'member', 'viewer', 'guest']);

export const userSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
  role: userRoleSchema,
  tenantId: uuidSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
  role: userRoleSchema.optional().default('member'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string(),
});

// =============================================================================
// AI & AGENT SCHEMAS
// =============================================================================

export const messageRoleSchema = z.enum(['user', 'assistant', 'system', 'tool']);

export const messageSchema = z.object({
  role: messageRoleSchema,
  content: z.string(),
  name: z.string().optional(),
  toolCallId: z.string().optional(),
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.record(z.unknown()),
  })).optional(),
  metadata: z.object({
    timestamp: timestampSchema.optional(),
    model: z.string().optional(),
    tokens: z.object({
      input: z.number(),
      output: z.number(),
    }).optional(),
    latencyMs: z.number().optional(),
  }).optional(),
});

export const chatRequestSchema = z.object({
  conversationId: uuidSchema.optional(),
  message: z.string().min(1).max(100000),
  agentId: z.string().optional(),
  context: z.record(z.unknown()).optional(),
  stream: z.boolean().optional().default(false),
});

export const modelConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'local']),
  model: z.string(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
});

export const agentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  model: modelConfigSchema,
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.record(z.unknown()),
  })),
  memory: z.object({
    type: z.enum(['buffer', 'vector', 'hybrid']),
    maxMessages: z.number().int().positive().optional(),
  }).optional(),
  maxIterations: z.number().int().positive().optional().default(10),
});

// =============================================================================
// WORKFLOW SCHEMAS
// =============================================================================

export const workflowTriggerSchema = z.object({
  type: z.enum(['manual', 'schedule', 'webhook', 'event']),
  config: z.record(z.unknown()),
});

export const workflowStepSchema = z.object({
  id: z.string(),
  type: z.enum(['agent', 'api', 'condition', 'transform', 'wait']),
  name: z.string(),
  config: z.record(z.unknown()),
  next: z.union([
    z.string(),
    z.array(z.object({
      condition: z.string(),
      stepId: z.string(),
    })),
  ]).optional(),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  trigger: workflowTriggerSchema,
  steps: z.array(workflowStepSchema).min(1),
});

// =============================================================================
// INTEGRATION SCHEMAS
// =============================================================================

export const integrationTypeSchema = z.enum([
  'google_sheets',
  'google_drive',
  'github',
  'slack',
  'n8n',
  'aws_s3',
  'aws_sqs',
  'webhook',
]);

export const integrationConfigSchema = z.object({
  id: z.string(),
  type: integrationTypeSchema,
  enabled: z.boolean(),
  credentials: z.record(z.unknown()),
  settings: z.record(z.unknown()),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validate and parse data with nice error messages
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => 
      `${e.path.join('.')}: ${e.message}`
    ).join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }
  return result.data;
}

/**
 * Safe parse that returns null on failure
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

// Re-export zod for convenience
export { z };
