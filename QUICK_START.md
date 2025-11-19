# ⚡ Quick Start Guide

Get BrunoExchange running in 15 minutes!

---

## Prerequisites

- Node.js 20+
- pnpm 9+
- Git

---

## Step 1: Install Dependencies (2 min)

```bash
# Install pnpm if not installed
npm install -g pnpm@9

# Install all dependencies
pnpm install
```

---

## Step 2: Set Up Environment Variables (3 min)

### Backend

```bash
cd apps/backend

# Copy environment template
cp .env.example .env

# Edit .env and add:
# - DATABASE_URL (Supabase connection pooling URL)
# - DIRECT_URL (Supabase direct connection URL)
# - REDIS_URL (Upstash Redis URL)
# - JWT_SECRET (run: openssl rand -base64 64)
# - JWT_REFRESH_SECRET (run: openssl rand -base64 64)

# Example:
nano .env  # or use your favorite editor
```

**Minimum .env for local development:**
```env
NODE_ENV=development
PORT=8080
DATABASE_URL="postgresql://user:pass@localhost:5432/brunoexchange"
DIRECT_URL="postgresql://user:pass@localhost:5432/brunoexchange"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"
CORS_ORIGIN="http://localhost:5173"
```

### Frontend

```bash
cd ../frontend

# Copy environment template
cp .env.example .env.local

# Edit .env.local
nano .env.local

# Add:
VITE_API_URL=http://localhost:8080
VITE_WS_URL=http://localhost:8080
```

---

## Step 3: Set Up Database (5 min)

### Option A: Use Supabase (Recommended)

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Copy connection strings to .env
4. Run migrations:

```bash
cd apps/backend

# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Seed initial data
pnpm prisma:seed
```

### Option B: Local PostgreSQL

```bash
# Install PostgreSQL if not installed
# macOS: brew install postgresql@16

# Start PostgreSQL
brew services start postgresql@16

# Create database
createdb brunoexchange

# Update DATABASE_URL in .env to:
# DATABASE_URL="postgresql://localhost:5432/brunoexchange"

# Run migrations
cd apps/backend
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

---

## Step 4: Start Redis (2 min)

### Option A: Use Upstash (Recommended)

1. Go to [https://upstash.com](https://upstash.com)
2. Create a new database
3. Copy Redis URL to .env

### Option B: Local Redis

```bash
# Install Redis
# macOS: brew install redis

# Start Redis
brew services start redis

# Update REDIS_URL in .env:
# REDIS_URL="redis://localhost:6379"
```

---

## Step 5: Run the App! (1 min)

```bash
# From the root directory

# Terminal 1 - Start backend
pnpm dev:backend

# Terminal 2 - Start frontend
pnpm dev:frontend

# Or start both together
pnpm dev
```

---

## Step 6: Test It Out (2 min)

1. **Open browser**: http://localhost:5173

2. **Register a new account**:
   - Email: test@example.com
   - Password: SecurePass123!

3. **Check your balance**: Should show 100 credits

4. **Browse markets**: Go to Markets page

5. **Test API health**:
   ```bash
   curl http://localhost:8080/health
   # Should return: {"ok":true,"timestamp":"..."}
   ```

---

## 🎉 You're Done!

The app is now running locally. Next steps:

1. **Create markets** (requires admin role)
2. **Place orders** on markets
3. **View your portfolio**
4. **Test real-time updates** (open two browsers)

---

## Common Issues

### Port already in use

```bash
# Backend port 8080
lsof -ti:8080 | xargs kill -9

# Frontend port 5173
lsof -ti:5173 | xargs kill -9
```

### Database connection error

```bash
# Check DATABASE_URL is correct
# Make sure PostgreSQL is running
brew services list

# Try direct connection instead of pooler
```

### Redis connection error

```bash
# Check REDIS_URL is correct
# Make sure Redis is running
brew services list

# Test connection
redis-cli ping
```

### Prisma client not generated

```bash
cd apps/backend
pnpm prisma:generate
```

### Module not found errors

```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install
```

---

## Useful Commands

```bash
# View database
pnpm prisma:studio

# Check logs
pnpm dev:backend  # Shows backend logs
pnpm dev:frontend # Shows frontend logs

# Reset database
pnpm --filter @prediction-markets/backend prisma migrate reset

# Build for production
pnpm build

# Run tests
pnpm test
```

---

## Development Workflow

1. **Backend changes**: Edit files in `apps/backend/src/`
   - Auto-reloads on save
   - Check terminal for errors

2. **Frontend changes**: Edit files in `src/`
   - Hot module replacement
   - Check browser console

3. **Database changes**: Edit `apps/backend/prisma/schema.prisma`
   ```bash
   pnpm prisma:migrate:dev
   pnpm prisma:generate
   ```

4. **Shared types**: Edit `packages/shared/src/index.ts`
   ```bash
   pnpm build:shared
   ```

---

## Next Steps

- Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for production deployment
- Read [MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md) for full feature list
- Check [START_HERE.md](./START_HERE.md) for all documentation

---

## 🆘 Need Help?

- Check health endpoint: `curl http://localhost:8080/health`
- Check ready endpoint: `curl http://localhost:8080/ready`
- View Prisma Studio: `pnpm prisma:studio`
- Check browser console: F12 > Console
- Check backend logs in terminal

Happy coding! 🚀
