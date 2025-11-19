# 🚀 BrunoExchange - Team Setup Guide

**For: New Team Member**  
**Last Updated**: November 19, 2025  
**Current Branch**: `main`

This guide will get you set up with the EXACT same localhost environment, including all markets, users, and leaderboard data.

---

## 📋 Prerequisites

Install these first:

```bash
# Check versions
node --version  # Need v20+
pnpm --version  # Need v9+
docker --version
docker-compose --version
```

**Install if missing:**
```bash
# Install Node.js 20+ from https://nodejs.org/
# Or use nvm:
nvm install 20
nvm use 20

# Install pnpm
npm install -g pnpm@9

# Install Docker Desktop from https://www.docker.com/products/docker-desktop
```

---

## 🏁 Step-by-Step Setup

### 1️⃣ Clone the Repository

```bash
# Clone from GitHub
git clone https://github.com/Prediction-Markets-Platform/BrunoExchange.git
cd BrunoExchange

# Verify you're on main branch
git branch
# Should show: * main
```

### 2️⃣ Install Dependencies

```bash
# Install all dependencies (takes 2-3 minutes)
pnpm install

# This installs:
# - Root workspace dependencies
# - Frontend (apps/frontend)
# - Backend (apps/backend)
# - Shared packages (packages/shared)
```

### 3️⃣ Setup Environment Variables

```bash
# Copy the example environment file
cp apps/backend/.env.example apps/backend/.env

# Edit the .env file with these values:
```

**Edit `apps/backend/.env`:**
```env
# Node Environment
NODE_ENV=development
PORT=8080
LOG_LEVEL=info

# Database (Local Docker PostgreSQL)
DATABASE_URL="postgresql://brunoexchange:brunoexchange_dev_password@localhost:5433/brunoexchange?schema=public"
DIRECT_URL="postgresql://brunoexchange:brunoexchange_dev_password@localhost:5433/brunoexchange?schema=public"

# Redis (Local Docker Redis)
REDIS_URL="redis://localhost:6380"

# JWT Secrets (COPY THESE EXACT VALUES for team consistency)
JWT_SECRET="dev-jwt-secret-change-in-production-12345678"
JWT_REFRESH_SECRET="dev-jwt-refresh-secret-change-in-production-87654321"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# CORS Configuration
CORS_ORIGIN="http://localhost:5173,http://localhost:5174"

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW="60s"
```

### 4️⃣ Start Docker Services

```bash
# Start PostgreSQL, Redis, Backend, and Frontend containers
docker-compose up -d

# Wait 10 seconds for containers to be ready
sleep 10

# Verify all 4 services are running
docker ps
```

**You should see 4 containers:**
- `brunoexchange-postgres` (port 5433)
- `brunoexchange-redis` (port 6380)
- `brunoexchange-backend` (port 8080)
- `brunoexchange-frontend` (port 5173)

### 5️⃣ Setup Database Schema

```bash
cd apps/backend

# Generate Prisma client
pnpm prisma:generate

# Push schema to database (creates all tables)
pnpm prisma:migrate

# Seed database with initial data
pnpm prisma:seed

cd ../..
```

**✅ What gets seeded:**
- **Admin user**: `admin@browncast.com` / `admin123456`
- **Test users**: alice, bob, charlie, dave
- **Sample markets**: 10+ prediction markets across categories
- **Sample trades**: Historical trading data
- **Leaderboard data**: Rankings based on portfolio performance

---

## 🎯 Access the Application

### Frontend
Open browser to: **http://localhost:5173**

### Backend API
Base URL: **http://localhost:8080**

### Test Credentials

**Admin Account** (full access):
```
Email: admin@browncast.com
Password: admin123456
```

**Regular Users**:
```
alice@brown.edu / password123
bob@brown.edu / password123
charlie@brown.edu / password123
dave@brown.edu / password123
```

---

## 🔍 Verify Everything Works

### 1. Test Backend API

```bash
# Health check
curl http://localhost:8080/health
# Should return: {"status":"ok","timestamp":"..."}

# Get all markets
curl http://localhost:8080/api/markets | jq
# Should return array of market objects

# Check leaderboard
curl http://localhost:8080/api/user/leaderboard | jq
# Should return user rankings
```

### 2. Test Frontend

1. Open **http://localhost:5173** in browser
2. Click "Login" 
3. Use admin credentials: `admin@browncast.com` / `admin123456`
4. You should see:
   - ✅ Markets page with 10+ markets
   - ✅ Portfolio page showing your balance
   - ✅ Leaderboard with rankings
   - ✅ Admin panel (admin only)
   - ✅ Market Requests page (admin only)

### 3. Test Trading

1. Navigate to any market
2. Select YES or NO
3. Set quantity and price
4. Click BUY or SELL
5. Should see order confirmation

