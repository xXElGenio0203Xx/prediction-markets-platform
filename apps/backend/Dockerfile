# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /workspace

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# Copy shared package
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src/

# Copy backend package
COPY apps/backend/package.json ./apps/backend/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /workspace

# Install pnpm
RUN npm install -g pnpm@9

# Copy deps from previous stage
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/packages ./packages
COPY --from=deps /workspace/apps/backend/node_modules ./apps/backend/node_modules

# Copy source code
COPY pnpm-workspace.yaml package.json ./
COPY apps/backend ./apps/backend

# Generate Prisma client
WORKDIR /workspace/apps/backend
RUN pnpm prisma generate

# Build TypeScript
RUN pnpm build

# ============================================
# Stage 3: Production runtime
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Set to production
ENV NODE_ENV=production

# Copy built files
COPY --from=builder /workspace/apps/backend/dist ./dist
COPY --from=builder /workspace/apps/backend/node_modules ./node_modules
COPY --from=builder /workspace/apps/backend/package.json ./
COPY --from=builder /workspace/apps/backend/prisma ./prisma

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Expose port
EXPOSE 8080

# Run migrations and start server
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/server.js"]
