/**
 * Secrets Management - Secure credential handling
 * 
 * Supports:
 * - Environment variables (default)
 * - AWS Secrets Manager (production)
 * - Local .secrets file (development only)
 * 
 * Usage:
 *   import { getSecret, loadSecrets } from '@framework/config/secrets';
 *   await loadSecrets(); // Call once at startup
 *   const apiKey = await getSecret('OPENAI_API_KEY');
 */

import { getConfig, isDev } from './env';
import { createLogger } from './logger';
import { readFile, access } from 'fs/promises';
import { join } from 'path';

const logger = createLogger('secrets');

// =============================================================================
// TYPES
// =============================================================================

export interface SecretsProvider {
  get(key: string): Promise<string | undefined>;
  load(): Promise<void>;
}

type SecretValue = string | undefined;

// =============================================================================
// ENVIRONMENT PROVIDER (Default)
// =============================================================================

class EnvSecretsProvider implements SecretsProvider {
  async get(key: string): Promise<SecretValue> {
    return process.env[key];
  }
  
  async load(): Promise<void> {
    // Environment variables are already loaded
  }
}

// =============================================================================
// LOCAL FILE PROVIDER (Development)
// =============================================================================

class LocalFileSecretsProvider implements SecretsProvider {
  private secrets: Map<string, string> = new Map();
  private loaded = false;
  
  async get(key: string): Promise<SecretValue> {
    if (!this.loaded) {
      await this.load();
    }
    return this.secrets.get(key) || process.env[key];
  }
  
  async load(): Promise<void> {
    const secretsPath = join(process.cwd(), '.secrets');
    
    try {
      await access(secretsPath);
      const content = await readFile(secretsPath, 'utf-8');
      
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        
        // Remove quotes if present
        const unquoted = value.replace(/^["']|["']$/g, '');
        this.secrets.set(key, unquoted);
      }
      
      logger.debug({ count: this.secrets.size }, 'Loaded secrets from .secrets file');
    } catch (error) {
      // File doesn't exist, that's fine
      logger.debug('.secrets file not found, using environment variables');
    }
    
    this.loaded = true;
  }
}

// =============================================================================
// AWS SECRETS MANAGER PROVIDER
// =============================================================================

class AWSSecretsProvider implements SecretsProvider {
  private secrets: Map<string, string> = new Map();
  private loaded = false;
  private client: any = null; // AWS SDK SecretsManager client
  
  async get(key: string): Promise<SecretValue> {
    if (!this.loaded) {
      await this.load();
    }
    
    // Check cached secrets first
    if (this.secrets.has(key)) {
      return this.secrets.get(key);
    }
    
    // Fall back to environment variable
    return process.env[key];
  }
  
  async load(): Promise<void> {
    const config = getConfig();
    
    try {
      // Dynamic import to avoid requiring AWS SDK if not used
      const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
      
      this.client = new SecretsManagerClient({
        region: config.aws.region,
        credentials: config.aws.accessKeyId ? {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey!,
        } : undefined,
      });
      
      // Load all secrets with our prefix
      const prefix = process.env.AWS_SECRETS_PREFIX || `${config.appName}/`;
      
      // In a real implementation, you'd list secrets with the prefix
      // and load them. For now, we'll load specific known secrets.
      const secretNames = [
        'database-credentials',
        'api-keys',
        'oauth-secrets',
      ];
      
      for (const name of secretNames) {
        try {
          const command = new GetSecretValueCommand({
            SecretId: `${prefix}${name}`,
          });
          
          const response = await this.client.send(command);
          
          if (response.SecretString) {
            const parsed = JSON.parse(response.SecretString);
            for (const [key, value] of Object.entries(parsed)) {
              if (typeof value === 'string') {
                this.secrets.set(key, value);
              }
            }
          }
        } catch (error: any) {
          if (error.name !== 'ResourceNotFoundException') {
            logger.warn({ secretName: name, error: error.message }, 'Failed to load secret');
          }
        }
      }
      
      logger.info({ count: this.secrets.size }, 'Loaded secrets from AWS Secrets Manager');
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to initialize AWS Secrets Manager');
      // Fall back to environment variables
    }
    
    this.loaded = true;
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

let provider: SecretsProvider | null = null;

/**
 * Initialize the secrets provider
 * Call this once at application startup
 */
export async function loadSecrets(): Promise<void> {
  if (provider) {
    logger.debug('Secrets already loaded, skipping');
    return;
  }
  
  const config = getConfig();
  
  // Choose provider based on environment
  if (config.env === 'production' && config.aws.accessKeyId) {
    provider = new AWSSecretsProvider();
    logger.info('Using AWS Secrets Manager for secrets');
  } else if (isDev()) {
    provider = new LocalFileSecretsProvider();
    logger.info('Using local file/env for secrets');
  } else {
    provider = new EnvSecretsProvider();
    logger.info('Using environment variables for secrets');
  }
  
  await provider.load();
}

/**
 * Get a secret value
 * Returns undefined if the secret doesn't exist
 */
export async function getSecret(key: string): Promise<string | undefined> {
  if (!provider) {
    // Auto-initialize with env provider if not loaded
    provider = new EnvSecretsProvider();
    await provider.load();
  }
  
  return provider.get(key);
}

/**
 * Get a required secret value
 * Throws if the secret doesn't exist
 */
export async function requireSecret(key: string): Promise<string> {
  const value = await getSecret(key);
  if (!value) {
    throw new Error(`Required secret not found: ${key}`);
  }
  return value;
}

/**
 * Check if a secret exists
 */
export async function hasSecret(key: string): Promise<boolean> {
  const value = await getSecret(key);
  return value !== undefined;
}

// =============================================================================
// SENSITIVE VALUE HANDLING
// =============================================================================

/**
 * Mask a sensitive value for logging
 * Shows first and last 2 characters: "sk-abc...xyz"
 */
export function maskSecret(value: string): string {
  if (value.length <= 8) {
    return '****';
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

/**
 * Create a proxy that masks secrets in logs
 */
export function createSecureLogger(baseLogger: any): any {
  const sensitiveKeys = ['password', 'secret', 'token', 'key', 'apiKey', 'credential'];
  
  const maskValue = (key: string, value: unknown): unknown => {
    if (typeof value !== 'string') return value;
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
      return maskSecret(value);
    }
    return value;
  };
  
  const maskObject = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        result[key] = maskObject(value as Record<string, unknown>);
      } else {
        result[key] = maskValue(key, value);
      }
    }
    return result;
  };
  
  return new Proxy(baseLogger, {
    get(target, prop) {
      const value = target[prop];
      if (typeof value === 'function' && ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(prop as string)) {
        return (objOrMsg: unknown, msg?: string) => {
          if (typeof objOrMsg === 'object' && objOrMsg !== null) {
            value.call(target, maskObject(objOrMsg as Record<string, unknown>), msg);
          } else {
            value.call(target, objOrMsg, msg);
          }
        };
      }
      return value;
    },
  });
}
