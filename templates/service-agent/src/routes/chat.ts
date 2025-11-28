/**
 * Chat Routes
 * 
 * HTTP and WebSocket endpoints for chatting with agents.
 */

import { FastifyPluginAsync } from 'fastify';
import { chatRequestSchema } from '@framework/core/validation';
import { NotFoundError, ValidationError } from '@framework/core/errors';
import { generateId } from '@framework/core/utils';

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  // HTTP chat endpoint
  fastify.post('/', async (request, reply) => {
    const result = chatRequestSchema.safeParse(request.body);
    
    if (!result.success) {
      throw new ValidationError('Invalid chat request', {
        errors: result.error.errors,
      });
    }
    
    const { message, agentId = 'assistant', conversationId, context } = result.data;
    
    // Get agent
    const agent = fastify.agents.get(agentId);
    if (!agent) {
      throw new NotFoundError('Agent', agentId);
    }
    
    // Execute chat
    const chatResult = await agent.chat(message, {
      conversationId: conversationId || generateId(),
      context,
    });
    
    return {
      success: true,
      data: {
        conversationId: chatResult.conversationId,
        message: chatResult.message,
        usage: chatResult.usage,
      },
    };
  });
  
  // WebSocket chat endpoint for streaming
  fastify.get('/ws', { websocket: true }, (connection, request) => {
    const { socket } = connection;
    
    socket.on('message', async (rawMessage) => {
      try {
        const data = JSON.parse(rawMessage.toString());
        const result = chatRequestSchema.safeParse(data);
        
        if (!result.success) {
          socket.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format',
          }));
          return;
        }
        
        const { message, agentId = 'assistant', conversationId, context } = result.data;
        const agent = fastify.agents.get(agentId);
        
        if (!agent) {
          socket.send(JSON.stringify({
            type: 'error',
            error: `Agent not found: ${agentId}`,
          }));
          return;
        }
        
        // Stream response
        socket.send(JSON.stringify({ type: 'start' }));
        
        const stream = agent.chatStream(message, {
          conversationId: conversationId || generateId(),
          context,
        });
        
        for await (const chunk of stream) {
          socket.send(JSON.stringify({
            type: 'chunk',
            content: chunk,
          }));
        }
        
        const finalResult = await stream.return(undefined as any);
        
        socket.send(JSON.stringify({
          type: 'end',
          data: {
            conversationId: finalResult.value?.conversationId,
            usage: finalResult.value?.usage,
          },
        }));
      } catch (error: any) {
        socket.send(JSON.stringify({
          type: 'error',
          error: error.message,
        }));
      }
    });
    
    socket.on('close', () => {
      // Cleanup if needed
    });
  });
  
  // Conversation history endpoint
  fastify.get('/:conversationId', async (request) => {
    const { conversationId } = request.params as { conversationId: string };
    
    // TODO: Implement conversation storage and retrieval
    // const conversation = await conversationService.get(conversationId);
    
    return {
      success: true,
      data: {
        conversationId,
        messages: [], // Would return actual messages
      },
    };
  });
};
