# Prediction Market Backend

A production-ready, centralized prediction market backend built with Node.js, TypeScript, Fastify, Prisma, PostgreSQL, Redis, and Socket.IO.

## Features

- ⚡ **High Performance**: Fastify HTTP server with async/await
- 🔒 **Secure**: JWT authentication, helmet, CORS, rate limiting
- 📊 **Real-time**: WebSocket updates via Socket.IO with heartbeats and gap detection
- 💰 **ACID Compliant**: Transaction-safe order matching and settlement
- 🎯 **Price-Time Priority**: Deterministic matching engine with self-trade prevention
- 📈 **Observable**: Structured logging (pino), Prometheus metrics, request tracing
- 🐳 **Docker Ready**: Multi-stage Dockerfile + docker-compose
- ✅ **Well Tested**: Vitest integration and unit tests
- 📚 **API Docs**: Interactive OpenAPI/Swagger documentation

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript (ESM)
- **HTTP Server**: Fastify
- **Database**: PostgreSQL 16 with Prisma ORM
- **Cache/Queue**: Redis 7
- **Real-time**: Socket.IO (WebSockets)
- **Validation**: Zod
- **Auth**: JWT with HTTP-only cookies
- **Testing**: Vitest + Supertest
- **Logging**: Pino with structured logs
- **Metrics**: Prometheus

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data
├── src/
│   ├── config.ts              # Environment configuration
│   ├── index.ts               # Server entry point
│   ├── contracts/             # Zod schemas
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   ├── markets.ts
│   │   ├── orders.ts
│   │   └── user.ts
│   ├── engine/                # Matching engine (pure functions)
│   │   ├── types.ts
│   │   ├── book.ts
│   │   └── engine.ts
│   ├── middleware/            # Auth middleware
│   │   └── auth.ts
│   ├── plugins/               # Fastify plugins
│   │   ├── prisma.ts
│   │   ├── redis.ts
│   │   ├── swagger.ts
│   │   └── metrics.ts
│   ├── routes/                # API routes
│   │   ├── auth.ts
│   │   ├── markets.ts
│   │   └── orders.ts
│   ├── settlement/            # Order settlement & persistence
│   │   └── settlement.ts
│   ├── utils/                 # Utilities
│   │   ├── errors.ts
│   │   └── validate.ts
│   └── ws/                    # WebSocket server
│       └── server.ts
├── tests/
│   ├── engine/
│   │   └── book.spec.ts
│   └── routes/
│       ├── auth.spec.ts
│       └── integration.spec.ts
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

## Quick Start

### Prerequisites

- Node.js 20+ 
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### Installation

1. **Clone and navigate**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Setup environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start services** (PostgreSQL + Redis):
   ```bash
   docker-compose up -d db redis
   ```

5. **Run migrations**:
   ```bash
   npm run prisma:migrate
   ```

6. **Generate Prisma client**:
   ```bash
   npm run prisma:generate
   ```

7. **Seed database**:
   ```bash
   npm run prisma:seed
   ```

8. **Start development server**:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:4000`

### Docker Setup (Full Stack)

Run everything with Docker:

```bash
docker-compose up --build
```

This starts PostgreSQL, Redis, and the API server.

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:4000/docs
- **Health Check**: http://localhost:4000/healthz
- **Metrics**: http://localhost:4000/metrics

## API Endpoints

### Authentication

```bash
# Register
POST /v1/auth/register
Content-Type: application/json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "fullName": "John Doe"
}

# Login
POST /v1/auth/login
Content-Type: application/json
{
  "email": "user@example.com",
  "password": "securePassword123"
}

# Refresh token
POST /v1/auth/refresh

# Logout
POST /v1/auth/logout
```

### Markets

```bash
# List markets
GET /v1/markets?status=OPEN&limit=20&offset=0

# Get market
GET /v1/markets/:id

# Create market (admin only)
POST /v1/markets
Authorization: Bearer {token}
Content-Type: application/json
{
  "slug": "will-it-rain-tomorrow",
  "question": "Will it rain tomorrow?",
  "description": "Resolves YES if measurable precipitation occurs"
}
```

### Orders

```bash
# Get order book
GET /v1/orderbook/:marketId