---

## 🌿 Create Your Own Branch

**IMPORTANT**: Never work directly on `main` branch!

```bash
# Create your own feature branch
git checkout -b [your-name]/bug-fixes

# Example:
git checkout -b john/bug-fixes

# Check you're on your branch
git branch
# Should show: * john/bug-fixes
```

---

## 🔄 Daily Workflow

### Starting Your Work Session

```bash
# 1. Pull latest changes from main
git checkout main
git pull origin main

# 2. Switch to your branch and merge main
git checkout [your-name]/bug-fixes
git merge main

# 3. Start Docker services (if not running)
docker-compose up -d

# 4. Start working!
```

### During Development

```bash
# Check what's running
docker ps

# View backend logs
docker logs -f brunoexchange-backend

# View frontend logs  
docker logs -f brunoexchange-frontend

# Restart a service if needed
docker-compose restart backend
```

### Ending Your Session

```bash
# Commit your changes
git add .
git commit -m "Fix: describe what you fixed"

# Push to your branch
git push origin [your-name]/bug-fixes

# Optional: Stop Docker services to save resources
docker-compose down
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find and kill process using port 5433, 6380, 8080, or 5173
lsof -ti:5433 | xargs kill -9
lsof -ti:6380 | xargs kill -9
lsof -ti:8080 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Then restart Docker
docker-compose up -d
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker logs brunoexchange-postgres

# Restart PostgreSQL
docker-compose restart postgres

# Re-run migrations
cd apps/backend
pnpm prisma:migrate
pnpm prisma:seed
```

### Redis Connection Issues

```bash
# Check Redis is running
docker exec -it brunoexchange-redis redis-cli ping
# Should return: PONG

# Restart Redis
docker-compose restart redis
```

### "Module not found" Errors

```bash
# Clean install
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
pnpm install
```

### Frontend Build Issues

```bash
# Clear Vite cache
rm -rf node_modules/.vite
rm -rf src/.vite

# Rebuild
pnpm install
```

### Backend Won't Start

```bash
# Regenerate Prisma client
cd apps/backend
pnpm prisma:generate

# Check environment variables
cat .env
# Make sure DATABASE_URL and REDIS_URL are correct
```

---

## 📊 Syncing Data Between Team Members

### Option 1: Fresh Start (Recommended)

Everyone runs `pnpm prisma:seed` to get the same initial data.

### Option 2: Share Database Export

**Export from your machine:**
```bash
docker exec brunoexchange-postgres pg_dump \
  -U brunoexchange \
  -d brunoexchange \
  -f /tmp/brunoexchange_backup.sql

docker cp brunoexchange-postgres:/tmp/brunoexchange_backup.sql ./database_backup.sql

# Share database_backup.sql file with team
```

**Import on their machine:**
```bash
# Copy backup into container
docker cp ./database_backup.sql brunoexchange-postgres:/tmp/

# Restore database
docker exec brunoexchange-postgres psql \
  -U brunoexchange \
  -d brunoexchange \
  -f /tmp/brunoexchange_backup.sql
```

---

## 🎓 Understanding the Stack

### Ports
- **5173**: Frontend (Vite dev server)
- **8080**: Backend API (Fastify)
- **5433**: PostgreSQL database
- **6380**: Redis cache

### Key Files
- `apps/backend/.env` - Backend environment config
- `apps/backend/prisma/schema.prisma` - Database schema
- `apps/backend/prisma/seed.ts` - Seed data
- `docker-compose.yml` - Docker services config
- `package.json` - Root workspace scripts

### Useful Commands

```bash
# View all pnpm scripts
pnpm run

# Backend only
pnpm backend:dev

# Frontend only  
pnpm frontend:dev

# Generate Prisma types
pnpm prisma:generate

# View database in Prisma Studio
cd apps/backend && pnpm prisma studio

# Check Docker logs
docker-compose logs -f

# Restart everything
docker-compose restart
```

---

## 🤝 Team Collaboration Tips

1. **Use feature branches**: `[name]/feature-name`
2. **Commit often**: Small, focused commits
3. **Pull main daily**: Stay up to date
4. **Communicate**: Share what files you're working on
5. **Test before pushing**: Run the app locally
6. **Write clear commit messages**: "Fix: issue description"

---

## 📞 Getting Help

If you run into issues:

1. Check the troubleshooting section above
2. Check Docker logs: `docker-compose logs`
3. Ask team member who set you up
4. Check existing documentation in repo

---

## ✅ You're Ready!

After completing this guide, you should have:
- ✅ All services running in Docker
- ✅ Frontend at http://localhost:5173
- ✅ Backend at http://localhost:8080  
- ✅ Same markets and user data
- ✅ Your own feature branch
- ✅ Ability to trade and test features

**Happy coding! 🚀**
