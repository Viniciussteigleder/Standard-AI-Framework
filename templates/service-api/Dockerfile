# =============================================================================
# AI Framework API Service - Dockerfile
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
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Generate Prisma client
RUN cd packages/database && pnpm db:generate

# Build
RUN pnpm --filter @framework/api build

# -----------------------------------------------------------------------------
# Stage 2: Production
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8 --activate

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 fastify

# Copy built application
COPY --from=builder --chown=fastify:nodejs /app/packages/core/dist ./packages/core/dist
COPY --from=builder --chown=fastify:nodejs /app/packages/core/package.json ./packages/core/
COPY --from=builder --chown=fastify:nodejs /app/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=fastify:nodejs /app/packages/config/package.json ./packages/config/
COPY --from=builder --chown=fastify:nodejs /app/packages/database/dist ./packages/database/dist
COPY --from=builder --chown=fastify:nodejs /app/packages/database/package.json ./packages/database/
COPY --from=builder --chown=fastify:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=fastify:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules

# Environment
ENV NODE_ENV=production
ENV PORT=4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

USER fastify

EXPOSE ${PORT}

CMD ["node", "apps/api/dist/index.js"]
