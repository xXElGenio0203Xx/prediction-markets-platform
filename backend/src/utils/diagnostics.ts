/**
 * DIAGNOSTIC & AUDIT UTILITY
 * 
 * Helper functions for debugging and auditing exchange state
 * Usage: import and call from tests or admin endpoints
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get complete state for a market
 */
export async function getMarketDiagnostics(marketId: string) {
  const [market, orders, trades, positions] = await Promise.all([
    prisma.market.findUnique({ where: { id: marketId } }),
    prisma.order.findMany({
      where: { marketId },
      orderBy: [{ createdAt: 'asc' }],
    }),
    prisma.trade.findMany({
      where: { marketId },
      orderBy: [{ createdAt: 'asc' }],
    }),
    prisma.position.findMany({
      where: { marketId },
      include: { user: { select: { email: true, handle: true } } },
    }),
  ]);

  // Calculate orderbook state
  const openOrders = orders.filter((o) => ['OPEN', 'PARTIAL'].includes(o.status));
  const yesBids = openOrders
    .filter((o) => o.outcome === 'YES' && o.side === 'BUY')
    .map((o) => ({
      price: Number(o.price),
      quantity: Number(o.quantity) - Number(o.filled),
      userId: o.userId.substring(0, 8),
    }))
    .sort((a, b) => b.price - a.price);

  const yesAsks = openOrders
    .filter((o) => o.outcome === 'YES' && o.side === 'SELL')
    .map((o) => ({
      price: Number(o.price),
      quantity: Number(o.quantity) - Number(o.filled),
      userId: o.userId.substring(0, 8),
    }))
    .sort((a, b) => a.price - b.price);

  // Calculate implied probability
  const lastTrade = trades[trades.length - 1];
  const bestBid = yesBids[0]?.price || null;
  const bestAsk = yesAsks[0]?.price || null;

  let implied = 50;
  let impliedSource = 'default (empty book)';

  if (lastTrade) {
    const ageSeconds = (Date.now() - lastTrade.createdAt.getTime()) / 1000;
    if (ageSeconds < 60) {
      implied = Number(lastTrade.price) * 100;
      impliedSource = `last trade @ ${Number(lastTrade.price)} (${Math.floor(ageSeconds)}s ago)`;
    }
  }

  if (implied === 50 && bestBid && bestAsk) {
    const mid = (bestBid + bestAsk) / 2;
    implied = mid * 100;
    impliedSource = `mid-quote (${bestBid} / ${bestAsk})`;
  } else if (implied === 50 && bestBid && !bestAsk) {
    impliedSource = `bid-only @ ${bestBid}`;
  } else if (implied === 50 && !bestBid && bestAsk) {
    impliedSource = `ask-only @ ${bestAsk}`;
  }

  return {
    market: {
      id: market?.id,
      question: market?.question,
      status: market?.status,
      outcome: market?.outcome,
      resolutionSource: market?.resolutionSource,
    },
    orderbook: {
      yesBids,
      yesAsks,
      bestBid,
      bestAsk,
      spread: bestBid && bestAsk ? bestAsk - bestBid : null,
    },
    implied: {
      probability: implied,
      source: impliedSource,
    },
    statistics: {
      totalOrders: orders.length,
      openOrders: openOrders.length,
      filledOrders: orders.filter((o) => o.status === 'FILLED').length,
      cancelledOrders: orders.filter((o) => o.status === 'CANCELLED').length,
      totalTrades: trades.length,
      totalVolume: trades.reduce((sum, t) => sum + Number(t.quantity) * Number(t.price), 0),
      totalPositions: positions.length,
    },
    positions: positions.map((p) => ({
      user: p.user.handle || p.user.email,
      outcome: p.outcome,
      quantity: Number(p.quantity),
      averagePrice: Number(p.averagePrice),
      currentValue: Number(p.quantity) * (implied / 100),
      unrealizedPnL:
        Number(p.quantity) * (implied / 100) - Number(p.quantity) * Number(p.averagePrice),
    })),
    recentTrades: trades.slice(-10).map((t) => ({
      time: t.createdAt.toISOString(),
      price: Number(t.price),
      quantity: Number(t.quantity),
      outcome: t.outcome,
      value: Number(t.price) * Number(t.quantity),
    })),
  };
}

