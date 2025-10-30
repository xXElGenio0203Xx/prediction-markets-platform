# 🚀 Localhost Quick Start Guide

**Last Updated**: October 22, 2025  
**Branch**: local-dev-setup

Get the Browncast prediction market running on your local machine in under 5 minutes.

---

## 📋 Prerequisites

- **Node.js** v18+ and npm
- **Docker** and Docker Compose
- **Git** for cloning

---

## ⚡ Quick Start (5 steps)

### 1. Clone and Install

```bash
git clone <repository-url>
cd browncast-3f78c242
npm install
cd backend && npm install && cd ..
```

### 2. Start Docker Services

```bash
# Start PostgreSQL and Redis
docker-compose -f backend/docker-compose.yml up -d

# Verify services are running
docker ps
# Should see: prediction-market-db and prediction-market-redis
```

### 3. Configure Environment

```bash
# Copy backend environment file
cp backend/.env.example backend/.env

# The default values work for local development:
# - DATABASE_URL: postgresql://postgres:postgres@localhost:5432/prediction_market
# - REDIS_URL: redis://localhost:6379
# - JWT_SECRET: (generate new ones for production!)
```

**⚠️ IMPORTANT for Production**: Generate secure JWT secrets:
```bash
openssl rand -base64 32  # Use for JWT_SECRET
openssl rand -base64 32  # Use for JWT_REFRESH_SECRET (must be different!)
```

### 4. Setup Database

```bash
cd backend

# Push schema to database
npx prisma db push

# Seed with test data
npm run prisma:seed

cd ..
```

You'll get test accounts:
- **Admin**: `admin@browncast.com` / `admin123456`
- **Users**: `alice@example.com`, `bob@example.com`, `charlie@example.com` / `password123`

### 5. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npx tsx src/index.ts
# Server starts on http://localhost:4000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
# Frontend starts on http://localhost:5173
```

---

## ✅ Verify Installation

### Test Backend
```bash
# Check API is running
curl http://localhost:4000/api/markets

# Should return JSON with markets
```

### Test Frontend
1. Open http://localhost:5173 in browser
2. Click "Sign In"
3. Use test credentials: `alice@example.com` / `password123`
4. You should see markets and be able to trade

---

## 🎯 Key Features to Test

### User Features
1. **Markets Page** (`/Markets`) - Browse all prediction markets
2. **Trading** - Click a market, place YES/NO orders
3. **Portfolio** (`/Portfolio`) - View your positions
4. **Portfolio Analytics** (`/PortfolioAnalytics`) - See P&L, Sharpe ratio, win rate
5. **Market Analytics** (`/MarketAnalytics/:slug`) - Deep dive into market data
6. **Trade History** (`/TradeHistory`) - Review all trades, export CSV

### Admin Features (login as admin@browncast.com)
1. **Admin Panel** (`/Admin`) - Create markets, manage users
2. **Platform Metrics** (`/PlatformMetrics`) - DAU/MAU, volume, liquidity stats

---

## 🔧 Development Workflows

### Reset Database
```bash
cd backend
npx prisma migrate reset --force
npm run prisma:seed
```

### View Database
```bash
cd backend
npx prisma studio
# Opens GUI at http://localhost:5555
```

### Check Logs
```bash
# Backend logs show in terminal where you ran npx tsx src/index.ts
# Frontend logs show in browser console (F12)
```

### Run Tests
```bash
cd backend
npm test
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill processes on ports
lsof -ti:4000 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
```

### Docker Services Not Running
```bash
cd backend
docker-compose down
docker-compose up -d
docker ps  # Verify both containers are healthy
```

### Database Connection Error
```bash
# Check DATABASE_URL in backend/.env
# Should be: postgresql://postgres:postgres@localhost:5432/prediction_market

# Test connection
cd backend
npx prisma db push
```

### Redis Connection Error
```bash
# Check REDIS_URL in backend/.env
# Should be: redis://localhost:6379

