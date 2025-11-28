-- =============================================================================
-- Database Initialization Script
-- =============================================================================
-- This script runs when the PostgreSQL container is first created.
-- It sets up extensions and creates additional databases needed.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create additional databases
CREATE DATABASE n8n;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE ai_framework TO postgres;
GRANT ALL PRIVILEGES ON DATABASE n8n TO postgres;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Database initialization complete';
END $$;
