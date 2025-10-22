import { FastifyPluginAsync } from 'fastify';
import {
  zCreateMarket,
  zListMarketsQuery,
  zMarketResponse,
  zUpdateMarketStatus,
} from '../contracts/markets.js';
import { validateBody, validateQuery, validateParams } from '../utils/validate.js';
import { AppError } from '../utils/errors.js';
import { z } from 'zod';

const marketsRoutes: FastifyPluginAsync = async (fastify) => {
  // List all markets
  fastify.get(
    '/',
    {
      schema: {
        description: 'List all prediction markets with filtering and pagination',
        tags: ['markets'],
        querystring: zListMarketsQuery,
        response: {
          200: z.object({
            markets: z.array(zMarketResponse),
            total: z.number(),
            page: z.number(),
            pageSize: z.number(),
          }),
        },
      },
      preHandler: validateQuery(zListMarketsQuery),
    },
    async (request, reply) => {
      const { page = 1, pageSize = 20, status, category, featured } = request.query;
      const skip = (page - 1) * pageSize;

      const where: any = {};
      if (status) where.status = status;
      if (category) where.category = category;
      if (featured !== undefined) where.featured = featured;

      const [markets, total] = await Promise.all([
        fastify.prisma.market.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: [
            { featured: 'desc' },
            { volume24h: 'desc' },
            { createdAt: 'desc' },
          ],
        }),
        fastify.prisma.market.count({ where }),
      ]);

      reply.send({
        markets: markets.map((m) => ({
          id: m.id,
          slug: m.slug,
          question: m.question,
          description: m.description,
          category: m.category,
          status: m.status,
          createdBy: m.createdBy,
          closeTime: m.closeTime.toISOString(),
          resolveTime: m.resolveTime?.toISOString() || null,
          outcome: m.outcome,
          featured: m.featured,
          volume24h: Number(m.volume24h),
          liquidity: Number(m.liquidity),
          yesPrice: Number(m.yesPrice),
          noPrice: Number(m.noPrice),
          yesShares: Number(m.yesShares),
          noShares: Number(m.noShares),
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        })),
        total,
        page,
        pageSize,
      });
    }
  );

  // Get single market by slug
  fastify.get(
    '/:slug',
    {
      schema: {
        description: 'Get detailed information about a specific market',
        tags: ['markets'],
        params: z.object({ slug: z.string() }),
        response: {
          200: zMarketResponse,
        },
      },
      preHandler: validateParams(z.object({ slug: z.string() })),
    },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };

      const market = await fastify.prisma.market.findUnique({
        where: { slug },
      });

      if (!market) {
        throw new AppError('MARKET_NOT_FOUND', `Market '${slug}' not found`, 404);
      }

      reply.send({
        id: market.id,
        slug: market.slug,
        question: market.question,
        description: market.description,
        category: market.category,
        status: market.status,
        createdBy: market.createdBy,
        closeTime: market.closeTime.toISOString(),
        resolveTime: market.resolveTime?.toISOString() || null,
        outcome: market.outcome,
        featured: market.featured,
        volume24h: Number(market.volume24h),
        liquidity: Number(market.liquidity),
        yesPrice: Number(market.yesPrice),
        noPrice: Number(market.noPrice),
        yesShares: Number(market.yesShares),
        noShares: Number(market.noShares),
        createdAt: market.createdAt.toISOString(),
        updatedAt: market.updatedAt.toISOString(),
      });
    }
  );

  // Create new market (admin only)
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new prediction market (admin only)',
        tags: ['markets'],
        body: zCreateMarket,
        response: {
          201: zMarketResponse,
        },
      },
      preHandler: [fastify.authenticate, fastify.requireAdmin, validateBody(zCreateMarket)],
    },
    async (request, reply) => {
      const data = request.body;

      // Check if slug already exists
      const existing = await fastify.prisma.market.findUnique({
        where: { slug: data.slug },
      });

      if (existing) {
        throw new AppError('SLUG_EXISTS', `Market slug '${data.slug}' already exists`, 409);
      }

      // Validate times
      const closeTime = new Date(data.closeTime);
      const resolveTime = data.resolveTime ? new Date(data.resolveTime) : null;

      if (closeTime <= new Date()) {
        throw new AppError('INVALID_TIME', 'Close time must be in the future', 400);
      }

      if (resolveTime && resolveTime <= closeTime) {
        throw new AppError('INVALID_TIME', 'Resolve time must be after close time', 400);
      }

      const market = await fastify.prisma.market.create({
        data: {
          slug: data.slug,
          question: data.question,
          description: data.description,
          category: data.category,
          status: 'OPEN',
          createdBy: request.user.sub,
          closeTime,
          resolveTime,
          featured: data.featured || false,
          yesPrice: 0.5,
          noPrice: 0.5,
          yesShares: 0,
          noShares: 0,
          volume24h: 0,
          liquidity: 0,
        },
      });

      reply.code(201).send({
        id: market.id,
        slug: market.slug,
        question: market.question,
        description: market.description,
        category: market.category,
        status: market.status,
        createdBy: market.createdBy,
        closeTime: market.closeTime.toISOString(),
        resolveTime: market.resolveTime?.toISOString() || null,
        outcome: market.outcome,
        featured: market.featured,
        volume24h: Number(market.volume24h),
        liquidity: Number(market.liquidity),
        yesPrice: Number(market.yesPrice),
        noPrice: Number(market.noPrice),
        yesShares: Number(market.yesShares),
        noShares: Number(market.noShares),
        createdAt: market.createdAt.toISOString(),
        updatedAt: market.updatedAt.toISOString(),
      });
    }
  );

  // Update market status (admin only)
  fastify.patch(
    '/:slug/status',
    {
      schema: {
        description: 'Update market status (admin only)',
        tags: ['markets'],
        params: z.object({ slug: z.string() }),
        body: zUpdateMarketStatus,
        response: {
          200: zMarketResponse,
        },
      },
      preHandler: [
        fastify.authenticate,
        fastify.requireAdmin,
        validateParams(z.object({ slug: z.string() })),
        validateBody(zUpdateMarketStatus),
      ],
    },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const { status, outcome } = request.body;

      const market = await fastify.prisma.market.findUnique({
        where: { slug },
      });

      if (!market) {
        throw new AppError('MARKET_NOT_FOUND', `Market '${slug}' not found`, 404);
      }

      // Validate status transitions
      if (status === 'RESOLVED' && !outcome) {
        throw new AppError('MISSING_OUTCOME', 'Outcome required when resolving market', 400);
      }

      if (status === 'RESOLVED' && market.status === 'RESOLVED') {
        throw new AppError('ALREADY_RESOLVED', 'Market already resolved', 400);
      }

      const updated = await fastify.prisma.market.update({
        where: { slug },
        data: {
          status,
          outcome: outcome || market.outcome,
          resolveTime: status === 'RESOLVED' ? new Date() : market.resolveTime,
        },
      });

      // If resolved, trigger settlement (handled by settlement service)
      if (status === 'RESOLVED') {
        fastify.log.info({ marketId: market.id, outcome }, 'Market resolved, settlement triggered');
        // Settlement will be handled asynchronously by the settlement service
      }

      reply.send({
        id: updated.id,
        slug: updated.slug,
        question: updated.question,
        description: updated.description,
        category: updated.category,
        status: updated.status,
        createdBy: updated.createdBy,
        closeTime: updated.closeTime.toISOString(),
        resolveTime: updated.resolveTime?.toISOString() || null,
        outcome: updated.outcome,
        featured: updated.featured,
        volume24h: Number(updated.volume24h),
        liquidity: Number(updated.liquidity),
        yesPrice: Number(updated.yesPrice),
        noPrice: Number(updated.noPrice),
        yesShares: Number(updated.yesShares),
        noShares: Number(updated.noShares),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
    }
  );
};

export default marketsRoutes;
