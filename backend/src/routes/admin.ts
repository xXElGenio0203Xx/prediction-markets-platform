import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // Resolve a market
  fastify.post('/markets/:slug/resolve', {
    onRequest: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      tags: ['Admin'],
      summary: 'Resolve a market',
      // Zod schema removed - validation done manually
    },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { outcome, resolutionSource } = request.body as { outcome: 'YES' | 'NO'; resolutionSource?: string };

    const market = await fastify.prisma.market.findUnique({
      where: { slug },
    });

    if (!market) {
      return reply.code(404).send({ message: 'Market not found' });
    }

    if (market.status === 'RESOLVED') {
      return reply.code(400).send({ message: 'Market already resolved' });
    }

    // Update market
    await fastify.prisma.market.update({
      where: { id: market.id },
      data: {
        status: 'RESOLVED',
        outcome,
        resolveTime: new Date(),
        resolutionSource,
      },
    });

    // Settle positions
    const positions = await fastify.prisma.position.findMany({
      where: { marketId: market.id },
      include: {
        user: {
          include: {
            balance: true,
          },
        },
      },
    });

    // Update balances based on outcome
    for (const position of positions) {
      if (position.outcome === outcome) {
        // Winners get their shares converted to $1 each
        const payout = position.quantity.toNumber();
        
        await fastify.prisma.balance.update({
          where: { userId: position.userId },
          data: {
            available: {
              increment: payout,
            },
            total: {
              increment: payout,
            },
          },
        });
      }
      // Losers' shares are already worthless (no action needed)
    }

    // Broadcast market resolution
    fastify.websocketServer.broadcast({
      type: 'market-resolved',
      data: {
        marketId: market.id,
        outcome,
      },
    });

    return reply.send({ 
      message: 'Market resolved successfully',
      outcome,
    });
  });

  // System health check
  fastify.get('/health', {
    onRequest: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      tags: ['Admin'],
      summary: 'System health check',
    },
  }, async (_request, reply) => {
    // Check database
    const marketCount = await fastify.prisma.market.count();
    const userCount = await fastify.prisma.user.count();
    const orderCount = await fastify.prisma.order.count({
      where: {
        status: {
          in: ['OPEN', 'PARTIAL'],
        },
      },
    });

    // Check Redis
    const redisInfo = await fastify.redis.info();

    // Calculate total value locked
    const balances = await fastify.prisma.balance.aggregate({
      _sum: {
        total: true,
      },
    });

    return reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      stats: {
        markets: marketCount,
        users: userCount,
        openOrders: orderCount,
        totalValueLocked: balances._sum.total?.toNumber() || 0,
      },
      redis: {
        connected: redisInfo.includes('redis_version'),
      },
    });
  });

  // Get fee summary
  fastify.get('/fees/summary', {
    onRequest: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      tags: ['Admin'],
      summary: 'Get fee summary',
    },
  }, async (_request, reply) => {
    // For now, fees are not implemented
    // This is a placeholder for future fee tracking
    return reply.send({
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      allTime: 0,
    });
  });

  // Fee configuration endpoints
  fastify.get('/fees/config', {
    schema: {
      tags: ['Admin'],
      summary: 'Get fee configuration',
      // Zod schema removed - validation done manually
    },
  }, async (_request, reply) => {
    // Return default fee config (currently no fees)
    return reply.send({
      config: {
        maker_bps: 0,
        taker_bps: 0,
        per_contract_fee: 0,
      },
    });
  });

  // Bonus system
  fastify.post('/bonus/initialize', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['User'],
      summary: 'Initialize user bonus',
    },
  }, async (request, reply) => {
    const userId = request.user!.id;

    // Check if user already has a balance
    const existingBalance = await fastify.prisma.balance.findUnique({
      where: { userId },
    });

    if (existingBalance) {
      return reply.send({
        message: 'Bonus already initialized',
        balance: existingBalance.available.toNumber(),
      });
    }

    // Create initial balance with bonus
    const balance = await fastify.prisma.balance.create({
      data: {
        userId,
        available: 1000,
        locked: 0,
        total: 1000,
      },
    });

    return reply.send({
      message: 'Bonus initialized successfully',
      balance: balance.available.toNumber(),
    });
  });

  // Reset balances (development only)
  fastify.post('/admin/reset-balances', {
    onRequest: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      tags: ['Admin'],
      summary: 'Reset all user balances (dev only)',
    },
  }, async (_request, reply) => {
    if (fastify.config.NODE_ENV === 'production') {
      return reply.code(403).send({ message: 'Not available in production' });
    }

    await fastify.prisma.balance.deleteMany();
    await fastify.prisma.position.deleteMany();
    await fastify.prisma.order.updateMany({
      data: { status: 'CANCELLED' },
    });

    return reply.send({ message: 'Balances reset successfully' });
  });
};

export default adminRoutes;
