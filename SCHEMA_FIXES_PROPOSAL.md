# Proposed Schema Fixes

**Purpose**: SQL migration and Prisma schema updates to resolve architecture inconsistencies

---

## Migration 1: Add User `handle` Field

**Priority**: 🔴 CRITICAL  
**File**: `backend/prisma/schema.prisma`

### Current State
```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  fullName     String?
  role         UserRole @default(USER)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### Proposed Change
```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  handle       String?  @unique    // ADD THIS LINE
  passwordHash String
  fullName     String?
  role         UserRole @default(USER)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### Rationale
- Frontend shared types expect `handle` field for usernames
- Optional field (`String?`) allows gradual rollout
- Unique constraint prevents duplicate handles
- Aligns with modern social platform patterns

### Commands
```bash
cd backend
pnpm prisma migrate dev --name add_user_handle_field
pnpm prisma generate
```

### Route Updates Required
**File**: `backend/src/routes/auth-simple.ts`

```typescript
// UPDATE register endpoint
fastify.post('/register', async (request, reply) => {
  const { email, password, fullName, handle } = request.body as any;
  
  // Validate handle if provided
  if (handle) {
    const existingHandle = await fastify.prisma.user.findUnique({ 
      where: { handle } 
    });
    if (existingHandle) {
      throw new AppError('HANDLE_TAKEN', 409, 'Handle already taken');
    }
  }

  const existing = await fastify.prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('USER_EXISTS', 409, 'User already exists');
  }

  const passwordHash = await hashPassword(password);

  const user = await fastify.prisma.$transaction(async (tx: any) => {
    const newUser = await tx.user.create({
      data: { 
        email, 
        passwordHash, 
        fullName: fullName || null,
        handle: handle || null,  // ADD THIS LINE
        role: 'USER' 
      },
    });

    await tx.balance.create({
      data: { userId: newUser.id, available: 100, locked: 0, total: 100 },
    });

    return newUser;
  });

  // ... rest of function
});
```

---

## Migration 2: Add Market Image and Resolution Fields

**Priority**: 🟡 RECOMMENDED  
**File**: `backend/prisma/schema.prisma`

### Current State
```prisma
model Market {
  id           String       @id @default(uuid())
  slug         String       @unique
  question     String
  description  String?
  category     String
  status       MarketStatus @default(OPEN)
  // ... other fields
}
```

### Proposed Change
```prisma
model Market {
  id           String       @id @default(uuid())
  slug         String       @unique
  question     String
  imageUrl     String?                      // ADD THIS LINE
  description  String?
  category     String
  status       MarketStatus @default(OPEN)
  createdBy    String
  closeTime    DateTime
  resolveTime  DateTime?
  outcome      Outcome?
  resolutionSource String?                  // ADD THIS LINE
  featured     Boolean      @default(false)
  volume24h    Decimal      @default(0) @db.Decimal(18, 4)
  liquidity    Decimal      @default(0) @db.Decimal(18, 4)
  // ... rest of fields
}
```

### Rationale
- `imageUrl`: Allows market images (logos, visual aids)
- `resolutionSource`: URL/description of resolution source (news article, oracle, etc.)
- Both optional (`String?`) for backward compatibility
- Aligns with shared types expectations

### Commands
```bash
cd backend
pnpm prisma migrate dev --name add_market_image_and_resolution_source
pnpm prisma generate
```

### Route Updates Required
**File**: `backend/src/routes/markets-simple.ts`

```typescript
// UPDATE market response serialization
function serializeMarket(market: any) {
  return {
    ...market,
    title: market.question,  // Map question → title for API
    imageUrl: market.imageUrl || null,
    resolutionSource: market.resolutionSource || null,
    yesPrice: Number(market.yesPrice),
    noPrice: Number(market.noPrice),
    yesShares: Number(market.yesShares),
    noShares: Number(market.noShares),
    volume24h: Number(market.volume24h),
    liquidity: Number(market.liquidity),
    createdAt: market.createdAt.toISOString(),
    updatedAt: market.updatedAt.toISOString(),
    closeTime: market.closeTime.toISOString(),
    resolveTime: market.resolveTime?.toISOString() || null,
  };
}

// UPDATE all market endpoints
fastify.get('/', async (request, reply) => {
  const markets = await fastify.prisma.market.findMany({
    orderBy: { featured: 'desc' },
  });
  
  return reply.send({
    markets: markets.map(serializeMarket),
  });
});

fastify.get('/:slug', async (request, reply) => {
  const { slug } = request.params as any;
  const market = await fastify.prisma.market.findUnique({
    where: { slug },
    include: { creator: true },
  });
  
  if (!market) {
    throw new AppError('MARKET_NOT_FOUND', 404, 'Market not found');
  }
  
  return reply.send(serializeMarket(market));
});
```

---

## Migration 3: Add Decimal Serialization Helpers

**Priority**: 🟢 OPTIONAL (Nice to have)  
**File**: `packages/shared/src/index.ts`