/**
 * Get user portfolio diagnostics
 */
export async function getUserDiagnostics(userId: string) {
  const [user, balance, positions, orders, trades] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.balance.findUnique({ where: { userId } }),
    prisma.position.findMany({
      where: { userId },
      include: { market: { select: { question: true, status: true } } },
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }],
      take: 20,
    }),
    prisma.trade.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: [{ createdAt: 'desc' }],
      take: 20,
    }),
  ]);

  // Calculate position values
  const positionDetails = await Promise.all(
    positions.map(async (p) => {
      const marketDiag = await getMarketDiagnostics(p.marketId);
      const markPrice = marketDiag.implied.probability / 100;

      return {
        market: p.market.question,
        marketStatus: p.market.status,
        outcome: p.outcome,
        quantity: Number(p.quantity),
        averagePrice: Number(p.averagePrice),
        markPrice,
        currentValue: Number(p.quantity) * markPrice,
        costBasis: Number(p.quantity) * Number(p.averagePrice),
        unrealizedPnL:
          Number(p.quantity) * markPrice - Number(p.quantity) * Number(p.averagePrice),
      };
    })
  );

  const totalPositionValue = positionDetails.reduce((sum, p) => sum + p.currentValue, 0);
  const totalUnrealizedPnL = positionDetails.reduce((sum, p) => sum + p.unrealizedPnL, 0);

  return {
    user: {
      id: user?.id,
      email: user?.email,
      handle: user?.handle,
      role: user?.role,
    },
    balance: {
      available: Number(balance?.available || 0),
      locked: Number(balance?.locked || 0),
      total: Number(balance?.total || 0),
    },
    portfolio: {
      cashBalance: Number(balance?.available || 0) + Number(balance?.locked || 0),
      positionValue: totalPositionValue,
      portfolioValue:
        Number(balance?.available || 0) + Number(balance?.locked || 0) + totalPositionValue,
      unrealizedPnL: totalUnrealizedPnL,
    },
    positions: positionDetails,
    recentOrders: orders.map((o) => ({
      id: o.id.substring(0, 8),
      marketId: o.marketId.substring(0, 8),
      side: o.side,
      outcome: o.outcome,
      price: Number(o.price),
      quantity: Number(o.quantity),
      filled: Number(o.filled),
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
    recentTrades: trades.map((t) => ({
      id: t.id.substring(0, 8),
      marketId: t.marketId.substring(0, 8),
      side: t.buyerId === userId ? 'BUY' : 'SELL',
      outcome: t.outcome,
      price: Number(t.price),
      quantity: Number(t.quantity),
      value: Number(t.price) * Number(t.quantity),
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

/**
 * Fix balances by recalculating from ledger
 * (Not implemented - requires Ledger table)
 */
export async function fixBalances(userId?: string) {
  console.log('Fix balances not implemented - requires Ledger table');
  console.log('Current balance system uses cached values in Balance table');

  if (userId) {
    const balance = await prisma.balance.findUnique({ where: { userId } });
    console.log(`User ${userId} balance:`, {
      available: Number(balance?.available || 0),
      locked: Number(balance?.locked || 0),
      total: Number(balance?.total || 0),
    });
  }

  return {
    status: 'not_implemented',
    message: 'Requires Ledger table implementation',
  };
}

/**
 * Validate system invariants
 */
export async function validateInvariants() {
  const issues: string[] = [];

  // Check for negative balances
  const negativeBalances = await prisma.balance.findMany({
    where: {
      OR: [{ available: { lt: 0 } }, { locked: { lt: 0 } }, { total: { lt: 0 } }],
    },
  });

  if (negativeBalances.length > 0) {
    issues.push(`Found ${negativeBalances.length} users with negative balances`);
  }

  // Check for negative positions
  const negativePositions = await prisma.position.findMany({
    where: { quantity: { lt: 0 } },
  });

  if (negativePositions.length > 0) {
    issues.push(`Found ${negativePositions.length} negative positions`);
  }

  // Check for orders with invalid filled amounts
  const invalidOrders = await prisma.order.findMany({
    where: {
      OR: [{ filled: { lt: 0 } }, { filled: { gt: prisma.order.fields.quantity } }],
    },
  });

  if (invalidOrders.length > 0) {
    issues.push(`Found ${invalidOrders.length} orders with invalid filled amounts`);
  }

  // Check for trades with zero quantity
  const zeroTrades = await prisma.trade.findMany({
    where: { quantity: { lte: 0 } },
  });

  if (zeroTrades.length > 0) {
    issues.push(`Found ${zeroTrades.length} trades with zero or negative quantity`);
  }

  return {
    valid: issues.length === 0,
    issues,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Export audit trail for a user
 */
export async function exportUserAudit(userId: string) {
  const [user, balance, positions, orders, trades, orderEvents] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.balance.findUnique({ where: { userId } }),
    prisma.position.findMany({
      where: { userId },
      include: { market: true },
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'asc' }],
      include: { market: { select: { question: true } } },
    }),
    prisma.trade.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: [{ createdAt: 'asc' }],
      include: { market: { select: { question: true } } },
    }),
    prisma.orderEvent.findMany({
      where: {
        order: { userId },
      },
      orderBy: [{ createdAt: 'asc' }],
    }),
  ]);

  return {
    user: {
      id: user?.id,
      email: user?.email,
      handle: user?.handle,
      createdAt: user?.createdAt,
    },
    currentBalance: {
      available: Number(balance?.available || 0),
      locked: Number(balance?.locked || 0),
      total: Number(balance?.total || 0),
      updatedAt: balance?.updatedAt,
    },
    positions: positions.map((p) => ({
      market: p.market.question,
      outcome: p.outcome,
      quantity: Number(p.quantity),
      averagePrice: Number(p.averagePrice),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    orders: orders.map((o) => ({
      id: o.id,
      market: o.market.question,
      side: o.side,
      outcome: o.outcome,
      type: o.type,
      price: Number(o.price),
      quantity: Number(o.quantity),
      filled: Number(o.filled),
      status: o.status,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    })),
    trades: trades.map((t) => ({
      id: t.id,
      market: t.market.question,
      side: t.buyerId === userId ? 'BUY' : 'SELL',
      outcome: t.outcome,
      price: Number(t.price),
      quantity: Number(t.quantity),
      value: Number(t.price) * Number(t.quantity),
      createdAt: t.createdAt,
    })),
    orderEvents: orderEvents.map((e) => ({
      orderId: e.orderId,
      type: e.type,
      data: e.data,
      createdAt: e.createdAt,
    })),
    generatedAt: new Date().toISOString(),
  };
}

// Export all functions
export default {
  getMarketDiagnostics,
  getUserDiagnostics,
  fixBalances,
  validateInvariants,
  exportUserAudit,
};

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'market':
      if (!arg) {
        console.error('Usage: tsx diagnostics.ts market <marketId>');
        process.exit(1);
      }
      getMarketDiagnostics(arg)
        .then((result) => {
          console.log(JSON.stringify(result, null, 2));
        })
        .finally(() => prisma.$disconnect());
      break;

    case 'user':
      if (!arg) {
        console.error('Usage: tsx diagnostics.ts user <userId>');
        process.exit(1);
      }
      getUserDiagnostics(arg)
        .then((result) => {
          console.log(JSON.stringify(result, null, 2));
        })
        .finally(() => prisma.$disconnect());
      break;

    case 'validate':
      validateInvariants()
        .then((result) => {
          console.log(JSON.stringify(result, null, 2));
          if (!result.valid) {
            process.exit(1);
          }
        })
        .finally(() => prisma.$disconnect());
      break;

    case 'audit':
      if (!arg) {
        console.error('Usage: tsx diagnostics.ts audit <userId>');
        process.exit(1);
      }
      exportUserAudit(arg)
        .then((result) => {
          console.log(JSON.stringify(result, null, 2));
        })
        .finally(() => prisma.$disconnect());
      break;

    default:
      console.log('Bruno Exchange Diagnostics');
      console.log('');
      console.log('Usage:');
      console.log('  tsx diagnostics.ts market <marketId>  - Get market diagnostics');
      console.log('  tsx diagnostics.ts user <userId>      - Get user portfolio');
      console.log('  tsx diagnostics.ts validate           - Validate system invariants');
      console.log('  tsx diagnostics.ts audit <userId>     - Export user audit trail');
      process.exit(1);
  }
}
