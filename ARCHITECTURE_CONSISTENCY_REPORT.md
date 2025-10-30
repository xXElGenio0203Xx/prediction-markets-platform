# Architecture Consistency Report

**Generated**: 2024-01-XX  
**Purpose**: Document and track type/field consistency across all layers of the application

---

## Executive Summary

This report identifies **5 inconsistencies** across the architecture (2 critical, 2 medium, 1 acceptable):

1. 🔴 **User Model Field Mismatch**: `handle` field exists in shared types but not in Prisma schema
2. 🟡 **Timestamp Type Inconsistency**: Backend engine uses `Date` objects, shared types use `string` (ACCEPTABLE)
3. ✅ **Position Fields**: All fields match perfectly (VERIFIED)
4. 🟡 **Market Model Field Mismatches**: 
   - Field name: `question` (Prisma) vs `title` (API)
   - Missing: `imageUrl` field not in Prisma
   - Missing: `resolutionSource` field not in Prisma

**Action Required**:
- Add `handle` to User model (CRITICAL)
- Add `imageUrl` and `resolutionSource` to Market model (RECOMMENDED)
- Map field names in API route handlers OR update Prisma field names

---

## Layer Analysis

### Layer 1: Database Schema (Prisma)
**Location**: `backend/prisma/schema.prisma`  
**Status**: ✅ Source of Truth

**User Model Fields**:
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

**Missing Fields**:
- ❌ `handle` (optional username field)

**Timestamp Type**: `DateTime` (Prisma native type)

---

### Layer 2: Shared Types Package (API Layer)
**Location**: `packages/shared/src/index.ts`  
**Status**: ⚠️ Inconsistencies Found

**User Type Fields**:
```typescript
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  handle: z.string().optional(),  // ❌ NOT IN PRISMA
  fullName: z.string().nullable(),
  role: UserRoleSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

**Inconsistencies**:
1. ❌ `handle` field exists here but NOT in Prisma schema
2. ✅ Timestamps are `string` (correct for JSON serialization)

---

### Layer 3: Backend Engine Types
**Location**: `backend/src/engine/types.ts`  
**Status**: ⚠️ Timestamp Type Mismatch

**Order Interface**:
```typescript
export interface Order {
  id: string;
  marketId: string;
  userId: string;
  side: OrderSide;
  type: OrderType;
  outcome: Outcome;
  price: number;
  quantity: number;
  filled: number;
  status: OrderStatus;
  createdAt: Date;  // ❌ Should be string for API
}
```

**Trade Interface**:
```typescript
export interface Trade {
  id: string;
  marketId: string;
  buyOrderId: string;
  sellOrderId: string;
  buyerId: string;
  sellerId: string;
  outcome: Outcome;
  price: number;
  quantity: number;
  createdAt: Date;  // ❌ Should be string for API
}
```

**Inconsistencies**:
1. ❌ Uses `Date` objects instead of `string` (not JSON-serializable)
2. ℹ️ Engine-internal types can use Date, but API responses must use string

---

### Layer 4: API Routes (Backend)
**Location**: `backend/src/routes/auth-simple.ts`  
**Status**: ✅ Matches Prisma Schema

**Register Endpoint**:
```typescript
fastify.post('/register', async (request, reply) => {
  const { email, password, fullName } = request.body as any;
  // ...
  const user = await tx.user.create({
    data: { 
      email, 
      passwordHash, 
      fullName: fullName || null,  // ✅ Matches Prisma
      role: 'USER' 
    },
  });
});
```

**Consistency**:
- ✅ Uses `fullName` field (matches Prisma)
- ❌ Does NOT use `handle` field
- ✅ Returns user object with Prisma fields

---

### Layer 5: Frontend API Client
**Location**: `src/api/client.js`  
**Status**: ⚠️ Expects `handle` field

**Register Method**:
```javascript
async register(email, password, fullName) {
  return this.request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, fullName }),
  });
}
```

**Potential Issues**:
- ⚠️ Frontend shared types expect `handle` field in User responses
- ⚠️ Backend doesn't return `handle` field
- ℹ️ This will cause type mismatches if TypeScript is strict

---

## Critical Issues

### Issue #1: User Model - Missing `handle` Field in Database
**Severity**: 🔴 High  
**Impact**: Type safety broken, frontend expects field that doesn't exist

**Problem**:
- `packages/shared` User type has `handle?: string` (optional)
- `backend/prisma/schema.prisma` User model does NOT have `handle` field
- Frontend components may try to display `user.handle` → undefined

**Recommended Fix**:
```prisma
// Add to User model in backend/prisma/schema.prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  handle       String?  @unique  // ADD THIS
  passwordHash String
  fullName     String?
  role         UserRole @default(USER)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Migration Required**: Yes
