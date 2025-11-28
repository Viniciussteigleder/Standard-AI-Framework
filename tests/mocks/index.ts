/**
 * Test Mocks
 * 
 * Mock implementations for external services and dependencies.
 */

import { vi } from 'vitest';

// =============================================================================
// AI PROVIDER MOCKS
// =============================================================================

export function createMockAnthropicClient() {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Mock response' }],
        usage: { input_tokens: 10, output_tokens: 20 },
        stop_reason: 'end_turn',
      }),
      stream: vi.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { text: 'Mock ' } };
          yield { type: 'content_block_delta', delta: { text: 'response' } };
        },
        finalMessage: vi.fn().mockResolvedValue({
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
      }),
    },
  };
}

export function createMockOpenAIClient() {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: { content: 'Mock response', role: 'assistant' },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 10, completion_tokens: 20 },
        }),
      },
    },
  };
}

// =============================================================================
// GOOGLE SHEETS MOCKS
// =============================================================================

export function createMockGoogleSheetsClient() {
  return {
    read: vi.fn().mockResolvedValue({
      values: [
        ['Name', 'Price', 'Quantity'],
        ['Product A', 29.99, 10],
        ['Product B', 49.99, 5],
      ],
      range: 'Sheet1!A1:C3',
    }),
    write: vi.fn().mockResolvedValue(undefined),
    append: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    getSpreadsheet: vi.fn().mockResolvedValue({
      id: 'mock-spreadsheet-id',
      title: 'Mock Spreadsheet',
      sheets: [
        { id: 0, title: 'Sheet1', rowCount: 100, columnCount: 26 },
      ],
    }),
  };
}

// =============================================================================
// N8N MOCKS
// =============================================================================

export function createMockN8nClient() {
  return {
    triggerWorkflow: vi.fn().mockResolvedValue({
      id: 'exec-123',
      workflowId: 'workflow-123',
      status: 'running',
      startedAt: new Date().toISOString(),
    }),
    triggerWebhook: vi.fn().mockResolvedValue({ success: true }),
    getExecution: vi.fn().mockResolvedValue({
      id: 'exec-123',
      workflowId: 'workflow-123',
      status: 'success',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    }),
    getWorkflows: vi.fn().mockResolvedValue([
      { id: 'workflow-1', name: 'Sync Data', active: true },
      { id: 'workflow-2', name: 'Send Report', active: true },
    ]),
  };
}

// =============================================================================
// DATABASE MOCKS
// =============================================================================

export function createMockPrismaClient() {
  return {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    conversation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
  };
}

// =============================================================================
// HTTP REQUEST MOCKS
// =============================================================================

export function createMockFetch() {
  return vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
      text: () => Promise.resolve(''),
    });
  });
}

// =============================================================================
// LOGGER MOCKS
// =============================================================================

export function createMockLogger() {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}

// =============================================================================
// UTILITY MOCKS
// =============================================================================

export function mockEnv(env: Record<string, string>) {
  const originalEnv = process.env;
  
  beforeAll(() => {
    process.env = { ...originalEnv, ...env };
  });
  
  afterAll(() => {
    process.env = originalEnv;
  });
}

export function mockDate(date: Date | string) {
  const mockDate = new Date(date);
  vi.useFakeTimers();
  vi.setSystemTime(mockDate);
  
  return () => {
    vi.useRealTimers();
  };
}
