/**
 * Test Fixtures
 * 
 * Reusable test data and factory functions.
 */

import { Message, User, Conversation, AgentConfig } from '@framework/core';

// =============================================================================
// USER FIXTURES
// =============================================================================

export const testUsers = {
  admin: {
    id: 'user-admin-001',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  member: {
    id: 'user-member-001',
    email: 'member@example.com',
    name: 'Member User',
    role: 'member' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  viewer: {
    id: 'user-viewer-001',
    email: 'viewer@example.com',
    name: 'Viewer User',
    role: 'viewer' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
};

export function createTestUser(overrides: Partial<User> = {}): User {
  return {
    id: `user-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    role: 'member',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// =============================================================================
// MESSAGE FIXTURES
// =============================================================================

export const testMessages: Message[] = [
  {
    role: 'user',
    content: 'Hello, how are you?',
    metadata: {
      timestamp: '2024-01-01T10:00:00Z',
    },
  },
  {
    role: 'assistant',
    content: 'I\'m doing well, thank you! How can I help you today?',
    metadata: {
      timestamp: '2024-01-01T10:00:01Z',
      model: 'claude-3-5-sonnet-20241022',
      tokens: { input: 10, output: 15 },
    },
  },
  {
    role: 'user',
    content: 'What\'s 25 times 47?',
    metadata: {
      timestamp: '2024-01-01T10:00:02Z',
    },
  },
  {
    role: 'assistant',
    content: 'Let me calculate that for you.',
    toolCalls: [
      {
        id: 'call-001',
        name: 'calculator',
        arguments: { expression: '25 * 47' },
      },
    ],
    metadata: {
      timestamp: '2024-01-01T10:00:03Z',
    },
  },
];

export function createTestMessage(
  role: 'user' | 'assistant' | 'system' | 'tool',
  content: string,
  overrides: Partial<Message> = {}
): Message {
  return {
    role,
    content,
    metadata: {
      timestamp: new Date().toISOString(),
    },
    ...overrides,
  };
}

// =============================================================================
// CONVERSATION FIXTURES
// =============================================================================

export function createTestConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: `conv-${Date.now()}`,
    userId: testUsers.member.id,
    agentId: 'assistant',
    messages: testMessages.slice(0, 2),
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// =============================================================================
// AGENT FIXTURES
// =============================================================================

export const testAgentConfigs: Record<string, AgentConfig> = {
  assistant: {
    id: 'assistant',
    name: 'Test Assistant',
    description: 'A test assistant for unit tests',
    systemPrompt: 'You are a helpful test assistant.',
    model: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
    },
    tools: [],
  },
  dataAnalyst: {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'A data analysis agent',
    systemPrompt: 'You are a data analyst assistant.',
    model: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.3,
    },
    tools: [],
  },
};

// =============================================================================
// API RESPONSE FIXTURES
// =============================================================================

export const testApiResponses = {
  success: {
    success: true,
    data: {},
  },
  notFound: {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    },
  },
  unauthorized: {
    success: false,
    error: {
      code: 'AUTHENTICATION_ERROR',
      message: 'Authentication required',
    },
  },
  validationError: {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: {},
    },
  },
};

// =============================================================================
// GOOGLE SHEETS FIXTURES
// =============================================================================

export const testSheetData = {
  headers: ['Name', 'Price', 'Quantity', 'Total'],
  rows: [
    ['Product A', 29.99, 10, 299.90],
    ['Product B', 49.99, 5, 249.95],
    ['Product C', 19.99, 20, 399.80],
  ],
  range: 'Sheet1!A1:D4',
};
