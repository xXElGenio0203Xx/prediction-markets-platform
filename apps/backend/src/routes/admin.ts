import { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { prisma } from '../lib/prisma.js';
import { SettlementService } from '../settlement/settlement.js';
import { redis, CHANNELS } from '../lib/redis.js';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const settlementService = new SettlementService(prisma, fastify.log);

  // Resolve a market
  fastify.post('/markets/:slug/resolve', { preHandler: [requireAuth, requireAdmin] }, async (request) => {
    const { slug } = request.params as { slug: string };
    const { outcome, resolutionSource } = request.body as { outcome: 'YES' | 'NO'; resolutionSource?: string };

    if (!outcome || (outcome !== 'YES' && outcome !== 'NO')) {
      throw new AppError('INVALID_OUTCOME', 400, 'Valid outcome (YES or NO) is required');
    }

    const market = await prisma.market.findUnique({ where: { slug } });
    if (!market) {
      throw new AppError('MARKET_NOT_FOUND', 404, 'Market not found');
    }

    if (market.status === 'RESOLVED') {
      throw new AppError('ALREADY_RESOLVED', 400, 'Market already resolved');
    }

    // Update market
    await prisma.market.update({
      where: { id: market.id },
      data: {
        status: 'RESOLVED',
        outcome,
        resolveTime: new Date(),
        resolutionSource,
      },
    });

    // Settle positions
    try {
      await settlementService.settleMarket(market.id);
      fastify.log.info({ marketId: market.id, outcome }, 'Market settled successfully');
    } catch (error) {
      fastify.log.error({ marketId: market.id, error }, 'Settlement failed');
      throw new AppError('SETTLEMENT_FAILED', 500, 'Failed to settle market positions');
    }

    // Broadcast market resolution
    await redis.publish(CHANNELS.MARKETS, JSON.stringify({
      type: 'MARKET_RESOLVED',
      data: {
        marketId: market.id,
        slug: market.slug,
        outcome,
      },
    }));

    return { 
      message: 'Market resolved successfully',
      marketId: market.id,
      outcome,
    };
  });

  // System health check
  fastify.get('/health', { preHandler: [requireAuth, requireAdmin] }, async () => {
    const [marketCount, userCount, orderCount, tradeCount] = await Promise.all([
      prisma.market.count(),
      prisma.user.count(),
      prisma.order.count({ where: { status: { in: ['OPEN', 'PARTIAL'] } } }),
      prisma.trade.count(),
    ]);

    // Check Redis
    let redisStatus = 'connected';
    try {
      await redis.ping();
    } catch (error) {
      redisStatus = 'disconnected';
    }

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      redis: redisStatus,
      stats: {
        markets: marketCount,
        users: userCount,
        openOrders: orderCount,
        trades: tradeCount,
      },
    };
  });

  // Get system stats
  fastify.get('/stats', { preHandler: [requireAuth, requireAdmin] }, async () => {
    const [
      totalMarkets,
      openMarkets,
      totalUsers,
      totalTrades,
      totalVolume24h,
    ] = await Promise.all([
      prisma.market.count(),
      prisma.market.count({ where: { status: 'OPEN' } }),
      prisma.user.count(),
      prisma.trade.count(),
      prisma.market.aggregate({
        _sum: { volume24h: true },
      }),
    ]);

    return {
      markets: {
        total: totalMarkets,
        open: openMarkets,
      },
      users: {
        total: totalUsers,
      },
      trading: {
        totalTrades,
        volume24h: Number(totalVolume24h._sum.volume24h || 0),
      },
    };
  });

  // List all users (admin)
  fastify.get('/users', { preHandler: [requireAuth, requireAdmin] }, async (request) => {
    const { page = 1, pageSize = 50 } = request.query as any;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          handle: true,
          fullName: true,
          role: true,
          createdAt: true,
          balance: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      prisma.user.count(),
    ]);

    return {
      users: users.map(user => ({
        ...user,
        balance: user.balance ? {
          available: Number(user.balance.available),
          locked: Number(user.balance.locked),
          total: Number(user.balance.total),
        } : null,
      })),
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    };
  });

  // Update user role
  fastify.patch('/users/:userId/role', { preHandler: [requireAuth, requireAdmin] }, async (request) => {
    const { userId } = request.params as { userId: string };
    const { role } = request.body as { role: 'USER' | 'ADMIN' };

    if (!role || (role !== 'USER' && role !== 'ADMIN')) {
      throw new AppError('INVALID_ROLE', 400, 'Valid role (USER or ADMIN) is required');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return {
      message: 'User role updated',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  });
};

export default adminRoutes;
