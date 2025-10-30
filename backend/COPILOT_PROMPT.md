# 🤖 Copilot Prompt: Generate Complete Backend Implementation

## Context

You are implementing a production-ready prediction market backend. The project structure, database schema, and configuration are already set up. Generate all remaining source files.

## Existing Structure

- ✅ `prisma/schema.prisma` - Complete database schema
- ✅ `package.json` - All dependencies configured
- ✅ `tsconfig.json` - TypeScript config with path aliases
- ✅ `docker-compose.yml` - PostgreSQL + Redis services
- ✅ `.env.example` - Environment variables template

## Files to Generate

### 1. Main Application Entry

**File**: `src/index.ts`

Create Fastify server with:
- Pino logger (structured, with request IDs)
- Helmet for security headers
- CORS from config.CORS_ORIGIN
- Cookie parser for JWT cookies
- Rate limiting (100 req/15min on auth routes)
- Register all plugins: prisma, redis, swagger, metrics
- Register all routes under `/v1` prefix
- WebSocket server initialization
- Graceful shutdown on SIGTERM/SIGINT
- Health endpoint `/healthz` (check DB + Redis connections)
- Listen on config.PORT

### 2. Plugins

**File**: `src/plugins/prisma.ts`
- Singleton PrismaClient with connection pooling
- Fastify plugin that adds `prisma` to request context
- Graceful disconnect on app close

**File**: `src/plugins/redis.ts`
- Singleton Redis client from ioredis
- Fastify plugin that adds `redis` to request context
- Connection retry logic
- Graceful disconnect on app close

**File**: `src/plugins/swagger.ts`
- @fastify/swagger + @fastify/swagger-ui
- OpenAPI 3.0 spec at `/docs`
- Include security schemes (Bearer JWT)
- Auto-generate from route schemas

**File**: `src/plugins/metrics.ts`
- Prometheus client (prom-client)
- Default process metrics
- Custom metrics: http_request_duration_seconds, order_placement_total, trade_execution_total, ws_connections_active
- Expose at `/metrics`

### 3. Contracts (Zod Schemas)

**File**: `src/contracts/index.ts`
```typescript
export const zMessageEnvelope = z.object({
  type: z.string(),
  ts: z.number(),
  seq: z.number().optional(),
  lastSeq: z.number().optional(),
  data: z.unknown(),
  requestId: z.string().optional(),
});
```

**File**: `src/contracts/auth.ts`
- `zRegister`: email (email validation), password (min 8 chars), fullName (optional)
- `zLogin`: email, password
- `zUserResponse`: id, email, role, fullName, createdAt
- `zTokenResponse`: accessToken, refreshToken, user

**File**: `src/contracts/markets.ts`
- `zCreateMarket`: slug, question, description (optional)
- `zMarketResponse`: id, slug, question, description, status, createdAt, creator
- `zListMarketsQuery`: status (enum), limit (1-100), offset

**File**: `src/contracts/orders.ts`
- `zPlaceOrder`: marketId, side (BUY/SELL), type (LIMIT/MARKET), price (optional for MARKET), qty
- `zCancelOrder`: orderId
- `zOrderSnapshot`: id, marketId, userId, side, type, price, qty, qtyFilled, status, createdAt
- `zOrderbookLevel`: [price, qty] tuple
- `zOrderbookSnapshot`: bids (array of levels), asks, seq
- `zTrade`: id, buyOrderId, sellOrderId, marketId, price, qty, createdAt

**File**: `src/contracts/user.ts`
- `zBalanceResponse`: available, locked, total
- `zPositionResponse`: marketId, qtyLong, qtyShort, avgPrice, realizedPnl
- `zTransferRequest`: amount, reason

### 4. Middleware

**File**: `src/middleware/auth.ts`
- `requireAuth` preHandler: verify JWT from cookie or Authorization header, attach user to request
- `requireAdmin` preHandler: check user.role === 'ADMIN'
- `generateTokens(userId)`: create access + refresh JWT
- `verifyAccessToken(token)`: decode and verify
- `refreshTokens(refreshToken)`: rotate refresh token, generate new access token

