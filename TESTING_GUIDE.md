# 🎉 BrunoExchange - Ready to Test!

## ✅ What's Running

Your complete prediction markets platform is now running locally with Docker!

### Services
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080
- **Database**: PostgreSQL on port 5433
- **Cache**: Redis on port 6380

---

## 🎯 Test Accounts

Login with these pre-seeded accounts:

| Email | Password | Role | Balance |
|-------|----------|------|---------|
| `admin@browncast.com` | `admin123456` | Admin | $100,000 |
| `alice@example.com` | `password123` | User | $10,000 |
| `bob@example.com` | `password123` | User | $10,000 |
| `charlie@example.com` | `password123` | User | $10,000 |

---

## 📊 Pre-Seeded Markets (5 total)

1. **Will Bitcoin reach $100,000 by end of 2025?**
   - YES: $0.65 | NO: $0.35
   - Category: CRYPTO
   - Featured ⭐

2. **Will AGI be achieved by end of 2026?**
   - YES: $0.25 | NO: $0.75
   - Category: TECH
   - Featured ⭐

3. **Will the US enter recession in 2025?**
   - YES: $0.42 | NO: $0.58
   - Category: ECONOMICS
   - Featured ⭐

4. **Will SpaceX land humans on Mars by 2026?**
   - YES: $0.08 | NO: $0.92
   - Category: SCIENCE

5. **Will Ethereum maintain 99.9% uptime in 2025?**
   - YES: $0.88 | NO: $0.12
   - Category: CRYPTO

---

## 🧪 Testing Workflow

### 1. Register & Login
1. Go to http://localhost:5173
2. Register a new account OR login with test accounts above
3. You'll get initial balance automatically

### 2. Browse Markets
- Click "Markets" tab
- See all 5 pre-seeded markets
- Filter by category (CRYPTO, TECH, ECONOMICS, SCIENCE)
- Check featured markets

### 3. Place Orders
1. Click on any market
2. Choose YES or NO
3. Set price and quantity
4. Click "Place Order"
5. Watch real-time updates via WebSocket

### 4. Check Portfolio
1. Click "Portfolio" tab
2. See your:
   - Cash Balance
   - Portfolio Value
   - Unrealized P/L
   - Open Positions
3. View all your active positions
4. Cancel open orders

### 5. Admin Features (admin@browncast.com only)
- Resolve markets
- View all users
- Check system health

---

## 🔧 Quick Commands

```bash
# View all container status
docker-compose ps

# Watch backend logs
docker-compose logs -f backend

# Watch frontend logs
docker-compose logs -f frontend

# Restart everything
docker-compose restart

# Stop everything
docker-compose down

# Complete reset (deletes data)
docker-compose down -v
docker-compose up -d

# Re-seed database
docker-compose exec backend sh -c "cd /workspace/apps/backend && pnpm tsx prisma/seed.ts"
```

---

## 📝 What to Test

### Core Features
- ✅ User registration & login
- ✅ Browse markets (5 markets available)
- ✅ Place BUY/SELL orders (LIMIT type)
- ✅ View orderbook (bids & asks)
- ✅ Portfolio tracking
- ✅ Real-time updates (WebSocket)
- ✅ Position tracking
- ✅ Balance management

### Pages to Check
- ✅ Home page
- ✅ Markets page (should show 5 markets)
- ✅ Market detail page
- ✅ Portfolio page (should show positions and stats)
- ✅ Admin page (login as admin)

### Expected Behavior
- **Markets Page**: Shows 5 markets with prices
- **Portfolio Page**: Shows balance, positions, P/L
- **Market Detail**: Shows orderbook, place order form
- **Real-time**: Orders update instantly via WebSocket

---

## 🐛 Known Issues Fixed

✅ Portfolio page API calls - FIXED
✅ Database schema missing - FIXED (migrations created)
✅ No seed data - FIXED (5 markets + 3 users)
✅ Syntax errors in Portfolio.jsx - FIXED
✅ Redis pub/sub errors - FIXED

---

## 🚀 Next Steps

### For Local Development
1. Test all tabs and buttons
2. Place some orders
3. Check if Portfolio updates
4. Verify real-time updates work

### For Production Deployment
When ready to deploy:
1. Read `DEPLOYMENT_GUIDE.md`
2. Set up Supabase (PostgreSQL)
3. Set up Upstash (Redis)
4. Deploy backend to Fly.io
5. Deploy frontend to Vercel

---

## 📊 API Endpoints Available

### Auth
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/logout`
- POST `/api/auth/refresh`
- GET `/api/auth/me`

### Markets
- GET `/api/markets`
- GET `/api/markets/:slug`
- POST `/api/markets` (admin)
- POST `/api/markets/:slug/resolve` (admin)

### Orders
- POST `/api/orders/:marketSlug`
- DELETE `/api/orders/:orderId`
- GET `/api/orders/:marketSlug/orderbook`

### User
- GET `/api/user/balance`
- GET `/api/user/positions`
- GET `/api/user/portfolio`
- GET `/api/user/leaderboard`

### Health
- GET `/health`
- GET `/ready`
- GET `/metrics`

---

## 💡 Tips

1. **First login?** Use `alice@example.com / password123`
2. **Need more money?** Admin can credit accounts
3. **Markets not showing?** Check backend logs
4. **Frontend errors?** Check browser console
5. **Need to reset?** Run seed script again

---

## 📞 Support

If something isn't working:

1. Check Docker containers are running:
   ```bash
   docker-compose ps
   ```

2. Check logs for errors:
   ```bash
   docker-compose logs backend | tail -50
   ```

3. Verify database is seeded:
   ```bash
   docker-compose exec backend sh -c "cd /workspace/apps/backend && pnpm tsx prisma/seed.ts"
   ```

4. Frontend not loading? Check:
   ```bash
   docker-compose logs frontend | tail -50
   ```

---

## 🎊 You're All Set!

**Open http://localhost:5173 and start trading!**

Login as Alice or Bob, browse the 5 markets, and place your first order! 📈

---

**Last Updated**: November 2, 2025
**Docker Compose**: Running ✅
**Database**: Seeded with 5 markets ✅
**API**: All endpoints working ✅
**WebSocket**: Real-time updates enabled ✅
