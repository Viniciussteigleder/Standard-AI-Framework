# Logging Guide

## Overview

The Standard AI Framework provides a comprehensive logging system with structured output, multiple channels, and environment-specific behavior.

## Log Channels

| Channel | Purpose | File (prod) |
|---------|---------|-------------|
| `api` | HTTP API requests/responses | `logs/api.log` |
| `agent` | AI agent execution, tool calls | `logs/agent.log` |
| `web` | Frontend/SSR logs | `logs/web.log` |
| `a2a` | Agent-to-agent orchestration | `logs/a2a.log` |
| `error` | All errors (aggregated) | `logs/error.log` |
| `audit` | Security-sensitive operations | `logs/audit.log` |

## Usage

### Basic Logging

```typescript
import { createLogger } from '@framework/config';

const logger = createLogger('my-service');

logger.info('Service started');
logger.debug({ userId: '123' }, 'Processing request');
logger.error(new Error('Something failed'), 'Operation failed');
```

### Channel-Specific Logging

```typescript
import { LogChannels } from '@framework/config';

const apiLogger = LogChannels.api('users-route');
const agentLogger = LogChannels.agent('assistant');
const auditLogger = LogChannels.audit('auth');

apiLogger.info({ method: 'GET', path: '/users' }, 'Request received');
agentLogger.info({ toolName: 'calculator' }, 'Tool called');
auditLogger.info({ action: 'login', userId: '123' }, 'User logged in');
```

### Specialized Loggers

```typescript
import { logAudit, logInteraction, logExecution } from '@framework/config';

// Audit logging
logAudit({
  action: 'user.create',
  userId: 'admin-123',
  resourceType: 'user',
  resourceId: 'new-user-456',
  outcome: 'success',
  ip: '192.168.1.1',
});

// AI interaction logging
logInteraction({
  conversationId: 'conv-123',
  agentId: 'assistant',
  messageType: 'user',
  content: 'Hello, how are you?',
});

// Agent execution logging
logExecution({
  executionId: 'exec-123',
  agentId: 'data-analyst',
  status: 'tool_call',
  toolName: 'google_sheets',
  durationMs: 234,
});
```

## Environment Behavior

### Development (`NODE_ENV=development`)

- Pretty-printed colored output to console
- Human-readable timestamps
- Full stack traces on errors

### Production (`NODE_ENV=production`)

- JSON structured output
- Writes to `logs/` directory
- Separate error.log for all errors
- ISO timestamps

## Log Directory Structure

```
logs/
├── api.log           # API service logs
├── agent.log         # Agent execution logs
├── web.log           # Web/frontend logs
├── a2a.log           # A2A orchestration logs
├── error.log         # All errors (aggregated)
└── audit.log         # Security audit trail
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Minimum log level (trace, debug, info, warn, error, fatal) |
| `LOG_DIR` | `./logs` | Directory for log files |
| `LOG_FORMAT` | `json` | Output format (json, pretty) |

## Log Format (Production)

```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "service": "api",
  "channel": "api",
  "app": "my-project",
  "env": "production",
  "type": "http",
  "requestId": "req-123",
  "method": "POST",
  "path": "/api/users",
  "statusCode": 201,
  "durationMs": 45,
  "msg": "POST /api/users 201 45ms"
}
```

## Best Practices

1. **Always include context**: Pass an object with relevant IDs

```typescript
// Good
logger.info({ userId, orderId, action: 'checkout' }, 'Order placed');

// Avoid
logger.info('Order placed');
```

2. **Use appropriate levels**:
   - `trace`: Very detailed debugging
   - `debug`: Development debugging
   - `info`: Normal operations
   - `warn`: Recoverable issues
   - `error`: Errors requiring attention
   - `fatal`: System failures

3. **Don't log sensitive data**:

```typescript
// Bad
logger.info({ password: user.password }, 'Login attempt');

// Good
logger.info({ email: user.email }, 'Login attempt');
```

4. **Use child loggers for request context**:

```typescript
app.addHook('onRequest', (request) => {
  request.logger = logger.child({ requestId: request.id });
});
```

## Log Rotation (Production)

For production, use external log rotation tools:

```bash
# logrotate config (/etc/logrotate.d/ai-framework)
/var/log/ai-framework/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 app app
}
```

Or use a log aggregation service (CloudWatch, Datadog, Loki).
