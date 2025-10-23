# 🚀 Running Browncast Locally

## ✅ Current Status

All services are **configured and running**! You can access the app at http://localhost:5173

## 🎯 Quick Start

### Prerequisites ✓ (Already Running)
- ✅ **Docker** - PostgreSQL and Redis containers running
- ✅ **Node.js** - Installed and working
- ✅ **Database** - Seeded with test data
- ✅ **Backend** - Running on http://localhost:4000
- ✅ **Frontend** - Running on http://localhost:5173

### Starting the Application

#### Option 1: Start Everything (Recommended)

```bash
# Terminal 1 - Backend
cd backend
npx tsx src/index.ts

# Terminal 2 - Frontend  
npm run dev
```

#### Option 2: Use npm scripts

```bash
# Backend
cd backend && npm run dev

# Frontend (from root)
npm run dev
```

## 📦 Services Running

### 1. PostgreSQL Database
- **Container**: `prediction-market-db`
- **Port**: 5432
- **Status**: ✅ Running
- **Connection**: `postgresql://postgres:postgres@localhost:5432/prediction_market`
- **Check**: `docker ps | grep postgres`

### 2. Redis Cache
- **Container**: `prediction-market-redis`
- **Port**: 6379
- **Status**: ✅ Running
- **Connection**: `redis://localhost:6379`
- **Check**: `docker ps | grep redis`

### 3. Backend API
- **Port**: 4000
- **URL**: http://localhost:4000
- **Swagger Docs**: http://localhost:4000/docs
- **Metrics**: http://localhost:4000/metrics
- **WebSocket**: ws://localhost:4000/ws
- **Test**: `curl http://localhost:4000/api/markets`

### 4. Frontend App
- **Port**: 5173
- **URL**: http://localhost:5173
- **Hot Reload**: ✅ Enabled
- **Build**: `npm run build`

## 👤 Test Accounts

The database is seeded with these accounts:

| Role | Email | Password | Features |
|------|-------|----------|----------|
| **Admin** | admin@browncast.com | admin123456 | Full access, platform metrics, market resolution |
| **User** | alice@example.com | password123 | Trading, portfolio analytics |
| **User** | bob@example.com | password123 | Trading, portfolio analytics |
| **User** | charlie@example.com | password123 | Trading, portfolio analytics |

## 🎨 Available Features

### User Features
- ✅ **Portfolio Analytics** - http://localhost:5173/PortfolioAnalytics
  - Total P&L (realized + unrealized)
  - Win rate percentage
  - Sharpe ratio (risk-adjusted returns)
  - Diversification score
  - Best/worst performing markets
  - P&L over time chart

- ✅ **Market Analytics** - http://localhost:5173/MarketAnalytics/:slug
  - Order book heatmap (YES/NO)
  - Implied probability over time
  - Volume profile by price level
  - Liquidity depth chart
  - Recent trade flow
  - Bid-ask spread tracking

- ✅ **Trade History** - http://localhost:5173/TradeHistory
  - Filterable trade log (outcome, side, date)
  - P&L attribution per trade
  - Fee breakdown
  - CSV export
  - Pagination (50 per page)

- ✅ **Markets** - Browse and trade on prediction markets
- ✅ **Leaderboard** - Top traders by portfolio value
- ✅ **Portfolio** - View your positions and orders

### Admin Features (admin@browncast.com only)
- ✅ **Platform Metrics** - http://localhost:5173/PlatformMetrics
  - Volume metrics (24h, 7d, 30d, all-time)
  - DAU/MAU active users
  - Market creation/resolution stats
  - Average resolution time
  - Liquidity distribution
  - Trading activity timeline

- ✅ **Market Management** - Create and resolve markets
- ✅ **User Management** - View all users

## 📊 API Endpoints

### Public Endpoints
```
GET  /api/markets           - List all markets
GET  /api/markets/:slug     - Get market details
GET  /api/user/leaderboard  - Get top traders
```

### Authenticated Endpoints
```
POST /api/auth/register     - Create account
POST /api/auth/login        - Login
GET  /api/user/portfolio    - Get your portfolio
POST /api/orders/:slug      - Place an order
GET  /api/orders/user/orders - Get your orders

# Analytics (New!)
GET  /api/analytics/portfolio          - Portfolio analytics
GET  /api/analytics/market/:slug       - Market analytics  
GET  /api/analytics/trades             - Trade history
GET  /api/analytics/trades/export      - Download CSV
```

### Admin Endpoints
```
POST /api/admin/markets/:slug/resolve  - Resolve market
GET  /api/analytics/admin/platform     - Platform metrics
```

## 🔧 Troubleshooting

### Backend won't start
```bash
# Check if port 4000 is in use
lsof -ti:4000 | xargs kill -9

# Restart backend
cd backend && npx tsx src/index.ts
```

### Frontend won't start
```bash
# Check if port 5173 is in use
lsof -ti:5173 | xargs kill -9

# Restart frontend
npm run dev
```

### Database connection error
```bash
# Check if Docker containers are running
docker ps

# Restart containers if needed
cd backend
docker-compose up -d

# Reset database (if needed)
npm run prisma:migrate reset --force
npm run prisma:seed
```

### Redis connection error
```bash
# Check Redis container
docker ps | grep redis

# Restart Redis if needed
docker restart prediction-market-redis

# Test Redis connection
redis-cli ping  # Should return "PONG"
```

## 🛠️ Development Commands

### Database
```bash
cd backend

# View database in browser
npm run prisma:studio

# Create new migration
npx prisma migrate dev --name your_migration_name

# Reset and reseed database
npm run prisma:migrate reset --force
npm run prisma:seed

# Generate Prisma Client
npx prisma generate
```

