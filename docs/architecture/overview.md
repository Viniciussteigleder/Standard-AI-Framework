# Architecture Overview

## Design Philosophy

This framework follows these core principles:

1. **Progressive Complexity** - Start simple, add complexity as needed
2. **Explicit over Implicit** - No magic, clear data flow
3. **Type Safety** - TypeScript everywhere with runtime validation
4. **Modularity** - Enable only what you need
5. **AI-Native** - Built for agent development

## Layer Architecture

### 1. Foundation Layer (`packages/`)

The foundation provides shared utilities that every service needs:

```
packages/
├── core/         # Types, validation, errors, utilities
├── config/       # Environment, logging, secrets
└── ai/           # Agents, tools, memory, prompts
```

**Key Decisions:**

- **Zod for validation**: Runtime type checking with TypeScript inference
- **Pino for logging**: Fast, structured JSON logging
- **Custom error classes**: Consistent error handling across services
- **Modular AI package**: Swap providers without changing code

### 2. Service Layer (`apps/`)

Independent, deployable services:

```
apps/
├── api/          # Business logic, DB, auth
├── agent/        # AI agents, chat endpoints
├── a2a/          # Workflow orchestration
└── web/          # Next.js frontend
```

**Communication Patterns:**

- **Sync**: HTTP/REST between services
- **Async**: Redis queues or AWS SQS
- **Events**: Webhooks for external triggers

### 3. Integration Layer (`integrations/`)

Plug-and-play connectors:

```
integrations/
├── google/       # Sheets, Drive, Auth
├── github/       # Repos, PRs, Actions
├── n8n/          # Workflow automation
└── aws/          # S3, SQS, SES, etc.
```

**Pattern:**

```typescript
// Each integration provides:
interface Integration {
  createClient(config?): Promise<Client>;  // Factory
  createTool(client): Tool;                // For agents
}
```

## Data Flow

### Request Flow

```
Client Request
     │
     ▼
┌─────────┐
│   Web   │ (Next.js)
└────┬────┘
     │ API call
     ▼
┌─────────┐
│   API   │ (Fastify)
└────┬────┘
     │ Agent call (if AI needed)
     ▼
┌─────────┐
│  Agent  │ (AI Service)
└────┬────┘
     │ Tool calls
     ▼
┌─────────────┐
│ Integrations │
└─────────────┘
```

### Agent Loop

```
User Input
     │
     ▼
┌───────────────┐
│ System Prompt │
│ + Tools Def   │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  AI Provider  │ (Anthropic/OpenAI)
└───────┬───────┘
        │
   ┌────┴────┐
   │         │
   ▼         ▼
[Response] [Tool Calls]
              │
              ▼
       ┌────────────┐
       │ Execute    │
       │ Tools      │
       └─────┬──────┘
             │
             └──► Back to AI with results
```

## Configuration Strategy

### Environment Variables

Single source of truth via `.env.local`:

```env
# Pattern: CATEGORY_SETTING=value
DATABASE_URL=...
ANTHROPIC_API_KEY=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
```

### Config Loading

```typescript
// packages/config/src/env.ts
const config = {
  database: { url: env.DATABASE_URL },
  ai: {
    anthropic: { apiKey: env.ANTHROPIC_API_KEY }
  }
};
```

### Secrets Management

Development:
- `.env.local` file
- `.secrets` file (gitignored)

Production:
- AWS Secrets Manager
- Environment variables (injected by orchestrator)

## Error Handling

### Error Hierarchy

```typescript
FrameworkError (base)
├── ValidationError (400)
├── AuthenticationError (401)
├── AuthorizationError (403)
├── NotFoundError (404)
├── ConflictError (409)
├── RateLimitError (429)
├── InternalError (500)
├── ExternalServiceError (502)
└── AI-specific errors
    ├── AIProviderError
    ├── ToolExecutionError
    └── MaxIterationsError
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found: abc123",
    "details": { "resource": "User", "identifier": "abc123" }
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
// packages/*/src/**/*.test.ts
describe('createAgent', () => {
  it('should create agent with tools', () => {
    const agent = createAgent({ ... });
    expect(agent.tools).toHaveLength(2);
  });
});
```

### Integration Tests

```typescript
// apps/*/tests/integration/*.test.ts
describe('API /users', () => {
  it('should create user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/users',
      payload: { ... }
    });
    expect(response.statusCode).toBe(201);
  });
});
```

### E2E Tests

```typescript
// tests/e2e/*.spec.ts
test('user can chat with agent', async ({ page }) => {
  await page.goto('/chat');
  await page.fill('input', 'Hello');
  await page.click('button[type=submit]');
  await expect(page.locator('.response')).toBeVisible();
});
```

## Deployment Architecture

### Local Development

```
┌────────────────────────────────────┐
│           Docker Compose           │
│  ┌──────┐  ┌───────┐  ┌────────┐  │
│  │Postgres│  │ Redis │  │  n8n  │  │
│  └──────┘  └───────┘  └────────┘  │
└────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│          Local Services            │
│  ┌─────┐  ┌───────┐  ┌────────┐   │
│  │ API │  │ Agent │  │  Web   │   │
│  │:4000│  │ :4001 │  │ :3000  │   │
│  └─────┘  └───────┘  └────────┘   │
└────────────────────────────────────┘
```

### Production (AWS + Vercel)

```
┌─────────────────────────────────────────────┐
│                   Vercel                     │
│  ┌──────────────────────────────────────┐   │
│  │           Next.js (Web)               │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│                   AWS                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   ALB    │──│   ECS    │──│   RDS    │  │
│  │          │  │(API/Agent)│  │(Postgres)│  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                      │                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │    S3    │  │   SQS    │  │ Secrets  │  │
│  │ (files)  │  │ (queues) │  │ Manager  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│              n8n Cloud                       │
│  ┌──────────────────────────────────────┐   │
│  │         Workflow Automation           │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Security Considerations

### Authentication

- JWT tokens with short expiry (API)
- HTTP-only cookies (Web)
- API keys for service-to-service

### Authorization

- Role-based access control (RBAC)
- Resource-level permissions
- Multi-tenant isolation (optional)

### Data Protection

- Secrets never in code
- Environment-specific configs
- Audit logging for sensitive ops

## Performance Guidelines

### Caching Strategy

- **Response Cache**: Redis for API responses
- **Session Cache**: Redis for user sessions
- **Vector Cache**: In-memory for recent embeddings

### Database

- Connection pooling (PgBouncer or Prisma)
- Read replicas for heavy read workloads
- Indexes on frequently queried columns

### Agent Optimization

- Token limits to control costs
- Tool timeouts to prevent hangs
- Parallel tool execution where safe
