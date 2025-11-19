import { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { prisma } from '../lib/prisma.js';
import { SettlementService } from '../settlement/settlement.js';

// Helper to serialize market for API responses
function serializeMarket(market: any) {
  return {
    id: market.id,
    slug: market.slug,
    title: market.question || market.title,
    description: market.description,
    category: market.category,
    imageUrl: market.imageUrl || null,
    status: market.status,
    outcome: market.outcome,
    featured: market.featured,
    yesPrice: Number(market.yesPrice),
    noPrice: Number(market.noPrice),
    yesShares: Number(market.yesShares),
    noShares: Number(market.noShares),
    volume24h: Number(market.volume24h),
    liquidity: Number(market.liquidity),
    closeTime: market.closeTime.toISOString(),
    resolveTime: market.resolveTime?.toISOString() || null,
    resolutionSource: market.resolutionSource || null,
    createdAt: market.createdAt.toISOString(),
    updatedAt: market.updatedAt.toISOString(),
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
      prisma.market.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { volume24h: 'desc' }],
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      prisma.market.count({ where }),
    ]);

    return {
      markets: markets.map(serializeMarket),
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    };
  });

  // Get single market
  fastify.get('/:slug', async (request) => {
    const { slug } = request.params as { slug: string };
    
    const market = await prisma.market.findUnique({ where: { slug } });
    if (!market) {
      throw new AppError('MARKET_NOT_FOUND', 404, 'Market not found');
    }

    return serializeMarket(market);
  });

  // Get market by ID
  fastify.get('/id/:id', async (request) => {
    const { id } = request.params as { id: string };
    
    const market = await prisma.market.findUnique({ where: { id } });
    if (!market) {
      throw new AppError('MARKET_NOT_FOUND', 404, 'Market not found');
    }

    return serializeMarket(market);
  });

  // Create market (admin)
  fastify.post('/', { preHandler: [requireAuth, requireAdmin] }, async (request) => {
    const data = request.body as any;
    
    if (!data.question && !data.title) {
      throw new AppError('MISSING_TITLE', 400, 'Market title/question is required');
    }

    const title = data.title || data.question;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Check if slug exists
    const existing = await prisma.market.findUnique({ where: { slug } });
    if (existing) {
      throw new AppError('SLUG_EXISTS', 409, 'Market with this title already exists');
    }

    const market = await prisma.market.create({
      data: {
        question: title,
        slug,
        description: data.description || null,
        category: data.category || null,
        imageUrl: data.imageUrl || null,
        resolutionSource: data.resolutionSource || null,
        status: 'OPEN',
        featured: data.featured || false,
        yesPrice: 0.5,
        noPrice: 0.5,
        yesShares: 0,
        noShares: 0,
        volume24h: 0,
        liquidity: 0,
        closeTime: data.closeTime ? new Date(data.closeTime) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        creatorId: request.user!.id,
      },
    });

    return serializeMarket(market);
  });

  // Update market (admin)
  fastify.patch('/:slug', { preHandler: [requireAuth, requireAdmin] }, async (request) => {
    const { slug } = request.params as { slug: string };
    const data = request.body as any;

    const market = await prisma.market.findUnique({ where: { slug } });
    if (!market) {
      throw new AppError('MARKET_NOT_FOUND', 404, 'Market not found');
    }

    const updated = await prisma.market.update({
      where: { slug },
      data: {
        question: data.title || data.question || undefined,
        description: data.description !== undefined ? data.description : undefined,
        category: data.category !== undefined ? data.category : undefined,
        imageUrl: data.imageUrl !== undefined ? data.imageUrl : undefined,
        featured: data.featured !== undefined ? data.featured : undefined,
        closeTime: data.closeTime ? new Date(data.closeTime) : undefined,
      },
    });

    return serializeMarket(updated);
  });

  // Update market status (admin)
  fastify.patch('/:slug/status', { preHandler: [requireAuth, requireAdmin] }, async (request) => {
    const { slug } = request.params as { slug: string };
    const { status, outcome } = request.body as any;

    const market = await prisma.market.findUnique({ where: { slug } });
    if (!market) {
      throw new AppError('MARKET_NOT_FOUND', 404, 'Market not found');
    }

    if (status === 'RESOLVED' && !outcome) {
      throw new AppError('MISSING_OUTCOME', 400, 'Outcome required for resolution');
    }

    const updated = await prisma.market.update({
      where: { slug },
      data: { 
        status, 
        outcome: outcome || null,
        resolveTime: status === 'RESOLVED' ? new Date() : undefined,
      },
    });

    // Trigger settlement if resolved
    if (status === 'RESOLVED' && outcome) {
      const settlementService = new SettlementService(prisma, fastify.log);
      try {
        await settlementService.settleMarket(market.id);
        fastify.log.info({ marketId: market.id, outcome }, 'Market settled successfully');
      } catch (error) {
        fastify.log.error({ marketId: market.id, error }, 'Failed to settle market');
        // Don't throw - market is already marked as resolved
      }
    }

    return serializeMarket(updated);
  });

  // Get market stats
  fastify.get('/:slug/stats', async (request) => {
    const { slug } = request.params as { slug: string };
    
    const market = await prisma.market.findUnique({ where: { slug } });
    if (!market) {
      throw new AppError('MARKET_NOT_FOUND', 404, 'Market not found');
    }

    const [tradeCount, positionCount, uniqueTraders] = await Promise.all([
      prisma.trade.count({ where: { marketId: market.id } }),
      prisma.position.count({ where: { marketId: market.id } }),
      prisma.trade.findMany({
        where: { marketId: market.id },
        select: { buyerId: true, sellerId: true },
        distinct: ['buyerId'],
      }),
    ]);

    return {
      marketId: market.id,
      slug: market.slug,
      tradeCount,
      positionCount,
      uniqueTraders: new Set([
        ...uniqueTraders.map((t: any) => t.buyerId),
        ...uniqueTraders.map((t: any) => t.sellerId),
      ]).size,
      volume24h: Number(market.volume24h),
      liquidity: Number(market.liquidity),
    };
  });
};

export default marketsRoutes;
