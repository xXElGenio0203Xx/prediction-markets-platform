import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const TimeRangeSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  period: z.enum(['24h', '7d', '30d', 'all']).optional(),
});

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================
  // USER ANALYTICS
  // ============================================

  /**
   * Get user portfolio analytics
   * Returns: Total P&L, win rate, average return, best/worst markets, diversification, Sharpe ratio
   */
  fastify.get('/portfolio', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Analytics'],
      summary: 'Get portfolio analytics',
      // Zod schema removed,
    },
  }, async (request, reply) => {
    const userId = request.user!.id;
    const { period = '30d' } = request.query as z.infer<typeof TimeRangeSchema>;

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'all':
        startDate.setFullYear(2020);
        break;
    }

    // Get all user trades
    const trades = await fastify.prisma.trade.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        createdAt: { gte: startDate },
      },
      include: {
        market: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get current positions
    const positions = await fastify.prisma.position.findMany({
      where: { userId },
      include: { market: true },
    });

    // Calculate P&L over time
    const plOverTime: Array<{ date: string; pl: number; cumulative: number }> = [];
    let cumulativePL = 0;

    // Group trades by day
    const tradesByDay = new Map<string, typeof trades>();
    for (const trade of trades) {
      const dateKey = trade.createdAt.toISOString().split('T')[0];
      if (!tradesByDay.has(dateKey)) {
        tradesByDay.set(dateKey, []);
      }
      tradesByDay.get(dateKey)!.push(trade);
    }

    // Calculate daily P&L
    for (const [date, dayTrades] of tradesByDay.entries()) {
      let dailyPL = 0;
      for (const trade of dayTrades) {
        if (trade.buyerId === userId) {
          dailyPL -= Number(trade.price) * Number(trade.quantity);
        }
        if (trade.sellerId === userId) {
          dailyPL += Number(trade.price) * Number(trade.quantity);
        }
      }
      cumulativePL += dailyPL;
      plOverTime.push({ date, pl: dailyPL, cumulative: cumulativePL });
    }

    // Add unrealized P&L from current positions
    let unrealizedPL = 0;
    for (const position of positions) {
      const currentPrice = position.outcome === 'YES'
        ? Number(position.market.yesPrice)
        : Number(position.market.noPrice);
      const costBasis = Number(position.averagePrice) * Number(position.quantity);
      const currentValue = currentPrice * Number(position.quantity);
      unrealizedPL += (currentValue - costBasis);
    }

    const totalPL = cumulativePL + unrealizedPL;

    // Calculate win rate (markets where profit > 0)
    const marketPLs = new Map<string, number>();
    for (const trade of trades) {
      const marketId = trade.marketId;
      if (!marketPLs.has(marketId)) {
        marketPLs.set(marketId, 0);
      }
      const pl = trade.buyerId === userId
        ? -Number(trade.price) * Number(trade.quantity)
        : Number(trade.price) * Number(trade.quantity);
      marketPLs.set(marketId, marketPLs.get(marketId)! + pl);
    }

    const resolvedMarkets = [...marketPLs.entries()].filter(([marketId]) => {
      const market = trades.find(t => t.marketId === marketId)?.market;
      return market?.status === 'RESOLVED';
    });

    const wins = resolvedMarkets.filter(([_, pl]) => pl > 0).length;
    const winRate = resolvedMarkets.length > 0 ? (wins / resolvedMarkets.length) * 100 : 0;

    // Average return per trade
    const totalTrades = trades.length;
    const avgReturn = totalTrades > 0 ? totalPL / totalTrades : 0;

    // Best and worst performing markets
    const marketPerformance = [...marketPLs.entries()].map(([marketId, pl]) => {
      const market = trades.find(t => t.marketId === marketId)?.market;
      return {
        marketId,
        marketName: market?.question || 'Unknown',
        pl,
        trades: trades.filter(t => t.marketId === marketId).length,
      };
    }).sort((a, b) => b.pl - a.pl);

    const bestMarkets = marketPerformance.slice(0, 5);
    const worstMarkets = marketPerformance.slice(-5).reverse();

    // Diversification score (based on position concentration)
    const totalPositionValue = positions.reduce((sum, pos) => {
      const price = pos.outcome === 'YES'
        ? Number(pos.market.yesPrice)
        : Number(pos.market.noPrice);
      return sum + (price * Number(pos.quantity));
    }, 0);

    const positionConcentrations = positions.map(pos => {
      const price = pos.outcome === 'YES'
        ? Number(pos.market.yesPrice)
        : Number(pos.market.noPrice);
      const value = price * Number(pos.quantity);
      return totalPositionValue > 0 ? value / totalPositionValue : 0;
    });

    // Herfindahl index (0 = perfect diversification, 1 = concentrated)
    const herfindahlIndex = positionConcentrations.reduce((sum, conc) => sum + (conc * conc), 0);
    const diversificationScore = Math.max(0, 100 * (1 - herfindahlIndex));

    // Sharpe ratio (simplified: return / volatility)
    const returns = plOverTime.map(d => d.pl);
    const avgDailyReturn = returns.length > 0
      ? returns.reduce((sum, r) => sum + r, 0) / returns.length
      : 0;
    const variance = returns.length > 1
      ? returns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / (returns.length - 1)
      : 0;
    const volatility = Math.sqrt(variance);
    const sharpeRatio = volatility > 0 ? (avgDailyReturn / volatility) * Math.sqrt(252) : 0; // Annualized

    return reply.send({
      totalPL,
      realizedPL: cumulativePL,
      unrealizedPL,
      plOverTime,
      winRate,
      totalTrades,
      avgReturn,
      bestMarkets,
      worstMarkets,
      diversificationScore,
      sharpeRatio,
      activePositions: positions.length,
    });
  });

  /**
   * Get market analytics
   * Returns: Order book heatmap, trade flow, bid-ask spread, volume profile, liquidity depth, probability over time
   */
  fastify.get('/market/:slug', {
    schema: {
      tags: ['Analytics'],
      summary: 'Get market analytics',
      // Zod schemas removed - validation done manually,
      // Zod schema removed,
    },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { period = '7d' } = request.query as z.infer<typeof TimeRangeSchema>;

    const market = await fastify.prisma.market.findUnique({
      where: { slug },
    });

    if (!market) {
      return reply.code(404).send({ message: 'Market not found' });
    }

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'all':
        startDate.setFullYear(2020);
        break;
    }

    // Get current orderbook
    const orders = await fastify.prisma.order.findMany({
      where: {
        marketId: market.id,
        status: { in: ['OPEN', 'PARTIAL'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Order book heatmap (price levels with quantities)
    const orderBookHeatmap = {
      YES: {
        bids: [] as Array<{ price: number; quantity: number; orders: number }>,
        asks: [] as Array<{ price: number; quantity: number; orders: number }>,
      },
      NO: {
        bids: [] as Array<{ price: number; quantity: number; orders: number }>,
        asks: [] as Array<{ price: number; quantity: number; orders: number }>,
      },
    };

    // Aggregate by outcome and side
    const aggregateOrders = (outcome: 'YES' | 'NO', side: 'BUY' | 'SELL') => {
      const filtered = orders.filter(o => o.outcome === outcome && o.side === side);
      const priceMap = new Map<number, { quantity: number; orders: number }>();

      for (const order of filtered) {
        const price = Number(order.price);
        const qty = Number(order.quantity) - Number(order.filled);
        const existing = priceMap.get(price) || { quantity: 0, orders: 0 };
        priceMap.set(price, {
          quantity: existing.quantity + qty,
          orders: existing.orders + 1,
        });
      }

      return Array.from(priceMap.entries())
        .map(([price, data]) => ({ price, ...data }))
        .sort((a, b) => side === 'BUY' ? b.price - a.price : a.price - b.price);
    };

    orderBookHeatmap.YES.bids = aggregateOrders('YES', 'BUY');
    orderBookHeatmap.YES.asks = aggregateOrders('YES', 'SELL');
    orderBookHeatmap.NO.bids = aggregateOrders('NO', 'BUY');
    orderBookHeatmap.NO.asks = aggregateOrders('NO', 'SELL');

    // Recent trade flow
    const trades = await fastify.prisma.trade.findMany({
      where: {
        marketId: market.id,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const tradeFlow = trades.map(t => ({
      timestamp: t.createdAt,
      outcome: t.outcome,
      price: Number(t.price),
      quantity: Number(t.quantity),
      value: Number(t.price) * Number(t.quantity),
    }));

    // Bid-ask spread over time (sampled every hour)
    const spreadOverTime: Array<{ timestamp: string; yesSpread: number; noSpread: number }> = [];
    const hourlyBuckets = new Map<string, typeof orders>();

    for (const order of orders) {
      const hourKey = new Date(order.createdAt).toISOString().slice(0, 13) + ':00:00.000Z';
      if (!hourlyBuckets.has(hourKey)) {
        hourlyBuckets.set(hourKey, []);
      }
      hourlyBuckets.get(hourKey)!.push(order);
    }

    for (const [timestamp, hourOrders] of hourlyBuckets.entries()) {
      const yesBids = hourOrders.filter(o => o.outcome === 'YES' && o.side === 'BUY')
        .map(o => Number(o.price));
      const yesAsks = hourOrders.filter(o => o.outcome === 'YES' && o.side === 'SELL')
        .map(o => Number(o.price));
      const noBids = hourOrders.filter(o => o.outcome === 'NO' && o.side === 'BUY')
        .map(o => Number(o.price));
      const noAsks = hourOrders.filter(o => o.outcome === 'NO' && o.side === 'SELL')
        .map(o => Number(o.price));

      const yesBest = yesBids.length > 0 ? Math.max(...yesBids) : 0;
      const yesAsk = yesAsks.length > 0 ? Math.min(...yesAsks) : 1;
      const noBest = noBids.length > 0 ? Math.max(...noBids) : 0;
      const noAsk = noAsks.length > 0 ? Math.min(...noAsks) : 1;

      spreadOverTime.push({
        timestamp,
        yesSpread: yesAsk - yesBest,
        noSpread: noAsk - noBest,
      });
    }

    // Volume profile (trades by price level)
    const volumeProfile: Array<{ price: number; volume: number; trades: number }> = [];
    const volumeMap = new Map<number, { volume: number; trades: number }>();

    for (const trade of trades) {
      const price = Math.round(Number(trade.price) * 100) / 100; // Round to 2 decimals
      const existing = volumeMap.get(price) || { volume: 0, trades: 0 };
      volumeMap.set(price, {
        volume: existing.volume + Number(trade.quantity),
        trades: existing.trades + 1,
      });
    }

    for (const [price, data] of volumeMap.entries()) {
      volumeProfile.push({ price, ...data });
    }
    volumeProfile.sort((a, b) => a.price - b.price);

    // Liquidity depth chart (cumulative quantities at each price)
    const liquidityDepth = {
      YES: {
        bids: orderBookHeatmap.YES.bids.map((level, idx, arr) => ({
          price: level.price,
          cumulative: arr.slice(0, idx + 1).reduce((sum, l) => sum + l.quantity, 0),
        })),
        asks: orderBookHeatmap.YES.asks.map((level, idx, arr) => ({
          price: level.price,
          cumulative: arr.slice(0, idx + 1).reduce((sum, l) => sum + l.quantity, 0),
        })),
      },
      NO: {
        bids: orderBookHeatmap.NO.bids.map((level, idx, arr) => ({
          price: level.price,
          cumulative: arr.slice(0, idx + 1).reduce((sum, l) => sum + l.quantity, 0),
        })),
        asks: orderBookHeatmap.NO.asks.map((level, idx, arr) => ({
          price: level.price,
          cumulative: arr.slice(0, idx + 1).reduce((sum, l) => sum + l.quantity, 0),
        })),
      },
    };

    // Implied probability over time (from trade prices)
    const probabilityOverTime: Array<{ timestamp: string; yesProb: number; noProb: number }> = [];
    const dailyBuckets = new Map<string, typeof trades>();

    for (const trade of trades) {
      const dateKey = trade.createdAt.toISOString().split('T')[0];
      if (!dailyBuckets.has(dateKey)) {
        dailyBuckets.set(dateKey, []);
      }
      dailyBuckets.get(dateKey)!.push(trade);
    }

    for (const [timestamp, dayTrades] of dailyBuckets.entries()) {
      const yesTrades = dayTrades.filter(t => t.outcome === 'YES');
      const noTrades = dayTrades.filter(t => t.outcome === 'NO');

      const yesAvg = yesTrades.length > 0
        ? yesTrades.reduce((sum, t) => sum + Number(t.price), 0) / yesTrades.length
        : Number(market.yesPrice);

      const noAvg = noTrades.length > 0
        ? noTrades.reduce((sum, t) => sum + Number(t.price), 0) / noTrades.length
        : Number(market.noPrice);

      probabilityOverTime.push({
        timestamp,
        yesProb: yesAvg * 100,
        noProb: noAvg * 100,
      });
    }

    return reply.send({
      market: {
        id: market.id,
        slug: market.slug,
        question: market.question,
        status: market.status,
      },
      orderBookHeatmap,
      tradeFlow,
      spreadOverTime,
      volumeProfile,
      liquidityDepth,
      probabilityOverTime,
      currentSpread: {
        yes: orderBookHeatmap.YES.asks[0]?.price - orderBookHeatmap.YES.bids[0]?.price || 0,
        no: orderBookHeatmap.NO.asks[0]?.price - orderBookHeatmap.NO.bids[0]?.price || 0,
      },
      totalVolume: trades.reduce((sum, t) => sum + Number(t.quantity), 0),
      totalTrades: trades.length,
    });
  });

  /**
   * Get trade history with filters
   * Returns: Filterable trade log with P&L attribution and fees
   */
  fastify.get('/trades', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Analytics'],
      summary: 'Get trade history',
      // Zod schema removed - validation done manually
    },
  }, async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as {
      marketId?: string;
      outcome?: 'YES' | 'NO';
      side?: 'BUY' | 'SELL';
      start?: string;
      end?: string;
      limit?: number;
      offset?: number;
    };

    const where: any = {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    };

    if (query.marketId) where.marketId = query.marketId;
    if (query.outcome) where.outcome = query.outcome;
    if (query.start || query.end) {
      where.createdAt = {};
      if (query.start) where.createdAt.gte = new Date(query.start);
      if (query.end) where.createdAt.lte = new Date(query.end);
    }

    const trades = await fastify.prisma.trade.findMany({
      where,
      include: {
        market: true,
        buyOrder: true,
        sellOrder: true,
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit || 50,
      skip: query.offset || 0,
    });

    const total = await fastify.prisma.trade.count({ where });

    // Calculate P&L and fees for each trade
    const tradesWithPL = trades.map(trade => {
      const isBuyer = trade.buyerId === userId;
      const side = isBuyer ? 'BUY' : 'SELL';

      // Filter by side if specified
      if (query.side && side !== query.side) {
        return null;
      }

      const price = Number(trade.price);
      const quantity = Number(trade.quantity);
      const value = price * quantity;

      // Calculate P&L (simplified - actual P&L depends on exit)
      let pl = 0;
      if (trade.market.status === 'RESOLVED') {
        const won = trade.market.outcome === trade.outcome;
        if (isBuyer) {
          pl = won ? quantity - value : -value;
        } else {
          pl = won ? 0 : value;
        }
      }

      // Fee calculation (0.5% for simplicity)
      const fee = value * 0.005;

      return {
        id: trade.id,
        timestamp: trade.createdAt,
        market: {
          id: trade.market.id,
          slug: trade.market.slug,
          question: trade.market.question,
        },
        outcome: trade.outcome,
        side,
        price,
        quantity,
        value,
        fee,
        pl,
        plPercentage: value > 0 ? (pl / value) * 100 : 0,
      };
    }).filter(Boolean);

    // Calculate summary
    const totalValue = tradesWithPL.reduce((sum, t) => sum + (t?.value || 0), 0);
    const totalFees = tradesWithPL.reduce((sum, t) => sum + (t?.fee || 0), 0);
    const totalPL = tradesWithPL.reduce((sum, t) => sum + (t?.pl || 0), 0);

    return reply.send({
      trades: tradesWithPL,
      pagination: {
        total,
        limit: query.limit || 50,
        offset: query.offset || 0,
      },
      summary: {
        totalTrades: tradesWithPL.length,
        totalValue,
        totalFees,
        totalPL,
        avgTradeSize: tradesWithPL.length > 0 ? totalValue / tradesWithPL.length : 0,
      },
    });
  });

  /**
   * Export trades to CSV
   */
  fastify.get('/trades/export', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Analytics'],
      summary: 'Export trades to CSV',
    },
  }, async (request, reply) => {
    const userId = request.user!.id;

    const trades = await fastify.prisma.trade.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: { market: true },
      orderBy: { createdAt: 'desc' },
    });

    // Generate CSV
    const headers = ['Date', 'Market', 'Outcome', 'Side', 'Price', 'Quantity', 'Value', 'Fee', 'P&L'];
    const rows = trades.map(trade => {
      const isBuyer = trade.buyerId === userId;
      const side = isBuyer ? 'BUY' : 'SELL';
      const price = Number(trade.price);
      const quantity = Number(trade.quantity);
      const value = price * quantity;
      const fee = value * 0.005;

      let pl = 0;
      if (trade.market.status === 'RESOLVED') {
        const won = trade.market.outcome === trade.outcome;
        pl = isBuyer ? (won ? quantity - value : -value) : (won ? 0 : value);
      }

      return [
        trade.createdAt.toISOString(),
        `"${trade.market.question}"`,
        trade.outcome,
        side,
        price,
        quantity,
        value,
        fee,
        pl,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="trades.csv"');
    return reply.send(csv);
  });

  // ============================================
  // ADMIN ANALYTICS
  // ============================================

  /**
   * Get platform metrics
   * Returns: Volume, active users, market stats, liquidity metrics
   */
  fastify.get('/admin/platform', {
    onRequest: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      tags: ['Analytics', 'Admin'],
      summary: 'Get platform metrics',
      // Zod schema removed,
    },
  }, async (request, reply) => {
    const { period = '30d' } = request.query as z.infer<typeof TimeRangeSchema>;

    // Calculate date ranges
    const now = new Date();
    const ranges = {
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      'all': new Date(2020, 0, 1),
    };

    // Total volume metrics
    const volumeMetrics = await Promise.all(
      Object.entries(ranges).map(async ([key, date]) => {
        const trades = await fastify.prisma.trade.findMany({
          where: { createdAt: { gte: date } },
        });
        const volume = trades.reduce((sum, t) => sum + Number(t.price) * Number(t.quantity), 0);
        return [key, volume];
      })
    );

    const volume = Object.fromEntries(volumeMetrics);

    // Active users (DAU/MAU)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = ranges['30d'];

    const [dauTrades, mauTrades] = await Promise.all([
      fastify.prisma.trade.findMany({
        where: { createdAt: { gte: oneDayAgo } },
        select: { buyerId: true, sellerId: true },
      }),
      fastify.prisma.trade.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { buyerId: true, sellerId: true },
      }),
    ]);

    const dau = new Set([...dauTrades.map(t => t.buyerId), ...dauTrades.map(t => t.sellerId)]).size;
    const mau = new Set([...mauTrades.map(t => t.buyerId), ...mauTrades.map(t => t.sellerId)]).size;

    // Market creation rate
    const marketsCreated = await fastify.prisma.market.groupBy({
      by: ['status'],
      _count: true,
      where: {
        createdAt: { gte: ranges[period] },
      },
    });

    const totalMarkets = marketsCreated.reduce((sum, m) => sum + m._count, 0);
    const resolvedMarkets = marketsCreated.find(m => m.status === 'RESOLVED')?._count || 0;

    // Resolution accuracy (markets resolved vs total)
    const allMarkets = await fastify.prisma.market.count();
    const allResolved = await fastify.prisma.market.count({
      where: { status: 'RESOLVED' },
    });
    const resolutionRate = allMarkets > 0 ? (allResolved / allMarkets) * 100 : 0;

    // Average time to resolution
    const resolvedWithTimes = await fastify.prisma.market.findMany({
      where: {
        status: 'RESOLVED',
        resolveTime: { not: null },
      },
      select: {
        closeTime: true,
        resolveTime: true,
      },
    });

    const avgResolutionTime = resolvedWithTimes.length > 0
      ? resolvedWithTimes.reduce((sum, m) => {
          const closeTime = m.closeTime.getTime();
          const resolveTime = m.resolveTime!.getTime();
          return sum + (resolveTime - closeTime);
        }, 0) / resolvedWithTimes.length
      : 0;

    const avgResolutionHours = avgResolutionTime / (1000 * 60 * 60);

    // Liquidity metrics
    const openOrders = await fastify.prisma.order.findMany({
      where: { status: { in: ['OPEN', 'PARTIAL'] } },
    });

    const totalLiquidity = openOrders.reduce((sum, o) => {
      const remaining = Number(o.quantity) - Number(o.filled);
      return sum + (Number(o.price) * remaining);
    }, 0);

    const avgLiquidityPerMarket = allMarkets > 0 ? totalLiquidity / allMarkets : 0;

    // Markets by liquidity tier
    const marketLiquidity = await fastify.prisma.market.findMany({
      select: {
        id: true,
        liquidity: true,
      },
    });

    const liquidityTiers = {
      low: marketLiquidity.filter(m => Number(m.liquidity) < 100).length,
      medium: marketLiquidity.filter(m => Number(m.liquidity) >= 100 && Number(m.liquidity) < 1000).length,
      high: marketLiquidity.filter(m => Number(m.liquidity) >= 1000).length,
    };

    // Trading activity over time
    const tradesOverTime = await fastify.prisma.trade.findMany({
      where: { createdAt: { gte: ranges[period] } },
      orderBy: { createdAt: 'asc' },
    });

    const dailyActivity = new Map<string, { trades: number; volume: number; users: Set<string> }>();
    for (const trade of tradesOverTime) {
      const date = trade.createdAt.toISOString().split('T')[0];
      if (!dailyActivity.has(date)) {
        dailyActivity.set(date, { trades: 0, volume: 0, users: new Set() });
      }
      const day = dailyActivity.get(date)!;
      day.trades += 1;
      day.volume += Number(trade.price) * Number(trade.quantity);
      day.users.add(trade.buyerId);
      day.users.add(trade.sellerId);
    }

    const activityTimeseries = Array.from(dailyActivity.entries()).map(([date, data]) => ({
      date,
      trades: data.trades,
      volume: data.volume,
      activeUsers: data.users.size,
    }));

    return reply.send({
      volume,
      activeUsers: {
        dau,
        mau,
        dauMauRatio: mau > 0 ? (dau / mau) * 100 : 0,
      },
      markets: {
        total: allMarkets,
        created: totalMarkets,
        resolved: resolvedMarkets,
        open: allMarkets - allResolved,
        resolutionRate,
        avgResolutionHours,
      },
      liquidity: {
        total: totalLiquidity,
        avgPerMarket: avgLiquidityPerMarket,
        tiers: liquidityTiers,
      },
      activity: activityTimeseries,
    });
  });
};

export default analyticsRoutes;
