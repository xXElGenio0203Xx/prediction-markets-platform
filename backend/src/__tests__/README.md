# Bruno Exchange — Sanity Check Suite

Comprehensive test suite verifying core exchange logic for CLOB (Central Limit Order Book) with escrow, positions, lifecycle, and implied probabilities.

## 📋 Overview

This test suite validates:

1. **Order Semantics** — Buy NO ↔ Sell YES @ (1-p)
2. **Escrowed Balances** — Immediate locking, no negatives
3. **Positions** — VWAP tracking, no shorting
4. **Market Lifecycle** — open → close → resolve → settle
5. **Implied Probabilities** — Last trade / mid-quote / 50% default
6. **CLOB Matching** — Price-time priority, single-price trades

## 🧪 Test Files

### 1. Unit & Invariant Tests
**File:** `src/__tests__/sanity-check.spec.ts`

Tests system invariants and unit-level assertions:

- ✅ Price space mapping (NO → YES conversion)
- ✅ Escrow math and release
- ✅ Position tracking (VWAP, no shorting)
- ✅ Implied probability rules
- ✅ Lifecycle enforcement
- ✅ Portfolio accounting

**Run:**
```bash
cd backend
npm run test:sanity
```

### 2. Integration Scenarios
**File:** `src/__tests__/scenario-tests.spec.ts`

End-to-end scenarios with full state verification:

- **Scenario 1:** Empty → Bid → NO Buy (cross-side matching)
- **Scenario 2:** Mid-quote drift without trades
- **Scenario 3:** Cancel & Escrow Release
- **Scenario 4:** Cap & Funds Guards
- **Scenario 5:** Lifecycle (open → close → resolve)

**Run:**
```bash
cd backend
npm run test:scenarios
```

### 3. Manual Checklist Runner
**File:** `src/__tests__/manual-checklist.ts`

Interactive step-through script that:
- Seeds two users (Alice & Bob)
- Executes all 5 scenarios
- Prints state after each step
- Waits for ENTER key between steps

**Run:**
```bash
cd backend
npx tsx src/__tests__/manual-checklist.ts
```

## 🎯 System Invariants (Must Always Hold)

### 1. Price Space & Mapping

```typescript
// Buy NO @ p_no MUST internally convert to Sell YES @ (1 - p_no)
buyNO(0.65, qty) === sellYES(0.35, qty)
buyNO(0.40, qty) === sellYES(0.60, qty)

// One trade = one price (maker's price)
bidYES(0.40) + askYES(0.35) → trade @ 0.40

// Implied YES probability = price_yes * 100%
yesPrice(0.47) → implied 47%
```

### 2. Escrow & No Negatives

```typescript
// Buy YES: escrow p*q immediately
buyYES(0.40, 80) → escrow $32.00

// Reject if insufficient funds
available < escrowNeeded → REJECT

// Sell YES: must own shares
sharesOwned < sellQty → REJECT

// Cancel: release unused escrow
cancel(remaining=20 @ 0.40) → release $8.00

// Never negative
cashBalance >= 0
```

### 3. Positions

```typescript
// Track in YES shares (net)
sharesYES >= 0

// Update VWAP on each fill
newVWAP = (oldQty * oldAvg + newQty * newPrice) / (oldQty + newQty)

// Cannot sell more than owned
sellQty <= sharesOwned
```

### 4. Implied Probability Display

```typescript
// If recent trade (<60s): use last trade
if (ageSeconds < 60) {
  implied = lastTradePrice * 100
}

// Else if both sides exist: use mid-quote
else if (bestBid && bestAsk) {
  implied = ((bestBid + bestAsk) / 2) * 100
}

// Else: default to 50% with badge
else {
  implied = 50
  badge = bestBid ? `Bid-only ${bestBid*100}%` 
        : bestAsk ? `Ask-only ${bestAsk*100}%`
        : `Empty Book`
}
```

### 5. Lifecycle

```typescript
// Market states
pending → live → closed → resolved

// Only OPEN markets accept orders
status === 'OPEN' → canTrade

// Resolve YES: pay $1 per share
outcome === 'YES' && sharesYES > 0 → payout = sharesYES * 1.0

// Resolve NO: no payout to YES holders
outcome === 'NO' && sharesYES > 0 → payout = 0

// Always store verification
resolutionSource: string
```

### 6. Portfolio Accounting

```typescript
// Cash balance
cashBalance = available + locked

// Position value
positionValue = Σ(sharesYES * markPrice)

// Portfolio value
portfolioValue = cashBalance + positionValue

// Mark price selection
markPrice = recentTrade ? lastTradePrice
          : bothSides ? midQuote
          : 0.50
```

## 🔧 Running Tests

### Prerequisites