```bash
cd backend
pnpm prisma migrate dev --name add_user_handle_field
```

**Alternative Fix** (NOT RECOMMENDED):
Remove `handle` from `packages/shared/src/index.ts` UserSchema
- ❌ Less flexible for future username feature
- ❌ Breaks if any frontend code expects handle

---

### Issue #2: Timestamp Type Inconsistency
**Severity**: 🟡 Medium  
**Impact**: Engine types not API-compatible, manual serialization needed

**Problem**:
- `backend/src/engine/types.ts` uses `createdAt: Date`
- `packages/shared` uses `createdAt: z.string()`
- When serializing engine types to JSON → Date becomes ISO string automatically
- When deserializing JSON → string does NOT become Date automatically

**Current Behavior**:
```typescript
// Engine creates Order with Date
const order: Order = { ..., createdAt: new Date() };

// JSON.stringify() converts Date to ISO string automatically
JSON.stringify(order); // { ..., "createdAt": "2024-01-15T10:30:00.000Z" }

// Frontend receives string (correct)
const apiOrder: OrderSchema = { ..., createdAt: "2024-01-15T10:30:00.000Z" };
```

**Resolution**: ✅ This is ACCEPTABLE as-is
- Engine layer can use `Date` for internal logic (comparison, sorting)
- API layer uses `string` for JSON serialization
- Need to ensure route handlers convert Date → string explicitly

**Recommended Pattern**:
```typescript
// In route handlers, convert Date to string
fastify.get('/orders/:id', async (request, reply) => {
  const order = await engine.getOrder(orderId); // Order with Date
  
  return reply.send({
    ...order,
    createdAt: order.createdAt.toISOString(), // Convert Date → string
    updatedAt: order.updatedAt.toISOString(),
  });
});
```

---

### Issue #3: Position Field Verification ✅ RESOLVED
**Severity**: ✅ None  
**Impact**: No issues found

**Verification Result**:
- ✅ `packages/shared` PositionSchema has `averagePrice: z.number()`
- ✅ `backend/prisma/schema.prisma` Position model has `averagePrice Decimal`
- ✅ Field names match perfectly across all layers

