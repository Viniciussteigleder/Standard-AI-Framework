/**
 * Enhanced Logging Configuration
 * 
 * Provides structured logging with:
 * - Console output (dev)
 * - File output (prod)
 * - JSON structured logs
 * - Log rotation
 * - Multiple log channels (api, agent, error, audit)
 */

import pino, { Logger as PinoLogger, LoggerOptions } from 'pino';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// =============================================================================
// TYPES
// =============================================================================

export interface Logger {
  trace: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal: LogFn;
  child: (bindings: Record<string, unknown>) => Logger;
}

type LogFn = {
  (msg: string): void;
  (obj: Record<string, unknown>, msg?: string): void;
  (error: Error, msg?: string): void;
};

export type LogChannel = 'api' | 'agent' | 'web' | 'a2a' | 'error' | 'audit' | 'default';

export interface LogConfig {
  level: string;
  prettyPrint: boolean;
  destination: 'console' | 'file' | 'both';
  logDir: string;
  rotation: {
    enabled: boolean;
    maxSize: string;
    maxFiles: number;
    compress: boolean;
  };
  channels: LogChannel[];
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_LOG_DIR = './logs';

function ensureLogDirectory(logDir: string): void {
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
}

function isDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

// =============================================================================
// LOGGER FACTORY
// =============================================================================

const loggers = new Map<string, Logger>();

function getLoggerOptions(serviceName: string, channel: LogChannel): LoggerOptions {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const appName = process.env.APP_NAME || 'ai-framework';
  const env = process.env.NODE_ENV || 'development';

  const baseOptions: LoggerOptions = {
    name: serviceName,
    level: logLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        service: bindings.name,
        channel,
        pid: bindings.pid,
        host: bindings.hostname,
      }),
    },
    base: {
      env,
      app: appName,
      channel,
    },
  };

  // In development, use pretty printing
  if (isDev()) {
    return {
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
          messageFormat: `[${channel.toUpperCase()}] {msg}`,
        },
      },
    };
  }

  // In production, write to files
  if (isProd()) {
    ensureLogDirectory(DEFAULT_LOG_DIR);
    return {
      ...baseOptions,
      transport: {
        targets: [
          {
            target: 'pino/file',
            level: logLevel,
            options: {
              destination: join(DEFAULT_LOG_DIR, `${channel}.log`),
              mkdir: true,
            },
          },
          {
            target: 'pino/file',
            level: 'error',
            options: {
              destination: join(DEFAULT_LOG_DIR, 'error.log'),
              mkdir: true,
            },
          },
        ],
      },
    };
  }

  return baseOptions;
}

/**
 * Create a logger instance for a service/module
 */
export function createLogger(serviceName: string, channel: LogChannel = 'default'): Logger {
  const key = `${serviceName}:${channel}`;
  const existing = loggers.get(key);
  if (existing) return existing;

  const pinoLogger = pino(getLoggerOptions(serviceName, channel));
  const logger = wrapPinoLogger(pinoLogger);
  
  loggers.set(key, logger);
  return logger;
}

/**
 * Create channel-specific loggers
 */
export const LogChannels = {
  api: (name: string) => createLogger(name, 'api'),
  agent: (name: string) => createLogger(name, 'agent'),
  web: (name: string) => createLogger(name, 'web'),
  a2a: (name: string) => createLogger(name, 'a2a'),
  error: (name: string) => createLogger(name, 'error'),
  audit: (name: string) => createLogger(name, 'audit'),
};

// =============================================================================
// SPECIALIZED LOGGERS
// =============================================================================

/**
 * Audit logger for security-sensitive operations
 */
