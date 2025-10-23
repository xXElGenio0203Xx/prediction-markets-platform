# 🎯 Prediction Markets Platform

A production-ready prediction market platform with a Central Limit Order Book (CLOB) matching engine, real-time WebSocket updates, and escrow-backed trading.

---

## 🏗️ Architecture

**Monorepo Structure**:
- `apps/backend` - Fastify + Socket.IO server (Fly.io)
- `apps/frontend` - Vite + React app (Vercel)
- `packages/shared` - Shared TypeScript types + Zod schemas

**Stack**:
- **Backend**: Fastify 5.2, Socket.IO 4.8, Prisma 6.18
- **Database**: Supabase PostgreSQL
- **Cache**: Upstash Redis (pub/sub + rate limiting)
- **Auth**: JWT with HTTP-only cookies
- **Real-time**: Redis pub/sub → Socket.IO rooms
- **Deployment**: Fly.io (backend) + Vercel (frontend)

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required
node >= 20
pnpm >= 9

# Services
- Supabase PostgreSQL (configured)
- Upstash Redis (get URL)
- Fly.io account (deployment)
- Vercel account (deployment)
```

### Installation

```bash
# Install pnpm globally
npm install -g pnpm@9

# Install dependencies
pnpm install

# Setup backend
cd apps/backend
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
# From workspace root

# Start backend (port 8080)
pnpm backend:dev

# Start frontend (port 5173)
pnpm frontend:dev

# Build shared types
pnpm shared:build
```

### Test Endpoints

```bash
# Health check
curl http://localhost:8080/health

# Register user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "displayName": "Test User"
  }'

# Get markets
curl http://localhost:8080/api/markets
```

---

## 📚 Documentation

- **[Production Deployment Guide](./PRODUCTION_DEPLOYMENT.md)** - Complete deployment walkthrough
- **[Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)** - Pre/post-deployment verification
- **[Backend README](./apps/backend/README.md)** - API docs, architecture, development
- **[Supabase Setup](./backend/SUPABASE_SETUP.md)** - Database configuration (legacy)
- **[Quick Reference](./backend/QUICK_REFERENCE.md)** - Common commands (legacy)

---

## 🎯 Features

### Core Functionality
- ✅ **CLOB Matching Engine** - Price-time priority order matching
- ✅ **Escrow System** - Lock funds on buy orders, lock shares on sell orders
- ✅ **Real-time Updates** - WebSocket broadcasts for orderbook/trades/balances
- ✅ **User Management** - JWT authentication with refresh tokens
- ✅ **Market Lifecycle** - OPEN → CLOSED → RESOLVED → CANCELLED
- ✅ **Position Tracking** - VWAP calculation, unrealized P/L

### Security
- ✅ **Rate Limiting** - IP-based (100 req/60s HTTP, 10 conn/60s WS)
- ✅ **Input Validation** - Zod schemas on all routes
- ✅ **HTTP-only Cookies** - XSS protection
- ✅ **Helmet Headers** - CSP, HSTS, etc.
- ✅ **CORS Whitelist** - Production domains only

### Monitoring
- ✅ **Health Checks** - `/health`, `/ready` (DB + Redis)
- ✅ **Prometheus Metrics** - `/metrics` (HTTP, WS, business metrics)
- ✅ **Sentry Integration** - Error tracking (optional)
- ✅ **Structured Logging** - Pino with log levels

---

## 🗂️ Project Structure

```
browncast-3f78c242/
├── apps/
│   ├── backend/                 # Fastify + Socket.IO server
│   │   ├── src/
│   │   │   ├── server.ts        # Main server (350+ lines)
│   │   │   ├── config.ts        # Environment validation
│   │   │   ├── lib/             # Infrastructure
│   │   │   │   ├── redis.ts     # Redis client + pub/sub
│   │   │   │   ├── rate-limit.ts
│   │   │   │   ├── prisma.ts
│   │   │   │   ├── sentry.ts
│   │   │   │   └── metrics.ts
│   │   │   ├── routes/          # API routes
│   │   │   │   ├── auth.ts
│   │   │   │   ├── markets.ts
│   │   │   │   ├── orders.ts
│   │   │   │   └── user.ts
│   │   │   ├── engine/          # CLOB matching engine
│   │   │   │   ├── book.ts      # OrderBook class
│   │   │   │   ├── engine.ts    # MatchingEngine
│   │   │   │   └── types.ts
│   │   │   ├── settlement/      # Market resolution
│   │   │   │   └── settlement.ts
│   │   │   └── middleware/      # Auth middleware
│   │   │       └── auth.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Database schema (11 models)
│   │   │   └── seed.ts          # Sample data
│   │   ├── Dockerfile           # Multi-stage Docker build
│   │   ├── fly.toml             # Fly.io configuration
│   │   └── package.json
│   │
│   └── frontend/                # Vite + React (to be created)
│       ├── src/
│       ├── vercel.json
│       └── package.json
│
├── packages/
│   └── shared/                  # Shared types + Zod schemas
│       ├── src/
│       │   └── index.ts         # 300+ lines of types
│       ├── tsconfig.json
│       └── package.json
│
├── backend/                     # Legacy (to be migrated)
│   ├── src/
│   ├── prisma/
│   └── README.md
│
├── src/                         # Legacy frontend (to be migrated)
│
├── pnpm-workspace.yaml          # Workspace config
├── package.json                 # Root package.json
├── PRODUCTION_DEPLOYMENT.md     # Deployment guide
├── DEPLOYMENT_CHECKLIST.md      # Verification checklist
└── README.md                    # This file
```

---

## 🔌 API Reference

### Authentication

```bash
POST /api/auth/register   # Register user
POST /api/auth/login      # Login (returns JWT)
POST /api/auth/refresh    # Refresh access token
POST /api/auth/logout     # Logout
GET  /api/auth/me         # Get current user
```

### Markets

```bash
GET  /api/markets         # List all markets
GET  /api/markets/:slug   # Get market details
POST /api/markets         # Create market (admin)
PATCH /api/markets/:slug/status  # Update status (admin)
```

### Orders

```bash
POST   /api/orders/:marketSlug       # Place order
DELETE /api/orders/:orderId          # Cancel order
GET    /api/orders/:marketSlug/orderbook  # Get orderbook
GET    /api/orders/:marketSlug/trades     # Get recent trades
GET    /api/orders/user/orders       # Get user orders
```

### User

```bash
GET /api/user/balance     # Get balance (available/locked/total)
GET /api/user/positions   # Get positions across markets
GET /api/user/portfolio   # Get portfolio summary
```

---

## 🌐 WebSocket Events

### Subscribe to Market

```javascript
socket.emit('subscribe:market', { marketId: 'uuid' });
```

### Receive Updates

```javascript
socket.on('orderbook_update', (data) => {
  // { marketId, outcome, snapshot: { bids, asks, sequence } }
});

