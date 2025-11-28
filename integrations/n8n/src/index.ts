/**
 * n8n Integration - Workflow automation
 * 
 * Provides:
 * - Trigger n8n workflows via webhook
 * - Receive webhooks from n8n
 * - Query workflow status
 * 
 * Usage:
 *   import { createN8nClient } from '@framework/integrations/n8n';
 *   
 *   const n8n = createN8nClient();
 *   await n8n.triggerWorkflow('workflow-id', { data: 'value' });
 */

import { createLogger } from '@framework/config';
import { ExternalServiceError } from '@framework/core';

const logger = createLogger('n8n');

// =============================================================================
// TYPES
// =============================================================================

export interface N8nConfig {
  baseUrl: string;
  apiKey?: string;
  webhookSecret?: string;
}

export interface N8nClient {
  triggerWorkflow(workflowId: string, data?: Record<string, unknown>): Promise<N8nExecution>;
  triggerWebhook(webhookPath: string, data?: Record<string, unknown>): Promise<unknown>;
  getExecution(executionId: string): Promise<N8nExecution>;
  getWorkflows(): Promise<N8nWorkflow[]>;
}

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface N8nExecution {
  id: string;
  workflowId: string;
  status: 'waiting' | 'running' | 'success' | 'error';
  startedAt: string;
  finishedAt?: string;
  data?: unknown;
  error?: string;
}

// =============================================================================
// CLIENT IMPLEMENTATION
// =============================================================================

class N8nClientImpl implements N8nClient {
  private config: N8nConfig;
  
  constructor(config: N8nConfig) {
    this.config = config;
  }
  
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    
    if (this.config.apiKey) {
      headers['X-N8N-API-KEY'] = this.config.apiKey;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`n8n API error: ${response.status} ${error}`);
      }
      
      return response.json();
    } catch (error: any) {
      logger.error({ error: error.message, path }, 'n8n request failed');
      throw new ExternalServiceError('n8n', error);
    }
  }
  
  async triggerWorkflow(
    workflowId: string,
    data?: Record<string, unknown>
  ): Promise<N8nExecution> {
    logger.debug({ workflowId }, 'Triggering n8n workflow');
    
    const result = await this.request<N8nExecution>(`/api/v1/workflows/${workflowId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
    
    logger.info({ workflowId, executionId: result.id }, 'n8n workflow triggered');
    return result;
  }
  
  async triggerWebhook(
    webhookPath: string,
    data?: Record<string, unknown>
  ): Promise<unknown> {
    logger.debug({ webhookPath }, 'Triggering n8n webhook');
    
    // Webhooks use a different path structure
    const url = webhookPath.startsWith('/')
      ? `${this.config.baseUrl}/webhook${webhookPath}`
      : `${this.config.baseUrl}/webhook/${webhookPath}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new ExternalServiceError('n8n', new Error(`Webhook failed: ${response.status}`));
    }
    
    return response.json();
  }
  
  async getExecution(executionId: string): Promise<N8nExecution> {
    return this.request<N8nExecution>(`/api/v1/executions/${executionId}`);
  }
  
  async getWorkflows(): Promise<N8nWorkflow[]> {
    const result = await this.request<{ data: N8nWorkflow[] }>('/api/v1/workflows');
    return result.data;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create an n8n client
 */
export async function createN8nClient(
  config?: Partial<N8nConfig>
): Promise<N8nClient> {
  const { getConfig } = await import('@framework/config');
  const appConfig = getConfig();
  
  // Determine which n8n to use (cloud or local)
  const useCloud = !!appConfig.integrations.n8n.cloudUrl && appConfig.env === 'production';
  
  const fullConfig: N8nConfig = {
    baseUrl: config?.baseUrl || (useCloud 
      ? appConfig.integrations.n8n.cloudUrl!
      : appConfig.integrations.n8n.localUrl),
    apiKey: config?.apiKey || (useCloud
      ? appConfig.integrations.n8n.cloudApiKey
      : appConfig.integrations.n8n.localApiKey),
    webhookSecret: config?.webhookSecret || appConfig.integrations.n8n.webhookSecret,
  };
  
  logger.info({ baseUrl: fullConfig.baseUrl }, 'Creating n8n client');
  
  return new N8nClientImpl(fullConfig);
}

// =============================================================================
// WEBHOOK VERIFICATION
// =============================================================================

import { createHmac } from 'crypto';

/**
 * Verify an incoming n8n webhook signature
 */
export function verifyN8nWebhook(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  return signature === expectedSignature;
}

// =============================================================================
// AGENT TOOL
// =============================================================================

import { createTool } from '@framework/ai/tools';

/**
 * Create an n8n tool for agents
 */
export function createN8nTool(client: N8nClient) {
  return createTool<
    { action: 'trigger' | 'status'; workflowId?: string; executionId?: string; data?: Record<string, unknown> },
    unknown
  >({
    name: 'n8n_workflow',
    description: 'Trigger n8n workflows or check execution status.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['trigger', 'status'],
          description: 'Action to perform',
        },
        workflowId: {
          type: 'string',
          description: 'Workflow ID (required for trigger)',
        },
        executionId: {
          type: 'string',
          description: 'Execution ID (required for status)',
        },
        data: {
          type: 'object',
          description: 'Data to pass to the workflow',
        },
      },
      required: ['action'],
    },
    execute: async ({ action, workflowId, executionId, data }) => {
      switch (action) {
        case 'trigger':
          if (!workflowId) throw new Error('workflowId required');
          return await client.triggerWorkflow(workflowId, data);
        case 'status':
          if (!executionId) throw new Error('executionId required');
          return await client.getExecution(executionId);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
  });
}
