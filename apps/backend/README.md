# 🚀 Prediction Markets - Backend

Production-ready Fastify + Socket.IO server with CLOB matching engine, Prisma + PostgreSQL, Redis pub/sub, and real-time WebSocket updates.

---

## 📋 Tech Stack

- **Framework**: Fastify 5.2 + Socket.IO 4.8
- **Database**: Supabase PostgreSQL + Prisma 6.18
- **Cache/Queue**: Upstash Redis + ioredis
- **Auth**: JWT with HTTP-only cookies
- **Rate Limiting**: rate-limiter-flexible (Redis-backed)
- **Validation**: Zod schemas from @prediction-markets/shared
- **Monitoring**: Sentry (optional), Prometheus metrics
- **Deployment**: Fly.io with Docker

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      HTTP/WebSocket Server                   │
│                                                              │
│  ┌──────────────┐        ┌──────────────┐                  │
│  │   Fastify    │───────▶│  Socket.IO   │                  │
│  │   (HTTP)     │        │    (/ws)     │                  │
│  └──────┬───────┘        └──────┬───────┘                  │
│         │                       │                            │
│         │ rate-limiter-flexible │                           │
│         ▼                       ▼                            │
│  ┌──────────────┐        ┌──────────────┐                  │
│  │     JWT      │        │  JWT Auth    │                  │
│  │  Middleware  │        │  Middleware  │                  │
│  └──────┬───────┘        └──────┬───────┘                  │
│         │                       │                            │
│         ▼                       ▼                            │
│  ┌──────────────────────────────────────┐                  │
│  │           API Routes                 │                  │
│  │  /api/auth   /api/markets            │                  │
│  │  /api/orders /api/user               │                  │
│  └──────┬───────────────────────────────┘                  │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────┐                  │
│  │     Matching Engine (CLOB)           │                  │
│  │  - Price-time priority               │                  │
│  │  - Escrow management                 │                  │
│  │  - Transactional matching            │                  │
│  └──────┬───────────────────────────────┘                  │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────┐      ┌────────────┐     ┌──────────────┐ │
│  │   Prisma    │─────▶│ PostgreSQL │     │    Redis     │ │
│  │   Client    │      │  (Supabase)│◀───▶│   (Upstash)  │ │
│  └─────────────┘      └────────────┘     └──────┬───────┘ │
│                                                   │          │
│                                                   │          │
│                        Redis Pub/Sub ◀───────────┘          │
│                        ┌────────────────────────────┐       │
│                        │ CHANNELS.ORDERBOOK         │       │
│                        │ CHANNELS.TRADES            │       │
│                        │ CHANNELS.MARKETS           │       │
│                        └────────────┬───────────────┘       │
│                                     │                        │
│                                     ▼                        │
│                        Socket.IO Rooms                       │
│                        ┌────────────────────────────┐       │
│                        │ m:{marketId}               │       │
│                        │ m:{marketId}:YES           │       │
│                        │ m:{marketId}:NO            │       │
│                        │ u:{userId}                 │       │
│                        └────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚦 Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (Supabase)
- Redis (Upstash)

### Installation

```bash
# From workspace root
pnpm install

# Navigate to backend
cd apps/backend

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Seed database
pnpm prisma:seed
```

### Development

```bash
# Start dev server (auto-reload)
pnpm dev

# Server runs at http://localhost:8080
```

### Production Build

```bash
# Build TypeScript
pnpm build

# Start production server
pnpm start
```

---

## 📡 API Endpoints

### Health & Monitoring

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Simple health check |
| `/ready` | GET | Readiness check (DB + Redis) |
| `/metrics` | GET | Prometheus metrics |

### Authentication (`/api/auth`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/register` | POST | - | Register new user |
| `/login` | POST | - | Login with email/password |
| `/refresh` | POST | Refresh Token | Refresh access token |
| `/logout` | POST | Access Token | Logout (invalidate tokens) |
| `/me` | GET | Access Token | Get current user |

### Markets (`/api/markets`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | - | List all markets |
| `/:slug` | GET | - | Get market details |
| `/` | POST | Admin | Create market |
| `/:slug/status` | PATCH | Admin | Update market status |

### Orders (`/api/orders`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/:marketSlug` | POST | User | Place order (CLOB) |
| `/:orderId` | DELETE | User | Cancel order |
| `/:marketSlug/orderbook` | GET | - | Get orderbook snapshot |
| `/:marketSlug/trades` | GET | - | Get recent trades |
| `/user/orders` | GET | User | Get user's orders |

### User (`/api/user`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/balance` | GET | User | Get balance (available/locked/total) |
| `/positions` | GET | User | Get positions across markets |
| `/portfolio` | GET | User | Get portfolio summary |

---

