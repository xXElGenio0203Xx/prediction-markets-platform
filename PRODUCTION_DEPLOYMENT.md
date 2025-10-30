# 🚀 Production Deployment Guide - Prediction Markets Platform

## Overview

This guide will help you deploy a production-ready prediction market platform with:
- **Backend**: Fastify + Socket.IO on Fly.io
- **Frontend**: Vite + React on Vercel
- **Database**: Supabase PostgreSQL
- **Cache/Queue**: Upstash Redis
- **DNS**: Cloudflare (api.yourdomain.com, app.yourdomain.com)

---

## 📋 Prerequisites

### Accounts Needed (Create These First)
1. ✅ **Supabase** (already configured)
   - Project ID: `xsdhkjiskqfelahfariv`
   - https://supabase.com/dashboard/project/xsdhkjiskqfelahfariv

2. ⏳ **Fly.io** - https://fly.io/app/sign-up
   - Install CLI: `curl -L https://fly.io/install.sh | sh`
   - Login: `flyctl auth login`

3. ⏳ **Vercel** - https://vercel.com/signup
   - Install CLI: `npm i -g vercel`
   - Login: `vercel login`

4. ⏳ **Upstash Redis** - https://console.upstash.com/
   - Create a new Redis database
   - Copy `REDIS_URL`

5. ⏳ **Cloudflare** (or your DNS provider) - https://dash.cloudflare.com/

### Optional Services
6. **Sentry** - https://sentry.io/ (error monitoring)
7. **Resend** - https://resend.com/ (transactional emails)

---

## 🏗️ Step 1: Monorepo Structure

### Current Structure → Target Structure

```
browncast-3f78c242/           →    prediction-markets/
├── backend/                   →    ├── apps/
├── src/                       →    │   ├── backend/      # Fastify + Socket.IO
├── package.json               →    │   └── frontend/     # Vite + React
                                    ├── packages/
                                    │   └── shared/       # Shared types
                                    ├── pnpm-workspace.yaml
                                    └── package.json
```

### Migration Commands

```bash
cd /Users/maria_1/Desktop/browncast-3f78c242

# Install pnpm globally
npm install -g pnpm@9

# Move existing code
mkdir -p apps/backend apps/frontend packages/shared

# Backend: Move existing backend to apps/backend
mv backend/* apps/backend/ 2>/dev/null || true
mv backend/.env apps/backend/.env 2>/dev/null || true

# Frontend: Move existing frontend to apps/frontend
mv src apps/frontend/
mv index.html apps/frontend/
mv vite.config.js apps/frontend/
mv package.json apps/frontend/package-frontend.json
# Edit apps/frontend/package.json to set name: "@prediction-markets/frontend"

# Root: Copy package-root.json to package.json
cp package-root.json package.json

# Install all dependencies
pnpm install
```

---

## 🗄️ Step 2: Configure Upstash Redis

### Create Upstash Redis Database
1. Go to https://console.upstash.com/redis
2. Click "Create Database"
3. Choose region closest to your Fly.io region (e.g., `us-east-1`)
4. Copy connection string

### Update Backend .env

```bash
cd apps/backend

# Add to .env
REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379
```

### Test Connection
```bash
cd apps/backend
pnpm install ioredis rate-limiter-flexible
node -e "const Redis = require('ioredis'); const r = new Redis(process.env.REDIS_URL); r.ping().then(console.log)"
# Should output: PONG
```

---

## 🐘 Step 3: Finalize Supabase Configuration

### Get Your Database Password
1. Go to: https://app.supabase.com/project/xsdhkjiskqfelahfariv/settings/database
2. Copy your database password (or reset it)

### Update apps/backend/.env

```bash
# Replace [YOUR_DB_PASSWORD] with actual password
DATABASE_URL=postgresql://postgres.xsdhkjiskqfelahfariv:YOUR_ACTUAL_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres.xsdhkjiskqfelahfariv:YOUR_ACTUAL_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# For production (use pooler)
DATABASE_URL=postgresql://postgres.xsdhkjiskqfelahfariv:YOUR_ACTUAL_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Run Migrations
```bash
cd apps/backend
pnpm prisma generate
pnpm prisma migrate deploy
pnpm prisma:seed
```

---

## 🚀 Step 4: Deploy Backend to Fly.io

### Initialize Fly.io App

```bash
cd apps/backend

