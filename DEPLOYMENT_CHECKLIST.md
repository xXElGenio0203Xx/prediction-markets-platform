# ✅ Deployment Checklist

Use this checklist before deploying to production.

---

## 🔧 Pre-Deployment

### Backend Configuration
- [ ] All environment variables set in Fly.io secrets
- [ ] `DATABASE_URL` points to Supabase pooler (port 6543)
- [ ] `DIRECT_URL` points to direct connection (port 5432)
- [ ] `REDIS_URL` configured with Upstash Redis
- [ ] `JWT_SECRET` is strong (32+ characters)
- [ ] `JWT_REFRESH_SECRET` is different from JWT_SECRET
- [ ] `CORS_ORIGIN` includes production domain
- [ ] Prisma migrations applied (`prisma migrate deploy`)
- [ ] Database seeded with initial data

### Frontend Configuration
- [ ] `VITE_API_URL` points to production backend
- [ ] `VITE_WS_URL` points to production WebSocket endpoint
- [ ] Build succeeds without errors
- [ ] Environment variables set in Vercel dashboard

### DNS Configuration
- [ ] `api.yourdomain.com` CNAME → Fly.io hostname
- [ ] `app.yourdomain.com` CNAME → Vercel hostname
- [ ] SSL certificates valid (Full Strict mode in Cloudflare)
- [ ] WebSocket path `/ws` not proxied/cached

---

## 🚀 Deployment Steps

### 1. Backend (Fly.io)

```bash
cd apps/backend

# Build Docker image
flyctl deploy --remote-only

# Verify deployment
curl https://api.yourdomain.com/health
curl https://api.yourdomain.com/ready

# Check logs
flyctl logs -a pm-backend
```

**Expected `/ready` response:**
```json
{
  "ready": true,
  "database": true,
  "redis": true
}
```

### 2. Frontend (Vercel)

```bash
cd apps/frontend

# Deploy
vercel --prod

# Or push to main branch (if CI/CD configured)
git push origin main
```

### 3. Test End-to-End

```bash
# 1. Register user
curl -X POST https://api.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "displayName": "Test User"
  }'

# 2. Login
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# 3. Get markets
curl https://api.yourdomain.com/api/markets \
  -b cookies.txt

# 4. Place order (requires market slug)
curl -X POST https://api.yourdomain.com/api/orders/will-btc-hit-100k \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -b cookies.txt \
  -d '{
    "side": "BUY",
    "outcome": "YES",
    "type": "LIMIT",
    "price": 0.65,
    "quantity": 10
  }'

# 5. Test WebSocket (with wscat)
wscat -c wss://api.yourdomain.com/ws \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# In wscat:
> {"event":"subscribe:market","data":{"marketId":"market-uuid"}}
> {"event":"ping"}
```

---

## 🔍 Post-Deployment Verification

### Health Checks
- [ ] `/health` returns 200 OK
- [ ] `/ready` returns 200 OK with `ready: true`
- [ ] `/metrics` returns Prometheus metrics

### API Functionality
- [ ] User registration works
- [ ] User login returns JWT tokens
- [ ] `/api/markets` returns market list
- [ ] `/api/markets/:slug` returns market details
- [ ] Order placement works (with valid token)
- [ ] Order cancellation works
- [ ] Orderbook retrieval works
- [ ] User balance/positions endpoints work

### WebSocket Functionality
- [ ] WebSocket connection succeeds with JWT
- [ ] `subscribe:market` joins rooms successfully
- [ ] `ping` → `pong` works
- [ ] Real-time updates received on order placement
- [ ] Real-time updates received on trade execution
- [ ] Multiple clients can connect simultaneously

### Security
- [ ] CORS only allows production domains
- [ ] Rate limiting blocks excessive requests
- [ ] Invalid JWT returns 401 Unauthorized
- [ ] SQL injection attempts are blocked (Prisma)
- [ ] XSS attempts are blocked (Helmet headers)
- [ ] HTTPS enforced (HTTP redirects to HTTPS)

### Performance
- [ ] Average response time < 200ms
- [ ] WebSocket latency < 50ms
- [ ] Database connection pool healthy
- [ ] Redis connection stable
- [ ] No memory leaks (check Fly.io metrics)

