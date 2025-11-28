/**
 * Environment Configuration - Type-safe environment variable loading
 * 
 * Usage:
 *   import { loadConfig, config } from '@framework/config/env';
 *   loadConfig(); // Call once at startup
 *   console.log(config.database.url);
 */

import { z } from 'zod';
import * as dotenv from 'dotenv';
import { join } from 'path';

// =============================================================================
// ENVIRONMENT SCHEMA
// =============================================================================

const envSchema = z.object({
  // General
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  APP_NAME: z.string().default('ai-app'),

  // Database
  DATABASE_URL: z.string().optional(),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),

  // AI Providers
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_ORG_ID: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
  AI_DEFAULT_PROVIDER: z.enum(['openai', 'anthropic']).default('anthropic'),

  // Vector DB
  VECTOR_DB_PROVIDER: z.enum(['pgvector', 'weaviate', 'pinecone', 'supabase']).default('pgvector'),
  VECTOR_DB_URL: z.string().optional(),

  // Auth
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  NEXTAUTH_URL: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Google Integration
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional(),
  GOOGLE_SHEETS_ENABLED: z.coerce.boolean().default(false),
  GOOGLE_DRIVE_ENABLED: z.coerce.boolean().default(false),

  // GitHub Integration
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_DEFAULT_ORG: z.string().optional(),

  // n8n Integration
  N8N_LOCAL_URL: z.string().default('http://localhost:5678'),
  N8N_LOCAL_API_KEY: z.string().optional(),
  N8N_CLOUD_URL: z.string().optional(),
  N8N_CLOUD_API_KEY: z.string().optional(),
  N8N_WEBHOOK_SECRET: z.string().optional(),

  // AWS
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_SQS_QUEUE_URL: z.string().optional(),

  // Service URLs
  API_SERVICE_URL: z.string().default('http://localhost:4000'),
  AGENT_SERVICE_URL: z.string().default('http://localhost:4001'),
  A2A_SERVICE_URL: z.string().default('http://localhost:4002'),
  WEB_APP_URL: z.string().default('http://localhost:3000'),

  // Redis
  REDIS_URL: z.string().optional(),

  // Observability
  SENTRY_DSN: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  // Feature Flags
  FEATURE_RAG_ENABLED: z.coerce.boolean().default(true),
  FEATURE_A2A_ENABLED: z.coerce.boolean().default(false),
  FEATURE_MULTI_TENANT: z.coerce.boolean().default(false),

  // Development
  DEV_MOCK_AI: z.coerce.boolean().default(false),
  DEV_MOCK_DB: z.coerce.boolean().default(false),
  DEV_AUTO_SEED: z.coerce.boolean().default(true),
});

type EnvConfig = z.infer<typeof envSchema>;

// =============================================================================
// STRUCTURED CONFIG
// =============================================================================

export interface Config {
  env: 'development' | 'production' | 'test';
  appName: string;
  logLevel: string;
  
  database: {
    url?: string;
    poolMin: number;
    poolMax: number;
  };
  
  ai: {
    defaultProvider: 'openai' | 'anthropic';
    openai: {
      apiKey?: string;
      orgId?: string;
      model: string;
    };
    anthropic: {
      apiKey?: string;
      model: string;
    };
  };
  
  vectorDb: {
    provider: string;
    url?: string;
  };
  
  auth: {
    jwtSecret?: string;
    jwtExpiresIn: string;
    nextAuthUrl?: string;
    nextAuthSecret?: string;
  };
  
  oauth: {
    google: {
      clientId?: string;
      clientSecret?: string;
    };
    github: {
      clientId?: string;
      clientSecret?: string;
    };
  };
  
  integrations: {
    google: {
      serviceAccountEmail?: string;
      serviceAccountPrivateKey?: string;
      sheetsEnabled: boolean;
      driveEnabled: boolean;
    };
    github: {
      token?: string;
      appId?: string;
      defaultOrg?: string;
    };
    n8n: {
      localUrl: string;
      localApiKey?: string;
      cloudUrl?: string;
      cloudApiKey?: string;
      webhookSecret?: string;
    };
  };
  
  aws: {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    s3Bucket?: string;
    sqsQueueUrl?: string;
  };
  
  services: {
    api: string;
    agent: string;
    a2a: string;
    web: string;
  };
  
  redis?: {
    url: string;
  };
  
  observability: {
    sentryDsn?: string;
    otelEndpoint?: string;
  };
  
  rateLimit: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
  
  features: {
    ragEnabled: boolean;
    a2aEnabled: boolean;
    multiTenant: boolean;
  };
  
