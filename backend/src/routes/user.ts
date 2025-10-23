import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const userRoutes: FastifyPluginAsync = async (fastify) => {
  // Get user balance
  fastify.get('/balance', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['User'],
      summary: 'Get user balance',
    },
  }, async (request, reply) => {
    const userId = request.user!.id;

    let balance = await fastify.prisma.balance.findUnique({
      where: { userId },
    });

    // Create balance if it doesn't exist
    if (!balance) {
      balance = await fastify.prisma.balance.create({
        data: {
          userId,
          available: 1000, // Starting bonus
          locked: 0,
          total: 1000,
        },
      });
    }

    return reply.send({
      balance: {
        available: balance.available.toNumber(),
        locked: balance.locked.toNumber(),
        total: balance.total.toNumber(),
      },
    });
  });

  // Get user positions
  fastify.get('/positions', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['User'],
      summary: 'Get user positions',
    },
  }, async (request, reply) => {
    const userId = request.user!.id;

    const positions = await fastify.prisma.position.findMany({
      where: { userId },
      include: {
        market: {
          select: {
            id: true,
            slug: true,
            question: true,
            imageUrl: true,
            status: true,
            yesPrice: true,
            noPrice: true,
            outcome: true,
          },
        },
      },
    });

    // Calculate position values
    const enrichedPositions = positions.map(position => {
      const currentPrice = position.outcome === 'YES' 
        ? position.market.yesPrice.toNumber()
        : position.market.noPrice.toNumber();
      
      const quantity = position.quantity.toNumber();
      const avgPrice = position.averagePrice.toNumber();
      const currentValue = quantity * currentPrice;
      const costBasis = quantity * avgPrice;
      const profitLoss = currentValue - costBasis;
      const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

      return {
        ...position,
        quantity: quantity,
        averagePrice: avgPrice,
        currentPrice,
        currentValue,
        costBasis,
        profitLoss,
        profitLossPercent,
      };
    });

    return reply.send({ positions: enrichedPositions });
  });

  // Get user portfolio summary
  fastify.get('/portfolio', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['User'],
      summary: 'Get user portfolio summary',
    },
  }, async (request, reply) => {
    const userId = request.user!.id;

    // Get balance
    const balance = await fastify.prisma.balance.findUnique({
      where: { userId },
    });

    // Get positions
    const positions = await fastify.prisma.position.findMany({
      where: { userId },
      include: {
        market: true,
      },
    });

    // Calculate portfolio metrics
    let totalValue = balance ? balance.available.toNumber() : 0;
    let totalCostBasis = 0;
    let openPositionsCount = 0;
    let totalProfitLoss = 0;

    positions.forEach(position => {
      const currentPrice = position.outcome === 'YES'
        ? position.market.yesPrice.toNumber()
        : position.market.noPrice.toNumber();
      
      const quantity = position.quantity.toNumber();
      const avgPrice = position.averagePrice.toNumber();
      const positionValue = quantity * currentPrice;
      const costBasis = quantity * avgPrice;
      
      totalValue += positionValue;
      totalCostBasis += costBasis;
      totalProfitLoss += (positionValue - costBasis);
      
      if (position.market.status === 'OPEN') {
        openPositionsCount++;
      }
    });

    // Get recent trades
    const recentTrades = await fastify.prisma.trade.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        market: {
          select: {
            slug: true,
            question: true,
          },
        },
      },
    });

    return reply.send({
      portfolio: {
        totalValue,
        cashBalance: balance ? balance.available.toNumber() : 0,
        totalProfitLoss,
        totalProfitLossPercent: totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0,
        openPositionsCount,
        totalPositions: positions.length,
        recentTrades: recentTrades.map(trade => ({
          ...trade,
          price: trade.price.toNumber(),
          quantity: trade.quantity.toNumber(),
        })),
      },
    });
  });

  // Get leaderboard
  fastify.get('/leaderboard', {
    schema: {
      tags: ['User'],
      summary: 'Get leaderboard',
      // Zod schemas removed - validation done manually
    },
  }, async (request, reply) => {
    const { limit } = request.query as { limit: number };

    // Get all users with balances and calculate portfolio values
    const users = await fastify.prisma.user.findMany({
      include: {
        balance: true,
        positions: {
          include: {
            market: true,
          },
        },
      },
    });

    const leaderboard = users.map(user => {
      let portfolioValue = user.balance ? user.balance.total.toNumber() : 0;
      
      // Add position values
      user.positions.forEach(position => {
        const currentPrice = position.outcome === 'YES'
          ? position.market.yesPrice.toNumber()
          : position.market.noPrice.toNumber();
        portfolioValue += position.quantity.toNumber() * currentPrice;
      });

      return {
        userId: user.id,
        handle: user.handle || user.email.split('@')[0],
        fullName: user.fullName,
        portfolioValue,
        totalPositions: user.positions.length,
      };
    })
    .sort((a, b) => b.portfolioValue - a.portfolioValue)
    .slice(0, limit);

    return reply.send({ leaderboard });
  });
};

export default userRoutes;
