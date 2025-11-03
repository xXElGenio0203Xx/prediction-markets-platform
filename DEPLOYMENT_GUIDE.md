# 🚀 Deployment Setup Guide

This guide will help you deploy the BrunoExchange prediction markets platform to production.

## Prerequisites

You'll need accounts for the following services:

1. **Supabase** (PostgreSQL database)
2. **Upstash** (Redis)
3. **Fly.io** (Backend hosting)
4. **Vercel** (Frontend hosting)
5. **GitHub** (Source control)

---

## Step 1: Database Setup (Supabase)

### 1.1 Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new organization (if needed)
4. Click "New Project"
   - Name: `brunoexchange` (or your preferred name)
   - Database Password: Generate a strong password (save it!)
   - Region: Choose closest to your users
5. Wait for project to be provisioned (~2 minutes)

### 1.2 Get Database Connection Strings

1. Go to Project Settings > Database
2. Copy these connection strings:
   - **Connection Pooling URL** (for DATABASE_URL) - Use "Transaction" mode
   - **Direct Connection URL** (for DIRECT_URL)
3. Save both - you'll need them later

### 1.3 Run Database Migrations

```bash
# From the apps/backend directory
cd apps/backend

# Set your DATABASE_URL temporarily
export DATABASE_URL="your-connection-pooling-url"

# Run migrations
pnpm prisma:migrate

# Seed initial data (optional)
pnpm prisma:seed
```

---

## Step 2: Redis Setup (Upstash)

### 2.1 Create Upstash Database

