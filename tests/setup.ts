/**
 * Global Test Setup
 * 
 * Runs before all tests to configure the test environment.
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// =============================================================================
// ENVIRONMENT SETUP
// =============================================================================

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise during tests
process.env.APP_NAME = 'test-app';

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock console to reduce noise (optional)
// vi.spyOn(console, 'log').mockImplementation(() => {});
// vi.spyOn(console, 'info').mockImplementation(() => {});

// =============================================================================
// GLOBAL HOOKS
// =============================================================================

beforeAll(async () => {
  // Global setup before all tests
  console.log('🧪 Starting test suite...');
});

afterAll(async () => {
  // Global cleanup after all tests
  console.log('✅ Test suite complete');
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});

// =============================================================================
// GLOBAL TEST UTILITIES
// =============================================================================

declare global {
  // Add global test utilities here
  var testUtils: {
    createMockUser: () => { id: string; email: string; name: string };
    createMockConversation: () => { id: string; messages: any[] };
    waitFor: (ms: number) => Promise<void>;
  };
}

globalThis.testUtils = {
  createMockUser: () => ({
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
  }),
  
  createMockConversation: () => ({
    id: 'test-conv-123',
    messages: [],
  }),
  
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};

// =============================================================================
// CUSTOM MATCHERS
// =============================================================================

// Example custom matcher
// expect.extend({
//   toBeValidUUID(received: string) {
//     const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
//     const pass = uuidRegex.test(received);
//     return {
//       pass,
//       message: () => pass
//         ? `expected ${received} not to be a valid UUID`
//         : `expected ${received} to be a valid UUID`,
//     };
//   },
// });
