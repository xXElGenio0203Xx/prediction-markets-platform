# ⚡ Supabase Quick Reference

## 🔑 Your Credentials

```bash
Project ID:  xsdhkjiskqfelahfariv
Region:      aws-0-us-east-1
URL:         https://xsdhkjiskqfelahfariv.supabase.co
Anon Key:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🚀 Quick Commands

```bash
# 1. Setup (one-time)
cd backend
./setup-supabase.sh          # Interactive setup
npx prisma generate          # Generate Prisma client
npx prisma migrate deploy    # Run migrations
npm run prisma:seed          # Seed sample data

# 2. Development
npm run dev                  # Start server on :4000
npm run build                # Build TypeScript
npm run type-check           # Type check only

# 3. Database
npx prisma studio            # Open database GUI
npx prisma migrate dev       # Create new migration
npx prisma db push           # Push schema changes (dev only)
npx prisma migrate reset     # Reset database (⚠️ deletes data)

# 4. Testing
npm test                     # Run tests
npm run test:watch           # Watch mode
curl http://localhost:4000/healthz  # Health check
```

## 📋 Initial Seed Data

After running `npm run prisma:seed`:

**Admin User**
- Email: `admin@browncast.com`
- Password: `admin123456`
- Balance: $100.00

**Test Users** (each has $100)
- `alice@example.com` / `password123`
- `bob@example.com` / `password123`  
- `charlie@example.com` / `password123`

**Sample Markets**
1. Bitcoin reaches $100k by EOY 2025
2. AGI achieved by 2026
3. US recession in 2025
4. SpaceX lands on Mars by 2026
5. Ethereum maintains 99.9% uptime

## 🌐 URLs

```bash
Local:
- API:        http://localhost:4000
- Health:     http://localhost:4000/healthz
- Metrics:    http://localhost:4000/metrics
- API Docs:   http://localhost:4000/docs
- Frontend:   http://localhost:5173

Supabase:
- Dashboard:  https://app.supabase.com/project/xsdhkjiskqfelahfariv
- Database:   https://app.supabase.com/project/xsdhkjiskqfelahfariv/database/tables
- Settings:   https://app.supabase.com/project/xsdhkjiskqfelahfariv/settings/database
```

## 🔧 Connection Strings

```bash
# Development (direct, for migrations)
postgresql://postgres.xsdhkjiskqfelahfariv:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Production (pooler, for high concurrency)
postgresql://postgres.xsdhkjiskqfelahfariv:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

## 📦 Environment Variables Needed

```bash
# Required in .env
SUPABASE_URL=https://xsdhkjiskqfelahfariv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres.xsdhkjiskqfelahfariv:PASSWORD@...
DIRECT_URL=postgresql://postgres.xsdhkjiskqfelahfariv:PASSWORD@...
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this
```

## 🧪 API Test Examples

```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123","fullName":"Test"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}'

# Get markets
curl http://localhost:4000/api/markets

# Get single market
curl http://localhost:4000/api/markets/bitcoin-100k-eoy-2025
```

## 🐳 Docker Commands

```bash
# Start database & redis only
docker-compose up -d db redis

# Stop all containers
docker-compose down

# View logs
docker-compose logs -f db

# Remove volumes (⚠️ deletes data)
docker-compose down -v
```

## 🆘 Common Issues

**"Connection timeout"**
→ Check password in .env
→ Verify Supabase project is active
→ Check IP allowlist (Settings → Database → Network)

**"Too many connections"**
→ Use connection pooler (port 6543)
→ Add `?connection_limit=5` to DATABASE_URL

**"Table does not exist"**
→ Run `npx prisma migrate deploy`
→ Or `npx prisma db push` for dev

**"Port 4000 already in use"**
→ `lsof -ti:4000 | xargs kill -9`
→ Or change PORT in .env

## 📚 Documentation

- Full setup: `SUPABASE_SETUP.md`
- Integration guide: `SUPABASE_INTEGRATION.md`
- API docs: `README.md`
- Supabase: https://supabase.com/docs
- Prisma: https://prisma.io/docs

---

💡 **Tip**: Keep this file open while developing!
