/**
 * Database Seed Script
 * 
 * Creates initial data for development and testing.
 * Run with: pnpm db:seed
 */

import { prisma } from '../src';
import { UserRole, ConversationStatus, MessageRole } from '@prisma/client';

async function main() {
  console.log('🌱 Seeding database...\n');

  // ==========================================================================
  // TENANT
  // ==========================================================================
  
  console.log('Creating tenant...');
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Organization',
      slug: 'default',
      plan: 'pro',
      settings: {
        features: {
          agents: true,
          workflows: true,
          integrations: true,
        },
        limits: {
          maxAgents: 10,
          maxConversations: 1000,
          maxTokensPerMonth: 1000000,
        },
      },
    },
  });
  console.log(`  ✓ Tenant: ${tenant.name}`);

  // ==========================================================================
  // USERS
  // ==========================================================================
  
  console.log('\nCreating users...');
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      tenantId: tenant.id,
      preferences: {
        theme: 'dark',
        language: 'en',
        notifications: true,
      },
    },
  });
  console.log(`  ✓ Admin: ${adminUser.email}`);
  
  const memberUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Test User',
      role: UserRole.MEMBER,
      tenantId: tenant.id,
    },
  });
  console.log(`  ✓ Member: ${memberUser.email}`);

  // ==========================================================================
  // AGENTS
  // ==========================================================================
  
  console.log('\nCreating agents...');
  
  const assistantAgent = await prisma.agent.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'assistant' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'General Assistant',
      slug: 'assistant',
      description: 'A helpful AI assistant for general tasks',
      systemPrompt: `You are a helpful AI assistant. You are friendly, concise, and accurate.
You help users with a variety of tasks including answering questions, writing, analysis, and more.
When you don't know something, you say so honestly.`,
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      tools: ['calculator', 'current_time'],
      skills: [],
      isPublic: true,
      isActive: true,
    },
  });
  console.log(`  ✓ Agent: ${assistantAgent.name}`);
  
  const dataAnalystAgent = await prisma.agent.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'data-analyst' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Data Analyst',
      slug: 'data-analyst',
      description: 'Specialized in data analysis and insights',
      systemPrompt: `You are a data analyst AI. You excel at:
- Analyzing datasets and finding patterns
- Creating summaries and reports
- Explaining statistical concepts
- Helping with data visualization decisions

Always cite your sources and explain your methodology.`,
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.3,
      tools: ['calculator', 'google_sheets', 'price_checker'],
      skills: ['price-checker'],
      isPublic: true,
      isActive: true,
    },
  });
  console.log(`  ✓ Agent: ${dataAnalystAgent.name}`);
  
  const coderAgent = await prisma.agent.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'coder' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Code Assistant',
      slug: 'coder',
      description: 'Helps with coding tasks and code review',
      systemPrompt: `You are an expert software engineer and code assistant. You:
- Write clean, maintainable code
- Follow best practices and design patterns
- Explain your code and reasoning
- Consider edge cases and error handling
- Write tests when appropriate

Languages you excel in: TypeScript, Python, SQL, and more.`,
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.2,
      maxTokens: 4096,
      tools: [],
      skills: [],
      isPublic: true,
      isActive: true,
    },
  });
  console.log(`  ✓ Agent: ${coderAgent.name}`);

  // ==========================================================================
  // SAMPLE CONVERSATION
  // ==========================================================================
  
  console.log('\nCreating sample conversation...');
  
  const conversation = await prisma.conversation.create({
    data: {
      userId: memberUser.id,
      agentId: assistantAgent.id,
      title: 'Welcome Conversation',
      status: ConversationStatus.ACTIVE,
      messages: {
        create: [
          {
            role: MessageRole.USER,
            content: 'Hello! What can you help me with?',
            inputTokens: 10,
          },
          {
            role: MessageRole.ASSISTANT,
            content: `Hello! I'm your AI assistant. I can help you with:

1. **Answering questions** - Ask me anything!
2. **Writing & editing** - Drafts, emails, documents
3. **Analysis** - Data analysis, research summaries
4. **Coding** - Code review, debugging, explanations
5. **Creative tasks** - Brainstorming, ideas

What would you like to explore today?`,
            outputTokens: 80,
            model: 'claude-3-5-sonnet-20241022',
            latencyMs: 1200,
          },
        ],
      },
      totalInputTokens: 10,
      totalOutputTokens: 80,
    },
  });
  console.log(`  ✓ Conversation: ${conversation.title}`);

  // ==========================================================================
  // SAMPLE WORKFLOW
  // ==========================================================================
  
  console.log('\nCreating sample workflow...');
  
  const workflow = await prisma.workflow.create({
    data: {
      tenantId: tenant.id,
      name: 'Daily Report Generator',
      description: 'Generates and sends daily summary reports',
      triggerType: 'schedule',
      triggerConfig: {
        cron: '0 9 * * *', // 9 AM daily
        timezone: 'Europe/Berlin',
      },
      steps: [
        {
          id: 'fetch-data',
          type: 'api',
          name: 'Fetch Data',
          config: {
            endpoint: '/api/reports/daily',
            method: 'GET',
          },
          next: 'analyze',
        },
        {
          id: 'analyze',
          type: 'agent',
          name: 'Analyze Data',
          config: {
            agentId: dataAnalystAgent.id,
            prompt: 'Analyze the following data and create a summary report:',
          },
          next: 'send',
        },
        {
          id: 'send',
          type: 'api',
          name: 'Send Report',
          config: {
            endpoint: '/api/notifications/send',
            method: 'POST',
          },
        },
      ],
      status: 'DRAFT',
    },
  });
  console.log(`  ✓ Workflow: ${workflow.name}`);

  // ==========================================================================
  // DONE
  // ==========================================================================
  
  console.log('\n✅ Seeding complete!\n');
  console.log('Summary:');
  console.log(`  - 1 tenant`);
  console.log(`  - 2 users`);
  console.log(`  - 3 agents`);
  console.log(`  - 1 conversation`);
  console.log(`  - 1 workflow`);
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