# Create fly.toml (see below)
# Create Dockerfile (see below)

# Launch app
flyctl launch --now=false --name pm-backend --region iad

# Set secrets
flyctl secrets set \
  DATABASE_URL="postgresql://postgres.xsdhkjiskqfelahfariv:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true" \
  DIRECT_URL="postgresql://postgres.xsdhkjiskqfelahfariv:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres" \
  REDIS_URL="rediss://default:PASSWORD@your-endpoint.upstash.io:6379" \
  JWT_SECRET="$(openssl rand -base64 32)" \
  JWT_REFRESH_SECRET="$(openssl rand -base64 32)" \
  CORS_ORIGIN="https://app.yourdomain.com,https://your-vercel-preview.vercel.app" \
  SENTRY_DSN="" \
  RESEND_API_KEY=""

# Deploy
flyctl deploy
```

### fly.toml

```toml
app = "pm-backend"
primary_region = "iad"

[build]
  [build.args]
    NODE_VERSION = "20"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

  [[http_service.checks]]
    grace_period = "10s"
    interval = "30s"
    method = "GET"
    timeout = "5s"
    path = "/health"

  [[http_service.checks]]
    grace_period = "10s"
    interval = "60s"
    method = "GET"
    timeout = "5s"
    path = "/ready"

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
```

### Dockerfile

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@9
COPY package.json pnpm-lock.yaml ./
COPY ../../pnpm-workspace.yaml ../../pnpm-workspace.yaml
COPY ../../packages/shared/package.json ../../packages/shared/
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/../../packages/shared ../../packages/shared
COPY . .
RUN pnpm prisma generate
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@9
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Run migrations on startup
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/server.js"]
```

### Test Deployment

```bash
# Check logs
flyctl logs

# Test endpoints
curl https://pm-backend.fly.dev/health
curl https://pm-backend.fly.dev/ready
curl https://pm-backend.fly.dev/metrics
```

---

## 🌐 Step 5: Deploy Frontend to Vercel

### Prepare Frontend

```bash
cd apps/frontend

# Create vercel.json
cat > vercel.json << 'EOF'
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
EOF

# Update package.json
# Set name: "@prediction-markets/frontend"
```

### Deploy to Vercel

```bash
cd apps/frontend

# Login
vercel login

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard:
# VITE_API_URL=https://api.yourdomain.com
# VITE_WS_URL=wss://api.yourdomain.com/ws
# VITE_SENTRY_DSN=
```

---

## 🌍 Step 6: Configure DNS (Cloudflare)

### Add DNS Records

1. Go to Cloudflare Dashboard → Your Domain → DNS

2. **Backend (Fly.io)**:
   ```
   Type: CNAME
   Name: api
   Target: pm-backend.fly.dev
   Proxy: Enabled (orange cloud)
   ```

3. **Frontend (Vercel)**:
   ```
   Type: CNAME
   Name: app
   Target: cname.vercel-dns.com
   Proxy: Enabled
   ```

4. **Verify in Vercel**:
   - Go to Project → Settings → Domains
   - Add `app.yourdomain.com`
   - Follow verification steps

### SSL Configuration

1. Cloudflare → SSL/TLS
2. Set to "Full (Strict)"
3. Enable "Always Use HTTPS"
4. Enable "HTTP/2" and "Brotli"

### WebSocket Configuration

For `/ws` path:
1. Cloudflare → Rules → Page Rules
2. Add rule: `api.yourdomain.com/ws*`
3. Settings: "Browser Cache TTL: Bypass"

---

## 🔒 Step 7: Security Checklist

### Backend Security
- [ ] JWT secrets are strong (32+ chars)
- [ ] CORS restricted to production domains
- [ ] Rate limiting enabled (IP + user)
- [ ] Helmet security headers active
- [ ] Input validation with Zod on all routes
- [ ] Database uses connection pooler
- [ ] Secrets stored in Fly.io (not .env)

### Database Security
- [ ] Supabase password changed from default
- [ ] Row Level Security (RLS) policies enabled
- [ ] Connection uses SSL
- [ ] IP allowlist configured (if needed)

