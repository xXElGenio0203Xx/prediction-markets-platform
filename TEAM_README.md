# Browncast - Analytics Dashboard Branch

## ✨ What's New in This Branch

This branch (`feature/clob-and-analytics`) contains major new features:

### 🎯 CLOB Matching Engine
- Central Limit Order Book (CLOB) implementation
- Limit and market orders
- Self-trade prevention
- Real-time order matching
- Order book depth tracking

### 📊 Analytics Dashboard
- **Portfolio Analytics**: Track P&L, win rate, Sharpe ratio, diversification score
- **Market Analytics**: Order book heatmap, volume profile, liquidity depth, probability trends
- **Trade History**: Filterable log with CSV export, P&L attribution
- **Platform Metrics**: DAU/MAU, volume tracking, liquidity analysis (admin only)

### 🐳 Local Development Setup
- Docker Compose for PostgreSQL + Redis
- No cloud services required for local development
- Seeded test data included

---

## 🚀 Quick Start for Team Members

### 1. Clone the Branch

```bash
git clone <repository-url>
cd browncast-3f78c242
git checkout feature/clob-and-analytics
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Start Docker Services

```bash
# Start PostgreSQL and Redis
docker-compose -f backend/docker-compose.yml up -d

# Verify they're running
docker ps
# Should see: prediction-market-db and prediction-market-redis
```

### 4. Setup Backend

```bash
cd backend

# Copy environment file (already configured for local dev)
cp .env.example .env

# Initialize database
npx prisma db push

# Seed with test data
npm run prisma:seed

cd ..
```

### 5. Setup Frontend

```bash
# Copy environment file
cp .env.example .env

# Already configured to use http://localhost:4000
```

### 6. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npx tsx src/index.ts
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 7. Access the App

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000/api

### 8. Login with Test Accounts

- **Admin**: `admin@browncast.com` / `admin123456`
- **User**: `alice@example.com` / `password123`
- **More users**: `bob@example.com`, `charlie@example.com` / `password123`

---

## 📖 Documentation

- **LOCALHOST_QUICKSTART.md** - Detailed setup guide ⭐ **START HERE**
- **ANALYTICS_IMPLEMENTATION.md** - Analytics features deep dive
- **CLOB_IMPLEMENTATION.md** - Trading engine documentation
- **PRE_COMMIT_CHECKLIST.md** - Safekeeping checklist before commits
- **CREDENTIALS_SETUP_GUIDE.md** - Production deployment with cloud services

---

## 🎯 Features to Test

### User Features
1. Browse markets (`/Markets`)
2. Place YES/NO orders on markets
3. View portfolio (`/Portfolio`)
4. **NEW**: Portfolio Analytics (`/PortfolioAnalytics`) - See your P&L, win rate, Sharpe ratio
5. **NEW**: Market Analytics (`/MarketAnalytics/:slug`) - Deep dive into market data
6. **NEW**: Trade History (`/TradeHistory`) - Review trades, export CSV

### Admin Features (login as admin)
1. Admin panel (`/Admin`) - Create markets, manage users
2. **NEW**: Platform Metrics (`/PlatformMetrics`) - DAU/MAU, volume, liquidity stats

---

## 🔧 Tech Stack

### Backend
- **Fastify** - Fast web framework
- **Prisma** - Database ORM
- **PostgreSQL** - Database (via Docker)
- **Redis** - Caching and real-time (via Docker)
- **TypeScript** - Type safety

### Frontend
- **React** - UI library
- **Vite** - Build tool
- **TanStack Query** - Data fetching
- **recharts** - Data visualization
- **Tailwind CSS** - Styling

---

## 🐛 Troubleshooting

### "Port already in use"
```bash
# Kill processes on ports
lsof -ti:4000 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
```

### "Can't connect to database"
```bash
# Check Docker containers
docker ps

# Restart if needed
docker-compose -f backend/docker-compose.yml restart

# Verify DATABASE_URL in backend/.env
# Should be: postgresql://postgres:postgres@localhost:5432/prediction_market
```

### "No markets showing"
```bash
# Reseed database
cd backend
npx prisma db push --force-reset
npm run prisma:seed
```

### "Frontend can't connect to backend"
```bash
# Check .env in root directory
cat .env
# Should have:
# VITE_API_URL=http://localhost:4000/api
# VITE_WS_URL=ws://localhost:4000/ws

# Restart frontend after changes
```

---

## 📁 Key Files Changed

### New Files (Analytics)
- `backend/src/routes/analytics.ts` - Analytics API endpoints
- `src/pages/PortfolioAnalytics.jsx` - Portfolio metrics page
- `src/pages/MarketAnalytics.jsx` - Market deep dive page
- `src/pages/TradeHistory.jsx` - Trade log with filters
- `src/pages/PlatformMetrics.jsx` - Admin metrics dashboard
- `src/api/client.js` - Enhanced API client

### New Files (Infrastructure)
- `backend/docker-compose.yml` - Local PostgreSQL + Redis
- `LOCALHOST_QUICKSTART.md` - Setup guide
- `ANALYTICS_IMPLEMENTATION.md` - Analytics documentation
- `PRE_COMMIT_CHECKLIST.md` - Commit safeguards

### Modified Files (Core)
- `backend/src/engine/engine.ts` - CLOB matching logic
- `backend/src/routes/orders.ts` - Order placement
- `backend/src/index.ts` - Analytics routes registration
- `src/pages/Layout.jsx` - Navigation updates
- `src/pages/Admin.jsx` - Platform Metrics link

---

## 🔐 Security Notes

### ⚠️ Files NOT Committed (Contain Secrets)
- `.env` - Frontend config (gitignored)
- `backend/.env` - Backend secrets (gitignored)

### ✅ Files Committed (Safe Templates)
- `.env.example` - Frontend template
- `backend/.env.example` - Backend template with local defaults

### 🔒 For Production Deployment
1. Generate new JWT secrets: `openssl rand -base64 32`
2. Use strong database passwords
3. Follow `CREDENTIALS_SETUP_GUIDE.md` for cloud services
4. Use environment variables (not .env files)

---

## 💬 Questions or Issues?

If you encounter any problems:

1. Check `LOCALHOST_QUICKSTART.md` for detailed troubleshooting
2. Verify Docker containers are running: `docker ps`
3. Check backend logs in terminal where you ran `npx tsx src/index.ts`
4. Check frontend logs in browser console (F12)
5. Reach out to the team!

---

## 🎉 Happy Testing!

This branch represents a major upgrade to the platform. Test thoroughly and report any issues you find!

**Key Test Scenarios**:
- [ ] Place a limit order and verify it appears in order book
- [ ] Place a market order and verify immediate execution
- [ ] Check Portfolio Analytics shows correct P&L
- [ ] Export trade history to CSV
- [ ] Admin can view Platform Metrics
- [ ] WebSocket updates work (orders update in real-time)

Enjoy exploring the new features! 🚀📊
