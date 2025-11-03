# 🎯 BrunoExchange - Prediction Markets Platform

A production-ready prediction market platform with a Central Limit Order Book (CLOB) matching engine, real-time WebSocket updates, and escrow-backed trading.

---

## 🚀 Quick Start

**Get running in 15 minutes!**

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
# Edit both files with your credentials

# 3. Set up database
cd apps/backend
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed

# 4. Start development servers
cd ../..
pnpm dev  # Starts both backend and frontend
```

Visit http://localhost:5173 and start trading!

📖 **Full guide**: [QUICK_START.md](./QUICK_START.md)

---

## 📚 Documentation

### Getting Started
- **[QUICK_START.md](./QUICK_START.md)** ⚡ - Get running in 15 minutes
- **[START_HERE.md](./START_HERE.md)** 📖 - Complete documentation index
- **[MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md)** ✅ - What's been built

### Deployment
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** 🚀 - Production deployment (Fly.io + Vercel)
- **[CREDENTIALS_SETUP_GUIDE.md](./CREDENTIALS_SETUP_GUIDE.md)** 🔑 - Service account setup

### Technical
- **[CLOB_IMPLEMENTATION.md](./CLOB_IMPLEMENTATION.md)** 📊 - Matching engine details
- **[apps/backend/README.md](./apps/backend/README.md)** 🔧 - Backend API docs

---

## 🏗️ Architecture

### Monorepo Structure

```
BrunoExchange/
├── apps/
│   ├── backend/          # Fastify + Socket.IO server
│   │   ├── src/
│   │   │   ├── engine/   # CLOB matching engine
│   │   │   ├── routes/   # API endpoints
│   │   │   ├── lib/      # Redis, Prisma, metrics
│   │   │   └── server.ts # Main server
│   │   └── prisma/       # Database schema
│   │
│   └── frontend/         # Vite + React app
│       ├── vite.config.ts
│       ├── vercel.json
│       └── package.json
│
├── packages/
│   └── shared/           # Shared TypeScript types
│
└── src/                  # Frontend source files
```

### Tech Stack

**Backend:**
- Fastify 5.2 (HTTP server)
- Socket.IO 4.8 (WebSocket)
- Prisma 6.18 (ORM)
- Supabase (PostgreSQL)
- Upstash (Redis)
- JWT authentication

**Frontend:**
- React 18
- Vite (build tool)
- TanStack Query
- Radix UI
- Tailwind CSS
- Socket.IO client

**Infrastructure:**
- Fly.io (backend hosting)
- Vercel (frontend hosting)
- Sentry (error tracking)
- Prometheus (metrics)

---

## ✨ Key Features

### Trading Engine
- ✅ Central Limit Order Book (CLOB)
- ✅ Price-time priority matching
- ✅ Self-trade prevention
- ✅ Partial fills
- ✅ Market & limit orders
- ✅ Escrow-backed settlement

### Real-time Updates
- ✅ Socket.IO WebSocket connections
- ✅ Redis pub/sub for scaling
- ✅ Live orderbook updates
- ✅ Trade notifications
- ✅ Position updates

### Security
- ✅ JWT access + refresh tokens
- ✅ HTTP-only cookies
- ✅ bcrypt password hashing
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Input validation (Zod)

### User Experience
- ✅ Real-time market prices
- ✅ Portfolio tracking
- ✅ Trade history
- ✅ Position management
- ✅ Admin dashboard

---

## 🛠️ Development

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL (or Supabase account)
- Redis (or Upstash account)

### Commands

```bash
# Development
pnpm dev                 # Start both backend and frontend
pnpm dev:backend         # Start backend only
pnpm dev:frontend        # Start frontend only

# Build
pnpm build               # Build all
pnpm build:backend       # Build backend
pnpm build:frontend      # Build frontend

# Database
pnpm prisma:generate     # Generate Prisma client
pnpm prisma:migrate      # Run migrations
pnpm prisma:seed         # Seed database
pnpm prisma:studio       # Open Prisma Studio

