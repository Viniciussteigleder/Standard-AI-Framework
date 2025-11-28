# Getting Started Guide

This guide will help you set up and start using the AI Framework for your first project.

## Prerequisites

- Node.js 20+
- pnpm 8+ (`npm install -g pnpm`)
- Git
- Optional: Docker (for local n8n, databases)

## Quick Start (5 minutes)

### 1. Clone and Install

```bash
git clone https://github.com/your-org/ai-framework.git my-project
cd my-project
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Minimum required for development
ANTHROPIC_API_KEY=sk-ant-...    # or OPENAI_API_KEY

# Optional but recommended
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp
```

### 3. Start Development

```bash
pnpm dev
```

This starts:
- API service on http://localhost:4000
- Agent service on http://localhost:4001
- Web app on http://localhost:3000

## Project Structure

After setup, you'll have:

```
my-project/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── api/          # Backend API
│   └── agent/        # AI agent service
├── packages/
│   ├── core/         # Shared types & utilities
│   ├── config/       # Configuration
│   └── ai/           # AI/agent libraries
└── integrations/     # External service connectors
```

## Your First Agent

Create a file `apps/agent/src/agents/my-agent.ts`:

```typescript
import { createAgent } from '@framework/ai';
import { calculatorTool, currentTimeTool } from '@framework/ai/tools';

export const myAgent = createAgent({
  id: 'my-agent',
  name: 'My First Agent',
  systemPrompt: `You are a helpful assistant. 
You can do calculations and tell the time.
Be concise and friendly.`,
  tools: [calculatorTool, currentTimeTool],
  model: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
  },
});
```

### Test Your Agent

```typescript
const result = await myAgent.chat('What is 25 * 47?');
console.log(result.message.content);
// "25 × 47 = 1,175"
```

## Adding Integrations

### Google Sheets

1. Set up credentials in `.env.local`:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_SHEETS_ENABLED=true
```

2. Use in your code:

```typescript
import { createGoogleSheetsClient } from '@framework/integrations/google';

const sheets = await createGoogleSheetsClient();
const data = await sheets.read('spreadsheet-id', 'Sheet1!A1:D10');
```

### n8n Workflows

1. Start local n8n:

```bash
pnpm n8n:local
```

2. Configure:

```env
N8N_LOCAL_URL=http://localhost:5678
N8N_LOCAL_API_KEY=your-api-key
```

3. Trigger workflows:

```typescript
import { createN8nClient } from '@framework/integrations/n8n';

const n8n = await createN8nClient();
await n8n.triggerWorkflow('workflow-id', { data: 'value' });
```

## Development Workflow

### 1. Make Changes

Edit files in `apps/` or `packages/`. Changes auto-reload in dev mode.

### 2. Add New Features

```bash
# Create a new tool
touch packages/ai/src/tools/my-tool.ts

# Create a new API route
touch apps/api/src/routes/my-route.ts
```

### 3. Build & Test

```bash
pnpm build        # Build all packages
pnpm test         # Run tests
pnpm type-check   # TypeScript check
```

### 4. Deploy

```bash
# Deploy to Vercel (web app)
cd apps/web && vercel

# Deploy API to AWS (see infra/ docs)
cd infra/terraform && terraform apply
```

## Common Patterns

### API Route

```typescript
// apps/api/src/routes/users.ts
import { FastifyPluginAsync } from 'fastify';
import { createUserSchema } from '@framework/core/validation';

export const usersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/users', async (request, reply) => {
    const data = createUserSchema.parse(request.body);
    // Create user...
    return { success: true, user };
  });
};
```

### Custom Tool

```typescript
// packages/ai/src/tools/weather.ts
import { createTool } from './index';

export const weatherTool = createTool({
  name: 'get_weather',
  description: 'Get current weather for a location',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name' },
    },
    required: ['location'],
  },
  execute: async ({ location }) => {
    const response = await fetch(`https://api.weather.com/...`);
    return response.json();
  },
});
```

### Using Memory

```typescript
import { createAgent } from '@framework/ai';
import { createBufferMemory } from '@framework/ai/memory';

const memory = createBufferMemory({ maxMessages: 50 });

const agent = createAgent({
  id: 'memory-agent',
  name: 'Agent with Memory',
  systemPrompt: '...',
  memory,
});

// Conversations are remembered
await agent.chat('My name is Alice');
await agent.chat('What is my name?'); // "Your name is Alice"
```

## Next Steps

1. **Read the Architecture Docs** - `docs/architecture/`
2. **Explore Examples** - `templates/` and `workflows/`
3. **Set Up Database** - PostgreSQL with Prisma
4. **Configure Auth** - NextAuth or custom JWT
5. **Deploy** - Vercel for web, AWS for services

## Getting Help

- Check `.claude/CONTEXT.md` for AI assistant guidance
- Review existing code in `packages/` for patterns
- Open an issue on GitHub for bugs/features

Happy building! 🚀