## 🔌 WebSocket Events

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:8080/ws', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe:market` | `{ marketId: string }` | Subscribe to market updates |
| `unsubscribe:market` | `{ marketId: string }` | Unsubscribe from market |
| `ping` | - | Heartbeat |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `orderbook_update` | `OrderbookUpdatePayload` | Orderbook changed |
| `trade_executed` | `TradeExecutedPayload` | Trade matched |
| `order_placed` | `OrderPlacedPayload` | Order placed |
| `order_cancelled` | `OrderCancelledPayload` | Order cancelled |
| `market_updated` | `MarketUpdatedPayload` | Market status changed |
| `balance_updated` | `BalanceUpdatedPayload` | User balance changed |
| `position_updated` | `PositionUpdatedPayload` | User position changed |
| `pong` | `{ timestamp: number }` | Heartbeat response |

---

## 🗂️ Database Schema

```prisma
// Key models

model User {
  id           String      @id @default(uuid())
  email        String      @unique
  passwordHash String
  role         UserRole    @default(USER)
  balance      Balance?
  orders       Order[]
  trades       Trade[]
  positions    Position[]
}

model Market {
  id          String        @id @default(uuid())
  slug        String        @unique
  question    String
  description String
  status      MarketStatus  @default(OPEN)
  orders      Order[]
  trades      Trade[]
  positions   Position[]
}

model Order {
  id         String       @id @default(uuid())
  marketId   String
  userId     String
  side       OrderSide    // BUY | SELL
  outcome    Outcome      // YES | NO
  type       OrderType    // LIMIT | MARKET
  price      Decimal      @db.Decimal(5, 2)
  quantity   Int
  filled     Int          @default(0)
  status     OrderStatus  @default(OPEN)
}

model Trade {
  id       String   @id @default(uuid())
  marketId String
  outcome  Outcome  // YES | NO
  price    Decimal  @db.Decimal(5, 2)
  quantity Int
  buyerId  String
  sellerId String
}

model Position {
  userId   String
  marketId String
  outcome  Outcome  // YES | NO
  shares   Int
  vwap     Decimal  @db.Decimal(5, 2)
  
  @@unique([userId, marketId, outcome])
}

model Balance {
  userId    String   @id
  available Decimal  @db.Decimal(12, 2)
  locked    Decimal  @db.Decimal(12, 2)
}
```

---

## 🔐 Security Features

- **JWT Authentication**: Access tokens (15m) + refresh tokens (7d)
- **HTTP-only Cookies**: Prevents XSS attacks
- **Rate Limiting**: 100 req/60s per IP (HTTP), 10 conn/60s (WebSocket)
- **Helmet**: Security headers (CSP, HSTS, etc.)
- **CORS**: Whitelist allowed origins
- **Input Validation**: Zod schemas on all routes
- **SQL Injection**: Prisma parameterized queries
- **Secrets Management**: Environment variables (not committed)

---

## 🚀 Deployment

### Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Launch app (creates fly.toml)
flyctl launch --name pm-backend --region iad

# Set secrets
flyctl secrets set \
  DATABASE_URL="postgresql://..." \
  REDIS_URL="rediss://..." \
  JWT_SECRET="$(openssl rand -base64 32)" \
  JWT_REFRESH_SECRET="$(openssl rand -base64 32)" \
  CORS_ORIGIN="https://app.yourdomain.com"

# Deploy
flyctl deploy

# Check logs
flyctl logs
```

### Environment Variables (Production)

```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://postgres.xsdhkjiskqfelahfariv:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xsdhkjiskqfelahfariv:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
REDIS_URL=rediss://default:PASSWORD@your-endpoint.upstash.io:6379
JWT_SECRET=your-secret-32-chars-min
JWT_REFRESH_SECRET=your-refresh-secret-32-chars-min
CORS_ORIGIN=https://app.yourdomain.com,https://preview.vercel.app
SENTRY_DSN=https://...@sentry.io/...
RESEND_API_KEY=re_...
LOG_LEVEL=info
```

---

## 📊 Monitoring

### Prometheus Metrics

```bash
curl http://localhost:8080/metrics
```

**Available metrics:**
- `http_request_duration_seconds` (histogram)
- `http_requests_total` (counter)
- `websocket_connections_total` (gauge)
- `websocket_messages_total` (counter)
- `orders_placed_total` (counter)
- `trades_executed_total` (counter)
- `order_matching_duration_seconds` (histogram)
- `database_query_duration_seconds` (histogram)

### Sentry (Error Tracking)

```bash
# Set DSN in environment
SENTRY_DSN=https://your-key@sentry.io/your-project
```

---

## 🧪 Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

---

## 📝 Development Tips

### Prisma Commands

```bash
# Create migration
pnpm prisma migrate dev --name add_new_field

# Apply migrations (prod)
pnpm prisma migrate deploy

# Reset database
pnpm prisma migrate reset

# Open Prisma Studio (GUI)
pnpm prisma studio
```

### Redis Commands

```bash
# Connect to Redis CLI
redis-cli -u $REDIS_URL

# List keys
KEYS *

# Monitor pub/sub
MONITOR
```

### Debugging

```bash
# Enable debug logging
LOG_LEVEL=debug pnpm dev

# Check WebSocket connections
curl http://localhost:8080/metrics | grep websocket_connections_total
```

---

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Add tests
4. Run `pnpm test`
5. Submit PR

---

## 📄 License

MIT
