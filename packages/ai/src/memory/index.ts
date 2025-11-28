/**
 * Memory Module - Conversation memory and vector storage
 * 
 * Supports:
 * - Buffer memory (in-memory, limited messages)
 * - Vector memory (RAG with embeddings)
 * - Hybrid memory (combines both)
 */

import type { Message, UUID } from '@framework/core/types';
import { generateId } from '@framework/core/utils';
import { createLogger } from '@framework/config/logger';

const logger = createLogger('memory');

// =============================================================================
// TYPES
// =============================================================================

export interface Memory {
  add(message: Message): Promise<void>;
  get(limit?: number): Promise<Message[]>;
  search(query: string, limit?: number): Promise<Message[]>;
  clear(): Promise<void>;
}

export interface BufferMemoryOptions {
  maxMessages?: number;
}

export interface VectorMemoryOptions {
  collection: string;
  embeddingModel?: string;
  dimensions?: number;
}

// =============================================================================
// BUFFER MEMORY (In-Memory)
// =============================================================================

export class BufferMemory implements Memory {
  private messages: Message[] = [];
  private maxMessages: number;
  
  constructor(options: BufferMemoryOptions = {}) {
    this.maxMessages = options.maxMessages || 100;
  }
  
  async add(message: Message): Promise<void> {
    this.messages.push(message);
    
    // Trim to max size
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
    
    logger.debug({ messageCount: this.messages.length }, 'Message added to buffer memory');
  }
  
  async get(limit?: number): Promise<Message[]> {
    if (limit) {
      return this.messages.slice(-limit);
    }
    return [...this.messages];
  }
  
  async search(query: string, limit = 5): Promise<Message[]> {
    // Simple text search for buffer memory
    const queryLower = query.toLowerCase();
    
    const scored = this.messages
      .map(msg => ({
        message: msg,
        score: msg.content.toLowerCase().includes(queryLower) ? 1 : 0,
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return scored.map(item => item.message);
  }
  
  async clear(): Promise<void> {
    this.messages = [];
    logger.debug('Buffer memory cleared');
  }
}

// =============================================================================
// VECTOR MEMORY (RAG)
// =============================================================================

export interface VectorStore {
  upsert(id: string, embedding: number[], metadata: Record<string, unknown>): Promise<void>;
  search(embedding: number[], limit: number): Promise<Array<{ id: string; score: number; metadata: Record<string, unknown> }>>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export class VectorMemory implements Memory {
  private vectorStore: VectorStore;
  private embedder: EmbeddingProvider;
  private messageStore: Map<string, Message> = new Map();
  
  constructor(vectorStore: VectorStore, embedder: EmbeddingProvider) {
    this.vectorStore = vectorStore;
    this.embedder = embedder;
  }
  
  async add(message: Message): Promise<void> {
    const id = generateId();
    const embedding = await this.embedder.embed(message.content);
    
    await this.vectorStore.upsert(id, embedding, {
      role: message.role,
      timestamp: message.metadata?.timestamp || new Date().toISOString(),
    });
    
    this.messageStore.set(id, message);
    
    logger.debug({ messageId: id }, 'Message added to vector memory');
  }
  
  async get(limit?: number): Promise<Message[]> {
    // Vector memory doesn't have a natural ordering
    // Return most recent by timestamp if stored
    const messages = Array.from(this.messageStore.values());
    
    if (limit) {
      return messages.slice(-limit);
    }
    return messages;
  }
  
  async search(query: string, limit = 5): Promise<Message[]> {
    const embedding = await this.embedder.embed(query);
    const results = await this.vectorStore.search(embedding, limit);
    
    const messages: Message[] = [];
    for (const result of results) {
      const message = this.messageStore.get(result.id);
      if (message) {
        messages.push(message);
      }
    }
    
    logger.debug({ query: query.slice(0, 50), resultCount: messages.length }, 'Vector search completed');
    return messages;
  }
  
  async clear(): Promise<void> {
    await this.vectorStore.clear();
    this.messageStore.clear();
    logger.debug('Vector memory cleared');
  }
}

// =============================================================================
// HYBRID MEMORY
// =============================================================================

export class HybridMemory implements Memory {
  private buffer: BufferMemory;
  private vector: VectorMemory;
  
  constructor(buffer: BufferMemory, vector: VectorMemory) {
    this.buffer = buffer;
    this.vector = vector;
  }
  
  async add(message: Message): Promise<void> {
    await Promise.all([
      this.buffer.add(message),
      this.vector.add(message),
    ]);
  }
  
  async get(limit?: number): Promise<Message[]> {
    // Get recent messages from buffer
    return this.buffer.get(limit);
  }
  
  async search(query: string, limit = 5): Promise<Message[]> {
    // Search vector memory for semantic matches
    return this.vector.search(query, limit);
  }
  
  async clear(): Promise<void> {
    await Promise.all([
      this.buffer.clear(),
      this.vector.clear(),
    ]);
  }
}

// =============================================================================
// IN-MEMORY VECTOR STORE (for development)
// =============================================================================

export class InMemoryVectorStore implements VectorStore {
  private vectors: Map<string, { embedding: number[]; metadata: Record<string, unknown> }> = new Map();
  
  async upsert(id: string, embedding: number[], metadata: Record<string, unknown>): Promise<void> {
    this.vectors.set(id, { embedding, metadata });
  }
  
  async search(embedding: number[], limit: number): Promise<Array<{ id: string; score: number; metadata: Record<string, unknown> }>> {
    const results: Array<{ id: string; score: number; metadata: Record<string, unknown> }> = [];
    
    for (const [id, data] of this.vectors) {
      const score = this.cosineSimilarity(embedding, data.embedding);
      results.push({ id, score, metadata: data.metadata });
    }
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  async delete(id: string): Promise<void> {
    this.vectors.delete(id);
  }
  
  async clear(): Promise<void> {
    this.vectors.clear();
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a simple buffer memory
 */
export function createBufferMemory(options?: BufferMemoryOptions): Memory {
  return new BufferMemory(options);
}

/**
 * Create a vector memory with the given store and embedder
 */
export function createVectorMemory(
  vectorStore: VectorStore,
  embedder: EmbeddingProvider
): Memory {
  return new VectorMemory(vectorStore, embedder);
}

/**
 * Create a hybrid memory combining buffer and vector
 */
export function createHybridMemory(
  vectorStore: VectorStore,
  embedder: EmbeddingProvider,
  bufferOptions?: BufferMemoryOptions
): Memory {
  const buffer = new BufferMemory(bufferOptions);
  const vector = new VectorMemory(vectorStore, embedder);
  return new HybridMemory(buffer, vector);
}
