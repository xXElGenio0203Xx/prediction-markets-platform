#!/usr/bin/env node
/**
 * CLOB Matching Engine Test
 * Tests the new matching engine features:
 * 1. Price-time priority
 * 2. Partial fills
 * 3. Market orders
 * 4. Self-trade prevention
 * 5. Order book depth aggregation
 */

import { MatchingEngine } from './src/engine/engine.js';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const logger = pino({ level: 'info' });
const prisma = new PrismaClient();
const engine = new MatchingEngine(prisma, logger);

// Test data
const marketId = 'test-market-123';
const user1 = 'user-1';
const user2 = 'user-2';
const user3 = 'user-3';

async function setupTestMarket() {
  // Create test market
  await prisma.market.upsert({
    where: { slug: 'test-clob' },
    create: {
      id: marketId,
      slug: 'test-clob',
      question: 'Will CLOB matching work?',
      category: 'test',
      status: 'OPEN',
      createdBy: user1,
      closeTime: new Date(Date.now() + 86400000),
      yesPrice: 0.5,
      noPrice: 0.5,
    },
    update: {},
  });

  // Create test users and balances
  for (const userId of [user1, user2, user3]) {
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: `${userId}@test.com`,
        username: userId,
        passwordHash: 'test',
        role: 'USER',
      },
      update: {},
    });

    await prisma.balance.upsert({
      where: { userId },
      create: {
        userId,
        available: 10000,
        locked: 0,
        total: 10000,
      },
      update: {
        available: 10000,
        locked: 0,
        total: 10000,
      },
    });
  }
}

async function test1_PriceTimePriority() {
  console.log('\n🧪 Test 1: Price-Time Priority');
  
  // Place limit orders at different prices and times
  const order1 = await engine.submitOrder({
    marketId,
    userId: user1,
    side: 'BUY',
    type: 'LIMIT',
    outcome: 'YES',
    price: 0.6,
    quantity: 100,
    filled: 0,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 3000),
  });
  
  const order2 = await engine.submitOrder({
    marketId,
    userId: user2,
    side: 'BUY',
    type: 'LIMIT',
    outcome: 'YES',
    price: 0.7, // Better price
    quantity: 50,
    filled: 0,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 2000),
  });
  
  const order3 = await engine.submitOrder({
    marketId,
    userId: user3,
    side: 'BUY',
    type: 'LIMIT',
    outcome: 'YES',
    price: 0.6, // Same price as order1, but later
    quantity: 75,
    filled: 0,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 1000),
  });
  
  // Now sell 150 shares - should match order2 first (best price), then order1 (time priority)
  const sellOrder = await engine.submitOrder({
    marketId,
    userId: user1,
    side: 'SELL',
    type: 'LIMIT',
    outcome: 'YES',
    price: 0.6,
    quantity: 150,
    filled: 0,
    status: 'PENDING',
    createdAt: new Date(),
  });
  
  console.log('✅ Sell order executed:', {
    filled: sellOrder.order.filled,
    status: sellOrder.order.status,
    trades: sellOrder.trades.length,
  });
  
  console.log('   Expected: 50 @ 0.7 (order2), 100 @ 0.6 (order1)');
  console.log('   Trade 1:', sellOrder.trades[0]?.price, sellOrder.trades[0]?.quantity);
  console.log('   Trade 2:', sellOrder.trades[1]?.price, sellOrder.trades[1]?.quantity);
  
  const success = sellOrder.order.status === 'FILLED' &&
                  sellOrder.trades[0].price === 0.7 &&
                  sellOrder.trades[0].quantity === 50 &&
                  sellOrder.trades[1].price === 0.6 &&
                  sellOrder.trades[1].quantity === 100;
  
  console.log(success ? '✅ PASS' : '❌ FAIL');
  return success;
}

async function test2_PartialFills() {
  console.log('\n🧪 Test 2: Partial Fills');
  
  // Place buy order for 100
  const buyOrder = await engine.submitOrder({
    marketId,
    userId: user2,
    side: 'BUY',
    type: 'LIMIT',
    outcome: 'NO',
    price: 0.55,
    quantity: 100,
    filled: 0,
    status: 'PENDING',
    createdAt: new Date(),
  });
  
  // Sell only 40 - should partially fill
  const sellOrder1 = await engine.submitOrder({
    marketId,
    userId: user1,
    side: 'SELL',
    type: 'LIMIT',
    outcome: 'NO',
    price: 0.55,
    quantity: 40,
    filled: 0,
    status: 'PENDING',
    createdAt: new Date(),
  });
  
  console.log('✅ First sell (40 shares):', {
    filled: sellOrder1.order.filled,
    status: sellOrder1.order.status,
  });
  
  // Sell remaining 60
  const sellOrder2 = await engine.submitOrder({
    marketId,
    userId: user3,
    side: 'SELL',
    type: 'LIMIT',
    outcome: 'NO',
    price: 0.55,
    quantity: 60,
    filled: 0,
    status: 'PENDING',
    createdAt: new Date(),
  });
  
  console.log('✅ Second sell (60 shares):', {
    filled: sellOrder2.order.filled,
    status: sellOrder2.order.status,
  });
  
  const success = sellOrder1.order.status === 'FILLED' &&
                  sellOrder2.order.status === 'FILLED';
  
  console.log(success ? '✅ PASS' : '❌ FAIL');
  return success;
}

