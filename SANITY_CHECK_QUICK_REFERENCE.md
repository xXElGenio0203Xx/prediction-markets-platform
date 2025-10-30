# 🎯 Bruno Exchange Sanity Check Suite — Quick Reference

**Status:** ✅ COMPLETE  
**Files Created:** 5 (2,300+ lines of test code)  
**Test Coverage:** 29 unit tests + 5 integration scenarios + interactive runner

---

## 🚀 Quick Commands

```bash
cd backend

# Run all tests
npm run test

# Run specific test suites
npm run test:sanity       # System invariants (29 tests)
npm run test:scenarios    # Integration scenarios (5 workflows)
npm run test:book         # Order book unit tests

# Run interactive manual checklist
npm run test:manual

# Run diagnostics
npx tsx src/utils/diagnostics.ts validate
npx tsx src/utils/diagnostics.ts market <marketId>
npx tsx src/utils/diagnostics.ts user <userId>
```

---

## 📁 Files Created

```
backend/
├── src/
│   ├── __tests__/
│   │   ├── sanity-check.spec.ts       (~700 lines) ✅
│   │   ├── scenario-tests.spec.ts     (~600 lines) ✅
│   │   ├── manual-checklist.ts        (~500 lines) ✅
│   │   └── README.md                  (~400 lines) ✅
│   └── utils/
│       └── diagnostics.ts             (~500 lines) ✅
├── package.json                       (updated with scripts)
└── SANITY_CHECK_SUITE_COMPLETE.md    (this file)
```

---

## ✅ System Invariants Tested

### 1. Price Space Mapping
- ✅ Buy NO @ p → Sell YES @ (1-p)
- ✅ One trade = one price (maker's)
- ✅ Implied = price * 100%

### 2. Escrow & No Negatives
- ✅ Buy YES: escrow p*q immediately
- ✅ Reject if insufficient funds
- ✅ Cancel: release unused escrow
- ✅ Never negative balances

### 3. Positions
- ✅ Track in YES shares (net >= 0)
- ✅ Update VWAP on each fill
- ✅ Cannot sell more than owned

### 4. Implied Probability
- ✅ Recent trade (<60s): use last
- ✅ Both sides: use mid-quote
- ✅ One-sided/empty: 50% + badge

### 5. Lifecycle
- ✅ States: open → closed → resolved
- ✅ Only OPEN accepts orders
- ✅ Resolve YES: pay $1 per share
- ✅ Resolve NO: no payout to YES

### 6. Portfolio Accounting
- ✅ portfolioValue = cash + positions
- ✅ Mark price selection logic
- ✅ Unrealized PnL calculation

---

## 🧪 Test Scenarios Covered

### Scenario 1: Empty → Bid → NO Buy
- Empty orderbook (implied 50%)
- User A: Buy YES @ 0.40 x 80
- User B: Buy NO @ 0.65 x 60 (→ Sell YES @ 0.35)
- **Result:** Trade @ 0.40 (maker's price), User A filled 60, remaining 20

### Scenario 2: Mid-quote Drift
- Bid: YES @ 0.44 x 40
- Ask: YES @ 0.50 x 60
- **Result:** Mid = 0.47, implied 47%

### Scenario 3: Cancel & Escrow Release
- Order: Buy YES @ 0.40 x 80, filled 20
- Cancel remaining 60
- **Result:** Release $24 escrow, keep $8 locked

### Scenario 4: Funds Guard
- Available: $10,000
- Try: Buy YES @ 0.50 x 100,000 (needs $50,000)
- **Result:** REJECTED

### Scenario 5: Lifecycle
- OPEN → CLOSED → RESOLVED (YES)
- User A: 30 YES shares → $30 payout
- User B: 20 NO shares → $0 payout
- **Result:** Positions settled, orders cancelled

---

## 🔧 Prerequisites

Before running tests:

1. **Database accessible**
   ```bash
   # Check .env has correct values
   cat backend/.env | grep DATABASE_URL
   ```

2. **Migrations applied**
   ```bash
   npm run prisma:migrate
   ```

3. **Dependencies installed**
   ```bash
   npm install
   ```

---

## 📊 Expected Test Results

```bash
$ npm run test

✓ src/__tests__/sanity-check.spec.ts (29 tests)
  ✓ A) System Invariants
    ✓ 1. Price Space & Mapping (3)
    ✓ 2. Escrow & No Negatives (5)
    ✓ 3. Positions (3)
    ✓ 4. Implied Probability Display (5)
    ✓ 5. Lifecycle (4)
    ✓ 6. Portfolio Accounting (4)
  ✓ B) Unit Assertions (8)

✓ src/__tests__/scenario-tests.spec.ts (5 tests)
  ✓ Scenario 1: Empty → Bid → NO Buy
  ✓ Scenario 2: Mid-quote drift
  ✓ Scenario 3: Cancel & Escrow Release
  ✓ Scenario 4: Funds Guard
  ✓ Scenario 5: Lifecycle

Test Files  2 passed (2)
     Tests  34 passed (34)
  Duration  2.5s
```

---

## 🐛 Troubleshooting

### "Can't reach database server"
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
npm run prisma:studio
```

### "Order rejected"
- Verify available >= escrow needed
- Check user owns shares (for Sell)
- Confirm market status is OPEN

### "Trade price incorrect"
- Maker price is used (not taker)
- Verify NO → YES: 1 - p_no
- Check price-time priority

---

## 📚 Documentation

- **Test README:** `backend/src/__tests__/README.md`
- **Complete Report:** `SANITY_CHECK_SUITE_COMPLETE.md`
- **Deployment:** `DEPLOYMENT_READINESS_REPORT.md`
- **Setup Guide:** `CREDENTIALS_SETUP_GUIDE.md`

---

## ✅ Pre-Deployment Checklist

- [ ] Run `npm run test` — All tests pass
- [ ] Run `npm run test:manual` — Interactive runner completes
- [ ] Run `npx tsx src/utils/diagnostics.ts validate` — No invariant violations
- [ ] Check no console errors
- [ ] Verify escrow math accurate
- [ ] Confirm no negative balances
- [ ] Test with real Supabase connection

---

## 🎯 Summary

**Created:** 5 files, 2,300+ lines of test code  
**Coverage:** 29 unit tests, 5 integration scenarios, 1 interactive runner, diagnostics utility  
**Status:** ✅ Ready to run  

**Next Step:** Run `npm run test` to verify all tests pass.

---

**Last Updated:** October 22, 2025