```bash
# Install dependencies
cd backend
npm install

# Ensure Supabase database is running
# Update .env with DATABASE_URL and DIRECT_URL

# Run migrations
npm run prisma:migrate
```

### Run All Tests

```bash
npm run test              # All tests
npm run test:sanity       # Sanity check suite only
npm run test:scenarios    # Scenario tests only
npm run test:book         # Order book unit tests
```

### Run Manual Checklist

```bash
npx tsx src/__tests__/manual-checklist.ts
```

Press ENTER to step through scenarios interactively.

## 📊 Expected Outcomes

### Scenario 1: Empty → Bid → NO Buy

```
Initial State:
  Orderbook: empty
  Implied: 50% (empty book)

After Buy YES @ 0.40 x 80:
  Orderbook: bid YES @ 0.40 (80)
  Implied: 50% (Bid-only 40%)
  Escrow: $32.00

After Buy NO @ 0.65 x 60 (→ Sell YES @ 0.35):
  Trade: 60 @ 0.40 (maker's price)
  Orderbook: bid YES @ 0.40 (20 remaining)
  Implied: 40% (last trade)
  User A: -$24 (filled), -$8 (locked)
  User B: +$24 (sell proceeds)
```

### Scenario 2: Mid-quote Drift

```
Bid: YES @ 0.44 (40)
Ask: YES @ 0.50 (60)
Mid: (0.44 + 0.50) / 2 = 0.47
Implied: 47%
```

### Scenario 3: Cancel & Escrow Release

```
Order: Buy YES @ 0.40 x 80
Filled: 20
Remaining: 60
Cancel: Release 60 * 0.40 = $24.00
Keep locked: 20 * 0.40 = $8.00
```

### Scenario 4: Funds Guard

```
Available: $10,000
Order: Buy YES @ 0.50 x 100,000
Escrow needed: $50,000
Result: REJECTED (insufficient funds)
```

### Scenario 5: Lifecycle

```
OPEN → place orders
CLOSED → reject new orders
RESOLVED (YES) → settle positions
  User A: 30 YES → payout $30.00
  User B: 20 NO → payout $0.00
Cancel open orders, release escrow
```

## 🐛 Debugging

### Enable Logs

```typescript
// In test files, change logger level:
const logger = pino({ level: 'debug' }); // or 'trace'
```

### Check Database State

```bash
# Open Prisma Studio
npm run prisma:studio

# View:
# - Users table (balances)
# - Markets table (status, outcome)
# - Orders table (price, quantity, filled, status)
# - Trades table (price, quantity, buyers/sellers)
# - Positions table (shares, avg price)
```

### Common Issues

**"Can't reach database server"**
- Ensure Supabase is running
- Check `DATABASE_URL` in `.env`
- Use `DIRECT_URL` for migrations

**"Order rejected"**
- Check available balance >= escrow needed
- Verify user owns shares for Sell orders
- Confirm market status is OPEN

**"Trade price incorrect"**
- Verify maker price is used (not taker)
- Check price-time priority
- Ensure NO → YES conversion: 1 - p_no

## 📝 Test Coverage

| Category | Tests | Status |
|----------|-------|--------|
| Price Space Mapping | 3 | ✅ |
| Escrow & Funds | 5 | ✅ |
| Positions | 3 | ✅ |
| Implied Probability | 5 | ✅ |
| Lifecycle | 4 | ✅ |
| Portfolio Accounting | 4 | ✅ |
| Integration Scenarios | 5 | ✅ |
| **Total** | **29** | **✅** |

## 🚀 Before Deployment

Run complete test suite and manual checklist:

```bash
# 1. Run automated tests
npm run test

# 2. Run manual checklist
npx tsx src/__tests__/manual-checklist.ts

# 3. Verify all scenarios pass
# 4. Check no console errors
# 5. Inspect final state in Prisma Studio
```

All tests must pass before production deployment.

## 📚 References

- **Engine:** `src/engine/engine.ts` (428 lines)
- **Order Book:** `src/engine/book.ts` (181 lines)
- **Settlement:** `src/settlement/settlement.ts` (160 lines)
- **Types:** `src/engine/types.ts` (52 lines)
- **Schema:** `prisma/schema.prisma` (263 lines)

## 🆘 Support

If tests fail, check:

1. **Database connection** — Supabase accessible?
2. **Schema migrated** — `npm run prisma:migrate`
3. **Dependencies installed** — `npm install`
4. **Environment variables** — `.env` configured?
5. **Logs** — Enable debug logging for details

For questions, see:
- `DEPLOYMENT_READINESS_REPORT.md`
- `CREDENTIALS_SETUP_GUIDE.md`
- `ARCHITECTURE_CONSISTENCY_REPORT.md`