async function test3_MarketOrders() {
  console.log('\n🧪 Test 3: Market Orders');
  
  // Place limit sell orders at different prices
  await engine.submitOrder({
    marketId,
    userId: user2,
    side: 'SELL',
    type: 'LIMIT',
    outcome: 'YES',
    price: 0.65,
    quantity: 50,
    filled: 0,
    status: 'PENDING',
    createdAt: new Date(),
  });
  
  await engine.submitOrder({
    marketId,
    userId: user3,
    side: 'SELL',
    type: 'LIMIT',
    outcome: 'YES',
    price: 0.70,
    quantity: 50,
    filled: 0,
    status: 'PENDING',
    createdAt: new Date(),
  });
  
  // Market buy order - should match both at their prices
  const marketBuy = await engine.submitOrder({
    marketId,
    userId: user1,
    side: 'BUY',
    type: 'MARKET',
    outcome: 'YES',
    price: 1.0, // Ignored for market orders
    quantity: 100,
    filled: 0,
    status: 'PENDING',
    createdAt: new Date(),
  });
  
  console.log('✅ Market buy executed:', {
    filled: marketBuy.order.filled,
    status: marketBuy.order.status,
    trades: marketBuy.trades.length,
  });
  
  console.log('   Trade 1:', marketBuy.trades[0]?.price, marketBuy.trades[0]?.quantity);
  console.log('   Trade 2:', marketBuy.trades[1]?.price, marketBuy.trades[1]?.quantity);
  
  const success = marketBuy.order.status === 'FILLED' &&
                  marketBuy.trades[0].price === 0.65 &&
                  marketBuy.trades[1].price === 0.70;
  
  console.log(success ? '✅ PASS' : '❌ FAIL');
  return success;
}

async function test4_SelfTradePrevention() {
  console.log('\n🧪 Test 4: Self-Trade Prevention');
  
  // User places buy order
  const buyOrder = await engine.submitOrder({
    marketId,
    userId: user1,
    side: 'BUY',
    type: 'LIMIT',
    outcome: 'NO',
    price: 0.60,
    quantity: 100,
    filled: 0,
    status: 'PENDING',
    createdAt: new Date(),
  });
  
  console.log('✅ Buy order placed:', buyOrder.order.id);
  
  // Same user tries to sell - should NOT match
  const sellOrder = await engine.submitOrder({
    marketId,
    userId: user1, // Same user!
    side: 'SELL',
    type: 'LIMIT',
    outcome: 'NO',
    price: 0.60,
    quantity: 50,
    filled: 0,
    status: 'PENDING',
    createdAt: new Date(),
  });
  
  console.log('✅ Sell order result:', {
    filled: sellOrder.order.filled,
    status: sellOrder.order.status,
    trades: sellOrder.trades.length,
  });
  
  // Should not match (no trades)
  const success = sellOrder.trades.length === 0 &&
                  sellOrder.order.status === 'OPEN';
  
  console.log(success ? '✅ PASS: Self-trade prevented' : '❌ FAIL: Self-trade occurred');
  return success;
}

async function test5_OrderBookDepth() {
  console.log('\n🧪 Test 5: Order Book Depth Aggregation');
  
  // Place multiple orders at same price
  await engine.submitOrder({
    marketId,
    userId: user1,
    side: 'BUY',
    type: 'LIMIT',
    outcome: 'YES',
    price: 0.50,
    quantity: 100,
    filled: 0,
    status: 'PENDING',
    createdAt: new Date(),
  });
  
  await engine.submitOrder({
    marketId,
    userId: user2,
    side: 'BUY',
    type: 'LIMIT',
    outcome: 'YES',
    price: 0.50,
    quantity: 150,
    filled: 0,
    status: 'PENDING',
    createdAt: new Date(),
  });
  
  const orderbook = await engine.getOrderbook(marketId);
  
  console.log('✅ Orderbook bids:', JSON.stringify(orderbook.bids, null, 2));
  
  // Should aggregate: 250 shares at 0.50
  const bid050 = orderbook.bids.find(b => b.price === 0.50);
  const success = bid050 && bid050.quantity === 250 && bid050.orders === 2;
  
  console.log(success ? '✅ PASS: Depth aggregated correctly' : '❌ FAIL: Aggregation error');
  return success;
}

// Run all tests
async function runTests() {
  console.log('🚀 CLOB Matching Engine Test Suite\n');
  console.log('=' .repeat(50));
  
  try {
    await setupTestMarket();
    console.log('✅ Test market and users created\n');
    
    const results = [];
    results.push(await test1_PriceTimePriority());
    results.push(await test2_PartialFills());
    results.push(await test3_MarketOrders());
    results.push(await test4_SelfTradePrevention());
    results.push(await test5_OrderBookDepth());
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Results:');
    console.log(`   Passed: ${results.filter(r => r).length}/${results.length}`);
    console.log(`   Failed: ${results.filter(r => !r).length}/${results.length}`);
    
    const allPassed = results.every(r => r);
    console.log(allPassed ? '\n✅ ALL TESTS PASSED!' : '\n❌ SOME TESTS FAILED');
    
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
