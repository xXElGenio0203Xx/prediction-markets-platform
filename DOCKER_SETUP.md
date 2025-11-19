# 🐳 Docker Local Development Guide

Run the entire BrunoExchange stack locally with Docker!

---

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- 8GB RAM minimum (recommended: 16GB)
- 10GB free disk space

### Install Docker

**macOS:**
```bash
brew install --cask docker
# Or download from https://www.docker.com/products/docker-desktop
```

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**Windows:**
Download from https://www.docker.com/products/docker-desktop

---

## Quick Start (5 minutes)

### 1. Start Everything

```bash
# Start all services (Postgres, Redis, Backend, Frontend)
docker-compose up -d

# Watch logs
docker-compose logs -f

# Or watch specific service
docker-compose logs -f backend
```

### 2. Wait for Services to Be Ready

The first run takes ~3-5 minutes (downloads images, builds, runs migrations).

Check status:
```bash
docker-compose ps

# Should show all services as "running" and "healthy"
```

### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080
- **Backend Health**: http://localhost:8080/health
- **Backend Metrics**: http://localhost:8080/metrics

### 4. Test the Application

1. Register a new account at http://localhost:5173
2. Login with your credentials
3. Check your balance (should be 100 credits from seed data)
4. Browse markets
5. Place an order!

---

## What Gets Deployed?

### Services Running

1. **PostgreSQL** (port 5432)
   - Database: `brunoexchange`
   - User: `brunoexchange`
   - Password: `brunoexchange_dev_password`

2. **Redis** (port 6379)
   - No authentication (dev only)
   - Persistence enabled

3. **Backend API** (port 8080)
   - Fastify + Socket.IO server
   - Auto-runs migrations
   - Auto-seeds database
   - Hot reload enabled

4. **Frontend** (port 5173)
   - Vite dev server
   - Hot module replacement
   - Connected to backend

---

## Useful Commands

### Start/Stop

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v

# Restart a specific service
docker-compose restart backend
docker-compose restart frontend
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Check Status

```bash
# List all services
docker-compose ps

# Check resource usage
docker stats
```

### Database Management

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U brunoexchange -d brunoexchange

# Run migrations
docker-compose exec backend pnpm prisma migrate dev

# Open Prisma Studio (on host machine)
cd apps/backend
pnpm prisma studio
# Then set DATABASE_URL to: postgresql://brunoexchange:brunoexchange_dev_password@localhost:5432/brunoexchange

# Reset database
docker-compose exec backend pnpm prisma migrate reset

# Seed database again
docker-compose exec backend pnpm prisma db seed
```

### Redis Management

```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Check Redis keys
docker-compose exec redis redis-cli KEYS '*'

# Monitor Redis commands
docker-compose exec redis redis-cli MONITOR

# Flush all data (⚠️ deletes everything)
docker-compose exec redis redis-cli FLUSHALL
```

### Backend Shell

```bash
# Access backend container shell
docker-compose exec backend sh

# Run commands inside
pnpm test
pnpm lint
```

---

## Development Workflow

### Making Backend Changes

1. Edit files in `apps/backend/src/`
2. Backend auto-reloads (watch logs)
3. Test changes at http://localhost:8080

### Making Frontend Changes

1. Edit files in `src/`
2. Frontend auto-reloads (hot module replacement)
3. View changes at http://localhost:5173

### Database Schema Changes

```bash
# 1. Edit apps/backend/prisma/schema.prisma

# 2. Create migration
docker-compose exec backend pnpm prisma migrate dev --name your_change_name

# 3. Changes automatically applied
```

### Adding New Dependencies

```bash
# Stop services
docker-compose down

# Add dependency (on host machine)
cd apps/backend
pnpm add package-name

# Rebuild and restart
docker-compose up -d --build backend
```

---

## Testing the Stack

### 1. Health Checks

```bash
# Backend health
curl http://localhost:8080/health

# Backend readiness
curl http://localhost:8080/ready

# Expected response
# {"ok":true,"timestamp":"2025-11-02T..."}
```

### 2. Register User

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "fullName": "Test User"
  }'
```

### 3. Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# Save the accessToken from response
```

### 4. Get Markets

```bash
curl http://localhost:8080/api/markets
```

### 5. Place Order

```bash
# Use accessToken from login
curl -X POST http://localhost:8080/api/orders/your-market-slug \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "outcome": "YES",
    "side": "BUY",
    "type": "LIMIT",
    "price": 0.6,
    "quantity": 10
  }'