# Test Redis
docker exec -it prediction-market-redis redis-cli ping
# Should return: PONG
```

### Frontend Can't Connect to Backend
```bash
# Check .env in root directory
# Should have:
# VITE_API_URL=http://localhost:4000/api
# VITE_WS_URL=ws://localhost:4000/ws

# Restart frontend after changing .env
```

### Prisma Client Out of Sync
```bash
cd backend
npx prisma generate
npx prisma db push
```

---

## 📁 Project Structure

```
browncast-3f78c242/
├── backend/                    # Fastify backend
│   ├── src/
│   │   ├── routes/            # API routes
│   │   │   ├── analytics.ts   # Analytics endpoints (NEW)
│   │   │   ├── auth-simple.ts # Authentication
│   │   │   ├── markets-simple.ts
│   │   │   ├── orders.ts      # CLOB order matching
│   │   │   ├── user.ts
│   │   │   └── admin.ts
│   │   ├── engine/            # CLOB matching engine
│   │   ├── middleware/        # Auth, validation
│   │   └── index.ts           # Server entry
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Test data
│   ├── docker-compose.yml     # PostgreSQL + Redis
│   └── .env                   # Backend config
├── src/                       # React frontend
│   ├── pages/                 # Page components
│   │   ├── PortfolioAnalytics.jsx  # NEW
│   │   ├── MarketAnalytics.jsx     # NEW
│   │   ├── TradeHistory.jsx        # NEW
│   │   ├── PlatformMetrics.jsx     # NEW (admin)
│   │   └── ...
│   ├── api/                   # API client
│   │   └── client.js          # Backend API calls
│   └── components/            # Reusable components
├── .env                       # Frontend config
└── package.json               # Frontend dependencies
```

---

## 🔐 Security Notes

### ⚠️ DO NOT commit these files:
- `backend/.env` (contains secrets)
- `.env` (frontend config with API URLs)
- `node_modules/`
- `dist/`

### ✅ Safe to commit:
- `backend/.env.example` (template with placeholders)
- `.env.example` (template)
- All source code

### 🔒 Before deploying to production:
1. Generate new JWT secrets (don't use defaults!)
2. Use strong database passwords
3. Enable HTTPS/SSL
4. Set `NODE_ENV=production`
5. Use environment variables (not .env files)
6. Review CREDENTIALS_SETUP_GUIDE.md for hosted services

---

## 📚 Additional Documentation

- **ANALYTICS_IMPLEMENTATION.md** - Analytics features deep dive
- **CLOB_IMPLEMENTATION.md** - Order matching engine details
- **DEPLOYMENT_CHECKLIST.md** - Production deployment guide
- **CREDENTIALS_SETUP_GUIDE.md** - Supabase, Upstash, Fly.io setup
- **START_HERE.md** - Project overview

---

## 🆘 Getting Help

### Common Issues
1. **Can't login** - Check backend is running, verify test accounts seeded
2. **No markets showing** - Run `npm run prisma:seed` in backend
3. **Orders not matching** - Check backend logs for CLOB errors
4. **Analytics not loading** - Verify analytics routes registered in backend/src/index.ts

### Debug Mode
```bash
# Backend with verbose logging
cd backend
LOG_LEVEL=debug npx tsx src/index.ts

# Frontend with debug info
npm run dev
# Open browser console (F12) for errors
```

---

## ✨ What's New in This Branch

### CLOB Matching Engine
- Limit and market orders
- Self-trade prevention
- Order book depth tracking
- Real-time trade execution

### Analytics Dashboard
- **Portfolio Analytics**: P&L, Sharpe ratio, win rate, diversification
- **Market Analytics**: Order book heatmap, volume profile, liquidity depth
- **Trade History**: Filterable log with CSV export
- **Platform Metrics**: DAU/MAU, volume tracking, liquidity analysis (admin)

### Infrastructure
- Docker Compose for local development
- Prisma ORM with migrations
- Redis for caching and real-time features
- WebSocket support for live updates

---

**Ready to Trade!** 🎲📈

Once both services are running, navigate to http://localhost:5173 and start making predictions!
