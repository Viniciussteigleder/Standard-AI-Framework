import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Global setup
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['packages/*/src/**/*.ts', 'apps/*/src/**/*.ts'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    
    // Test file patterns
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts',
      'packages/*/src/**/*.test.ts',
      'apps/*/src/**/*.test.ts',
    ],
    
    // Exclude patterns
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
    
    // Path aliases
    alias: {
      '@framework/core': resolve(__dirname, 'packages/core/src'),
      '@framework/config': resolve(__dirname, 'packages/config/src'),
      '@framework/ai': resolve(__dirname, 'packages/ai/src'),
    },
    
    // Timeout for long-running tests
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Reporter configuration
    reporters: ['default', 'html'],
    
    // Setup files
    setupFiles: ['./tests/setup.ts'],
  },
});