### Monitoring
- [ ] Sentry receiving error reports (if configured)
- [ ] Prometheus metrics accessible
- [ ] Uptime monitoring configured (UptimeRobot, etc.)
- [ ] Alerting configured for downtime

---

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check logs
flyctl logs -a pm-backend

# Common issues:
# 1. Missing environment variables
flyctl secrets list

# 2. Database connection failed
# → Check DATABASE_URL, ensure migrations applied

# 3. Redis connection failed
# → Check REDIS_URL, test with redis-cli

# 4. Port binding error
# → Ensure PORT=8080 in fly.toml matches Dockerfile EXPOSE
```

### WebSocket connection fails

```bash
# 1. Check CORS settings
# Ensure CORS_ORIGIN includes frontend domain

# 2. Check JWT token
# Token must be valid and not expired

# 3. Check Cloudflare settings
# WebSocket path /ws should not be cached
# Consider disabling proxy for /ws path if issues persist

# 4. Test direct connection (bypass Cloudflare)
wscat -c wss://pm-backend.fly.dev/ws -H "Authorization: Bearer TOKEN"
```

### Database connection pool exhausted

```bash
# Solution 1: Use Supabase pooler (pgbouncer)
DATABASE_URL=postgresql://...@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Solution 2: Scale Fly.io machines
flyctl scale count 2

# Solution 3: Increase connection limit in Prisma
# Edit prisma/schema.prisma:
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
}
```

### Rate limiting too aggressive

```bash
# Increase limits
flyctl secrets set \
  RATE_LIMIT_MAX=200 \
  RATE_LIMIT_WINDOW_MS=60000

# Redeploy
flyctl deploy
```

### Redis connection drops

```bash
# Check Upstash status
# https://status.upstash.com/

# Test connection
redis-cli -u $REDIS_URL PING

# Increase retry attempts (edit src/lib/redis.ts)
maxRetriesPerRequest: 5
```

---

## 🔄 Rollback Procedure

### Backend

```bash
# List recent releases
flyctl releases -a pm-backend

# Rollback to previous version
flyctl releases rollback <version> -a pm-backend

# Verify
curl https://api.yourdomain.com/health
```

### Frontend

```bash
# In Vercel dashboard:
# 1. Go to Deployments
# 2. Find previous successful deployment
# 3. Click "..." → "Promote to Production"
```

### Database

```bash
# If migration failed, rollback:
cd apps/backend

# Find migration to rollback
pnpm prisma migrate status

# Manual rollback (run SQL in Supabase dashboard)
# Or restore from backup if available
```

---

## 📊 Scaling

### Vertical Scaling (Fly.io)

```bash
# Upgrade CPU/memory
flyctl scale vm shared-cpu-2x --memory 1024 -a pm-backend
```

### Horizontal Scaling (Fly.io)

```bash
# Add more machines
flyctl scale count 3 -a pm-backend

# Note: Redis pub/sub ensures WebSocket messages
# are broadcast across all instances
```

### Database Scaling (Supabase)

```bash
# Upgrade plan in Supabase dashboard
# https://app.supabase.com/project/xsdhkjiskqfelahfariv/settings/billing

# Or migrate to dedicated PostgreSQL instance
```

### Redis Scaling (Upstash)

```bash
# Upgrade plan in Upstash dashboard
# https://console.upstash.com/redis/YOUR_DB_ID

# Consider Redis cluster for high throughput
```

---

## 🎯 Success Criteria

- ✅ Backend deployed on Fly.io with 99.9% uptime
- ✅ Frontend deployed on Vercel with CDN distribution
- ✅ DNS configured (api/app subdomains)
- ✅ SSL certificates valid (A+ rating on SSL Labs)
- ✅ Health checks passing
- ✅ WebSocket real-time updates working
- ✅ End-to-end order flow functional (register → login → place order → match → update UI)
- ✅ Rate limiting protecting against abuse
- ✅ Monitoring/alerting configured
- ✅ Backup strategy in place (Supabase auto-backups)

---

## 📞 Support

**Fly.io Issues**: https://community.fly.io/  
**Vercel Issues**: https://vercel.com/support  
**Supabase Issues**: https://github.com/supabase/supabase/discussions  
**Upstash Issues**: https://upstash.com/docs/redis  

---

**Last Updated**: 2024  
**Maintained By**: Your Team
