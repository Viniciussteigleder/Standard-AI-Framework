/**
 * Core Types - Foundation for the entire framework
 * 
 * These types are used across all services and should be
 * imported from @framework/core/types
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

export type Timestamp = string; // ISO 8601
export type UUID = string;

export interface BaseEntity {
  id: UUID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PaginationParams {
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
    hasMore: boolean;
    nextCursor?: string;
  };
}

// =============================================================================
// USER & AUTH TYPES
// =============================================================================

export interface User extends BaseEntity {
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  tenantId?: UUID;
  metadata?: Record<string, unknown>;
}

export type UserRole = 'admin' | 'member' | 'viewer' | 'guest';

export interface Session {
  userId: UUID;
  tenantId?: UUID;
  expiresAt: Timestamp;
  metadata?: Record<string, unknown>;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

// =============================================================================
// AI & AGENT TYPES
// =============================================================================

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  timestamp?: Timestamp;
  model?: string;
  tokens?: {
    input: number;
    output: number;
  };
  latencyMs?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
  error?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: ModelConfig;
  tools: ToolDefinition[];
  memory?: MemoryConfig;
  maxIterations?: number;
}

export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'local';
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface MemoryConfig {
  type: 'buffer' | 'vector' | 'hybrid';
  maxMessages?: number;
  vectorStore?: VectorStoreConfig;
}

export interface VectorStoreConfig {
  provider: 'pgvector' | 'weaviate' | 'pinecone' | 'supabase';
  collection: string;
  embeddingModel: string;
  dimensions: number;
}

// =============================================================================
// CONVERSATION & CHAT TYPES
// =============================================================================

export interface Conversation extends BaseEntity {
  userId: UUID;
  agentId: string;
  title?: string;
  messages: Message[];
  metadata?: Record<string, unknown>;
  status: ConversationStatus;
}

export type ConversationStatus = 'active' | 'archived' | 'deleted';

export interface ChatRequest {
  conversationId?: UUID;
  message: string;
  agentId?: string;
  context?: Record<string, unknown>;
  stream?: boolean;
}

export interface ChatResponse {
  conversationId: UUID;
  message: Message;
  toolResults?: ToolResult[];
}

// =============================================================================
// WORKFLOW & A2A TYPES
// =============================================================================

export interface Workflow extends BaseEntity {
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  status: WorkflowStatus;
}

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'webhook' | 'event';
  config: Record<string, unknown>;
}

export interface WorkflowStep {
  id: string;
  type: 'agent' | 'api' | 'condition' | 'transform' | 'wait';
  name: string;
  config: Record<string, unknown>;
  next?: string | ConditionalNext[];
}

export interface ConditionalNext {
  condition: string; // Expression
  stepId: string;
}

export interface WorkflowExecution extends BaseEntity {
  workflowId: UUID;
  status: ExecutionStatus;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  steps: StepExecution[];
  error?: string;
}

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface StepExecution {
  stepId: string;
  status: ExecutionStatus;
  input: unknown;
  output?: unknown;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  error?: string;
}

// =============================================================================
// INTEGRATION TYPES
// =============================================================================

export interface IntegrationConfig {
  id: string;
  type: IntegrationType;
  enabled: boolean;
  credentials: Record<string, unknown>;
  settings: Record<string, unknown>;
}

export type IntegrationType = 
  | 'google_sheets'
  | 'google_drive'
  | 'github'
  | 'slack'
  | 'n8n'
  | 'aws_s3'
  | 'aws_sqs'
  | 'webhook';

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string; // Only in development
}

// =============================================================================
// EVENT TYPES
// =============================================================================

export interface DomainEvent<T = unknown> {
  id: UUID;
  type: string;
  timestamp: Timestamp;
  source: string;
  data: T;
  metadata?: Record<string, unknown>;
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;
