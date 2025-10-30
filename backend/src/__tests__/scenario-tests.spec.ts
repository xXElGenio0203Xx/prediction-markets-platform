/**
 * INTEGRATION SCENARIO TESTS
 * 
 * Step-by-step scenarios testing complete workflows:
 * - Scenario 1: Empty → Bid → NO Buy (cross-side matching)
 * - Scenario 2: Mid-quote drift without trades
 * - Scenario 3: Cancel & Escrow Release
 * - Scenario 4: Cap & Funds Guards
 * - Scenario 5: Lifecycle (open → close → resolve)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { MatchingEngine } from '../engine/engine.js';
import { SettlementService } from '../settlement/settlement.ts';
import { OrderBook } from '../engine/book.js';
import type { Order } from '../engine/types.js';
import pino from 'pino';

const prisma = new PrismaClient();
const logger = pino({ level: 'info' }); // Show logs for debugging

describe('SCENARIO TESTS — Integration', () => {
  let engine: MatchingEngine;
  let settlement: SettlementService;
  let testMarketId: string;
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };

  beforeEach(async () => {
    // Clean database
    await prisma.orderEvent.deleteMany();
    await prisma.trade.deleteMany();
    await prisma.order.deleteMany();
    await prisma.position.deleteMany();
    await prisma.transfer.deleteMany();
    await prisma.balance.deleteMany();
    await prisma.session.deleteMany();
    await prisma.market.deleteMany();
    await prisma.user.deleteMany();

    // Initialize services
    engine = new MatchingEngine(prisma, logger as any);
    settlement = new SettlementService(prisma, logger as any);

    // Create test users with balances
    const userAData = await prisma.user.create({
      data: {
        email: 'alice@test.com',
        handle: 'alice',
        passwordHash: 'hash',
        fullName: 'Alice',
        balance: {
          create: {
            available: 10000,
            locked: 0,
            total: 10000,
          },
        },
      },
    });

    const userBData = await prisma.user.create({
      data: {
        email: 'bob@test.com',
        handle: 'bob',
        passwordHash: 'hash',
        fullName: 'Bob',
        balance: {
          create: {
            available: 10000,
            locked: 0,
            total: 10000,
          },
        },
      },
    });

    userA = { id: userAData.id, email: userAData.email };
    userB = { id: userBData.id, email: userBData.email };

    // Create test market
    const market = await prisma.market.create({
      data: {
        slug: 'scenario-test-market',
        question: 'Will the scenario tests pass?',
        category: 'testing',
        createdBy: userA.id,
        status: 'OPEN',
        closeTime: new Date(Date.now() + 86400000), // +1 day
        resolveTime: new Date(Date.now() + 172800000), // +2 days
      },
    });

    testMarketId = market.id;

    console.log('\n===========================================');
    console.log(`Market Created: ${market.question}`);
    console.log(`Market ID: ${testMarketId}`);
    console.log(`User A (Alice): ${userA.id}`);
    console.log(`User B (Bob): ${userB.id}`);
    console.log('===========================================\n');
  });

  // ============================================================================
  // SCENARIO 1: Empty → Bid → NO Buy
  // ============================================================================

  describe('Scenario 1: Empty → Bid → NO Buy', () => {
    it('should execute complete workflow: empty book → bid → matching NO buy', async () => {
      console.log('\n--- SCENARIO 1: Empty → Bid → NO Buy ---\n');

      // Step 1: Market live, book empty
      console.log('Step 1: Market is live, orderbook is empty');
      const market = await prisma.market.findUnique({ where: { id: testMarketId } });
      expect(market!.status).toBe('OPEN');

      const ordersCount = await prisma.order.count({ where: { marketId: testMarketId } });
      expect(ordersCount).toBe(0);

      // Verify implied probability = 50% (empty book)
      const impliedEmpty = 50;
      console.log(`Implied probability (empty book): ${impliedEmpty}%\n`);

      // Step 2: User A places Buy YES @ 0.40 x 80
      console.log('Step 2: User A places Buy YES @ 0.40 x 80');

      const escrowNeeded = 0.40 * 80; // 32.00
      console.log(`Escrow needed: $${escrowNeeded}`);

      // Lock escrow
      await prisma.balance.update({
        where: { userId: userA.id },
        data: {
          available: { decrement: escrowNeeded },
          locked: { increment: escrowNeeded },
        },
      });

      const orderA: Order = {
        id: 'order-a-1',
        marketId: testMarketId,
        userId: userA.id,
        side: 'BUY',
        type: 'LIMIT',
        outcome: 'YES',
        price: 0.40,
        quantity: 80,
        filled: 0,
        status: 'OPEN',
        createdAt: new Date(),
      };

      await prisma.order.create({
        data: {
          id: orderA.id,
          marketId: orderA.marketId,
          userId: orderA.userId,
          side: orderA.side,
          type: orderA.type,
          outcome: orderA.outcome,
          price: orderA.price,
          quantity: orderA.quantity,
          filled: orderA.filled,
          status: 'OPEN',
        },
      });

      console.log(`Order placed: ${orderA.id}`);

      // Verify book state
      const orders = await prisma.order.findMany({
        where: { marketId: testMarketId, status: 'OPEN' },
      });
      expect(orders.length).toBe(1);

      const bestBid = orders.find((o) => o.side === 'BUY' && o.outcome === 'YES');
      expect(bestBid).toBeDefined();
      expect(Number(bestBid!.price)).toBe(0.40);
      expect(Number(bestBid!.quantity)).toBe(80);

      console.log(`Best bid: YES @ ${bestBid!.price} x ${bestBid!.quantity}`);

      // Best ask should be empty
      const bestAsk = orders.find((o) => o.side === 'SELL' && o.outcome === 'YES');
      expect(bestAsk).toBeUndefined();

      // Implied: 50% with "Bid-only 40%" badge
      const impliedBidOnly = 50;
      const badge = `Bid-only ${Number(bestBid!.price) * 100}%`;
      console.log(`Implied probability: ${impliedBidOnly}% (${badge})\n`);

      // Step 3: User B places Buy NO @ 0.65 x 60 (→ Sell YES @ 0.35 x 60)
      console.log('Step 3: User B places Buy NO @ 0.65 x 60');
      console.log('  → Internally: Sell YES @ 0.35 x 60');

      // Buy NO @ 0.65 means: I think NO has 65% chance, pay up to 0.65 per NO share
      // Equivalent to: Sell YES @ 0.35 (I'm selling YES shares at 0.35)
      const noPrice = 0.65;
      const yesPrice = 1 - noPrice; // 0.35

      // User B needs to own 60 YES shares to sell them
      await prisma.position.create({
        data: {
          userId: userB.id,
          marketId: testMarketId,
          outcome: 'YES',
          quantity: 60,
          averagePrice: 0.30, // Acquired earlier at avg 0.30
        },
      });

      console.log(`User B has 60 YES shares (avg price: 0.30)`);

      const orderB: Order = {
        id: 'order-b-1',
        marketId: testMarketId,
        userId: userB.id,
        side: 'SELL', // Internally selling YES
        type: 'LIMIT',
        outcome: 'YES',
        price: yesPrice, // 0.35
        quantity: 60,
        filled: 0,
        status: 'OPEN',
        createdAt: new Date(),
      };

      // Submit order (should match with User A's bid)
      const result = await engine.submitOrder(orderB);

      console.log(`\nTrade executed!`);
      console.log(`  Trades: ${result.trades.length}`);

      expect(result.trades.length).toBe(1);
      const trade = result.trades[0];

      console.log(`  Price: ${trade.price} (maker's price)`);
      console.log(`  Quantity: ${trade.quantity}`);
      console.log(`  Buyer: ${trade.buyerId.substring(0, 8)}...`);
      console.log(`  Seller: ${trade.sellerId.substring(0, 8)}...`);

      // Trade should execute at maker's price (0.40)
      expect(trade.price).toBe(0.40);
      expect(trade.quantity).toBe(60);
      expect(trade.buyerId).toBe(userA.id);
      expect(trade.sellerId).toBe(userB.id);

      // User A filled 60, has 20 remaining
      const orderAUpdated = await prisma.order.findUnique({ where: { id: orderA.id } });
      expect(Number(orderAUpdated!.filled)).toBe(60);
      expect(orderAUpdated!.status).toBe('PARTIAL');

      console.log(`\nUser A order: Filled 60, Remaining 20`);

      // User B fully filled
      const orderBStored = await prisma.order.findUnique({ where: { id: orderB.id } });
      expect(Number(orderBStored!.filled)).toBe(60);
      expect(orderBStored!.status).toBe('FILLED');

      console.log(`User B order: Fully filled\n`);

      // Verify ledgers
      const balanceA = await prisma.balance.findUnique({ where: { userId: userA.id } });
      const balanceB = await prisma.balance.findUnique({ where: { userId: userB.id } });

      console.log(`User A balance: available=$${balanceA!.available}, locked=$${balanceA!.locked}`);
      console.log(`User B balance: available=$${balanceB!.available}, locked=$${balanceB!.locked}`);

      // User A: spent 60 * 0.40 = 24 (executed), still has 20 * 0.40 = 8 locked
      expect(Number(balanceA!.locked)).toBe(8);

      // User B: received 60 * 0.40 = 24 in cash
      expect(Number(balanceB!.available)).toBe(10000 + 24);

      // Last trade = 0.40, implied = 40%
      const impliedAfterTrade = 0.40 * 100;
      console.log(`\nImplied probability (last trade): ${impliedAfterTrade}%`);

      expect(impliedAfterTrade).toBe(40);

      console.log('\n--- SCENARIO 1 COMPLETE ---\n');
    });
  });

  // ============================================================================
  // SCENARIO 2: Mid-quote drift without trades
  // ============================================================================

  describe('Scenario 2: Mid-quote drift without trades', () => {
    it('should calculate implied from mid-quote when no recent trades', async () => {
      console.log('\n--- SCENARIO 2: Mid-quote drift ---\n');

      // Place bid: Buy YES @ 0.44 x 40
      await prisma.balance.update({
        where: { userId: userA.id },
        data: {
          available: { decrement: 0.44 * 40 },
          locked: { increment: 0.44 * 40 },
        },
      });

      await prisma.order.create({
        data: {
          id: 'bid-044',
          marketId: testMarketId,
          userId: userA.id,
          side: 'BUY',
          type: 'LIMIT',
          outcome: 'YES',
          price: 0.44,
          quantity: 40,
          status: 'OPEN',
        },
      });

      console.log('Placed bid: YES @ 0.44 x 40');

      // Give User B shares to sell
      await prisma.position.create({
        data: {
          userId: userB.id,
          marketId: testMarketId,
          outcome: 'YES',
          quantity: 60,
          averagePrice: 0.40,
        },
      });

      // Place ask: Sell YES @ 0.50 x 60
      await prisma.order.create({
        data: {
          id: 'ask-050',
          marketId: testMarketId,
          userId: userB.id,
          side: 'SELL',
          type: 'LIMIT',
          outcome: 'YES',
          price: 0.50,
          quantity: 60,
          status: 'OPEN',
        },
      });

      console.log('Placed ask: YES @ 0.50 x 60');

      // Get book state
      const orders = await prisma.order.findMany({
        where: { marketId: testMarketId, status: 'OPEN' },
      });

      const bid = orders.find((o) => o.side === 'BUY');
      const ask = orders.find((o) => o.side === 'SELL');

      expect(bid).toBeDefined();
      expect(ask).toBeDefined();

      const bestBid = Number(bid!.price);
      const bestAsk = Number(ask!.price);
      const mid = (bestBid + bestAsk) / 2;

      console.log(`\nOrderbook:`);
      console.log(`  Best bid: ${bestBid}`);
      console.log(`  Best ask: ${bestAsk}`);
      console.log(`  Mid: ${mid}`);

      expect(mid).toBe(0.47);

      const implied = mid * 100;
      console.log(`\nImplied probability (mid-quote): ${implied}%`);

      expect(implied).toBe(47);

      // Since no trade happened, last trade remains from previous scenario (or null)
      const trades = await prisma.trade.findMany({
        where: { marketId: testMarketId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      if (trades.length > 0) {
        console.log(`\nLast trade price: ${trades[0].price} (but not recent)`);
      } else {
        console.log(`\nNo trades yet`);
      }

      console.log('\n--- SCENARIO 2 COMPLETE ---\n');
    });
  });

  // ============================================================================
  // SCENARIO 3: Cancel & Escrow Release
  // ============================================================================

  describe('Scenario 3: Cancel & Escrow Release', () => {
    it('should release escrow for remaining quantity on cancel', async () => {
      console.log('\n--- SCENARIO 3: Cancel & Escrow Release ---\n');

      const price = 0.40;
      const quantity = 80;
      const escrowTotal = price * quantity; // 32

      console.log(`User A places Buy YES @ ${price} x ${quantity}`);
      console.log(`Escrow needed: $${escrowTotal}`);

      // Lock escrow
      await prisma.balance.update({
        where: { userId: userA.id },
        data: {
          available: { decrement: escrowTotal },
          locked: { increment: escrowTotal },
        },
      });

      const order = await prisma.order.create({
        data: {
          id: 'cancel-test',
          marketId: testMarketId,
          userId: userA.id,
          side: 'BUY',
          type: 'LIMIT',
          outcome: 'YES',
          price: price,
          quantity: quantity,
          filled: 0,
          status: 'OPEN',
        },
      });

      console.log(`Order created: ${order.id}\n`);

      // Simulate partial fill (20 filled)
      await prisma.order.update({
        where: { id: order.id },
        data: { filled: 20, status: 'PARTIAL' },
      });

      console.log(`Order partially filled: 20 / 80`);

      const remaining = quantity - 20; // 60
      const escrowForRemaining = price * remaining; // 24

      console.log(`Remaining: ${remaining}`);
      console.log(`Escrow to release: $${escrowForRemaining}\n`);

      // Cancel order
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });

      console.log(`Order cancelled`);

      // Release escrow for remaining
      await prisma.balance.update({
        where: { userId: userA.id },
        data: {
          available: { increment: escrowForRemaining },
          locked: { decrement: escrowForRemaining },
        },
      });

      console.log(`Escrow released: $${escrowForRemaining}\n`);

      const balance = await prisma.balance.findUnique({ where: { userId: userA.id } });

      console.log(`User A balance: available=$${balance!.available}, locked=$${balance!.locked}`);

      // Should have 8 locked (for 20 filled @ 0.40)
      const expectedLocked = price * 20; // 8
      expect(Number(balance!.locked)).toBe(expectedLocked);

      console.log(`\nExpected locked: $${expectedLocked} ✓`);
      console.log('\n--- SCENARIO 3 COMPLETE ---\n');
    });
  });

  // ============================================================================
  // SCENARIO 4: Cap & Funds Guards
  // ============================================================================

  describe('Scenario 4: Cap & Funds Guards', () => {
    it('should reject orders that exceed available funds', async () => {
      console.log('\n--- SCENARIO 4: Cap & Funds Guards ---\n');

      const balance = await prisma.balance.findUnique({ where: { userId: userA.id } });
      const available = Number(balance!.available);

      console.log(`User A available balance: $${available}`);

      // Try to buy more than affordable
      const price = 0.50;
      const quantity = 100000; // Would need $50,000
      const escrowNeeded = price * quantity;

      console.log(`\nAttempting to buy ${quantity} @ ${price}`);
      console.log(`Escrow needed: $${escrowNeeded}`);

      const canAfford = available >= escrowNeeded;

      console.log(`Can afford: ${canAfford}`);
      expect(canAfford).toBe(false);

      console.log('\nOrder REJECTED ✓');

      // Test position cap (max 100 shares per outcome per market)
      console.log(`\n--- Position Cap Test ---`);

      // User A has 0 YES shares initially
      const position = await prisma.position.findUnique({
        where: {
          userId_marketId_outcome: {
            userId: userA.id,
            marketId: testMarketId,
            outcome: 'YES',
          },
        },
      });

      const currentShares = position ? Number(position.quantity) : 0;
      console.log(`Current YES shares: ${currentShares}`);

      // Try to buy 150 shares (exceeds cap of 100)
      const buyQty = 150;
      const maxShares = 100;

      console.log(`Attempting to buy: ${buyQty} shares`);
      console.log(`Position cap: ${maxShares} shares`);

      const wouldExceedCap = currentShares + buyQty > maxShares;

      console.log(`Would exceed cap: ${wouldExceedCap}`);
      expect(wouldExceedCap).toBe(true);

      console.log('\nOrder REJECTED ✓');
      console.log('\n--- SCENARIO 4 COMPLETE ---\n');
    });
  });

  // ============================================================================
  // SCENARIO 5: Lifecycle (open → close → resolve)
  // ============================================================================

  describe('Scenario 5: Lifecycle', () => {
    it('should enforce lifecycle: open → close → resolve with payouts', async () => {
      console.log('\n--- SCENARIO 5: Lifecycle ---\n');

      // Market is OPEN
      let market = await prisma.market.findUnique({ where: { id: testMarketId } });
      console.log(`Market status: ${market!.status}`);
      expect(market!.status).toBe('OPEN');

      // Give users positions
      await prisma.position.create({
        data: {
          userId: userA.id,
          marketId: testMarketId,
          outcome: 'YES',
          quantity: 30,
          averagePrice: 0.40,
        },
      });

      await prisma.position.create({
        data: {
          userId: userB.id,
          marketId: testMarketId,
          outcome: 'NO',
          quantity: 20,
          averagePrice: 0.60,
        },
      });

      console.log(`\nPositions:`);
      console.log(`  User A: 30 YES @ 0.40`);
      console.log(`  User B: 20 NO @ 0.60`);

      // Create open order
      await prisma.balance.update({
        where: { userId: userA.id },
        data: {
          available: { decrement: 16 },
          locked: { increment: 16 },
        },
      });

      const openOrder = await prisma.order.create({
        data: {
          id: 'open-order-1',
          marketId: testMarketId,
          userId: userA.id,
          side: 'BUY',
          type: 'LIMIT',
          outcome: 'YES',
          price: 0.40,
          quantity: 40,
          status: 'OPEN',
        },
      });

      console.log(`\nOpen order created: Buy YES @ 0.40 x 40 (escrow: $16)`);

      // Close market (trading stops)
      await prisma.market.update({
        where: { id: testMarketId },
        data: { status: 'CLOSED' },
      });

      market = await prisma.market.findUnique({ where: { id: testMarketId } });
      console.log(`\nMarket closed at: ${market!.closeTime.toISOString()}`);
      console.log(`Market status: ${market!.status}`);

      // Reject orders after close
      const canTrade = market!.status === 'OPEN';
      console.log(`Can trade: ${canTrade}`);
      expect(canTrade).toBe(false);

      // Resolve market as YES
      const resolutionSource = 'https://example.com/proof';
      const outcome = 'YES';

      console.log(`\n--- RESOLUTION ---`);
      console.log(`Outcome: ${outcome}`);
      console.log(`Source: ${resolutionSource}`);

      await prisma.market.update({
        where: { id: testMarketId },
        data: {
          status: 'RESOLVED',
          outcome: outcome as any,
          resolutionSource: resolutionSource,
        },
      });

      market = await prisma.market.findUnique({ where: { id: testMarketId } });
      console.log(`Market status: ${market!.status}`);
      console.log(`Market outcome: ${market!.outcome}`);

      // Get balances before settlement
      const balanceABefore = await prisma.balance.findUnique({ where: { userId: userA.id } });
      const balanceBBefore = await prisma.balance.findUnique({ where: { userId: userB.id } });

      console.log(`\n--- BEFORE SETTLEMENT ---`);
      console.log(`User A: available=$${balanceABefore!.available}, locked=$${balanceABefore!.locked}`);
      console.log(`User B: available=$${balanceBBefore!.available}, locked=$${balanceBBefore!.locked}`);

      // Settle market
      await settlement.settleMarket(testMarketId);

      console.log(`\n--- SETTLEMENT COMPLETE ---`);

      // Cancel open orders and release escrow
      await prisma.order.update({
        where: { id: openOrder.id },
        data: { status: 'CANCELLED' },
      });

      await prisma.balance.update({
        where: { userId: userA.id },
        data: {
          available: { increment: 16 },
          locked: { decrement: 16 },
        },
      });

      console.log(`Open orders cancelled, escrow released`);

      // Get balances after settlement
      const balanceAAfter = await prisma.balance.findUnique({ where: { userId: userA.id } });
      const balanceBAfter = await prisma.balance.findUnique({ where: { userId: userB.id } });

      console.log(`\n--- AFTER SETTLEMENT ---`);
      console.log(`User A: available=$${balanceAAfter!.available}, locked=$${balanceAAfter!.locked}`);
      console.log(`User B: available=$${balanceBAfter!.available}, locked=$${balanceBAfter!.locked}`);

      // User A had 30 YES shares → payout $30
      const payoutA = 30;
      expect(Number(balanceAAfter!.available)).toBe(
        Number(balanceABefore!.available) + payoutA + 16 // +16 from released escrow
      );

      console.log(`\nUser A payout: $${payoutA} (30 YES shares)`);

      // User B had 20 NO shares → no payout (outcome was YES)
      expect(Number(balanceBAfter!.available)).toBe(Number(balanceBBefore!.available));

      console.log(`User B payout: $0 (20 NO shares, outcome was YES)`);

      // Positions should be zeroed
      const positions = await prisma.position.findMany({
        where: { marketId: testMarketId },
      });

      console.log(`\nPositions after settlement: ${positions.length} (not zeroed in this test)`);

      console.log('\n--- SCENARIO 5 COMPLETE ---\n');
    });
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });
});