### Backend
```bash
cd backend

# Development mode (watch mode)
npm run dev

# Type check
npx tsc --noEmit

# Run tests
npm test

# View logs
npm run dev | grep -E "(ERROR|WARN|INFO)"
```

### Frontend
```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

## 📁 Project Structure

```
browncast-3f78c242/
├── backend/                    # Backend API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── analytics.ts   # 📊 Analytics API (NEW!)
│   │   │   ├── auth-simple.ts
│   │   │   ├── markets-simple.ts
│   │   │   ├── orders.ts
│   │   │   ├── user.ts
│   │   │   └── admin.ts
│   │   ├── engine/            # CLOB matching engine
│   │   ├── middleware/         # Auth, rate limiting
│   │   ├── plugins/           # Prisma, Redis, Swagger
│   │   └── index.ts           # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Test data
│   └── .env                   # Backend config
├── src/                       # Frontend React app
│   ├── pages/
│   │   ├── PortfolioAnalytics.jsx  # 📈 User analytics (NEW!)
│   │   ├── MarketAnalytics.jsx     # 📊 Market analytics (NEW!)
│   │   ├── TradeHistory.jsx        # 📋 Trade history (NEW!)
│   │   ├── PlatformMetrics.jsx     # 🎯 Admin metrics (NEW!)
│   │   ├── Markets.jsx
│   │   ├── Portfolio.jsx
│   │   └── Admin.jsx
│   ├── components/
│   │   ├── market/            # Market components
│   │   └── ui/                # UI components (shadcn)
│   └── api/
│       └── client.js          # API client (5 new analytics methods)
└── .env                       # Frontend config

```

## 🎯 What Works Out of the Box

✅ **Trading System**
- CLOB (Central Limit Order Book) matching engine
- Limit and market orders
- Real-time order book updates via WebSocket
- Position tracking
- Balance management

✅ **Analytics Dashboard** (Just Implemented!)
- Portfolio performance tracking
- Market-level analytics
- Trade history with filters
- Platform-wide metrics (admin only)
- CSV export functionality

✅ **User Management**
- Registration and login
- JWT authentication
- Admin roles
- User profiles

✅ **Market Management**
- Create prediction markets
- Binary outcomes (YES/NO)
- Market lifecycle (OPEN → CLOSED → RESOLVED)
- Admin resolution

## 🌐 Accessing the App

### 1. Open your browser
Navigate to: **http://localhost:5173**

### 2. Log in
Use any of the test accounts (see above)

### 3. Try the Analytics!
- **Portfolio**: http://localhost:5173/PortfolioAnalytics
- **Markets**: Browse and select a market
- **Market Analytics**: Click analytics on any market page
- **Trade History**: http://localhost:5173/TradeHistory
- **Admin** (admin only): http://localhost:5173/PlatformMetrics

## 📈 Next Steps

### To Test Analytics:
1. Log in as a test user (e.g., alice@example.com)
2. Place some trades on markets
3. View your analytics:
   - Portfolio Analytics - See your P&L and performance
   - Trade History - Review your trades
   - Market Analytics - Analyze individual markets

### To Test Admin Features:
1. Log in as admin@browncast.com / admin123456
2. Go to Admin page
3. Click "Platform Metrics" to see:
   - Total volume across time periods
   - Active users (DAU/MAU)
   - Market statistics
   - Resolution metrics
   - Liquidity distribution

## 🔐 Security Notes

### Current Setup (Development Only)
- ⚠️ Weak JWT secrets (change for production!)
- ⚠️ Default passwords (change for production!)
- ⚠️ CORS allows localhost only
- ⚠️ No rate limiting on localhost

### For Production Deployment:
1. Generate strong JWT secrets:
   ```bash
   openssl rand -base64 32
   ```
2. Set up proper environment variables
3. Enable HTTPS/SSL
4. Configure proper CORS origins
5. Set up monitoring and logging
6. Follow DEPLOYMENT_CHECKLIST.md

## 📚 Additional Documentation

- **ANALYTICS_IMPLEMENTATION.md** - Complete analytics documentation
- **DEPLOYMENT_CHECKLIST.md** - Production deployment guide
- **SERVICE_SETUP_CHECKLIST.md** - External services setup
- **CREDENTIALS_SETUP_GUIDE.md** - Environment configuration
- **QUICK_REFERENCE.md** - API and architecture reference

## ❓ Common Questions

**Q: Do I need to set up Supabase or other cloud services?**  
A: No! For localhost, everything runs in Docker containers.

**Q: Can I use the Supabase database instead?**  
A: Yes, but you'll need to update `backend/.env` with your Supabase credentials and run migrations.

**Q: How do I reset everything?**  
A: 
```bash
cd backend
docker-compose down -v  # Delete containers and volumes
docker-compose up -d    # Restart containers
npm run prisma:migrate reset --force
npm run prisma:seed
```

**Q: Why is the bundle size large (1.14MB)?**  
A: The recharts library adds ~200KB for analytics visualizations. This is acceptable for a dashboard application.

**Q: Are the analytics calculations accurate?**  
A: Yes! Formulas are documented in ANALYTICS_IMPLEMENTATION.md:
- Sharpe Ratio: Proper annualization with √252
- Diversification: Herfindahl-Hirschman Index
- P&L: Realized + unrealized tracking

## 🎉 You're All Set!

Your prediction market is running locally with:
- ✅ Full trading functionality
- ✅ Real-time order matching
- ✅ Comprehensive analytics
- ✅ Admin tools
- ✅ Test data

Access it at: **http://localhost:5173**

Need help? Check the documentation or start trading! 🚀
