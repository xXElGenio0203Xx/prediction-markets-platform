// Simplified markets routes  
import { FastifyPluginAsync } from 'fastify';
import { AppError } from '../utils/errors.js';

// Helper to serialize market for API responses
function serializeMarket(market: any) {
  return {
    ...market,
    title: market.question,  // Map question → title for API
    imageUrl: market.imageUrl || null,
    resolutionSource: market.resolutionSource || null,
    yesPrice: Number(market.yesPrice),
    noPrice: Number(market.noPrice),
    yesShares: Number(market.yesShares),
    noShares: Number(market.noShares),
    volume24h: Number(market.volume24h),
    liquidity: Number(market.liquidity),
    createdAt: market.createdAt.toISOString(),
    updatedAt: market.updatedAt.toISOString(),
    closeTime: market.closeTime.toISOString(),
    resolveTime: market.resolveTime?.toISOString() || null,
  };
}

const marketsRoutes: FastifyPluginAsync = async (fastify) => {
  // List markets
  fastify.get('/', async (request) => {
    const { page = 1, pageSize = 20, status, category, featured } = request.query as any;
    
    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (featured !== undefined) where.featured = featured === 'true';

    const [markets, total] = await Promise.all([
      fastify.prisma.market.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { volume24h: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      fastify.prisma.market.count({ where }),
    ]);

    return {
      markets: markets.map(serializeMarket),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  });

  // Get single market
  fastify.get('/:slug', async (request) => {
    const { slug } = request.params as { slug: string };
    
    const market = await fastify.prisma.market.findUnique({ where: { slug } });
    if (!market) {
      throw new AppError('MARKET_NOT_FOUND', 404, 'Market not found');
    }

    return serializeMarket(market);
  });

  // Create market (admin)
  fastify.post('/', { preHandler: [fastify.authenticate, fastify.requireAdmin] }, async (request) => {
    const data = request.body as any;
    
    const market = await fastify.prisma.market.create({
      data: {
        ...data,
        question: data.question || data.title,  // Support both field names
        imageUrl: data.imageUrl || null,
        resolutionSource: data.resolutionSource || null,
        slug: (data.title || data.question).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        status: 'OPEN',
        yesPrice: 0.5,
        noPrice: 0.5,
        yesShares: 0,
        noShares: 0,
        volume24h: 0,
        liquidity: 0,
      },
    });

    return serializeMarket(market);
  });

  // Update market status (admin)
  fastify.patch('/:slug/status', { preHandler: [fastify.authenticate, fastify.requireAdmin] }, async (request) => {
    const { slug } = request.params as { slug: string };
    const { status, outcome } = request.body as any;

    const market = await fastify.prisma.market.findUnique({ where: { slug } });
    if (!market) {
      throw new AppError('MARKET_NOT_FOUND', 404, 'Market not found');
    }

    if (status === 'RESOLVED' && !outcome) {
      throw new AppError('MISSING_OUTCOME', 400, 'Outcome required for resolution');
    }

    const updated = await fastify.prisma.market.update({
      where: { slug },
      data: { status, outcome: outcome || null },
    });

    // TODO: If resolved, trigger settlement
    // if (status === 'RESOLVED' && outcome) {
    //   await settleMarket(market.id, outcome);
    // }

    return serializeMarket(updated);
  });
};

export default marketsRoutes;