1. Go to [https://upstash.com](https://upstash.com)
2. Sign up / Log in
3. Click "Create Database"
   - Name: `brunoexchange-redis`
   - Type: Regional
   - Region: Choose same region as Supabase
   - TLS: Enabled
4. Click "Create"

### 2.2 Get Redis URL

1. Click on your database
2. Scroll to "REST API" section
3. Copy the **UPSTASH_REDIS_REST_URL**
4. Format: `rediss://default:PASSWORD@HOST:PORT`

---

## Step 3: Backend Deployment (Fly.io)

### 3.1 Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 3.2 Authenticate

```bash
flyctl auth login
```

### 3.3 Create Fly App

```bash
cd apps/backend

# Create app (choose a unique name)
flyctl launch --no-deploy

# When prompted:
# - App name: brunoexchange-api (or your preferred name)
# - Region: Same as Supabase
# - PostgreSQL: No (we're using Supabase)
# - Redis: No (we're using Upstash)
```

### 3.4 Set Environment Variables

```bash
# Database
flyctl secrets set DATABASE_URL="your-supabase-pooling-url"
flyctl secrets set DIRECT_URL="your-supabase-direct-url"

# Redis
flyctl secrets set REDIS_URL="your-upstash-redis-url"

# JWT (generate with: openssl rand -base64 64)
flyctl secrets set JWT_SECRET="your-generated-secret"
flyctl secrets set JWT_REFRESH_SECRET="your-generated-refresh-secret"

# CORS (add your frontend domain after deployment)
flyctl secrets set CORS_ORIGIN="https://your-frontend-domain.vercel.app"

# Environment
flyctl secrets set NODE_ENV="production"
flyctl secrets set LOG_LEVEL="info"
```

### 3.5 Deploy Backend

```bash
# Deploy
flyctl deploy

# Check status
flyctl status

# View logs
flyctl logs
```

### 3.6 Get Backend URL

```bash
flyctl info
# Look for "Hostname" - this is your API URL
# Example: brunoexchange-api.fly.dev
```

---

## Step 4: Frontend Deployment (Vercel)

### 4.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 4.2 Login to Vercel

```bash
vercel login
```

### 4.3 Deploy Frontend

```bash
cd apps/frontend

# Deploy
vercel

# When prompted:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - Project name: brunoexchange (or your preferred name)
# - Directory: ./ (current directory)
# - Override settings? No
```

### 4.4 Set Environment Variables on Vercel

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings > Environment Variables
4. Add:
   - `VITE_API_URL` = `https://your-fly-app.fly.dev`
   - `VITE_WS_URL` = `https://your-fly-app.fly.dev`
5. Save

### 4.5 Redeploy

```bash
# Trigger new deployment with env vars
vercel --prod
```

---

## Step 5: Update CORS on Backend

Now that you have your frontend URL:

```bash
cd apps/backend

# Update CORS to include your frontend domain
flyctl secrets set CORS_ORIGIN="https://your-frontend.vercel.app,http://localhost:5173"

# This will automatically redeploy
```

---

## Step 6: Verify Deployment

### 6.1 Check Backend Health

```bash
curl https://your-backend.fly.dev/health
# Should return: {"ok": true, "timestamp": "..."}
```

### 6.2 Check Frontend

1. Visit your Vercel URL
2. Try to register a new account
3. Try to browse markets
4. Place a test order

---

## Environment Variables Reference

### Backend (.env)

```env
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

REDIS_URL=rediss://...

JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

CORS_ORIGIN=https://yourfrontend.vercel.app

RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60s

WS_RATE_LIMIT_MAX=10
WS_RATE_LIMIT_WINDOW=60s

SENTRY_DSN=  # Optional
RESEND_API_KEY=  # Optional
```

### Frontend (.env)

```env
VITE_API_URL=https://your-backend.fly.dev
VITE_WS_URL=https://your-backend.fly.dev
```

---

## Monorepo Development Commands

### Install Dependencies

```bash
# From root
pnpm install
```

### Development

```bash
# Start backend
pnpm --filter @prediction-markets/backend dev

# Start frontend
pnpm --filter @prediction-markets/frontend dev

# Start both
pnpm dev
```

### Build

```bash
# Build backend
pnpm --filter @prediction-markets/backend build

# Build frontend
pnpm --filter @prediction-markets/frontend build

# Build all
pnpm build
```

### Database

```bash
# Generate Prisma client
pnpm --filter @prediction-markets/backend prisma:generate

# Run migrations
pnpm --filter @prediction-markets/backend prisma:migrate

# Seed database
pnpm --filter @prediction-markets/backend prisma:seed

# Open Prisma Studio
pnpm --filter @prediction-markets/backend prisma:studio
```

---

## Troubleshooting

### Backend won't start on Fly.io

```bash
# Check logs
flyctl logs

# Common issues:
# 1. Database connection - verify DATABASE_URL
# 2. Redis connection - verify REDIS_URL
# 3. Missing secrets - verify all secrets are set
```

### Frontend can't connect to backend

1. Check VITE_API_URL in Vercel env vars
2. Verify CORS_ORIGIN on backend includes your frontend domain
3. Check browser console for CORS errors

### Database migrations fail

```bash
# Reset database (WARNING: deletes all data)
pnpm --filter @prediction-markets/backend prisma migrate reset

# Or manually run migrations
pnpm --filter @prediction-markets/backend prisma migrate deploy
```

### WebSocket not connecting

1. Verify WS_URL uses wss:// (not ws://) in production
2. Check Fly.io logs for WebSocket handshake errors
3. Ensure frontend is using correct WS endpoint

---

## Security Checklist

- [ ] Changed all default passwords
- [ ] Generated secure JWT secrets (min 64 characters)
- [ ] Set NODE_ENV=production
- [ ] Configured CORS to only allow your frontend domain
- [ ] Enabled TLS/SSL on all connections
- [ ] Set up Sentry for error tracking (optional)
- [ ] Configured rate limiting
- [ ] Reviewed and restricted database permissions

---

## Monitoring

### Fly.io

```bash
# View metrics
flyctl dashboard

# Check logs in real-time
flyctl logs

# Scale app
flyctl scale count 2  # Run 2 instances
```

### Supabase

1. Go to your project dashboard
2. Check Database > Performance
3. Monitor connection pool usage

### Upstash

1. Check Redis dashboard
2. Monitor connection count and memory usage

---

## Next Steps

1. Set up custom domain on Vercel
2. Configure SSL certificates
3. Set up monitoring alerts (Sentry, Upstash alerts)
4. Create admin user account
5. Add initial markets
6. Test with real users

---

## Support

- Backend logs: `flyctl logs`
- Database logs: Supabase Dashboard > Logs
- Frontend logs: Vercel Dashboard > Deployments > [deployment] > Logs

For issues, check:
- GitHub Issues
- Documentation in repo
- Backend health endpoint: `/health`