# Testing
pnpm test                # Run tests
pnpm lint                # Lint code
pnpm type-check          # Type check

# Deployment
pnpm deploy:backend      # Deploy to Fly.io
pnpm deploy:frontend     # Deploy to Vercel
```

---

## 🚀 Deployment

### Production Services

1. **Supabase** - PostgreSQL database
2. **Upstash** - Redis cache & pub/sub
3. **Fly.io** - Backend hosting
4. **Vercel** - Frontend hosting

### Deploy Steps

```bash
# 1. Set up services (see DEPLOYMENT_GUIDE.md)
# 2. Configure environment variables
# 3. Deploy backend
cd apps/backend
flyctl deploy

# 4. Deploy frontend
cd apps/frontend
vercel --prod
```

📖 **Full guide**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## 📊 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Markets
- `GET /api/markets` - List markets
- `GET /api/markets/:slug` - Get market details
- `POST /api/markets` - Create market (admin)
- `PATCH /api/markets/:slug` - Update market (admin)
- `PATCH /api/markets/:slug/status` - Resolve market (admin)

### Orders
- `POST /api/orders/:slug` - Place order
- `DELETE /api/orders/:orderId` - Cancel order
- `GET /api/orders/my-orders` - Get user's orders
- `GET /api/orders/orderbook/:slug` - Get orderbook

### User
- `GET /api/user/balance` - Get balance
- `GET /api/user/positions` - Get positions
- `GET /api/user/portfolio` - Get portfolio summary
- `GET /api/user/trades` - Get trade history

### Admin
- `POST /api/admin/markets/:slug/resolve` - Resolve market
- `GET /api/admin/health` - System health
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users` - List users

---

## 🔧 Configuration

### Backend (.env)

```env
NODE_ENV=development
PORT=8080
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
CORS_ORIGIN=http://localhost:5173
```

See [apps/backend/.env.example](./apps/backend/.env.example) for full list.

### Frontend (.env.local)

```env
VITE_API_URL=http://localhost:8080
VITE_WS_URL=http://localhost:8080
```

See [apps/frontend/.env.example](./apps/frontend/.env.example) for details.

---

## 🧪 Testing

```bash
# Backend tests
pnpm test:backend

# All tests
pnpm test

# Coverage
pnpm test:coverage
```

---

## 📈 Monitoring

### Health Checks

```bash
# Health
curl http://localhost:8080/health

# Readiness
curl http://localhost:8080/ready

# Metrics (Prometheus)
curl http://localhost:8080/metrics
```

### Logging

- Backend logs: Check terminal or Fly.io logs
- Frontend logs: Check browser console or Vercel logs
- Database logs: Supabase dashboard
- Redis logs: Upstash dashboard

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

### Documentation
- [QUICK_START.md](./QUICK_START.md) - Quick setup guide
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Production deployment
- [START_HERE.md](./START_HERE.md) - All documentation

### Troubleshooting

**Backend won't start:**
- Check DATABASE_URL and REDIS_URL
- Verify all environment variables are set
- Check logs: `pnpm dev:backend`

**Frontend can't connect:**
- Verify VITE_API_URL is correct
- Check CORS_ORIGIN includes frontend URL
- Check browser console for errors

**Database issues:**
- Run migrations: `pnpm prisma:migrate`
- Check connection: `pnpm prisma:studio`
- Verify credentials in .env

---

## 🎯 Project Status

- ✅ Backend: Production-ready
- ✅ Frontend: Production-ready
- ✅ Database: Migrations complete
- ✅ Deployment: Configured
- ✅ Documentation: Complete

See [MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md) for full details.

---

## 🌟 Features Coming Soon

- [ ] Email notifications
- [ ] Social sharing
- [ ] Mobile app
- [ ] Advanced analytics
- [ ] API rate limits per user
- [ ] Market creation UI
- [ ] Leaderboard

---

## 📞 Contact

For questions or support:
- GitHub Issues
- Documentation
- Health endpoint: `/health`

---

**Built with ❤️ using modern web technologies**

*Ready to predict the future? Let's trade!* 🚀