**Prisma Position Model**:
```prisma
model Position {
  id           String   @id @default(uuid())
  userId       String
  marketId     String
  outcome      Outcome
  quantity     Decimal  @db.Decimal(18, 4)
  averagePrice Decimal  @db.Decimal(18, 4)  // ✅ MATCHES
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Shared Types Position**:
```typescript
export const PositionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  marketId: z.string(),
  outcome: OutcomeSchema,
  quantity: z.number(),
  averagePrice: z.number(),  // ✅ MATCHES
  updatedAt: z.string(),
});
```

**Status**: ✅ No action required

---

### Issue #4: Market Model - Field Name Mismatches
**Severity**: 🟡 Medium  
**Impact**: API responses don't match frontend expectations

**Problems Identified**:

1. **Field Name Mismatch**: `question` vs `title`
   - Prisma: `question String`
   - Shared types: `title: z.string()`
   - Impact: Frontend expects `market.title`, Prisma returns `market.question`

2. **Missing Field**: `imageUrl`
   - Prisma: NOT PRESENT
   - Shared types: `imageUrl: z.string().nullable()`
   - Impact: Frontend can't display market images

3. **Missing Field**: `resolutionSource`
   - Prisma: NOT PRESENT
   - Shared types: `resolutionSource: z.string().nullable()`
   - Impact: Can't show resolution source URL/description

**Recommended Fix - Option A (Add fields to Prisma)**:
```prisma
model Market {
  id           String       @id @default(uuid())
  slug         String       @unique
  question     String       // Keep for admin/database clarity
  imageUrl     String?      // ADD: For market image
  description  String?
  category     String
  status       MarketStatus @default(OPEN)
  createdBy    String
  closeTime    DateTime
  resolveTime  DateTime?
  outcome      Outcome?
  resolutionSource String?   // ADD: For resolution URL/source
  featured     Boolean      @default(false)
  // ... rest of fields
}
```

**Recommended Fix - Option B (Map in API routes)**:
```typescript
// In market routes, map field names
fastify.get('/:slug', async (request, reply) => {
  const market = await prisma.market.findUnique({
    where: { slug: request.params.slug }
  });
  
  return reply.send({
    ...market,
    title: market.question,  // Map question → title
    imageUrl: null,           // Default for missing field
    resolutionSource: null,   // Default for missing field
    yesPrice: Number(market.yesPrice),  // Convert Decimal
    noPrice: Number(market.noPrice),
    volume24h: Number(market.volume24h),
    liquidity: Number(market.liquidity),
    createdAt: market.createdAt.toISOString(),
    updatedAt: market.updatedAt.toISOString(),
  });
});
```

**Decision**: Option A (add fields) is better for future flexibility

**Migration Required**: Yes
```bash
cd backend
pnpm prisma migrate dev --name add_market_image_and_resolution_source
```

---

## Verification Checklist

### Database Schema Completeness
- [ ] User model has `handle` field (or removed from shared types)
- [ ] Market model has: `yesPrice`, `noPrice`, `volume24h`, `liquidity`
- [ ] Position model field names match shared types
- [ ] Order model enums match shared types (OrderSide, OrderType, OrderStatus)
- [ ] All timestamp fields use `DateTime` type

### Shared Types Completeness
- [ ] All Zod schemas match Prisma models
- [ ] Timestamp fields use `z.string()` (ISO format)
- [ ] Optional fields use `.optional()` or `.nullable()`
- [ ] Enums match Prisma enums exactly

### API Route Consistency
- [ ] Register endpoint uses correct User fields
- [ ] Order endpoints return fields matching shared types
- [ ] Market endpoints return fields matching shared types
- [ ] All Date objects converted to ISO strings before response

### Frontend API Client
- [ ] Expects fields that actually exist in backend
- [ ] No references to non-existent fields
- [ ] WebSocket event types match server.ts broadcasts

---

## Recommended Action Plan

### Step 1: Fix User Model (CRITICAL)
**Decision Point**: Add `handle` to database OR remove from shared types

**Option A (RECOMMENDED)**: Add to Database
```bash
# 1. Update Prisma schema
# Add: handle String? @unique

# 2. Create migration
cd backend
pnpm prisma migrate dev --name add_user_handle_field

# 3. Update register route to accept handle
# backend/src/routes/auth-simple.ts
const { email, password, fullName, handle } = request.body;
await tx.user.create({
  data: { email, passwordHash, fullName, handle, role: 'USER' }
});
```

**Option B**: Remove from Shared Types
```typescript
// packages/shared/src/index.ts
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  // handle: z.string().optional(),  // REMOVE THIS LINE
  fullName: z.string().nullable(),
  role: UserRoleSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

### Step 2: ✅ COMPLETED - Position Fields Verified
**Result**: All Position fields match perfectly
- ✅ `averagePrice` field exists in both Prisma and shared types
- ✅ All field names consistent

### Step 3: ✅ COMPLETED - Market Fields Verified
**Result**: All Market fields match with minor differences