# Get recent trades
GET /v1/trades/:marketId?limit=50

# Get my orders
GET /v1/orders?user=me
Authorization: Bearer {token}

# Place order
POST /v1/orders
Authorization: Bearer {token}
Content-Type: application/json
{
  "marketId": "uuid",
  "side": "BUY",
  "type": "LIMIT",
  "price": "0.65",
  "qty": "100"
}

# Cancel order
POST /v1/orders/:id/cancel
Authorization: Bearer {token}
```

## WebSocket API

Connect to `ws://localhost:4000/realtime` with authentication:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000/realtime', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Subscribe to topics
socket.emit('subscribe', { topics: ['markets', 'orderbook:market-id'] });

// Handle messages
socket.on('message', (envelope) => {
  console.log('Received:', envelope);
  // { type, ts, seq, lastSeq, data, requestId }
});

// Heartbeat
socket.on('ping', () => socket.emit('pong'));

// Unsubscribe
socket.emit('unsubscribe', { topics: ['orderbook:market-id'] });
```

### Available Topics

- `markets` - Market updates
- `orderbook:{marketId}` - Order book deltas
- `trades:{marketId}` - Trade executions
- `user:{userId}:orders` - User's order updates (private)
- `user:{userId}:balances` - User's balance updates (private)

### Message Envelope

All WebSocket messages follow this structure:

```typescript
{
  type: string;          // Message type
  ts: number;            // Timestamp (ms)
  seq?: number;          // Sequence number
  lastSeq?: number;      // Last sequence (for gap detection)
  data: unknown;         // Payload
  requestId?: string;    // Optional request correlation ID
}
```

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Development

```bash
# Development with auto-reload
npm run dev

# Build
npm run build

# Production
npm start

# Lint
npm run lint

# Prisma Studio (DB GUI)
npm run prisma:studio
```

## Matching Engine

The matching engine uses **price-time priority** with the following features:

- ✅ Deterministic matching (no DB calls in engine)
- ✅ Partial fills supported
- ✅ Market orders with price collar (max slippage)
- ✅ Self-trade prevention (configurable)
- ✅ FIFO within price levels
- ✅ Event-sourced architecture

### Order Types

- **LIMIT**: Order with specific price
- **MARKET**: Best execution with slippage protection

### Settlement Flow

1. Order received → Validate → Lock funds
2. Pass to matching engine
3. Engine produces events (matches, fills, cancels)
4. Settlement applies events in single DB transaction
5. Publish real-time updates via WebSocket

## Monitoring

### Logs

Structured JSON logs with pino:

```json
{
  "level": "info",
  "time": 1234567890,
  "requestId": "req-123",
  "userId": "user-456",
  "msg": "Order placed",
  "orderId": "order-789"
}
```

### Metrics

Prometheus metrics exposed at `/metrics`:

- HTTP request duration
- Order placement rate
- Trade execution count
- Active WebSocket connections
- DB query duration
- Cache hit/miss rates

## Security

- 🔒 Helmet for security headers
- 🛡️ CORS configured per environment
- ⏱️ Rate limiting on auth endpoints
- 🔐 JWT with HTTP-only cookies
- ✅ Input validation with Zod
- 🔄 Refresh token rotation
- 🚫 SQL injection prevention (Prisma)

## Production Deployment

### Environment Variables

Ensure these are set in production:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-secret>
CORS_ORIGIN=https://your-frontend.com
```

### Database Migrations

```bash
npm run prisma:migrate:prod
```

### Health Checks

The `/healthz` endpoint returns:

```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "uptime": 3600,
  "database": "connected",
  "redis": "connected"
}
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps db

# View logs
docker-compose logs db

# Reset database
docker-compose down -v
docker-compose up -d db
npm run prisma:migrate
```

### Redis Connection Issues

```bash
# Check Redis
docker-compose ps redis

# Test connection
redis-cli ping
```

## License

MIT

## Support

For questions or issues, please contact the development team or open an issue in the repository.

---

Built with ❤️ for prediction markets