### 5. Utilities

**File**: `src/utils/errors.ts`
```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export const errorHandler = (error, request, reply) => {
  // Log error with request context
  // Return normalized JSON: { error: { code, message, details } }
};
```

**File**: `src/utils/validate.ts`
- `validateBody<T>(schema: z.ZodSchema<T>)`: Fastify preHandler for body validation
- `validateQuery<T>(schema: z.ZodSchema<T>)`: Query param validation
- `validateParams<T>(schema: z.ZodSchema<T>)`: Path param validation

### 6. Routes

**File**: `src/routes/auth.ts`

Routes:
- `POST /v1/auth/register` - Create user with hashed password (bcrypt), return tokens
- `POST /v1/auth/login` - Verify password, generate tokens, set HTTP-only cookies
- `POST /v1/auth/refresh` - Rotate refresh token, return new access token
- `POST /v1/auth/logout` - Clear cookies, revoke session
- `GET /v1/auth/me` - Return current user (requireAuth)

All routes use Zod validation, rate limiting on register/login (5 req/min per IP).

**File**: `src/routes/markets.ts`

Routes:
- `GET /v1/markets` - List markets with filters (status, pagination)
- `GET /v1/markets/:id` - Get market details
- `POST /v1/markets` - Create market (requireAdmin)
- `PATCH /v1/markets/:id` - Update market status (requireAdmin)

**File**: `src/routes/orders.ts`

Routes:
- `GET /v1/orderbook/:marketId` - Current order book snapshot {bids, asks, seq}
- `GET /v1/trades/:marketId` - Recent trades (last 50, paginated)
- `GET /v1/orders` - User's orders (requireAuth, filter by market/status)
- `POST /v1/orders` - Place order (requireAuth, validate, lock funds, send to engine, return order)
- `POST /v1/orders/:id/cancel` - Cancel order (requireAuth, verify ownership, send cancel command)

**File**: `src/routes/user.ts`

Routes:
- `GET /v1/user/balance` - Get user balance (requireAuth)
- `GET /v1/user/positions` - Get user positions (requireAuth)
- `GET /v1/user/portfolio` - Calculate portfolio value (requireAuth)
- `POST /v1/user/transfer` - Admin deposit/withdrawal (requireAdmin)

### 7. Matching Engine

**File**: `src/engine/types.ts`
```typescript
export type OrderCommand = {
  type: 'PLACE' | 'CANCEL';
  orderId: string;
  userId: string;
  marketId: string;
  side?: 'BUY' | 'SELL';
  price?: Decimal;
  qty?: Decimal;
};

export type EngineEvent = 
  | { type: 'ORDER_ACCEPTED'; orderId: string; seq: bigint }
  | { type: 'ORDER_REJECTED'; orderId: string; reason: string }
  | { type: 'MATCH'; buyOrderId: string; sellOrderId: string; price: Decimal; qty: Decimal }
  | { type: 'ORDER_PARTIALLY_FILLED'; orderId: string; qtyFilled: Decimal; qtyRemaining: Decimal }
  | { type: 'ORDER_FILLED'; orderId: string; qtyFilled: Decimal }
  | { type: 'ORDER_CANCELED'; orderId: string }
  | { type: 'BOOK_DELTA'; side: 'BUY' | 'SELL'; price: Decimal; qty: Decimal };
```

**File**: `src/engine/book.ts`

Implement OrderBook class:
- Max heap for bids (sorted by price DESC, then createdAt ASC)
- Min heap for asks (sorted by price ASC, then createdAt ASC)
- Methods: `addOrder`, `removeOrder`, `getBestBid`, `getBestAsk`, `getSnapshot`
- FIFO within each price level

**File**: `src/engine/engine.ts`

Implement MatchingEngine class:
- Pure function, no DB/network calls
- `processCommand(command: OrderCommand): EngineEvent[]`
- Price-time priority matching
- Market orders: walk book up to max slippage (config.MAX_PRICE_SLIPPAGE)
- Self-trade prevention: skip if resting order userId === incoming userId
- Partial fills: emit PARTIALLY_FILLED events
- Emit BOOK_DELTA for every price level change