```

### 6. WebSocket Connection

```javascript
// In browser console at http://localhost:5173
const socket = io('http://localhost:8080', {
  transports: ['websocket'],
  auth: { token: 'YOUR_ACCESS_TOKEN' }
});

socket.on('connect', () => console.log('Connected!'));
socket.on('trade', (data) => console.log('Trade:', data));
```

---

## Performance Testing

### Load Test with curl

```bash
# Create 10 concurrent requests
seq 1 10 | xargs -P10 -I{} curl http://localhost:8080/api/markets

# Benchmark with ab (Apache Bench)
ab -n 1000 -c 10 http://localhost:8080/api/markets
```

### Monitor Resources

```bash
# Watch container stats
docker stats

# Check backend memory
docker-compose exec backend ps aux

# Check database connections
docker-compose exec postgres psql -U brunoexchange -d brunoexchange -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Check if ports are in use
lsof -ti:5432 -ti:6379 -ti:8080 -ti:5173

# Kill conflicting processes
lsof -ti:5432 | xargs kill -9
```

### Backend Migration Errors

```bash
# Reset and try again
docker-compose down -v
docker-compose up -d

# Or manually reset
docker-compose exec backend pnpm prisma migrate reset
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U brunoexchange -d brunoexchange -c "SELECT 1;"
```

### Frontend Can't Connect to Backend

1. Check CORS settings in backend
2. Verify backend is running: `docker-compose ps`
3. Check browser console for errors
4. Try: `curl http://localhost:8080/health`

### Out of Disk Space

```bash
# Clean up old images
docker system prune -a

# Remove all volumes (⚠️ deletes data)
docker-compose down -v
docker volume prune
```

### Services Keep Restarting

```bash
# Check logs for errors
docker-compose logs --tail=50 backend

# Common issues:
# - Database not ready (wait longer)
# - Migration errors (check DATABASE_URL)
# - Port conflicts (check lsof)
```

---

## Production vs Development

### Development (Docker Compose)
- ✅ Hot reload
- ✅ Debug logs
- ✅ Source maps
- ✅ Auto migrations
- ⚠️ Weak passwords
- ⚠️ No HTTPS
- ⚠️ Permissive CORS

### Production (Fly.io + Vercel)
- ✅ Strong secrets
- ✅ HTTPS/TLS
- ✅ Strict CORS
- ✅ CDN caching
- ✅ Auto-scaling
- ✅ Monitoring
- See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## Cleanup

### Stop Without Deleting Data

```bash
docker-compose down
```

### Complete Reset (⚠️ Deletes ALL data)

```bash
# Remove containers, networks, volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Clean everything
docker system prune -a --volumes
```

---

## Next Steps

After testing locally:

1. ✅ Verified all features work
2. ✅ Tested trading flow
3. ✅ Confirmed WebSocket updates
4. 📖 Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
5. 🚀 Deploy to production

---

## Environment Variables

Default values in docker-compose.yml:

```env
# PostgreSQL
POSTGRES_USER=brunoexchange
POSTGRES_PASSWORD=brunoexchange_dev_password
POSTGRES_DB=brunoexchange

# Backend
DATABASE_URL=postgresql://brunoexchange:brunoexchange_dev_password@postgres:5432/brunoexchange
REDIS_URL=redis://redis:6379
JWT_SECRET=dev_jwt_secret_please_change_in_production_min_64_chars_long
CORS_ORIGIN=http://localhost:5173

# Frontend
VITE_API_URL=http://localhost:8080
VITE_WS_URL=http://localhost:8080
```

⚠️ **NEVER use these in production!**

---

## Support

### Quick Checks

```bash
# All services healthy?
docker-compose ps

# Any errors?
docker-compose logs --tail=50

# Backend responding?
curl http://localhost:8080/health

# Database working?
docker-compose exec postgres psql -U brunoexchange -d brunoexchange -c "SELECT 1;"

# Redis working?
docker-compose exec redis redis-cli PING
```

### Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Port already in use | `docker-compose down && lsof -ti:8080 \| xargs kill -9` |
| Migration failed | `docker-compose down -v && docker-compose up -d` |
| Out of memory | `docker system prune -a` |
| Frontend can't connect | Check backend logs, verify CORS |
| Database locked | `docker-compose restart postgres` |

---

## 🎉 Happy Testing!

You now have a complete local environment. Test everything:

- ✅ User registration & login
- ✅ Market browsing
- ✅ Order placement
- ✅ Real-time updates
- ✅ Portfolio tracking
- ✅ Admin features

When you're confident, deploy to production! 🚀
