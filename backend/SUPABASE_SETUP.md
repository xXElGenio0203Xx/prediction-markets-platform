# Supabase Integration Guide

## Overview
This project now uses Supabase as the PostgreSQL database provider. Supabase provides a managed PostgreSQL database with additional features like authentication, real-time subscriptions, and edge functions.

## Setup Instructions

### 1. Get Database Credentials from Supabase Dashboard

1. Go to your Supabase project: https://app.supabase.com/project/xsdhkjiskqfelahfariv
2. Navigate to **Settings** → **Database**
3. Copy the connection strings:
   - **Connection string** (for application): Use with pgBouncer (port 6543) for production
   - **Direct connection** (for migrations): Use without pgBouncer (port 5432)

### 2. Update Environment Variables

Replace `[YOUR_DB_PASSWORD]` in `.env` with your actual database password from Supabase:

```bash
# Database - Supabase PostgreSQL
DATABASE_URL=postgresql://postgres.xsdhkjiskqfelahfariv:YOUR_ACTUAL_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres.xsdhkjiskqfelahfariv:YOUR_ACTUAL_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

### 3. Connection Modes

**Development (Port 5432 - Direct Connection):**
- Used for migrations: `npx prisma migrate dev`
- Used for Prisma Studio: `npx prisma studio`
- Lower latency, direct connection to PostgreSQL

**Production (Port 6543 - Connection Pooler):**
- Used for application runtime with high concurrent connections
- Uses PgBouncer for connection pooling
- Add `?pgbouncer=true` to connection string

### 4. Run Migrations

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name init

# Seed the database
npm run prisma:seed
```

### 5. Supabase Features Available

#### A. Authentication (Optional)
You can use Supabase Auth alongside your JWT implementation:
- Email/password
- OAuth providers (Google, GitHub, etc.)
- Magic links

#### B. Row Level Security (RLS)
Enable RLS policies in Supabase dashboard for additional security:
```sql
-- Example: Users can only see their own orders
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
ON "Order"
FOR SELECT
USING (auth.uid()::text = "userId");
```

#### C. Real-time Subscriptions
Use Supabase Realtime for WebSocket updates (alternative to Socket.IO):
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// Subscribe to order book changes
supabase
  .channel('orders')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'Order' },
    (payload) => console.log('New order:', payload)
  )
  .subscribe()
```

#### D. Upstash Redis Integration
Supabase integrates with Upstash Redis for caching:
1. Go to **Integrations** → **Upstash Redis**
2. Enable integration
3. Update `REDIS_URL` in `.env` with provided connection string

### 6. Database Schema

The schema includes:
- **User**: Authentication and profiles
- **Session**: JWT refresh tokens
- **Market**: Prediction markets (YES/NO binary options)
- **Order**: CLOB orders with price-time priority
- **Trade**: Executed trades
- **OrderEvent**: Audit trail
- **Balance**: User balances (available/locked/total)
- **Transfer**: Deposits/withdrawals
- **Position**: User positions per market per outcome
- **Candle**: Price history (OHLCV)

### 7. Production Deployment

For production, update DATABASE_URL to use connection pooler:

```bash
DATABASE_URL=postgresql://postgres.xsdhkjiskqfelahfariv:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xsdhkjiskqfelahfariv:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

### 8. Connection Pooling Best Practices

With Supabase's PgBouncer:
- **Transaction mode**: Use for most operations (default)
- **Session mode**: Required for prepared statements
- Configure in Prisma:
  ```typescript
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: ['query', 'error', 'warn'],
  })
  ```

### 9. Monitoring

Use Supabase Dashboard for:
- **Query Performance**: Database → Query Performance
- **Logs**: Logs Explorer
- **API Analytics**: API → Analytics

### 10. Backup and Recovery

Supabase provides:
- **Daily backups** (retained for 7 days on Pro plan)
- **Point-in-Time Recovery** (PITR) on Pro+ plans
- Manual backups: Database → Backups

## Cost Optimization

### Free Tier Limits
- 500MB database space
- 1GB file storage
- 2GB bandwidth
- Paused after 7 days of inactivity

### Pro Plan Benefits ($25/month)
- 8GB database space
- 100GB file storage
- 50GB bandwidth
- No inactivity pausing
- Daily backups
- Custom domain

## Troubleshooting

### Connection Timeout
```bash
# Test connection
psql "postgresql://postgres.xsdhkjiskqfelahfariv:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

### Migration Errors
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Push schema without migration
npx prisma db push
```

### Too Many Connections
- Switch to connection pooler (port 6543)
- Reduce connection pool size in Prisma:
  ```
  DATABASE_URL=postgresql://...?connection_limit=5
  ```

## Security Checklist

- [ ] Update database password from default
- [ ] Enable Row Level Security (RLS) policies
- [ ] Use environment variables (never commit credentials)
- [ ] Enable SSL in production
- [ ] Set up IP allowlist if needed (Supabase → Settings → Database → Network)
- [ ] Rotate JWT secrets regularly
- [ ] Use SUPABASE_ANON_KEY only for client-side (public key)
- [ ] Keep SUPABASE_SERVICE_KEY secret (admin privileges)

## Next Steps

1. Update `.env` with your actual Supabase password
2. Run `npx prisma migrate dev --name init`
3. Run `npm run prisma:seed` to create sample data
4. Start the backend: `npm run dev`
5. Test API at `http://localhost:4000/api/auth/register`

## Support

- Supabase Docs: https://supabase.com/docs
- Prisma + Supabase: https://supabase.com/docs/guides/integrations/prisma
- Community: https://github.com/supabase/supabase/discussions