### 8. Settlement

**File**: `src/settlement/settlement.ts`

Implement settlement service:
- `processEvents(marketId: string, events: EngineEvent[]): Promise<void>`
- Wrap in single Prisma transaction (SERIALIZABLE isolation)
- Before PLACE: check balance, lock funds (buyerQty * price for BUY)
- On MATCH: update Order.qtyFilled, insert Trade, update Balance (move locked → available), update Position
- On FILL/PARTIAL_FILL: update Order.status
- On CANCEL: unlock funds, update Order.status
- Insert OrderEvent for each event with idempotencyKey = `${orderId}-${event.type}-${seq}`
- Publish WebSocket events after commit
- Use `FOR UPDATE` row locks on Balance/Order

### 9. WebSocket Server

**File**: `src/ws/server.ts`

Implement Socket.IO namespace `/realtime`:
- Auth via JWT in `socket.handshake.auth.token`
- Support subscribe/unsubscribe messages: `{ topics: string[] }`
- Topics: `markets`, `orderbook:{marketId}`, `trades:{marketId}`, `user:{userId}:orders`, `user:{userId}:balances`
- Guard private topics: verify userId matches authenticated user
- Heartbeat: server emits `ping` every 15s, client replies `pong`, disconnect if idle > 60s
- Sequence numbers: maintain per-market counter, include seq/lastSeq in messages
- Backpressure: rate-limit broadcasts, drop slow clients
- Envelope all messages with zMessageEnvelope structure

### 10. Tests

**File**: `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

**File**: `tests/engine/book.spec.ts`

Test cases:
- Add orders to bid/ask sides
- Match crossed orders (bid price >= ask price)
- Partial fills when qty insufficient
- Market order sweep with slippage collar
- Cancel order removes from book
- Self-trade prevention blocks match
- FIFO within price level

**File**: `tests/routes/auth.spec.ts`

Test cases:
- Register with valid data succeeds
- Register with duplicate email fails
- Login with correct credentials succeeds
- Login with wrong password fails
- Refresh token rotation works
- Logout clears cookies

**File**: `tests/routes/integration.spec.ts`

Full flow test:
1. Start test server with testcontainers (PostgreSQL + Redis)
2. Register user → get tokens
3. Admin creates market
4. User deposits via transfer
5. User places BUY order
6. Second user places SELL order → trade executes
7. Check balances updated correctly
8. Check positions created
9. Verify WebSocket events received

**File**: `prisma/seed.ts`

Seed data:
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
      fullName: 'Admin User',
      balance: {
        create: {
          available: 10000,
          locked: 0,
        },
      },
    },
  });

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      passwordHash: await bcrypt.hash('password123', 10),
      role: 'USER',
      fullName: 'Test User',
      balance: {
        create: {
          available: 1000,
          locked: 0,
        },
      },
    },
  });

  // Create demo market
  await prisma.market.upsert({
    where: { slug: 'will-it-rain-tomorrow' },
    update: {},
    create: {
      slug: 'will-it-rain-tomorrow',
      question: 'Will it rain tomorrow?',
      description: 'Resolves YES if measurable precipitation occurs',
      status: 'OPEN',
      creatorId: admin.id,
    },
  });

  console.log('✅ Seed data created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 11. CI Workflow

**File**: `.github/workflows/ci.yml`

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx prisma generate
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

## Requirements

- TypeScript strict mode, no `any` types
- All async operations with proper error handling
- Prisma transactions for settlement (SERIALIZABLE isolation)
- Structured logs with pino (include requestId, userId)
- Input validation with Zod on all routes
- OpenAPI schemas for all endpoints
- Comprehensive error messages
- Rate limiting on sensitive endpoints
- HTTP-only secure cookies for tokens
- CORS configured from environment
- Graceful shutdown (close HTTP, WS, DB, Redis)

## Output Format

For each file:
1. Print file path as comment: `// src/path/to/file.ts`
2. Full file contents (no "omitted for brevity")
3. Functions ≤ 60 lines when reasonable

## Start Generation

Begin with `src/index.ts` and work through all files systematically.
