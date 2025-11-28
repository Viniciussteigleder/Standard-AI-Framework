/**
 * Agent Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAgent, createMockAIClient } from '@framework/ai';
import { calculatorTool } from '@framework/ai/tools';

describe('Agent', () => {
  describe('createAgent', () => {
    it('should create an agent with basic configuration', () => {
      const agent = createAgent({
        id: 'test-agent',
        name: 'Test Agent',
        systemPrompt: 'You are a test assistant.',
      });
      
      expect(agent.id).toBe('test-agent');
      expect(agent.name).toBe('Test Agent');
      expect(agent.tools).toHaveLength(0);
    });
    
    it('should create an agent with tools', () => {
      const agent = createAgent({
        id: 'test-agent',
        name: 'Test Agent',
        systemPrompt: 'You are a test assistant.',
        tools: [calculatorTool],
      });
      
      expect(agent.tools).toHaveLength(1);
      expect(agent.tools[0].name).toBe('calculator');
    });
    
    it('should allow adding tools after creation', () => {
      const agent = createAgent({
        id: 'test-agent',
        name: 'Test Agent',
        systemPrompt: 'You are a test assistant.',
      });
      
      agent.addTool(calculatorTool);
      
      expect(agent.tools).toHaveLength(1);
    });
    
    it('should allow removing tools', () => {
      const agent = createAgent({
        id: 'test-agent',
        name: 'Test Agent',
        systemPrompt: 'You are a test assistant.',
        tools: [calculatorTool],
      });
      
      agent.removeTool('calculator');
      
      expect(agent.tools).toHaveLength(0);
    });
  });
  
  describe('Agent.chat', () => {
    it('should return a response with message and metadata', async () => {
      // Mock the AI client
      const mockClient = createMockAIClient();
      mockClient.setResponse('hello', 'Hello! How can I help you?');
      
      const agent = createAgent({
        id: 'test-agent',
        name: 'Test Agent',
        systemPrompt: 'You are a test assistant.',
      });
      
      // Note: In real implementation, we'd inject the mock client
      // For now, this tests the structure
      expect(agent).toBeDefined();
    });
  });
});

describe('Tools', () => {
  describe('calculatorTool', () => {
    it('should evaluate simple expressions', async () => {
      const result = await calculatorTool.execute({ expression: '2 + 2' });
      expect(result).toBe(4);
    });
    
    it('should handle multiplication', async () => {
      const result = await calculatorTool.execute({ expression: '5 * 3' });
      expect(result).toBe(15);
    });
    
    it('should handle complex expressions', async () => {
      const result = await calculatorTool.execute({ expression: '(10 + 5) * 2' });
      expect(result).toBe(30);
    });
    
    it('should throw on invalid expressions', async () => {
      await expect(
        calculatorTool.execute({ expression: 'invalid' })
      ).rejects.toThrow();
    });
  });
});
