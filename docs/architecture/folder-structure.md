# Standard AI Framework - Complete Folder Structure

## Framework Repository Structure

```
Standard-AI-Framework/
│
├── 📁 .claude/                          # AI Assistant Context
│   └── CONTEXT.md                       # Framework patterns & instructions for AI
│
├── 📁 .github/                          # GitHub Configuration
│   └── workflows/
│       ├── ci.yml                       # Continuous Integration
│       └── deploy.yml                   # Deployment Pipeline
│
├── 📁 apps/                             # Deployable Applications
│   ├── {web,api,agent,a2a}/             # Placeholder directories
│   └── src/                             # (Created when services added)
│
├── 📁 bin/                              # CLI Executables
│   └── ai-framework.js                  # Main CLI tool
│
├── 📁 docs/                             # Documentation
│   ├── architecture/
│   │   └── overview.md                  # System architecture
│   └── guides/
│       ├── getting-started.md           # Quick start guide
│       └── logging.md                   # Logging guide
│
├── 📁 infra/                            # Infrastructure
│   └── docker/
│       ├── docker-compose.yml           # PostgreSQL, Redis
│       └── n8n-local.yml                # Local n8n instance
│
├── 📁 integrations/                     # External Service Connectors
│   ├── google/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── sheets.ts                # Google Sheets client
│   │   └── package.json
│   ├── n8n/
│   │   ├── src/
│   │   │   └── index.ts                 # n8n workflow client
│   │   └── package.json
│   ├── github/                          # (Placeholder)
│   └── aws/                             # (Placeholder)
│
├── 📁 logs/                             # Log Files (gitignored)
│   ├── api.log                          # API service logs
│   ├── agent.log                        # Agent execution logs
│   ├── web.log                          # Web/SSR logs
│   ├── error.log                        # Aggregated errors
│   └── audit.log                        # Security audit trail
│
├── 📁 lookups/                          # Reference Data (Markdown)
│   ├── business/
│   │   └── customer-tiers.md            # Business reference data
│   └── technical/
│       └── (technical reference files)
│
├── 📁 packages/                         # Shared Libraries
│   ├── core/
│   │   ├── src/
│   │   │   ├── types/index.ts           # Type definitions
│   │   │   ├── validation/index.ts      # Zod schemas
│   │   │   ├── errors/index.ts          # Error classes
│   │   │   ├── utils/index.ts           # Utility functions
│   │   │   └── index.ts                 # Package exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── config/
│   │   ├── src/
│   │   │   ├── env.ts                   # Environment config
│   │   │   ├── logger.ts                # Logging system
│   │   │   ├── secrets.ts               # Secrets management
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ai/
│       ├── src/
│       │   ├── agents/
│       │   │   ├── base.ts              # Base agent class
│       │   │   ├── providers.ts         # AI provider abstraction
│       │   │   └── index.ts
│       │   ├── tools/
│       │   │   └── index.ts             # Tool utilities & built-ins
│       │   ├── skills/
│       │   │   ├── price-checker.ts     # Example skill
│       │   │   └── index.ts             # Skill registry
│       │   ├── lookups/
│       │   │   └── index.ts             # Lookup loader
│       │   ├── memory/
│       │   │   └── index.ts             # Memory systems
│       │   ├── prompts/
│       │   │   └── index.ts             # Prompt templates
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── 📁 prompts/                          # System Prompts & Instructions
│   ├── system/
│   │   └── base-assistant.md            # Base system prompt
│   ├── agents/
│   │   └── data-analyst.md              # Agent-specific prompts
│   └── tools/
│       └── google-sheets.md             # Tool usage instructions
│
├── 📁 scripts/                          # Build & Utility Scripts
│   └── create-service.js                # Service scaffolding
│
├── 📁 skills/                           # Skill Definitions (Markdown)
│   ├── data/
│   │   └── price-checker.md             # Skill metadata & docs
│   ├── automation/
│   │   └── (automation skills)
│   └── integration/
│       └── (integration skills)
│
├── 📁 templates/                        # Service Templates
│   ├── service-api/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── health.ts
│   │   │   │   └── auth.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── service-agent/
│   │   ├── src/
│   │   │   ├── agents/index.ts
│   │   │   ├── routes/
│   │   │   │   ├── chat.ts
│   │   │   │   └── agents.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── service-web/
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   └── globals.css
│       │   ├── components/
│       │   │   ├── providers.tsx
│       │   │   └── chat.tsx
│       │   └── lib/
│       │       └── utils.ts
│       ├── next.config.js
│       ├── tailwind.config.ts
│       └── package.json
│
├── 📁 tests/                            # Test Suite
│   ├── unit/
│   │   └── agent.test.ts                # Unit tests
│   ├── integration/
│   │   └── api.test.ts                  # Integration tests
│   ├── e2e/
│   │   └── (E2E tests)
│   ├── fixtures/
│   │   └── index.ts                     # Test data factories
│   ├── mocks/
│   │   └── index.ts                     # Mock implementations
│   └── setup.ts                         # Test setup
│
├── 📁 workflows/                        # Workflow Definitions
│   ├── n8n/                             # n8n workflow JSONs
│   └── a2a/                             # Agent-to-agent orchestrations
│
├── .env.example                         # Environment template
├── .gitignore                           # Git ignore rules
├── package.json                         # Root package config
├── pnpm-workspace.yaml                  # Workspace definition
├── turbo.json                           # Turborepo config
├── vitest.config.ts                     # Test configuration
└── README.md                            # Main documentation
```

## Generated Project Structure

When you run `ai-framework create my-project`, this structure is created:

```
my-project/
│
├── 📁 .claude/                          # AI context (copied)
├── 📁 apps/                             # Your services
│   ├── web/                             # Next.js frontend
│   ├── api/                             # Fastify API
│   └── agent/                           # AI agent service
│
├── 📁 packages/                         # Shared libraries (copied)
│   ├── core/
│   ├── config/
│   └── ai/
│
├── 📁 integrations/                     # Connectors (as needed)
│   └── (added via CLI)
│
├── 📁 logs/                             # Runtime logs
├── 📁 lookups/                          # Your reference data
├── 📁 prompts/                          # Your prompts
├── 📁 skills/                           # Your skills
├── 📁 tests/                            # Your tests
│
├── .env.local                           # Your secrets (auto-synced)
├── package.json                         # Project config
└── (other config files)
```

## Key Directory Purposes

### `/logs/` - Logging
| File | Purpose | Rotation |
|------|---------|----------|
| `api.log` | HTTP requests, responses, errors | Daily, 7 days |
| `agent.log` | AI completions, tool calls, memory | Daily, 7 days |
| `web.log` | SSR, client errors | Daily, 7 days |
| `error.log` | All errors (aggregated) | Daily, 14 days |
| `audit.log` | Security events | Monthly, 1 year |

### `/skills/` - Skill Definitions
Markdown files with YAML frontmatter defining AI capabilities:
```yaml
---
id: skill-name
category: data|automation|integration
codePath: packages/ai/skills/skill-name.ts
inputSchema: {...}
outputSchema: {...}
---
```

### `/lookups/` - Reference Data
Static data that agents can query:
- Business rules
- Pricing tables
- Configuration mappings
- Domain knowledge

### `/prompts/` - Prompt Engineering
- `system/` - Base system prompts
- `agents/` - Agent-specific instructions
- `tools/` - Tool usage guidance

### `/tests/` - Test Architecture
- `unit/` - Isolated component tests
- `integration/` - Service interaction tests
- `e2e/` - End-to-end workflows
- `fixtures/` - Test data factories
- `mocks/` - External service mocks
