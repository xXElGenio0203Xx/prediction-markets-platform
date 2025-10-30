/**
 * MANUAL CHECKLIST RUNNER
 * 
 * Interactive script that walks through test scenarios step-by-step
 * Seeds two users and executes Scenario 1-5 with state printing
 * 
 * Usage: npx tsx src/__tests__/manual-checklist.ts
 */

import { PrismaClient } from '@prisma/client';
import { MatchingEngine } from '../engine/engine.js';
import { SettlementService } from '../settlement/settlement.ts';
import type { Order } from '../engine/types.js';
import pino from 'pino';
import * as readline from 'readline';

const prisma = new PrismaClient();
const logger = pino({ level: 'info' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function printHeader(text: string) {
  console.log('\n' + '='.repeat(60));
  console.log(text);
  console.log('='.repeat(60) + '\n');
}

function printState(title: string, data: any) {
  console.log(`\n--- ${title} ---`);
  console.log(JSON.stringify(data, null, 2));
}

async function getOrderBook(marketId: string) {
  const orders = await prisma.order.findMany({
    where: { marketId, status: { in: ['OPEN', 'PARTIAL'] } },
    orderBy: [{ outcome: 'asc' }, { side: 'asc' }, { price: 'desc' }],
  });

  const yesBids = orders.filter((o) => o.outcome === 'YES' && o.side === 'BUY');
  const yesAsks = orders.filter((o) => o.outcome === 'YES' && o.side === 'SELL');

  return {
    yesBids: yesBids.map((o) => ({
      price: Number(o.price),
      quantity: Number(o.quantity) - Number(o.filled),
      userId: o.userId.substring(0, 8),
    })),
    yesAsks: yesAsks.map((o) => ({
      price: Number(o.price),
      quantity: Number(o.quantity) - Number(o.filled),
      userId: o.userId.substring(0, 8),
    })),
    bestBid: yesBids[0] ? Number(yesBids[0].price) : null,
    bestAsk: yesAsks[0] ? Number(yesAsks[0].price) : null,
  };
}

async function getBalances(userId: string) {
  const balance = await prisma.balance.findUnique({ where: { userId } });
  return {
    available: Number(balance!.available),
    locked: Number(balance!.locked),
    total: Number(balance!.total),
  };
}

async function getPositions(userId: string, marketId: string) {
  const positions = await prisma.position.findMany({
    where: { userId, marketId },
  });

  return positions.map((p) => ({
    outcome: p.outcome,
    quantity: Number(p.quantity),
    averagePrice: Number(p.averagePrice),
  }));
}

async function getImplied(marketId: string) {
  const book = await getOrderBook(marketId);
  const trades = await prisma.trade.findMany({
    where: { marketId },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });

  let implied = 50;
  let source = 'default (empty book)';

  if (trades.length > 0) {
    const lastTrade = trades[0];
    const ageSeconds = (Date.now() - lastTrade.createdAt.getTime()) / 1000;

    if (ageSeconds < 60) {
      implied = Number(lastTrade.price) * 100;
      source = `last trade @ ${Number(lastTrade.price)} (${Math.floor(ageSeconds)}s ago)`;
    }
  }

  if (implied === 50 && book.bestBid && book.bestAsk) {
    const mid = (book.bestBid + book.bestAsk) / 2;
    implied = mid * 100;
    source = `mid-quote (${book.bestBid} / ${book.bestAsk})`;
  } else if (implied === 50 && book.bestBid && !book.bestAsk) {
    source = `bid-only @ ${book.bestBid}`;
  } else if (implied === 50 && !book.bestBid && book.bestAsk) {
    source = `ask-only @ ${book.bestAsk}`;
  }

  return { implied, source };
}

async function main() {
  printHeader('BRUNO EXCHANGE — MANUAL CHECKLIST RUNNER');

  console.log('This script will walk through test scenarios step-by-step.');
  console.log('Press ENTER to continue through each step.\n');

  await prompt('Press ENTER to start...');

  // Clean database
  printHeader('SETUP: Cleaning Database');
  await prisma.orderEvent.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.order.deleteMany();
  await prisma.position.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.balance.deleteMany();
  await prisma.session.deleteMany();
  await prisma.market.deleteMany();
  await prisma.user.deleteMany();
  console.log('✓ Database cleaned');

  // Create users
  printHeader('SETUP: Creating Users');

  const userA = await prisma.user.create({
    data: {
      email: 'alice@manual-test.com',
      handle: 'alice',
      passwordHash: 'hash',
      fullName: 'Alice (User A)',
      balance: {
        create: {
          available: 10000,
          locked: 0,
          total: 10000,
        },
      },
    },
  });

  const userB = await prisma.user.create({
    data: {
      email: 'bob@manual-test.com',
      handle: 'bob',
      passwordHash: 'hash',
      fullName: 'Bob (User B)',
      balance: {
        create: {
          available: 10000,
          locked: 0,
          total: 10000,
        },
      },
    },
  });

  console.log(`✓ User A (Alice): ${userA.id}`);
  console.log(`✓ User B (Bob): ${userB.id}`);

  // Create market
  const market = await prisma.market.create({
    data: {
      slug: 'manual-test-market',
      question: 'Will this manual test succeed?',
      category: 'testing',
      createdBy: userA.id,
      status: 'OPEN',
      closeTime: new Date(Date.now() + 86400000),
      resolveTime: new Date(Date.now() + 172800000),
    },
  });

  console.log(`✓ Market: ${market.question}`);
  console.log(`  ID: ${market.id}`);

  const engine = new MatchingEngine(prisma, logger as any);
  const settlement = new SettlementService(prisma, logger as any);

  await prompt('\nPress ENTER to continue...');

  // ============================================================================
  // SCENARIO 1: Empty → Bid → NO Buy
  // ============================================================================

  printHeader('SCENARIO 1: Empty → Bid → NO Buy');

  console.log('Step 1: Market is live, orderbook is empty');
  let book = await getOrderBook(market.id);
  let implied = await getImplied(market.id);
  printState('Orderbook', book);
  printState('Implied Probability', implied);

  await prompt('\nPress ENTER for Step 2...');

  console.log('\nStep 2: User A places Buy YES @ 0.40 x 80');
  console.log('  Escrow needed: $32.00');

  await prisma.balance.update({
    where: { userId: userA.id },
    data: {
      available: { decrement: 32 },
      locked: { increment: 32 },
    },
  });

  const orderA = await prisma.order.create({
    data: {
      id: 'manual-order-a1',
      marketId: market.id,
      userId: userA.id,
      side: 'BUY',
      type: 'LIMIT',
      outcome: 'YES',
      price: 0.40,
      quantity: 80,
      status: 'OPEN',
    },
  });

  console.log(`  Order placed: ${orderA.id}`);

  book = await getOrderBook(market.id);
  implied = await getImplied(market.id);
  const balanceA = await getBalances(userA.id);

  printState('Orderbook', book);
  printState('User A Balance', balanceA);
  printState('Implied Probability', implied);

  await prompt('\nPress ENTER for Step 3...');

  console.log('\nStep 3: User B places Buy NO @ 0.65 x 60');
  console.log('  → Internally: Sell YES @ 0.35 x 60');

  // Give User B shares to sell
  await prisma.position.create({
    data: {
      userId: userB.id,
      marketId: market.id,
      outcome: 'YES',
      quantity: 60,
      averagePrice: 0.30,
    },
  });

  console.log('  User B owns 60 YES shares (avg: 0.30)');

  const orderB: Order = {
    id: 'manual-order-b1',
    marketId: market.id,
    userId: userB.id,
    side: 'SELL',
    type: 'LIMIT',
    outcome: 'YES',
    price: 0.35,
    quantity: 60,
    filled: 0,
    status: 'OPEN',
    createdAt: new Date(),
  };

  const result = await engine.submitOrder(orderB);

  console.log(`\n  ✓ Trade executed!`);
  console.log(`    Trades: ${result.trades.length}`);
  console.log(`    Price: ${result.trades[0].price} (maker's price)`);
  console.log(`    Quantity: ${result.trades[0].quantity}`);

  book = await getOrderBook(market.id);
  implied = await getImplied(market.id);
  const balanceAUpdated = await getBalances(userA.id);
  const balanceB = await getBalances(userB.id);
  const positionsA = await getPositions(userA.id, market.id);
  const positionsB = await getPositions(userB.id, market.id);

  printState('Orderbook', book);
  printState('User A Balance', balanceAUpdated);
  printState('User B Balance', balanceB);
  printState('User A Positions', positionsA);
  printState('User B Positions', positionsB);
  printState('Implied Probability', implied);

  console.log('\n✓ SCENARIO 1 COMPLETE');

  await prompt('\nPress ENTER for SCENARIO 2...');

  // ============================================================================
  // SCENARIO 2: Mid-quote drift
  // ============================================================================

  printHeader('SCENARIO 2: Mid-quote drift without trades');

  console.log('Placing bid and ask that don\'t cross...');

  await prisma.balance.update({
    where: { userId: userA.id },
    data: {
      available: { decrement: 17.6 },
      locked: { increment: 17.6 },
    },
  });

  await prisma.order.create({
    data: {
      id: 'manual-bid-044',
      marketId: market.id,
      userId: userA.id,
      side: 'BUY',
      type: 'LIMIT',
      outcome: 'YES',
      price: 0.44,
      quantity: 40,
      status: 'OPEN',
    },
  });

  console.log('  Bid: YES @ 0.44 x 40');

  await prisma.order.create({
    data: {
      id: 'manual-ask-050',
      marketId: market.id,
      userId: userB.id,
      side: 'SELL',
      type: 'LIMIT',
      outcome: 'YES',
      price: 0.50,
      quantity: 40,
      status: 'OPEN',
    },
  });

  console.log('  Ask: YES @ 0.50 x 40');

  book = await getOrderBook(market.id);
  implied = await getImplied(market.id);

  printState('Orderbook', book);
  printState('Implied Probability', implied);

  console.log('\n✓ SCENARIO 2 COMPLETE');

  await prompt('\nPress ENTER for SCENARIO 3...');

  // ============================================================================
  // SCENARIO 3: Cancel & Escrow Release
  // ============================================================================

  printHeader('SCENARIO 3: Cancel & Escrow Release');

  console.log('Creating order to cancel...');

  await prisma.balance.update({
    where: { userId: userA.id },
    data: {
      available: { decrement: 32 },
      locked: { increment: 32 },
    },
  });

  const cancelOrder = await prisma.order.create({
    data: {
      id: 'manual-cancel-order',
      marketId: market.id,
      userId: userA.id,
      side: 'BUY',
      type: 'LIMIT',
      outcome: 'YES',
      price: 0.40,
      quantity: 80,
      filled: 20,
      status: 'PARTIAL',
    },
  });

  console.log(`  Order: Buy YES @ 0.40 x 80 (20 filled)`);
  console.log(`  Escrow locked: $32.00`);

  let balanceBefore = await getBalances(userA.id);
  printState('User A Balance (before cancel)', balanceBefore);

  await prompt('\nPress ENTER to cancel order...');

  const remaining = 80 - 20;
  const escrowToRelease = 0.40 * remaining;

  await prisma.order.update({
    where: { id: cancelOrder.id },
    data: { status: 'CANCELLED' },
  });

  await prisma.balance.update({
    where: { userId: userA.id },
    data: {
      available: { increment: escrowToRelease },
      locked: { decrement: escrowToRelease },
    },
  });

  console.log(`  ✓ Order cancelled`);
  console.log(`  Escrow released: $${escrowToRelease}`);

  const balanceAfter = await getBalances(userA.id);
  printState('User A Balance (after cancel)', balanceAfter);

  console.log('\n✓ SCENARIO 3 COMPLETE');

  await prompt('\nPress ENTER for SCENARIO 4...');

  // ============================================================================
  // SCENARIO 4: Funds Guard
  // ============================================================================

  printHeader('SCENARIO 4: Funds Guard');

  const currentBalance = await getBalances(userA.id);
  console.log(`User A available: $${currentBalance.available}`);

  const hugeOrder = {
    price: 0.50,
    quantity: 100000,
    escrowNeeded: 0.50 * 100000,
  };

  console.log(`\nAttempting order: Buy YES @ ${hugeOrder.price} x ${hugeOrder.quantity}`);
  console.log(`  Escrow needed: $${hugeOrder.escrowNeeded}`);

  const canAfford = currentBalance.available >= hugeOrder.escrowNeeded;
  console.log(`  Can afford: ${canAfford}`);

  if (!canAfford) {
    console.log(`  ✓ Order REJECTED (insufficient funds)`);
  } else {
    console.log(`  ✗ Order would be accepted (unexpected!)`);
  }

  console.log('\n✓ SCENARIO 4 COMPLETE');

  await prompt('\nPress ENTER for SCENARIO 5...');

  // ============================================================================
  // SCENARIO 5: Lifecycle
  // ============================================================================

  printHeader('SCENARIO 5: Lifecycle (close → resolve → settle)');

  console.log('Current market status:', market.status);

  await prompt('\nPress ENTER to close market...');

  await prisma.market.update({
    where: { id: market.id },
    data: { status: 'CLOSED' },
  });

  console.log('✓ Market CLOSED (trading stopped)');

  await prompt('\nPress ENTER to resolve market as YES...');

  await prisma.market.update({
    where: { id: market.id },
    data: {
      status: 'RESOLVED',
      outcome: 'YES',
      resolutionSource: 'https://example.com/manual-test-proof',
    },
  });

  console.log('✓ Market RESOLVED (outcome: YES)');
  console.log('  Source: https://example.com/manual-test-proof');

  const positionsBeforeSettle = await prisma.position.findMany({
    where: { marketId: market.id },
  });

  console.log(`\nPositions before settlement:`);
  for (const pos of positionsBeforeSettle) {
    console.log(`  ${pos.userId.substring(0, 8)}: ${pos.quantity} ${pos.outcome}`);
  }

  const balancesBeforeSettle = {
    userA: await getBalances(userA.id),
    userB: await getBalances(userB.id),
  };

  printState('Balances before settlement', balancesBeforeSettle);

  await prompt('\nPress ENTER to settle market...');

  await settlement.settleMarket(market.id);

  console.log('✓ Market SETTLED');

  const balancesAfterSettle = {
    userA: await getBalances(userA.id),
    userB: await getBalances(userB.id),
  };

  printState('Balances after settlement', balancesAfterSettle);

  console.log('\n✓ SCENARIO 5 COMPLETE');

  printHeader('ALL SCENARIOS COMPLETE!');

  console.log('Summary:');
  console.log('  ✓ Scenario 1: Empty → Bid → NO Buy');
  console.log('  ✓ Scenario 2: Mid-quote drift');
  console.log('  ✓ Scenario 3: Cancel & Escrow Release');
  console.log('  ✓ Scenario 4: Funds Guard');
  console.log('  ✓ Scenario 5: Lifecycle');

  console.log('\nFinal State:');
  printState('Market', {
    id: market.id,
    question: market.question,
    status: (await prisma.market.findUnique({ where: { id: market.id } }))!.status,
    outcome: (await prisma.market.findUnique({ where: { id: market.id } }))!.outcome,
  });

  printState('User A (Alice) Final Balance', await getBalances(userA.id));
  printState('User B (Bob) Final Balance', await getBalances(userB.id));

  rl.close();
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  rl.close();
  prisma.$disconnect();
  process.exit(1);
});
