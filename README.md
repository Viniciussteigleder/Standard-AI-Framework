# Standard AI Framework

> 🚀 **One command to start any AI project** - with all your credentials pre-configured.

A modular, production-ready framework for building AI-powered applications, agents, and automation systems. Configure your API keys once, use them everywhere.

## ✨ Key Features

- **🔐 Centralized Secrets** - Configure API keys once, auto-sync to all projects
- **🤖 AI-Native** - Built-in support for Anthropic (Claude) and OpenAI
- **📦 Modular Design** - Use only what you need
- **🔧 Ready-to-Use Templates** - API, Agent, Web services pre-configured
- **🔌 Plug-and-Play Integrations** - Google Sheets, GitHub, n8n, AWS
- **📝 AI-Assistant Friendly** - `.claude/CONTEXT.md` for Claude/Copilot

## 🚀 Quick Start

### First-Time Setup (Do Once)

```bash
# 1. Clone the framework
git clone https://github.com/Viniciussteigleder/Standard-AI-Framework.git
cd Standard-AI-Framework

# 2. Install dependencies
pnpm install

# 3. Configure your secrets (API keys, credentials)
node bin/ai-framework.js secrets:setup
```

This stores your credentials securely in `~/.ai-framework/secrets.env`.

### Create a New Project

```bash
# Create a new project with all dependencies and your secrets
node bin/ai-framework.js create my-project

# Or if installed globally:
ai-framework create my-project

# That's it! Start developing
cd my-project
pnpm dev
```

Your project is ready with:
- ✅ All dependencies installed
- ✅ Your API keys configured
- ✅ Git repository initialized
- ✅ TypeScript configured
- ✅ Development servers ready

## 📁 Project Structure

```
my-project/
├── apps/                      # Deployable applications
│   ├── web/                   # Next.js frontend
│   ├── api/                   # Backend API (Fastify)
│   ├── agent/                 # AI agent service
│   └── a2a/                   # Agent-to-agent orchestration
│
├── packages/                  # Shared libraries
│   ├── core/                  # Types, validation, errors
│   ├── config/                # Environment, logging, secrets
│   └── ai/                    # Agents, tools, memory, prompts
│
├── integrations/              # External service connectors
│   ├── google/                # Sheets, Drive
│   ├── github/                # Repos, PRs, Actions
│   ├── n8n/                   # Workflow automation
│   └── aws/                   # S3, SQS, etc.
│
├── .env.local                 # Your secrets (auto-synced)
└── .claude/CONTEXT.md         # AI assistant context
```

## 🔐 Secrets Management

### How It Works

1. **Configure once**: Run `ai-framework secrets:setup` and enter your API keys
2. **Stored securely**: Credentials saved to `~/.ai-framework/secrets.env` (chmod 600)
3. **Auto-sync**: Every new project automatically gets your credentials

### Supported Credentials

| Service | Keys |
|---------|------|
| **Anthropic** | `ANTHROPIC_API_KEY` |
| **OpenAI** | `OPENAI_API_KEY`, `OPENAI_ORG_ID` |
| **Google** | Service Account Email & Key |
| **GitHub** | Personal Access Token |
| **AWS** | Access Key, Secret Key, Region |
| **n8n** | Cloud URL, API Key |
| **Database** | PostgreSQL URL |

### Manual Secret Sync

```bash
# Sync secrets to current project
cd my-project
ai-framework secrets:sync
```

## 🤖 Building AI Agents

### Create Your First Agent

```typescript
import { createAgent } from '@framework/ai';
import { calculatorTool, currentTimeTool } from '@framework/ai/tools';

const myAgent = createAgent({
  id: 'assistant',
  name: 'My Assistant',
  systemPrompt: `You are a helpful assistant.
You can do calculations and tell the time.`,
  tools: [calculatorTool, currentTimeTool],
});

// Chat with the agent
const result = await myAgent.chat('What is 25 * 47?');
console.log(result.message.content);
// "25 × 47 = 1,175"
```