### Proposed Addition
```typescript
// Add at end of file

// ============================================================================
// Serialization Helpers
// ============================================================================

/**
 * Convert Prisma Date to ISO string for API responses
 */
export function serializeDate(date: Date): string {
  return date.toISOString();
}

/**
 * Convert Prisma Decimal to number for API responses
 */
export function serializeDecimal(decimal: any): number {
  return Number(decimal);
}

/**
 * Serialize Order from engine (with Date) to API format (with string)
 */
export function serializeOrder(order: {
  id: string;
  userId: string;
  marketId: string;
  side: OrderSide;
  type: OrderType;
  outcome: Outcome;
  price: any;
  quantity: any;
  filled: any;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}): Order {
  return {
    id: order.id,
    userId: order.userId,
    marketId: order.marketId,
    side: order.side,
    type: order.type,
    outcome: order.outcome,
    price: serializeDecimal(order.price),
    quantity: serializeDecimal(order.quantity),
    filled: serializeDecimal(order.filled),
    status: order.status,
    createdAt: serializeDate(order.createdAt),
    updatedAt: serializeDate(order.updatedAt),
  };
}

/**
 * Serialize Trade from engine to API format
 */
export function serializeTrade(trade: {
  id: string;
  marketId: string;
  buyOrderId: string;
  sellOrderId: string;
  buyerId: string;
  sellerId: string;
  outcome: Outcome;
  price: any;
  quantity: any;
  createdAt: Date;
}): Trade {
  return {
    id: trade.id,
    marketId: trade.marketId,
    buyOrderId: trade.buyOrderId,
    sellOrderId: trade.sellOrderId,
    buyerId: trade.buyerId,
    sellerId: trade.sellerId,
    outcome: trade.outcome,
    price: serializeDecimal(trade.price),
    quantity: serializeDecimal(trade.quantity),
    createdAt: serializeDate(trade.createdAt),
  };
}
```

### Usage in Routes
```typescript
import { serializeOrder, serializeTrade } from '@shared';

// In order routes
fastify.get('/user/orders', async (request, reply) => {
  const orders = await fastify.prisma.order.findMany({
    where: { userId: request.user.id },
  });
  
  return reply.send({
    orders: orders.map(serializeOrder),
  });
});

// In trade routes
fastify.get('/:marketSlug/trades', async (request, reply) => {
  const trades = await fastify.prisma.trade.findMany({
    where: { market: { slug: request.params.marketSlug } },
  });
  
  return reply.send({
    trades: trades.map(serializeTrade),
  });
});
```

---

## Complete Migration Script

**File**: `backend/fix-schema-consistency.sh`

```bash
#!/bin/bash

echo "🔧 Fixing schema inconsistencies..."
echo ""

# Check we're in backend directory
if [ ! -f "prisma/schema.prisma" ]; then
  echo "❌ Error: Must run from backend/ directory"
  exit 1
fi

# Backup current schema
echo "📦 Backing up current schema..."
cp prisma/schema.prisma prisma/schema.prisma.backup
echo "✅ Backup created: prisma/schema.prisma.backup"
echo ""

# Show what will be changed
echo "📝 Changes to be made:"
echo "  1. Add User.handle field (String?, unique)"
echo "  2. Add Market.imageUrl field (String?)"
echo "  3. Add Market.resolutionSource field (String?)"
echo ""

read -p "Continue with migration? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Migration cancelled"
  exit 0
fi

# Apply User handle field
echo "🔨 Adding User.handle field..."
sed -i '' '/passwordHash String/a\
  handle       String?  @unique
' prisma/schema.prisma

# Apply Market fields (more complex - do manually or use this approach)
echo "🔨 Adding Market.imageUrl and resolutionSource fields..."
# This requires manual editing - sed is complex for multi-line

echo ""
echo "⚠️  Please manually add these lines to Market model:"
echo ""
echo "  imageUrl         String?"
echo "  resolutionSource String?"
echo ""
echo "After editing, run:"
echo "  pnpm prisma migrate dev --name add_missing_fields"
echo "  pnpm prisma generate"
echo ""
echo "✅ Schema backup completed. Review changes and run migration."
```

---

## Verification After Migration

### Check 1: Prisma Schema Valid
```bash
cd backend
pnpm prisma validate
```

### Check 2: Migrations Applied
```bash
cd backend
pnpm prisma migrate status
```

### Check 3: Test User Registration with Handle
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User",
    "handle": "testuser"
  }'
```

### Check 4: Test Market Creation with Image
```bash
curl -X POST http://localhost:8080/api/markets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "slug": "test-market",
    "question": "Will this work?",
    "imageUrl": "https://example.com/image.jpg",
    "resolutionSource": "https://example.com/source",
    "category": "test",
    "closeTime": "2024-12-31T23:59:59Z"
  }'
```

---

## Rollback Plan

If migrations cause issues:

```bash
cd backend

# Restore backup
cp prisma/schema.prisma.backup prisma/schema.prisma

# Reset database (WARNING: DATA LOSS)
pnpm prisma migrate reset

# Or revert specific migration
pnpm prisma migrate resolve --rolled-back <migration_name>
```

---

## Files to Update After Migration

1. ✅ `backend/prisma/schema.prisma` - DONE by migration
2. ✅ `packages/shared/src/index.ts` - Already correct
3. ⚠️ `backend/src/routes/auth-simple.ts` - ADD handle support
4. ⚠️ `backend/src/routes/markets-simple.ts` - ADD field mapping
5. ⚠️ `backend/src/routes/orders.ts.bak` - ADD serialization helpers
6. ⚠️ `apps/backend/src/server.ts` - No changes (routes not registered yet)

---

## Summary

**Total Migrations**: 2 critical + 1 optional
**Estimated Time**: 15 minutes
**Risk Level**: Low (all fields optional, backward compatible)
**Breaking Changes**: None (optional fields)

**Recommended Order**:
1. Apply User handle migration (CRITICAL)
2. Test user registration
3. Apply Market fields migration (RECOMMENDED)
4. Test market creation/retrieval
5. Add serialization helpers (OPTIONAL)
6. Update all route handlers to use helpers