export interface AuditLogEntry {
  action: string;
  userId?: string;
  resourceType: string;
  resourceId?: string;
  outcome: 'success' | 'failure';
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export function logAudit(entry: AuditLogEntry): void {
  const logger = createLogger('audit', 'audit');
  logger.info({
    type: 'audit',
    ...entry,
    timestamp: new Date().toISOString(),
  }, `AUDIT: ${entry.action} on ${entry.resourceType} - ${entry.outcome}`);
}

/**
 * User interaction logger for AI conversations
 */
export interface InteractionLogEntry {
  conversationId: string;
  userId?: string;
  agentId: string;
  messageType: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tokens?: { input: number; output: number };
  latencyMs?: number;
  toolCalls?: string[];
}

export function logInteraction(entry: InteractionLogEntry): void {
  const logger = createLogger('interaction', 'agent');
  logger.info({
    type: 'interaction',
    ...entry,
    timestamp: new Date().toISOString(),
    content: entry.content.length > 500 
      ? entry.content.slice(0, 500) + '...' 
      : entry.content,
  }, `[${entry.messageType.toUpperCase()}] ${entry.agentId}`);
}

/**
 * Agent execution logger
 */
export interface ExecutionLogEntry {
  executionId: string;
  agentId: string;
  status: 'started' | 'tool_call' | 'completed' | 'failed';
  toolName?: string;
  durationMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export function logExecution(entry: ExecutionLogEntry): void {
  const logger = createLogger('execution', 'agent');
  const level = entry.status === 'failed' ? 'error' : 'info';
  
  logger[level]({
    type: 'execution',
    ...entry,
    timestamp: new Date().toISOString(),
  }, `EXEC [${entry.status}] ${entry.agentId}${entry.toolName ? ` -> ${entry.toolName}` : ''}`);
}

// =============================================================================
// REQUEST/RESPONSE LOGGING
// =============================================================================

export interface RequestLogContext {
  requestId: string;
  method: string;
  path: string;
  userId?: string;
  tenantId?: string;
  userAgent?: string;
  ip?: string;
}

export interface ResponseLogContext extends RequestLogContext {
  statusCode: number;
  durationMs: number;
  contentLength?: number;
}

export function logRequest(logger: Logger, context: ResponseLogContext): void {
  const level = context.statusCode >= 500 ? 'error' : 
                context.statusCode >= 400 ? 'warn' : 'info';
  
  logger[level]({
    type: 'http',
    ...context,
  }, `${context.method} ${context.path} ${context.statusCode} ${context.durationMs}ms`);
}

// =============================================================================
// AI COMPLETION LOGGING
// =============================================================================

export interface AICompletionLog {
  agentId?: string;
  conversationId?: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

export function logAICompletion(logger: Logger, context: AICompletionLog): void {
  const level = context.success ? 'info' : 'error';
  
  logger[level]({
    type: 'ai_completion',
    ...context,
  }, `AI: ${context.provider}/${context.model} ` +
     `${context.inputTokens}+${context.outputTokens} tokens ` +
     `${context.durationMs}ms ${context.success ? 'OK' : 'FAILED'}`);
}

export interface ToolCallLog {
  agentId: string;
  conversationId?: string;
  toolName: string;
  durationMs: number;
  success: boolean;
  error?: string;
}

export function logToolCall(logger: Logger, context: ToolCallLog): void {
  const level = context.success ? 'debug' : 'warn';
  
  logger[level]({
    type: 'tool_call',
    ...context,
  }, `Tool: ${context.toolName} ${context.durationMs}ms ${context.success ? 'OK' : 'FAILED'}`);
}

// =============================================================================
// WRAPPER
// =============================================================================

function wrapPinoLogger(pinoLogger: PinoLogger): Logger {
  return {
    trace: createLogFn(pinoLogger, 'trace'),
    debug: createLogFn(pinoLogger, 'debug'),
    info: createLogFn(pinoLogger, 'info'),
    warn: createLogFn(pinoLogger, 'warn'),
    error: createLogFn(pinoLogger, 'error'),
    fatal: createLogFn(pinoLogger, 'fatal'),
    child: (bindings) => wrapPinoLogger(pinoLogger.child(bindings)),
  };
}

function createLogFn(
  pinoLogger: PinoLogger,
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
): LogFn {
  return (objOrMsg: unknown, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      pinoLogger[level](objOrMsg);
    } else if (objOrMsg instanceof Error) {
      pinoLogger[level]({ err: objOrMsg }, msg || objOrMsg.message);
    } else {
      pinoLogger[level](objOrMsg as object, msg);
    }
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

let _defaultLogger: Logger | null = null;

export function getDefaultLogger(): Logger {
  if (!_defaultLogger) {
    _defaultLogger = createLogger('default');
  }
  return _defaultLogger;
}