### Create Custom Tools

```typescript
import { createTool } from '@framework/ai/tools';

const weatherTool = createTool({
  name: 'get_weather',
  description: 'Get current weather for a location',
  parameters: {
    type: 'object',
    properties: {
      city: { type: 'string', description: 'City name' },
    },
    required: ['city'],
  },
  execute: async ({ city }) => {
    // Your implementation
    return { temp: 22, condition: 'sunny' };
  },
});

// Add to agent
myAgent.addTool(weatherTool);
```

## 📦 CLI Commands

```bash
ai-framework <command> [options]

Commands:
  create <n>           Create a new project
  secrets:setup           Configure centralized secrets
  secrets:sync            Sync secrets to current project
  add:service <type>      Add service (api, agent, web, a2a)
  add:integration <n>  Add integration (google, github, n8n, aws)
  help                    Show help
```

### Examples

```bash
# Create new project
ai-framework create my-saas-app

# Add an API service to existing project
ai-framework add:service api

# Add Google Sheets integration
ai-framework add:integration google
```

## 🔧 Development Commands

Inside any project:

```bash
pnpm dev          # Start all services
pnpm dev:api      # Start API only
pnpm dev:agent    # Start agent service only
pnpm dev:web      # Start web app only

pnpm build        # Build all packages
pnpm test         # Run tests
pnpm lint         # Lint code
pnpm type-check   # TypeScript check
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  Next.js Apps │ Dashboards │ Chat UIs │ Admin Panels        │
├─────────────────────────────────────────────────────────────┤
│                    AI & AUTOMATION LAYER                     │
│  Agents │ Tools │ RAG │ A2A Orchestration │ n8n Workflows   │
├─────────────────────────────────────────────────────────────┤
│                      SERVICE LAYER                           │
│  API Services │ Auth/SSO │ Business Logic │ Webhooks        │
├─────────────────────────────────────────────────────────────┤
│                    FOUNDATION LAYER                          │
│  Config │ Logging │ Types │ Validation │ Secrets            │
└─────────────────────────────────────────────────────────────┘
```

## 🔌 Integrations

### Google Sheets

```typescript
import { createGoogleSheetsClient } from '@framework/integrations/google';

const sheets = await createGoogleSheetsClient();

// Read data
const data = await sheets.read('spreadsheet-id', 'Sheet1!A1:D10');

// Write data
await sheets.write('spreadsheet-id', 'Sheet1!A1', [
  ['Name', 'Value'],
  ['Item 1', '100'],
]);
```

### n8n Workflows

```typescript
import { createN8nClient } from '@framework/integrations/n8n';

const n8n = await createN8nClient();

// Trigger a workflow
await n8n.triggerWorkflow('workflow-id', {
  data: { key: 'value' }
});
```

## 🧪 Testing

```typescript
import { createMockAIClient } from '@framework/ai/agents';

// Use mock AI for tests
const mockAI = createMockAIClient();
mockAI.setResponse('hello', 'Hi there!');

// Test your agent without API calls
```

## 📚 Documentation

- [Getting Started](./docs/guides/getting-started.md)
- [Architecture Overview](./docs/architecture/overview.md)

## 🤝 For AI Assistants

This framework includes `.claude/CONTEXT.md` with detailed instructions for AI coding assistants. When using Claude, Copilot, or similar tools:

1. The AI will understand the project structure
2. Know which packages to import
3. Follow established patterns
4. Use proper error handling

## 📋 Requirements

- Node.js 20+
- pnpm 8+
- Git

## 🛡️ Security

- Secrets are stored with 600 permissions (owner read/write only)
- No secrets in git (`.gitignore` configured)
- JWT secrets auto-generated if not provided
- Environment-specific configuration

## 📄 License

MIT © Vinicius Steigleder

---

**Created with ❤️ for efficient AI development**
