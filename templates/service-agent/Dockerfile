# =============================================================================
# AI Framework Agent Service - Dockerfile
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8 --activate

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/core/package.json ./packages/core/
COPY packages/config/package.json ./packages/config/
COPY packages/ai/package.json ./packages/ai/
COPY packages/database/package.json ./packages/database/
COPY apps/agent/package.json ./apps/agent/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY apps/agent/ ./apps/agent/
COPY skills/ ./skills/
COPY lookups/ ./lookups/
COPY prompts/ ./prompts/

# Generate Prisma client
RUN cd packages/database && pnpm db:generate

# Build
RUN pnpm --filter @framework/agent build

# -----------------------------------------------------------------------------
# Stage 2: Production
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8 --activate

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 agent

# Copy built application
COPY --from=builder --chown=agent:nodejs /app/packages/core/dist ./packages/core/dist
COPY --from=builder --chown=agent:nodejs /app/packages/core/package.json ./packages/core/
COPY --from=builder --chown=agent:nodejs /app/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=agent:nodejs /app/packages/config/package.json ./packages/config/
COPY --from=builder --chown=agent:nodejs /app/packages/ai/dist ./packages/ai/dist
COPY --from=builder --chown=agent:nodejs /app/packages/ai/package.json ./packages/ai/
COPY --from=builder --chown=agent:nodejs /app/packages/database/dist ./packages/database/dist
COPY --from=builder --chown=agent:nodejs /app/packages/database/package.json ./packages/database/
COPY --from=builder --chown=agent:nodejs /app/apps/agent/dist ./apps/agent/dist
COPY --from=builder --chown=agent:nodejs /app/apps/agent/package.json ./apps/agent/
COPY --from=builder --chown=agent:nodejs /app/node_modules ./node_modules

# Copy runtime assets
COPY --from=builder --chown=agent:nodejs /app/skills ./skills
COPY --from=builder --chown=agent:nodejs /app/lookups ./lookups
COPY --from=builder --chown=agent:nodejs /app/prompts ./prompts

# Environment
ENV NODE_ENV=production
ENV PORT=4001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

USER agent

EXPOSE ${PORT}

CMD ["node", "apps/agent/dist/index.js"]
