# 🔐 Service Credentials Setup Guide

**For**: Production Deployment Team  
**Date**: October 22, 2025  
**Purpose**: Complete guide to set up all required service accounts and credentials

---

## 📋 Overview

This guide contains **all the accounts and credentials** needed to deploy the prediction market platform. Each section includes:
- Service name and purpose
- Sign-up link
- What credentials to collect
- Where to place them in the codebase

---

## 🗂️ Quick Reference: All Services Needed

| Service | Purpose | Priority | Cost |
|---------|---------|----------|------|
| [Supabase](#1-supabase-postgresql-database) | PostgreSQL Database | 🔴 Critical | Free tier available |
| [Upstash](#2-upstash-redis) | Redis (cache + pub/sub) | 🔴 Critical | Free tier available |
| [Fly.io](#3-flyio-backend-hosting) | Backend hosting | 🔴 Critical | ~$5-10/month |
| [Vercel](#4-vercel-frontend-hosting) | Frontend hosting | 🔴 Critical | Free tier available |
| [Cloudflare](#5-cloudflare-dns--ssl) | DNS + SSL | 🟡 Important | Free tier available |
| [Sentry](#6-sentry-error-monitoring) | Error monitoring | 🟢 Optional | Free tier available |
| [Resend](#7-resend-transactional-emails) | Transactional emails | 🟢 Optional | Free tier: 3k/month |

---

## 1. 🗄️ Supabase (PostgreSQL Database)

### Purpose
PostgreSQL database for all application data (users, markets, orders, trades, balances, positions).

### Sign Up
1. Go to: https://supabase.com
2. Click "Start your project"
3. Sign in with GitHub (recommended) or email
4. Create a new organization (e.g., "PredictionMarket")
5. Create a new project:
   - **Project name**: `prediction-market-prod`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to users (e.g., `us-east-1`)
   - **Pricing Plan**: Start with Free tier (can upgrade later)

### Credentials to Collect

After project is created, go to **Settings → Database**:

```bash
# You need these values:
Project Reference ID: [COPY THIS]     # Example: xsdhkjiskqfelahfariv
Database Password: [YOUR PASSWORD]     # The one you set during creation
Region: [COPY THIS]                    # Example: aws-0-us-east-1
```

Also go to **Settings → API** and copy:

```bash
Project URL: [COPY THIS]               # Example: https://xsdhkjiskqfelahfariv.supabase.co
anon public key: [COPY THIS]           # Long JWT token
```

### Where to Place Credentials

**File**: `/backend/.env`

```bash
# Supabase Configuration
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=[YOUR_ANON_PUBLIC_KEY]

# Database Configuration
# Direct connection (for migrations and dev)
DATABASE_URL=postgresql://postgres:[DB_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[DB_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

**File**: `/apps/backend/.env`

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@[REGION].pooler.supabase.com:5432/postgres
```

**Example with real values**:
```bash
# If your project ref is "xsdhkjiskqfelahfariv" and region is "aws-0-us-east-1"
DATABASE_URL=postgresql://postgres.xsdhkjiskqfelahfariv:YourPassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Post-Setup Tasks

After adding credentials, run migrations:
```bash
cd backend
npm run prisma:migrate
npm run prisma:seed
```

---

## 2. 🔴 Upstash (Redis)

### Purpose
Redis for caching, rate limiting, and pub/sub for real-time orderbook updates.

### Sign Up
1. Go to: https://upstash.com
2. Click "Get Started" or "Sign Up"
3. Sign in with GitHub (recommended) or email
4. Verify your email

### Create Redis Database
1. Click "Create Database"
2. **Settings**:
   - **Name**: `prediction-market-prod`
   - **Type**: Regional
   - **Region**: Choose same as Supabase (e.g., `us-east-1`)
   - **Eviction**: No eviction (we manage TTL manually)
3. Click "Create"

### Credentials to Collect

After database is created, you'll see:

```bash
# On the database details page:
UPSTASH_REDIS_REST_URL: [COPY THIS]           # https://[endpoint].upstash.io
UPSTASH_REDIS_REST_TOKEN: [COPY THIS]         # Long token

# Click on "Redis" tab, then scroll to "Connection" section:
Redis URL: rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6379
```

### Where to Place Credentials

**File**: `/backend/.env`

```bash
# Redis (use Upstash Redis)
REDIS_URL=rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6379
```

**File**: `/apps/backend/.env`

```bash
# Redis (Upstash)
REDIS_URL=rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6379
```

**Example with real values**:
```bash
REDIS_URL=rediss://default:AYNgASQgNjU2ZjE4YzctZGJmMS00@us1-proper-swan-12345.upstash.io:6379
```

### Test Connection

```bash
cd backend
node -e "const Redis = require('ioredis'); const redis = new Redis(process.env.REDIS_URL); redis.ping().then(() => console.log('Connected!')).catch(console.error);"
```

---

## 3. 🚀 Fly.io (Backend Hosting)

### Purpose
Hosting for Fastify + Socket.IO backend server in Docker containers.

### Sign Up
1. Go to: https://fly.io
2. Click "Sign Up" or "Get Started"
3. Sign up with GitHub (recommended) or email
4. Add payment method (required even for free tier, won't charge without your permission)

### Install Fly CLI

**macOS/Linux**:
```bash
curl -L https://fly.io/install.sh | sh
```

**Windows** (PowerShell):
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

### Login
```bash
flyctl auth login
```

### Create App

```bash
cd apps/backend
flyctl launch --name pm-backend --region iad --no-deploy
```

This creates `fly.toml` (already exists, will ask to use it).

### Credentials to Set

Set secrets (environment variables) on Fly.io:

```bash
# Database
flyctl secrets set DATABASE_URL="postgresql://postgres.xsdhkjiskqfelahfariv:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Redis
flyctl secrets set REDIS_URL="rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6379"

# JWT Secrets (generate these - see section below)
flyctl secrets set JWT_SECRET="[GENERATE_32_CHAR_SECRET]"
flyctl secrets set JWT_REFRESH_SECRET="[GENERATE_32_CHAR_SECRET]"

# CORS (your frontend URL)
flyctl secrets set CORS_ORIGIN="https://app.yourdomain.com"
```

### Generate JWT Secrets

Run this to generate secure secrets:
```bash
# JWT Secret
openssl rand -base64 32

# JWT Refresh Secret (run again for different value)
openssl rand -base64 32
```

Copy the output and use in `flyctl secrets set` commands above.

### Deploy

```bash
flyctl deploy
```

### Credentials to Collect

After deployment:
```bash
# Your backend URL (this is what frontend will use)
Backend URL: https://pm-backend.fly.dev

# API Key (for CI/CD)
Fly.io API Token: [Get from https://fly.io/user/personal_access_tokens]
```

### Where to Place Credentials

**File**: `/.env` (frontend)

```bash
# Production frontend .env
VITE_API_URL=https://pm-backend.fly.dev/api
VITE_WS_URL=wss://pm-backend.fly.dev/ws
```

---

## 4. 🌐 Vercel (Frontend Hosting)

### Purpose
Hosting for React/Vite frontend with automatic deployments from Git.

### Sign Up
1. Go to: https://vercel.com
2. Click "Sign Up"
3. Sign up with GitHub (recommended - auto-links repos)

### Create Project
1. Click "Add New..." → "Project"
2. Import your GitHub repository
3. **Settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Environment Variables

Click "Environment Variables" and add:

```bash
VITE_API_URL=https://pm-backend.fly.dev/api
VITE_WS_URL=wss://pm-backend.fly.dev/ws
```

### Deploy

Click "Deploy" - Vercel will build and deploy automatically.

### Credentials to Collect

After deployment:
```bash
# Your frontend URL
Frontend URL: https://[PROJECT_NAME].vercel.app
# Or custom domain: https://app.yourdomain.com

# Vercel API Token (for CI/CD)
Token: [Get from https://vercel.com/account/tokens]
```

### Custom Domain (Optional)

1. Go to project → Settings → Domains
2. Add your custom domain: `app.yourdomain.com`
3. Follow DNS instructions (see Cloudflare section)

---

## 5. ☁️ Cloudflare (DNS + SSL)

### Purpose
DNS management and SSL certificates for custom domains.

### Sign Up
1. Go to: https://cloudflare.com
2. Click "Sign Up"
3. Create account with email

### Add Domain
1. Click "Add a Site"
2. Enter your domain name (e.g., `yourdomain.com`)
3. Select Free plan
4. Cloudflare will scan DNS records
5. Update nameservers at your domain registrar to Cloudflare's nameservers

### DNS Configuration

Add these DNS records:

**Backend (API) - Fly.io**:
```
Type: CNAME
Name: api
Content: pm-backend.fly.dev
Proxy status: Proxied (orange cloud)
```

**Frontend - Vercel**:
```
Type: CNAME
Name: app
Content: cname.vercel-dns.com
Proxy status: Proxied (orange cloud)
```

**Root domain** (optional):
```
Type: CNAME
Name: @
Content: cname.vercel-dns.com
Proxy status: Proxied (orange cloud)
```

### SSL Configuration

1. Go to SSL/TLS → Overview
2. Set encryption mode to "Full" or "Full (strict)"
3. SSL certificates are automatic with Cloudflare proxy

### Credentials to Collect

```bash
# For CI/CD automation
Cloudflare API Token: [Create at https://dash.cloudflare.com/profile/api-tokens]
Zone ID: [Found on domain overview page]
```

### Update Environment Variables

After DNS is configured, update:

**Fly.io secrets**:
```bash
flyctl secrets set CORS_ORIGIN="https://app.yourdomain.com"
```

**Vercel environment variables**:
```bash
VITE_API_URL=https://api.yourdomain.com/api
VITE_WS_URL=wss://api.yourdomain.com/ws
```

---

## 6. 🐛 Sentry (Error Monitoring) - Optional

### Purpose
Error tracking and performance monitoring for backend and frontend.

### Sign Up
1. Go to: https://sentry.io
2. Click "Get Started" or "Sign Up"
3. Sign up with GitHub or email
4. Create organization (e.g., "PredictionMarket")

### Create Projects

**Backend Project**:
1. Click "Create Project"
2. Platform: Node.js
3. Name: `prediction-market-backend`
4. Copy the DSN

**Frontend Project**:
1. Click "Create Project"
2. Platform: React
3. Name: `prediction-market-frontend`
4. Copy the DSN

### Credentials to Collect

```bash
# Backend DSN
Backend Sentry DSN: https://[KEY]@[ORG].ingest.sentry.io/[PROJECT_ID]

# Frontend DSN
Frontend Sentry DSN: https://[KEY]@[ORG].ingest.sentry.io/[PROJECT_ID]
```

### Where to Place Credentials

**File**: `/apps/backend/.env`

```bash
# Optional: Sentry (error monitoring)
SENTRY_DSN=https://[KEY]@[ORG].ingest.sentry.io/[PROJECT_ID]
```

**File**: `/backend/.env`

```bash
# Optional: Sentry
SENTRY_DSN=https://[KEY]@[ORG].ingest.sentry.io/[PROJECT_ID]
```

**File**: `/.env` (frontend)

```bash
# Optional: Sentry
VITE_SENTRY_DSN=https://[KEY]@[ORG].ingest.sentry.io/[PROJECT_ID]
```

**Fly.io secrets** (optional):
```bash
flyctl secrets set SENTRY_DSN="https://[KEY]@[ORG].ingest.sentry.io/[PROJECT_ID]"
```

---

## 7. 📧 Resend (Transactional Emails) - Optional

### Purpose
Send transactional emails (password resets, notifications, etc.).

### Sign Up
1. Go to: https://resend.com
2. Click "Sign Up"
3. Sign up with email or GitHub

### Setup
1. Verify your email
2. Add your domain (optional, can use onboarding domain for testing)
3. Add DNS records if using custom domain:
   - SPF record
   - DKIM record
   - DMARC record (recommended)

### Credentials to Collect

1. Go to API Keys
2. Click "Create API Key"
3. Name: `Production Backend`
4. Permissions: Full Access (or limit to Sending)
5. Copy the API key (starts with `re_`)

```bash
Resend API Key: re_[YOUR_API_KEY]
```

### Where to Place Credentials

**File**: `/apps/backend/.env`

```bash
# Optional: Resend (transactional emails)
RESEND_API_KEY=re_[YOUR_API_KEY]
```

**File**: `/backend/.env`

```bash
# Optional: Resend
RESEND_API_KEY=re_[YOUR_API_KEY]
```

**Fly.io secrets** (optional):
```bash
flyctl secrets set RESEND_API_KEY="re_[YOUR_API_KEY]"
```

---

## 📝 Complete Environment Variables Checklist

### Backend (`/backend/.env`)

```bash
# ✅ Must have
NODE_ENV=production
PORT=4000
DATABASE_URL=[SUPABASE_CONNECTION_STRING]
DIRECT_URL=[SUPABASE_DIRECT_CONNECTION_STRING]
REDIS_URL=[UPSTASH_REDIS_URL]
JWT_SECRET=[GENERATE_WITH_OPENSSL]
JWT_REFRESH_SECRET=[GENERATE_WITH_OPENSSL]
CORS_ORIGIN=https://app.yourdomain.com

# ⚠️ Optional
SENTRY_DSN=[SENTRY_BACKEND_DSN]
RESEND_API_KEY=[RESEND_API_KEY]
```

### Apps Backend (`/apps/backend/.env`)

```bash
# ✅ Must have
NODE_ENV=production
PORT=8080
DATABASE_URL=[SUPABASE_POOLER_CONNECTION_STRING]
DIRECT_URL=[SUPABASE_DIRECT_CONNECTION_STRING]
REDIS_URL=[UPSTASH_REDIS_URL]
JWT_SECRET=[GENERATE_WITH_OPENSSL]
JWT_REFRESH_SECRET=[GENERATE_WITH_OPENSSL]
CORS_ORIGIN=https://app.yourdomain.com

# ⚠️ Optional
SENTRY_DSN=[SENTRY_BACKEND_DSN]
RESEND_API_KEY=[RESEND_API_KEY]
```

### Frontend (`/.env`)

```bash
# ✅ Must have
VITE_API_URL=https://api.yourdomain.com/api
VITE_WS_URL=wss://api.yourdomain.com/ws

# ⚠️ Optional
VITE_SENTRY_DSN=[SENTRY_FRONTEND_DSN]
```

---

## 🔒 Security Best Practices

### Generate Strong Secrets

```bash
# JWT Secret (32+ characters)
openssl rand -base64 32

# JWT Refresh Secret (different from JWT Secret)
openssl rand -base64 32

# General purpose secrets
openssl rand -hex 32
```

### Never Commit Secrets

Make sure these files are in `.gitignore`:
- `.env`
- `.env.local`
- `.env.production`
- `fly.toml` (contains secrets if added locally)

### Rotate Secrets Regularly

- JWT secrets: Every 90 days
- API keys: Every 180 days
- Database passwords: Every 180 days

### Use Environment Variables

Never hardcode credentials in code. Always use:
- `process.env.VARIABLE_NAME` in Node.js
- `import.meta.env.VITE_VARIABLE_NAME` in Vite frontend

---

## 🧪 Testing After Setup

### 1. Test Database Connection

```bash
cd backend
npm run prisma:migrate
npm run prisma:studio  # Opens database GUI
```

### 2. Test Redis Connection

```bash
cd backend
node -e "const Redis=require('ioredis');const r=new Redis(process.env.REDIS_URL);r.ping().then(()=>console.log('✅ Redis OK')).catch(e=>console.error('❌',e));"
```

### 3. Test Backend Locally

```bash
cd backend
npm run dev
# Should see: "Server listening on port 4000"
```

Test endpoints:
```bash
curl http://localhost:4000/health
# Should return: {"status":"ok"}
```

### 4. Test Frontend Locally

```bash
npm run dev
# Should see: "Local: http://localhost:5173"
```

Open browser to `http://localhost:5173` - should load without errors.

### 5. Test Production Deployment

**Backend**:
```bash
curl https://api.yourdomain.com/health
# Should return: {"status":"ok"}
```

**Frontend**:
Open `https://app.yourdomain.com` in browser - should load.

**WebSocket**:
Open browser console on frontend, should see WebSocket connection in Network tab.

---

## 🆘 Troubleshooting

### Database Connection Fails

**Check**:
1. Database password is correct (no special characters causing issues)
2. Database is not paused (Supabase free tier pauses after inactivity)
3. IP whitelist allows connections (Supabase → Settings → Database → Connection)

**Fix**: Update password in all `.env` files and Fly.io secrets.

### Redis Connection Fails

**Check**:
1. Redis URL format is `rediss://` (with two s's for SSL)
2. Password is correct
3. Endpoint is correct

**Fix**: Copy URL directly from Upstash dashboard.

### Fly.io Deployment Fails

**Check**:
1. All secrets are set: `flyctl secrets list`
2. Docker builds locally: `docker build -t test .`
3. Enough memory allocated in `fly.toml`

**Fix**: Check logs: `flyctl logs`

### CORS Errors

**Check**:
1. `CORS_ORIGIN` in backend matches frontend domain exactly
2. Protocol is correct (http vs https)
3. No trailing slash in URLs

**Fix**: Update `CORS_ORIGIN` in backend and redeploy.

### WebSocket Connection Fails

**Check**:
1. Using `wss://` (not `ws://`) for production
2. Cloudflare proxy is enabled (orange cloud)
3. No firewall blocking WebSocket connections

**Fix**: Test with `wscat`: `npm install -g wscat && wscat -c wss://api.yourdomain.com/ws`

---

## 📞 Support

### Service Status Pages

- Supabase: https://status.supabase.com
- Upstash: https://status.upstash.com
- Fly.io: https://status.flyio.net
- Vercel: https://vercel-status.com
- Cloudflare: https://cloudflarestatus.com

### Documentation

- Supabase: https://supabase.com/docs
- Upstash: https://upstash.com/docs/redis
- Fly.io: https://fly.io/docs
- Vercel: https://vercel.com/docs
- Cloudflare: https://developers.cloudflare.com
- Sentry: https://docs.sentry.io
- Resend: https://resend.com/docs

---

## ✅ Setup Completion Checklist

- [ ] **Supabase**: Account created, database created, credentials saved
- [ ] **Upstash**: Account created, Redis database created, credentials saved
- [ ] **Fly.io**: Account created, CLI installed, app created, secrets set
- [ ] **Vercel**: Account created, project created, environment variables set
- [ ] **Cloudflare**: Account created, domain added, DNS records configured
- [ ] **Sentry**: Account created (optional), projects created, DSNs saved
- [ ] **Resend**: Account created (optional), API key generated, saved
- [ ] **JWT Secrets**: Generated using OpenSSL, added to all `.env` files
- [ ] **Database Migration**: Ran `npm run prisma:migrate` successfully
- [ ] **Backend Local**: Tested and running on `http://localhost:4000`
- [ ] **Frontend Local**: Tested and running on `http://localhost:5173`
- [ ] **Backend Production**: Deployed to Fly.io, health check passing
- [ ] **Frontend Production**: Deployed to Vercel, site accessible
- [ ] **DNS**: Custom domains working (api.yourdomain.com, app.yourdomain.com)
- [ ] **SSL**: HTTPS working on all domains
- [ ] **WebSocket**: Real-time connections working in production

---

**Last Updated**: October 22, 2025  
**Status**: Ready for credential setup  
**Next Step**: Create accounts and fill in credentials following this guide

---

## 🎯 Quick Start for Your Friend

1. Start with **Supabase** (database) - most critical
2. Then **Upstash** (Redis) - needed for backend
3. Generate **JWT secrets** with OpenSSL
4. Test backend locally with these three
5. Set up **Fly.io** and deploy backend
6. Set up **Vercel** and deploy frontend
7. Configure **Cloudflare** for custom domains
8. Add **Sentry** and **Resend** later if needed

**Estimated time**: 2-3 hours for all critical services
