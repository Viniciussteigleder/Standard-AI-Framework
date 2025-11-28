/**
 * Error Classes - Consistent error handling across the framework
 * 
 * Usage:
 *   import { NotFoundError, ValidationError } from '@framework/core/errors';
 *   throw new NotFoundError('User', userId);
 */

// =============================================================================
// BASE ERROR
// =============================================================================

export abstract class FrameworkError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly timestamp: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.details = details;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
    };
  }
}

// =============================================================================
// CLIENT ERRORS (4xx)
// =============================================================================

export class ValidationError extends FrameworkError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class AuthenticationError extends FrameworkError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly statusCode = 401;

  constructor(message = 'Authentication required') {
    super(message);
  }
}

export class AuthorizationError extends FrameworkError {
  readonly code = 'AUTHORIZATION_ERROR';
  readonly statusCode = 403;

  constructor(message = 'Insufficient permissions') {
    super(message);
  }
}

export class NotFoundError extends FrameworkError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;

  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;
    super(message, { resource, identifier });
  }
}

export class ConflictError extends FrameworkError {
  readonly code = 'CONFLICT';
  readonly statusCode = 409;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class RateLimitError extends FrameworkError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly statusCode = 429;
  readonly retryAfter?: number;

  constructor(message = 'Rate limit exceeded', retryAfter?: number) {
    super(message, { retryAfter });
    this.retryAfter = retryAfter;
  }
}

// =============================================================================
// SERVER ERRORS (5xx)
// =============================================================================

export class InternalError extends FrameworkError {
  readonly code = 'INTERNAL_ERROR';
  readonly statusCode = 500;

  constructor(message = 'An internal error occurred', details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class ServiceUnavailableError extends FrameworkError {
  readonly code = 'SERVICE_UNAVAILABLE';
  readonly statusCode = 503;

  constructor(service: string, message?: string) {
    super(message || `${service} is temporarily unavailable`, { service });
  }
}

export class ExternalServiceError extends FrameworkError {
  readonly code = 'EXTERNAL_SERVICE_ERROR';
  readonly statusCode = 502;

  constructor(service: string, originalError?: Error) {
    super(`External service error: ${service}`, {
      service,
      originalMessage: originalError?.message,
    });
  }
}

// =============================================================================
// AI-SPECIFIC ERRORS
// =============================================================================

export class AIProviderError extends FrameworkError {
  readonly code = 'AI_PROVIDER_ERROR';
  readonly statusCode = 502;

  constructor(provider: string, message: string, details?: Record<string, unknown>) {
    super(`${provider}: ${message}`, { provider, ...details });
  }
}

export class ToolExecutionError extends FrameworkError {
  readonly code = 'TOOL_EXECUTION_ERROR';
  readonly statusCode = 500;

  constructor(toolName: string, message: string) {
    super(`Tool '${toolName}' failed: ${message}`, { toolName });
  }
}

export class AgentError extends FrameworkError {
  readonly code = 'AGENT_ERROR';
  readonly statusCode = 500;

  constructor(agentId: string, message: string) {
    super(`Agent '${agentId}' error: ${message}`, { agentId });
  }
}

export class MaxIterationsError extends FrameworkError {
  readonly code = 'MAX_ITERATIONS_EXCEEDED';
  readonly statusCode = 500;

  constructor(agentId: string, maxIterations: number) {
    super(`Agent '${agentId}' exceeded max iterations (${maxIterations})`, {
      agentId,
      maxIterations,
    });
  }
}

// =============================================================================
// WORKFLOW ERRORS
// =============================================================================

export class WorkflowError extends FrameworkError {
  readonly code = 'WORKFLOW_ERROR';
  readonly statusCode = 500;

  constructor(workflowId: string, stepId: string, message: string) {
    super(`Workflow '${workflowId}' failed at step '${stepId}': ${message}`, {
      workflowId,
      stepId,
    });
  }
}

// =============================================================================
// ERROR UTILITIES
// =============================================================================

/**
 * Type guard to check if an error is a FrameworkError
 */
export function isFrameworkError(error: unknown): error is FrameworkError {
  return error instanceof FrameworkError;
}

/**
 * Convert any error to a FrameworkError
 */
export function toFrameworkError(error: unknown): FrameworkError {
  if (isFrameworkError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return new InternalError(error.message, { originalStack: error.stack });
  }
  
  return new InternalError(String(error));
}

/**
 * Create an error handler for async functions
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  errorTransformer?: (error: unknown) => FrameworkError
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (errorTransformer) {
        throw errorTransformer(error);
      }
      throw toFrameworkError(error);
    }
  }) as T;
}
