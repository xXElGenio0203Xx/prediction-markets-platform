import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get portfolio analytics
  fastify.get('/portfolio', { preHandler: requireAuth }, async (request) => {
    const userId = request.user!.id;

    // Get user's positions
    const positions = await prisma.position.findMany({
      where: { userId },
      include: {
        market: true,
      },
    });

    // Calculate portfolio metrics
    const totalInvested = positions.reduce(
      (sum, pos) => sum + Number(pos.quantity) * Number(pos.averagePrice),
      0
    );

    const currentValue = positions.reduce((sum, pos) => {
      const currentPrice =
        pos.outcome === 'YES' ? Number(pos.market.yesPrice) : Number(pos.market.noPrice);
      return sum + Number(pos.quantity) * currentPrice;
    }, 0);

    const totalPnl = currentValue - totalInvested;
    const pnlPercentage = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    return {
      totalInvested,
      currentValue,
      totalPnl,
      pnlPercentage,
      activePositions: positions.length,
      positions: positions.map((pos) => ({
        marketId: pos.marketId,
        marketTitle: pos.market.question,
        outcome: pos.outcome,
        quantity: Number(pos.quantity),
        averagePrice: Number(pos.averagePrice),
        currentPrice:
          pos.outcome === 'YES' ? Number(pos.market.yesPrice) : Number(pos.market.noPrice),
        invested: Number(pos.quantity) * Number(pos.averagePrice),
        currentValue:
          Number(pos.quantity) *
          (pos.outcome === 'YES' ? Number(pos.market.yesPrice) : Number(pos.market.noPrice)),
      })),
    };
  });

  // Get trade history
  fastify.get('/trades', { preHandler: requireAuth }, async (request) => {
    const userId = request.user!.id;
    const { limit = 50, offset = 0 } = request.query as any;

    // Get user's trades
    const trades = await prisma.trade.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        market: {
          select: {
            question: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Number(limit),
      skip: Number(offset),
    });

    return {
      trades: trades.map((trade) => ({
        id: trade.id,
        marketId: trade.marketId,
        marketTitle: trade.market.question,
        marketSlug: trade.market.slug,
        outcome: trade.outcome,
        price: Number(trade.price),
        quantity: Number(trade.quantity),
        side: trade.buyerId === userId ? 'BUY' : 'SELL',
        total: Number(trade.price) * Number(trade.quantity),
        createdAt: trade.createdAt,
      })),
      total: trades.length,
    };
  });

  // Get market analytics
  fastify.get('/market/:slug', async (request) => {
    const { slug } = request.params as { slug: string };
    const { period = '7d' } = request.query as any;

    const market = await prisma.market.findUnique({
      where: { slug },
    });

    if (!market) {
      return { error: 'Market not found' };
    }

    // Get recent trades for the market
    const trades = await prisma.trade.findMany({
      where: { marketId: market.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Calculate volume
    const volume24h = trades
      .filter((t) => t.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000))
      .reduce((sum, t) => sum + Number(t.quantity) * Number(t.price), 0);

    const volume7d = trades
      .filter((t) => t.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .reduce((sum, t) => sum + Number(t.quantity) * Number(t.price), 0);

    return {
      marketId: market.id,
      title: market.question,
      slug: market.slug,
      yesPrice: Number(market.yesPrice),
      noPrice: Number(market.noPrice),
      volume24h,
      volume7d,
      totalTrades: trades.length,
      recentTrades: trades.slice(0, 20).map((t) => ({
        price: Number(t.price),
        quantity: Number(t.quantity),
        outcome: t.outcome,
        createdAt: t.createdAt,
      })),
    };
  });

  // Platform metrics (admin only)
  fastify.get('/admin/platform', { preHandler: requireAuth }, async (request) => {
    if (request.user!.role !== 'ADMIN') {
      throw new Error('Admin access required');
    }

    const [totalUsers, totalMarkets, totalTrades, totalVolume] = await Promise.all([
      prisma.user.count(),
      prisma.market.count(),
      prisma.trade.count(),
      prisma.trade.aggregate({
        _sum: {
          quantity: true,
        },
      }),
    ]);

    return {
      totalUsers,
      totalMarkets,
      totalTrades,
      totalVolume: Number(totalVolume._sum.quantity || 0),
    };
  });
};

export default analyticsRoutes;
