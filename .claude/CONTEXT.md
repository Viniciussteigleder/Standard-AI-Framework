# AI Framework - Context for AI Assistants

This file provides context for AI assistants (Claude, GitHub Copilot, etc.) working with this codebase.

## Project Overview

This is a **modular AI development framework** designed for building:
- AI-powered web applications (Next.js + React + Tailwind)
- Chatbots and conversational agents (Claude, GPT-4)
- Python AI services (FastAPI + Pydantic)
- Automated workflows (A2A - Agent-to-Agent)
- Data processing pipelines
- SaaS applications with multi-tenancy

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  Next.js Apps │ Dashboards │ Chat UIs │ Admin Panels        │
├─────────────────────────────────────────────────────────────┤
│                    AI & AUTOMATION LAYER                     │
│  Agents │ Tools │ Skills │ A2A Orchestration │ n8n          │
├─────────────────────────────────────────────────────────────┤
│                      SERVICE LAYER                           │
│  Node.js API │ Python API │ Auth/SSO │ Webhooks             │
├─────────────────────────────────────────────────────────────┤
│                       DATA LAYER                             │
│  Prisma ORM │ PostgreSQL │ PGVector │ Redis                 │
├─────────────────────────────────────────────────────────────┤
│                    FOUNDATION LAYER                          │
│  Config │ Logging │ Types │ Validation │ Secrets            │
└─────────────────────────────────────────────────────────────┘
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `apps/` | Deployable services (web, api, agent, a2a) |
| `packages/core` | Types, validation, errors, utilities |
| `packages/config` | Environment, logging, secrets |
| `packages/ai` | Agents, tools, skills, memory, prompts |
| `packages/database` | **Prisma schema, client, migrations** |
| `integrations/` | External connectors (google, github, n8n, aws) |
| `templates/service-python` | **Python FastAPI template** |
| `skills/` | Skill definitions (markdown + metadata) |
| `lookups/` | Reference data for agents |
| `prompts/` | System prompts and templates |
| `tests/` | Unit, integration, e2e tests |
| `infra/docker` | Docker compose and configs |
| `logs/` | Runtime log files |

## Technology Stack

### Frontend
- **Next.js 14** (App Router)
- **Tailwind CSS** + shadcn/ui
- **React Query** + Zustand
- **React Hook Form** + Zod

### Backend (Node.js)
- **Fastify** (API framework)
- **Prisma** (ORM)
- **Zod** (validation)
- **Pino** (logging)

### Backend (Python)
- **FastAPI** (API framework)
- **Pydantic** (validation)
- **structlog** (logging)
- **Anthropic/OpenAI SDKs**

### Database
- **PostgreSQL 16** with PGVector
- **Prisma** for migrations
- **Redis** for caching/queues

## Key Patterns

### 1. Agent Creation

```typescript
import { createAgent } from '@framework/ai';
import { calculatorTool } from '@framework/ai/tools';

const agent = createAgent({
  id: 'data-analyst',
  name: 'Data Analyst',
  systemPrompt: 'You are a data analysis assistant...',
  tools: [calculatorTool],
  model: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
});

const result = await agent.chat('What is 2+2?');
```

### 2. Database Access

```typescript
import { prisma, transaction } from '@framework/database';

// Simple query
const user = await prisma.user.findUnique({ where: { id } });

// Transaction
await transaction(async (tx) => {
  await tx.user.update({ where: { id }, data: { name } });
  await tx.auditLog.create({ data: { action: 'user.update', userId: id } });
});
```

### 3. Python Service

```python
from src.agents import get_agent
from src.models import ChatRequest, Message, MessageRole

agent = get_agent("assistant")
messages = [Message(role=MessageRole.USER, content="Hello")]
response, tool_results = await agent.chat(messages)
```

### 4. Logging

```typescript
import { createLogger, LogChannels, logAudit } from '@framework/config';

const logger = LogChannels.api('users-route');
logger.info({ userId }, 'User fetched');

logAudit({ action: 'user.create', userId, outcome: 'success' });
```

## Database Schema (Prisma)

Key models in `packages/database/prisma/schema.prisma`:

- **User** - Authentication and profiles
- **Tenant** - Multi-tenancy support
- **Agent** - AI agent configurations
- **Conversation** - Chat sessions
- **Message** - Individual messages with metadata
- **Document** + **Embedding** - RAG storage
- **Workflow** + **WorkflowExecution** - Automation
- **Integration** - External service configs
- **AuditLog** - Security logging

## Development Commands

```bash
# Development
pnpm dev              # Start all services
pnpm dev:api          # Start API only
pnpm dev:agent        # Start agent service
pnpm dev:web          # Start web app
pnpm dev:python       # Start Python service

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to DB
pnpm db:migrate       # Create migration
pnpm db:seed          # Seed database
pnpm db:studio        # Open Prisma Studio

# Docker
pnpm docker:up        # Start PostgreSQL, Redis
pnpm docker:up:tools  # Include adminer, n8n
pnpm docker:up:full   # Include all services
pnpm docker:python    # Start Python service
pnpm docker:reset     # Reset all data

# Testing
pnpm test             # Run all tests
pnpm test:unit        # Run unit tests
pnpm test:integration # Run integration tests
pnpm test:coverage    # Run with coverage

# Build & Quality
pnpm build            # Build all packages
pnpm lint             # Lint code
pnpm type-check       # TypeScript check
pnpm format           # Format code
```

## File Locations

| What | Where |
|------|-------|
| **Prisma schema** | `packages/database/prisma/schema.prisma` |
| **Database seed** | `packages/database/prisma/seed.ts` |
| **Python service** | `templates/service-python/` |
| **Dockerfiles** | `templates/service-*/Dockerfile` |
| **Logs** | `logs/{api,agent,web,error,audit}.log` |
| **Skills** | `skills/{category}/{skill-id}.md` |
| **Lookups** | `lookups/{domain}/{file}.md` |
| **Prompts** | `prompts/{system,agents,tools}/` |

## Environment Setup

1. Copy `.env.example` to `.env.local`
2. Start infrastructure: `pnpm docker:up`
3. Generate Prisma client: `pnpm db:generate`
4. Push schema: `pnpm db:push`
5. Seed data: `pnpm db:seed`
6. Start dev servers: `pnpm dev`

## Provider Support

| Category | Options |
|----------|---------|
| **AI** | Anthropic (Claude), OpenAI (GPT-4) |
| **Vector DB** | PGVector, Weaviate, Pinecone, Supabase |
| **Integrations** | Google Sheets, GitHub, n8n, AWS |
| **Database** | PostgreSQL (via Prisma) |
| **Cache** | Redis |

## When Implementing Features

1. **Always use TypeScript/Python types** properly
2. **Follow existing patterns** - look at similar code first
3. **Use framework packages** - never reinvent utilities
4. **Validate inputs** with Zod (TS) or Pydantic (Python)
5. **Log appropriately** using LogChannels
6. **Handle errors** with custom error classes
7. **Write tests** for new functionality
8. **Use Prisma** for database operations