  dev: {
    mockAi: boolean;
    mockDb: boolean;
    autoSeed: boolean;
  };
}

// =============================================================================
// CONFIG INSTANCE
// =============================================================================

let _config: Config | null = null;

function buildConfig(env: EnvConfig): Config {
  return {
    env: env.NODE_ENV,
    appName: env.APP_NAME,
    logLevel: env.LOG_LEVEL,
    
    database: {
      url: env.DATABASE_URL,
      poolMin: env.DATABASE_POOL_MIN,
      poolMax: env.DATABASE_POOL_MAX,
    },
    
    ai: {
      defaultProvider: env.AI_DEFAULT_PROVIDER,
      openai: {
        apiKey: env.OPENAI_API_KEY,
        orgId: env.OPENAI_ORG_ID,
        model: env.OPENAI_MODEL,
      },
      anthropic: {
        apiKey: env.ANTHROPIC_API_KEY,
        model: env.ANTHROPIC_MODEL,
      },
    },
    
    vectorDb: {
      provider: env.VECTOR_DB_PROVIDER,
      url: env.VECTOR_DB_URL,
    },
    
    auth: {
      jwtSecret: env.JWT_SECRET,
      jwtExpiresIn: env.JWT_EXPIRES_IN,
      nextAuthUrl: env.NEXTAUTH_URL,
      nextAuthSecret: env.NEXTAUTH_SECRET,
    },
    
    oauth: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
    },
    
    integrations: {
      google: {
        serviceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        serviceAccountPrivateKey: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
        sheetsEnabled: env.GOOGLE_SHEETS_ENABLED,
        driveEnabled: env.GOOGLE_DRIVE_ENABLED,
      },
      github: {
        token: env.GITHUB_TOKEN,
        appId: env.GITHUB_APP_ID,
        defaultOrg: env.GITHUB_DEFAULT_ORG,
      },
      n8n: {
        localUrl: env.N8N_LOCAL_URL,
        localApiKey: env.N8N_LOCAL_API_KEY,
        cloudUrl: env.N8N_CLOUD_URL,
        cloudApiKey: env.N8N_CLOUD_API_KEY,
        webhookSecret: env.N8N_WEBHOOK_SECRET,
      },
    },
    
    aws: {
      region: env.AWS_REGION,
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      s3Bucket: env.AWS_S3_BUCKET,
      sqsQueueUrl: env.AWS_SQS_QUEUE_URL,
    },
    
    services: {
      api: env.API_SERVICE_URL,
      agent: env.AGENT_SERVICE_URL,
      a2a: env.A2A_SERVICE_URL,
      web: env.WEB_APP_URL,
    },
    
    redis: env.REDIS_URL ? { url: env.REDIS_URL } : undefined,
    
    observability: {
      sentryDsn: env.SENTRY_DSN,
      otelEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    },
    
    rateLimit: {
      enabled: env.RATE_LIMIT_ENABLED,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
      windowMs: env.RATE_LIMIT_WINDOW_MS,
    },
    
    features: {
      ragEnabled: env.FEATURE_RAG_ENABLED,
      a2aEnabled: env.FEATURE_A2A_ENABLED,
      multiTenant: env.FEATURE_MULTI_TENANT,
    },
    
    dev: {
      mockAi: env.DEV_MOCK_AI,
      mockDb: env.DEV_MOCK_DB,
      autoSeed: env.DEV_AUTO_SEED,
    },
  };
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Load configuration from environment variables
 * Call this once at application startup
 */
export function loadConfig(envPath?: string): Config {
  // Load .env files
  dotenv.config({ path: envPath || join(process.cwd(), '.env.local') });
  dotenv.config({ path: join(process.cwd(), '.env') });
  
  // Parse and validate
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    const errors = parsed.error.errors.map(e => 
      `  ${e.path.join('.')}: ${e.message}`
    ).join('\n');
    throw new Error(`Configuration validation failed:\n${errors}`);
  }
  
  _config = buildConfig(parsed.data);
  return _config;
}

/**
 * Get the current configuration
 * Throws if loadConfig() hasn't been called
 */
export function getConfig(): Config {
  if (!_config) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return _config;
}

/**
 * Get config, loading if necessary (convenience for scripts)
 */
export function config(): Config {
  if (!_config) {
    loadConfig();
  }
  return _config!;
}

/**
 * Check if we're in production
 */
export function isProd(): boolean {
  return getConfig().env === 'production';
}

/**
 * Check if we're in development
 */
export function isDev(): boolean {
  return getConfig().env === 'development';
}

/**
 * Check if we're in test
 */
export function isTest(): boolean {
  return getConfig().env === 'test';
}
