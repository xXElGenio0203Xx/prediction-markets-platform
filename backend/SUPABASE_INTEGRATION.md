# Supabase Integration Summary

## ✅ What's Been Configured

### 1. Environment Variables
- **SUPABASE_URL**: `https://xsdhkjiskqfelahfariv.supabase.co`
- **SUPABASE_ANON_KEY**: Your public anon key (safe to expose in frontend)
- **DATABASE_URL**: Connection string for Supabase PostgreSQL
- **DIRECT_URL**: Direct connection for migrations (bypasses connection pooler)

### 2. Prisma Configuration
- Updated `schema.prisma` to use Supabase connection pooler
- Added `directUrl` for migration support
- Configured for optimal performance with Supabase

### 3. Backend Configuration
- Updated `src/config.ts` to validate Supabase environment variables
- Modified `src/plugins/prisma.ts` for Supabase compatibility
- All routes ready to work with Supabase database

### 4. Documentation
- Created `SUPABASE_SETUP.md` - Comprehensive setup guide
- Created `setup-supabase.sh` - Interactive setup script
- Updated `README.md` with quick start instructions

## 🔑 What You Need To Do

### Step 1: Get Your Database Password

1. Visit: https://app.supabase.com/project/xsdhkjiskqfelahfariv/settings/database
2. Scroll to **"Database Settings"**
3. Copy your database password (or click "Reset Database Password" if you don't have it)

### Step 2: Update Environment Variables

**Option A: Use the setup script (recommended)**
```bash
cd backend
./setup-supabase.sh
# Enter your password when prompted
```

**Option B: Manual update**
Edit `backend/.env` and replace `[YOUR_DB_PASSWORD]` with your actual password:
```bash
DATABASE_URL=postgresql://postgres.xsdhkjiskqfelahfariv:YOUR_ACTUAL_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres.xsdhkjiskqfelahfariv:YOUR_ACTUAL_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

### Step 3: Run Migrations

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Apply migrations to Supabase
npx prisma migrate deploy

# Seed with sample data (admin user, 5 markets, test users with $100 each)
npm run prisma:seed
```

### Step 4: Test the Connection

```bash
# Start the backend
npm run dev

# In another terminal, test the API
curl http://localhost:4000/healthz

# Should return:
# {"status":"healthy","database":"connected","redis":"connected"}
```

### Step 5: Test User Registration

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User"
  }'

# Should return user data and accessToken
```

## 📊 Database Schema Overview

Your Supabase database will have these tables:

### Core Tables
- **User** - User accounts with roles (USER/ADMIN)
- **Session** - JWT refresh token storage
- **Balance** - User cash balances (available/locked/total)

### Market Tables
- **Market** - Prediction markets with YES/NO outcomes
- **Order** - CLOB orders (price-time priority)
- **Trade** - Executed trades
- **OrderEvent** - Audit trail for all order changes
- **Position** - User positions per market per outcome

### Financial Tables
- **Transfer** - Deposits and withdrawals
- **Candle** - OHLCV price history for charts

## 🔒 Security Best Practices

### Already Implemented
✅ JWT authentication with HTTP-only cookies  
✅ Password hashing with bcrypt  
✅ Rate limiting (100 req/15min per IP)  
✅ CORS configured for localhost:5173  
✅ Helmet security headers  
✅ Input validation with Zod  

### Recommended Additional Steps
1. **Enable Row Level Security (RLS) in Supabase**
   - Go to Supabase → Database → Tables
   - Enable RLS for sensitive tables (User, Balance, Order, Position)
   - Example policy:
     ```sql
     CREATE POLICY "Users can only see their own orders"
     ON "Order" FOR SELECT
     USING (auth.uid()::text = "userId");
     ```

2. **Rotate Secrets**
   - Update `JWT_SECRET` and `JWT_REFRESH_SECRET` in production
   - Generate with: `openssl rand -base64 32`

3. **Enable SSL**
   - Supabase connections already use SSL
   - Verify with `?sslmode=require` in connection string

4. **Set up IP Allowlist** (Optional)
   - Supabase → Settings → Database → Network
   - Add your server IP addresses

## 🚀 Deployment Options

### Option 1: Vercel + Supabase (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd backend
vercel

# Set environment variables in Vercel dashboard
# DATABASE_URL, REDIS_URL, JWT_SECRET, etc.
```

### Option 2: Railway + Supabase
```bash
# Install Railway CLI
npm i -g railway

# Link project
railway link

# Add environment variables
railway add DATABASE_URL=[your_supabase_url]

# Deploy
railway up
```

### Option 3: Docker + Fly.io
```bash
# Already configured in Dockerfile and docker-compose.yml
fly launch
fly secrets set DATABASE_URL=[your_supabase_url]
fly deploy
```

## 📈 Monitoring

### Supabase Dashboard
- **Database**: https://app.supabase.com/project/xsdhkjiskqfelahfariv/database/tables
- **Query Performance**: Database → Query Performance
- **Logs**: Logs → Postgres Logs
- **API Analytics**: API → Analytics

### Application Metrics
- **Prometheus metrics**: http://localhost:4000/metrics
- **Health check**: http://localhost:4000/healthz
- **API docs**: http://localhost:4000/docs

## 🐛 Troubleshooting

### "Connection timeout" error
```bash
# Test connection with psql
psql "postgresql://postgres.xsdhkjiskqfelahfariv:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# If timeout, check:
# 1. Firewall settings
# 2. IP allowlist in Supabase (disable if testing)
# 3. Password is correct
```

### "Too many connections" error
```bash
# Use connection pooler (port 6543)
DATABASE_URL=postgresql://...@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Or reduce connection limit
DATABASE_URL=postgresql://...?connection_limit=5
```

### Migration fails
```bash
# Check current migrations
npx prisma migrate status

# Reset and retry (WARNING: deletes data)
npx prisma migrate reset

# Or use db push for development
npx prisma db push
```

## 📞 Support

- **Supabase Discord**: https://discord.supabase.com
- **Prisma Discord**: https://pris.ly/discord
- **Documentation**: 
  - Supabase: https://supabase.com/docs
  - Prisma: https://www.prisma.io/docs
  - Fastify: https://www.fastify.io/docs

## 🎯 Next Steps

1. ✅ Configure Supabase (Done)
2. ⏳ Get database password and run migrations
3. ⏳ Implement CLOB order matching with escrow
4. ⏳ Build Market page frontend
5. ⏳ Wire up WebSocket real-time updates
6. ⏳ Test complete trading workflow
7. ⏳ Deploy to production

---

**Project**: Bruno Exchange - Binary Prediction Markets  
**Database**: Supabase PostgreSQL  
**Region**: aws-0-us-east-1  
**Project ID**: xsdhkjiskqfelahfariv  
