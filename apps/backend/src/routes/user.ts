import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const userRoutes: FastifyPluginAsync = async (fastify) => {
  // Get user balance
  fastify.get('/balance', { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user!.id;

    let balance = await prisma.balance.findUnique({ where: { userId } });

    // Create balance if it doesn't exist
    if (!balance) {
      balance = await prisma.balance.create({
        data: {
          userId,
          available: 100,
          locked: 0,
          total: 100,
        },
      });
    }

    return {
      balance: {
        available: Number(balance.available),
        locked: Number(balance.locked),
        total: Number(balance.total),
      },
    };
  });

  // Get user positions
  fastify.get('/positions', { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user!.id;

    const positions = await prisma.position.findMany({
      where: { userId },
      include: {
        market: true,
      },
    });

    // Calculate position values
    const enrichedPositions = positions.map(position => {
      const currentPrice = position.outcome === 'YES' 
        ? Number(position.market.yesPrice)
        : Number(position.market.noPrice);
      
      const quantity = Number(position.quantity);
      const avgPrice = Number(position.averagePrice);
      const currentValue = quantity * currentPrice;
      const costBasis = quantity * avgPrice;
      const profitLoss = currentValue - costBasis;
      const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

      return {
        id: position.id,
        userId: position.userId,
        marketId: position.marketId,
        outcome: position.outcome,
        quantity,
        averagePrice: avgPrice,
        currentPrice,
        currentValue,
        costBasis,
        profitLoss,
        profitLossPercent,
        market: {
          id: position.market.id,
          slug: position.market.slug,
          question: position.market.question,
          status: position.market.status,
          outcome: position.market.outcome,
        },
        updatedAt: position.updatedAt,
      };
    });

    return { positions: enrichedPositions };
  });

  // Get user portfolio summary
  fastify.get('/portfolio', { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user!.id;

    // Get balance
    const balance = await prisma.balance.findUnique({ where: { userId } });

    // Get positions
    const positions = await prisma.position.findMany({
      where: { userId },
      include: { market: true },
    });

    // Calculate portfolio metrics
    let totalValue = balance ? Number(balance.available) : 0;
    let totalCostBasis = 0;
    let openPositionsCount = 0;
    let totalProfitLoss = 0;

    positions.forEach(position => {
      const currentPrice = position.outcome === 'YES'
        ? Number(position.market.yesPrice)
        : Number(position.market.noPrice);
      
      const quantity = Number(position.quantity);
      const avgPrice = Number(position.averagePrice);
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
    const recentTrades = await prisma.trade.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
        ],
      },
      include: { market: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const portfolioReturn = totalCostBasis > 0 
      ? (totalProfitLoss / totalCostBasis) * 100 
      : 0;

    return {
      summary: {
        totalValue,
        totalCostBasis,
        totalProfitLoss,
        portfolioReturn,
        openPositionsCount,
        totalPositionsCount: positions.length,
        availableBalance: balance ? Number(balance.available) : 0,
        lockedBalance: balance ? Number(balance.locked) : 0,
      },
      recentTrades: recentTrades.map(trade => ({
        id: trade.id,
        marketId: trade.marketId,
        marketSlug: trade.market.slug,
        marketQuestion: trade.market.question,
        outcome: trade.outcome,
        price: Number(trade.price),
        quantity: Number(trade.quantity),
        isBuyer: trade.buyerId === userId,
        createdAt: trade.createdAt,
      })),
    };
  });

  // Get user trade history
  fastify.get('/trades', { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user!.id;
    const { page = 1, pageSize = 50 } = request.query as any;

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where: {
          OR: [
            { buyerId: userId },
            { sellerId: userId },
          ],
        },
        include: { market: true },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      prisma.trade.count({
        where: {
          OR: [
            { buyerId: userId },
            { sellerId: userId },
          ],
        },
      }),
    ]);

    return {
      trades: trades.map(trade => ({
        id: trade.id,
        marketId: trade.marketId,
        marketSlug: trade.market.slug,
        marketQuestion: trade.market.question,
        outcome: trade.outcome,
        price: Number(trade.price),
        quantity: Number(trade.quantity),
        side: trade.buyerId === userId ? 'BUY' : 'SELL',
        createdAt: trade.createdAt,
      })),
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    };
  });

  // Get leaderboard
  fastify.get('/leaderboard', async (request) => {
    const { limit = 50 } = request.query as any;

    // Get all users with their portfolio stats
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        balance: true,
        positions: {
          include: {
            market: true,
          },
        },
        trades: {
          select: {
            id: true,
            buyerId: true,
            quantity: true,
            price: true,
          },
        },
      },
    });

    // Calculate portfolio value for each user
    const leaderboardData = users.map(user => {
      const availableBalance = user.balance ? Number(user.balance.available) : 0;
      let totalPositionValue = 0;
      let totalProfitLoss = 0;

      user.positions.forEach(position => {
        const currentPrice = position.outcome === 'YES'
          ? Number(position.market.yesPrice)
          : Number(position.market.noPrice);
        
        const quantity = Number(position.quantity);
        const avgPrice = Number(position.averagePrice);
        const positionValue = quantity * currentPrice;
        const costBasis = quantity * avgPrice;
        
        totalPositionValue += positionValue;
        totalProfitLoss += (positionValue - costBasis);
      });

      const totalValue = availableBalance + totalPositionValue;
      const totalTrades = user.trades.length;
      const portfolioReturn = totalValue > 0 ? ((totalValue - 1000) / 1000) * 100 : 0;

      return {
        user_id: user.id,
        email: user.email,
        full_name: user.fullName || user.email.split('@')[0],
        portfolio_value: totalValue,
        profit_loss: totalProfitLoss,
        total_return: portfolioReturn,
        total_trades: totalTrades,
        active_positions: user.positions.length,
      };
    });

    // Sort by total value descending and take top N
    leaderboardData.sort((a, b) => b.portfolio_value - a.portfolio_value);
    const topUsers = leaderboardData.slice(0, Number(limit));

    // Add rank to each user
    const rankedLeaderboard = topUsers.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    return {
      leaderboard: rankedLeaderboard,
      totalUsers: users.length,
      updatedAt: new Date().toISOString(),
    };
  });
};

export default userRoutes;