socket.on('trade_executed', (data) => {
  // { marketId, outcome, price, quantity, buyerId, sellerId }
});

socket.on('order_placed', (data) => {
  // { orderId, marketId, side, outcome, price, quantity }
});

socket.on('balance_updated', (data) => {
  // { userId, available, locked, total }
});
```

---

## 🚀 Deployment

### Backend (Fly.io)

```bash
cd apps/backend

# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Deploy
flyctl launch --name pm-backend --region iad
flyctl secrets set DATABASE_URL=... REDIS_URL=... JWT_SECRET=...
flyctl deploy

# Verify
curl https://pm-backend.fly.dev/health
```

### Frontend (Vercel)

```bash
cd apps/frontend

# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### DNS (Cloudflare)

```
api.yourdomain.com → CNAME pm-backend.fly.dev
app.yourdomain.com → CNAME cname.vercel-dns.com
```

See **[PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)** for complete guide.

---

## 📊 Database Schema

**Key Models**:
- `User` - Email, password, role (USER/ADMIN)
- `Market` - Question, status (OPEN/CLOSED/RESOLVED/CANCELLED)
- `Order` - CLOB orders (BUY/SELL, YES/NO, LIMIT/MARKET)
- `Trade` - Matched trades with price/quantity
- `Position` - User positions per market/outcome (VWAP, shares)
- `Balance` - User balance (available, locked, total)

See `apps/backend/prisma/schema.prisma` for full schema.

---

## 🧪 Testing

```bash
# Backend tests
cd apps/backend
pnpm test

# Frontend tests (when created)
cd apps/frontend
pnpm test

# E2E tests (when created)
pnpm test:e2e
```

---

## 🛠️ Development Workflow

### Adding a New Feature

1. **Update shared types** (if needed):
   ```bash
   cd packages/shared
   # Edit src/index.ts
   pnpm build
   ```

2. **Add backend route**:
   ```bash
   cd apps/backend/src/routes
   # Create new route file
   # Register in server.ts
   ```

3. **Add frontend component** (when ready):
   ```bash
   cd apps/frontend/src
   # Create component
   # Use shared types from @prediction-markets/shared
   ```

4. **Test locally**:
   ```bash
   # Terminal 1: Backend
   pnpm backend:dev

   # Terminal 2: Frontend
   pnpm frontend:dev
   ```

5. **Deploy**:
   ```bash
   git push origin main  # Triggers CI/CD (when configured)
   ```

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT

---

## 📞 Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@yourdomain.com

---

## 🗺️ Roadmap

### Phase 1: Core Platform (Current)
- [x] CLOB matching engine
- [x] Real-time WebSocket updates
- [x] JWT authentication
- [x] Escrow system
- [x] Production deployment (Fly.io + Vercel)

### Phase 2: Frontend (In Progress)
- [ ] Market listing page
- [ ] Market detail page with trade widget
- [ ] Orderbook visualization
- [ ] User portfolio page
- [ ] Admin dashboard

### Phase 3: Advanced Features
- [ ] Market creation by users
- [ ] Social features (comments, likes)
- [ ] Advanced charting (TradingView integration)
- [ ] Mobile app (React Native)
- [ ] API rate limiting per user (not just IP)

### Phase 4: Scale & Optimize
- [ ] Horizontal scaling (multi-region)
- [ ] Redis caching for orderbooks
- [ ] Database read replicas
- [ ] CDN for static assets
- [ ] Performance benchmarking

---

**Built with ❤️ using Fastify, Socket.IO, Prisma, React, and TypeScript**