**Prisma Market Model**:
```prisma
model Market {
  slug         String       @unique
  question     String       // ⚠️ Different name
  description  String?
  category     String
  status       MarketStatus
  outcome      Outcome?
  featured     Boolean
  yesPrice     Decimal
  noPrice      Decimal
  yesShares    Decimal
  noShares     Decimal
  volume24h    Decimal      // ✅ Matches
  liquidity    Decimal      // ✅ Matches
  closeTime    DateTime
  resolveTime  DateTime?
  createdAt    DateTime
  updatedAt    DateTime
}
```

**Shared Types Market**:
```typescript
export const MarketSchema = z.object({
  slug: z.string(),
  title: z.string(),           // ⚠️ Prisma uses "question"
  description: z.string().nullable(),
  category: z.string().nullable(),
  imageUrl: z.string().nullable(),  // ⚠️ NOT in Prisma
  status: MarketStatusSchema,
  outcome: OutcomeSchema.nullable(),
  featured: z.boolean(),
  yesPrice: z.number(),        // ✅ Matches
  noPrice: z.number(),         // ✅ Matches
  yesShares: z.number(),       // ✅ Matches
  noShares: z.number(),        // ✅ Matches
  volume24h: z.number(),       // ✅ Matches
  liquidity: z.number(),       // ✅ Matches
  closeTime: z.string(),
  resolveTime: z.string().nullable(),
  resolutionSource: z.string().nullable(),  // ⚠️ NOT in Prisma
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

**New Issues Found**:
1. ⚠️ Prisma uses `question`, shared types use `title`
2. ⚠️ Shared types have `imageUrl` field NOT in Prisma
3. ⚠️ Shared types have `resolutionSource` field NOT in Prisma

**Recommendation**: Add missing fields to Prisma schema:
```prisma
model Market {
  // ... existing fields
  question     String       // Keep this
  imageUrl     String?      // ADD THIS
  resolutionSource String?  // ADD THIS
}
```

**Route Handler Fix**: Map `question` → `title` when serializing:
```typescript
return reply.send({
  ...market,
  title: market.question,  // Map field name
  createdAt: market.createdAt.toISOString(),
  updatedAt: market.updatedAt.toISOString(),
});
```

### Step 4: Add Explicit Date Serialization
```typescript
// Create helper in packages/shared/src/index.ts
export function serializeOrder(order: Order & { createdAt: Date }): OrderSchema {
  return {
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
```

### Step 5: Test Type Safety
```bash
# Build shared types
cd packages/shared
pnpm build

# Build backend (should show type errors if inconsistent)
cd ../../apps/backend
pnpm build
```

---

## Status Summary

| Layer | Status | Action Required |
|-------|--------|-----------------|
| Prisma Schema | ⚠️ Missing fields | Add `handle`, `imageUrl`, `resolutionSource` |
| Shared Types | ✅ Complete | No changes needed |
| Engine Types | ⚠️ Date type | Add serialization helpers (acceptable as-is) |
| API Routes | ⚠️ Field mapping | Map `question`→`title`, handle nulls |
| Frontend Client | ⚠️ Expects fields | Will work after Prisma updated |

**Priority Actions**:
1. 🔴 Add `handle` to User model (CRITICAL - breaks type safety)
2. 🟡 Add `imageUrl` and `resolutionSource` to Market model (RECOMMENDED)
3. 🟢 Add explicit Date→string serialization helpers (OPTIONAL)

---

## Next Steps

1. **DECISION NEEDED**: Add `handle` to Prisma schema? (RECOMMENDED: Yes)
2. **RUN**: Verification queries on Position and Market models
3. **CREATE**: Migration for `handle` field if approved
4. **UPDATE**: Register/login routes to handle new field
5. **TEST**: Build all packages to verify type safety

---

**Document Status**: 🟡 Awaiting Decisions  
**Blocker**: User model field mismatch must be resolved before deployment