### Frontend Security
- [ ] API keys not exposed in client code
- [ ] CSP headers configured
- [ ] HTTPS only
- [ ] XSS protection enabled

---

## 📊 Step 8: Monitoring Setup

### Sentry (Error Tracking)

```bash
# Backend
cd apps/backend
pnpm add @sentry/node @sentry/profiling-node

# Frontend  
cd apps/frontend
pnpm add @sentry/react

# Get DSN from: https://sentry.io/
# Add to environment variables
```

### Uptime Monitoring

Use:
- **Uptime Robot** (free) - https://uptimerobot.com/
- **Better Uptime** - https://betteruptime.com/
- **Pingdom** - https://www.pingdom.com/

Monitor:
- `https://api.yourdomain.com/health` (every 5 min)
- `https://app.yourdomain.com` (every 5 min)

### Logs

**Fly.io logs**:
```bash
flyctl logs --app pm-backend -n 100
```

**Supabase logs**:
- Database → Logs

---

## 🔄 Step 9: CI/CD with GitHub Actions

### .github/workflows/backend.yml

```yaml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths:
      - 'apps/backend/**'
      - 'packages/shared/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build
        run: cd apps/backend && pnpm build
      
      - name: Setup Fly.io
        uses: superfly/flyctl-actions/setup-flyctl@master
      
      - name: Deploy to Fly.io
        run: cd apps/backend && flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### .github/workflows/frontend.yml

```yaml
name: Deploy Frontend
on:
  push:
    branches: [main]
    paths:
      - 'apps/frontend/**'
      - 'packages/shared/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build shared package
        run: pnpm --filter @prediction-markets/shared build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: apps/frontend
```

### GitHub Secrets Required

```bash
# Get from: flyctl auth token
FLY_API_TOKEN=...

# Get from: Vercel dashboard → Settings → Tokens
VERCEL_TOKEN=...
VERCEL_ORG_ID=...
VERCEL_PROJECT_ID=...
```

---

## ✅ Step 10: Testing & Validation

### Backend Health Checks

```bash
# Health
curl https://api.yourdomain.com/health

# Readiness
curl https://api.yourdomain.com/ready

# Metrics
curl https://api.yourdomain.com/metrics

# WebSocket
wscat -c wss://api.yourdomain.com/ws
```

### Frontend Tests

```bash
# Visit
https://app.yourdomain.com

# Check console for:
# - API connection
# - WebSocket connection
# - No CORS errors
```

### End-to-End Test

1. Register user: `POST /api/auth/register`
2. Login: `POST /api/auth/login`
3. Get markets: `GET /api/markets`
4. Place order: `POST /api/orders/:marketSlug`
5. Subscribe to WebSocket
6. Verify real-time updates received

---

## 📝 Environment Variables Summary

### Backend (.env for local, Fly secrets for prod)

```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://...@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://...@aws-0-us-east-1.pooler.supabase.com:5432/postgres
REDIS_URL=rediss://default:...@....upstash.io:6379
JWT_SECRET=...
JWT_REFRESH_SECRET=...
CORS_ORIGIN=https://app.yourdomain.com,https://....vercel.app
SENTRY_DSN=
RESEND_API_KEY=
LOG_LEVEL=info
```

### Frontend (Vercel dashboard)

```bash
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com/ws
VITE_SENTRY_DSN=
```

---

## 🎯 Next Steps After Deployment

1. **Scale as needed**:
   ```bash
   # Scale Fly.io
   flyctl scale count 2 --app pm-backend
   flyctl scale vm shared-cpu-2x --app pm-backend
   ```

2. **Set up monitoring**:
   - Sentry for errors
   - Uptime monitoring
   - Log aggregation

3. **Implement features**:
   - Complete CLOB matching engine
   - Market lifecycle management
   - Admin dashboard

4. **Performance optimization**:
   - Redis caching for orderbooks
   - CDN for static assets
   - Database query optimization

---

## 📞 Support & Resources

- **Fly.io Docs**: https://fly.io/docs/
- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Upstash Docs**: https://docs.upstash.com/

---

**🎉 Deployment Complete!**

Your production-ready prediction market platform is now live at:
- **API**: https://api.yourdomain.com
- **App**: https://app.yourdomain.com
- **WebSocket**: wss://api.yourdomain.com/ws
