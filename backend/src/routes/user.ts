import { FastifyPluginAsync } from 'fastify';
import {
  zBalanceResponse,
  zPositionResponse,
  zTransferRequest,
  zPortfolioResponse,
} from '../contracts/user.js';
import { validateBody } from '../utils/validate.js';
import { AppError } from '../utils/errors.js';
import { z } from 'zod';

const userRoutes: FastifyPluginAsync = async (fastify) => {
  // Get user balance
  fastify.get(
    '/balance',
    {
      schema: {
        description: 'Get current user balance',
        tags: ['user'],
        response: {
          200: zBalanceResponse,
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.sub;

      const balance = await fastify.prisma.balance.findUnique({
        where: { userId },
      });

      if (!balance) {
        throw new AppError('BALANCE_NOT_FOUND', 'Balance not found', 404);
      }

      reply.send({
        available: Number(balance.available),
        locked: Number(balance.locked),
        total: Number(balance.total),
      });
    }
  );

  // Get user positions
  fastify.get(
    '/positions',
    {
      schema: {
        description: 'Get all user positions across markets',
        tags: ['user'],
        response: {
          200: z.array(zPositionResponse),
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.sub;

      const positions = await fastify.prisma.position.findMany({
        where: { userId },
        include: {
          market: true,
        },
      });

      reply.send(
        positions.map((p) => ({
          id: p.id,
          marketId: p.marketId,
          marketSlug: p.market.slug,
          outcome: p.outcome as 'YES' | 'NO',
          quantity: Number(p.quantity),
          averagePrice: Number(p.averagePrice),
          currentPrice:
            p.outcome === 'YES' ? Number(p.market.yesPrice) : Number(p.market.noPrice),
          pnl:
            Number(p.quantity) *
            ((p.outcome === 'YES' ? Number(p.market.yesPrice) : Number(p.market.noPrice)) -
              Number(p.averagePrice)),
        }))
      );
    }
  );

  // Get portfolio summary
  fastify.get(
    '/portfolio',
    {
      schema: {
        description: 'Get portfolio summary with P&L',
        tags: ['user'],
        response: {
          200: zPortfolioResponse,
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.sub;

      const [balance, positions] = await Promise.all([
        fastify.prisma.balance.findUnique({
          where: { userId },
        }),
        fastify.prisma.position.findMany({
          where: { userId },
          include: { market: true },
        }),
      ]);

      if (!balance) {
        throw new AppError('BALANCE_NOT_FOUND', 'Balance not found', 404);
      }

      let totalInvested = 0;
      let currentValue = 0;

      for (const pos of positions) {
        const invested = Number(pos.quantity) * Number(pos.averagePrice);
        const current =
          Number(pos.quantity) *
          (pos.outcome === 'YES' ? Number(pos.market.yesPrice) : Number(pos.market.noPrice));

        totalInvested += invested;
        currentValue += current;
      }

      const totalPnl = currentValue - totalInvested;
      const totalValue = Number(balance.total) + currentValue;

      reply.send({
        balance: {
          available: Number(balance.available),
          locked: Number(balance.locked),
          total: Number(balance.total),
        },
        positions: positions.map((p) => ({
          id: p.id,
          marketId: p.marketId,
          marketSlug: p.market.slug,
          outcome: p.outcome as 'YES' | 'NO',
          quantity: Number(p.quantity),
          averagePrice: Number(p.averagePrice),
          currentPrice:
            p.outcome === 'YES' ? Number(p.market.yesPrice) : Number(p.market.noPrice),
          pnl:
            Number(p.quantity) *
            ((p.outcome === 'YES' ? Number(p.market.yesPrice) : Number(p.market.noPrice)) -
              Number(p.averagePrice)),
        })),
        totalInvested,
        currentValue,
        totalPnl,
        totalValue,
      });
    }
  );

  // Deposit funds (for testing/development)
  fastify.post(
    '/deposit',
    {
      schema: {
        description: 'Deposit funds (for testing/development)',
        tags: ['user'],
        body: zTransferRequest,
        response: {
          200: zBalanceResponse,
        },
      },
      preHandler: [fastify.authenticate, validateBody(zTransferRequest)],
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const { amount } = request.body;

      if (amount <= 0) {
        throw new AppError('INVALID_AMOUNT', 'Amount must be positive', 400);
      }

      // In production, this would integrate with payment gateway
      // For now, just update balance
      const balance = await fastify.prisma.$transaction(async (tx) => {
        // Create transfer record
        await tx.transfer.create({
          data: {
            userId,
            type: 'DEPOSIT',
            amount,
            status: 'COMPLETED',
          },
        });

        // Update balance
        const updated = await tx.balance.update({
          where: { userId },
          data: {
            available: { increment: amount },
            total: { increment: amount },
          },
        });

        return updated;
      });

      reply.send({
        available: Number(balance.available),
        locked: Number(balance.locked),
        total: Number(balance.total),
      });
    }
  );

  // Withdraw funds (for testing/development)
  fastify.post(
    '/withdraw',
    {
      schema: {
        description: 'Withdraw funds (for testing/development)',
        tags: ['user'],
        body: zTransferRequest,
        response: {
          200: zBalanceResponse,
        },
      },
      preHandler: [fastify.authenticate, validateBody(zTransferRequest)],
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const { amount } = request.body;

      if (amount <= 0) {
        throw new AppError('INVALID_AMOUNT', 'Amount must be positive', 400);
      }

      const balance = await fastify.prisma.balance.findUnique({
        where: { userId },
      });

      if (!balance || balance.available < amount) {
        throw new AppError('INSUFFICIENT_BALANCE', 'Insufficient available balance', 400);
      }

      const updated = await fastify.prisma.$transaction(async (tx) => {
        // Create transfer record
        await tx.transfer.create({
          data: {
            userId,
            type: 'WITHDRAWAL',
            amount,
            status: 'COMPLETED',
          },
        });

        // Update balance
        const updatedBalance = await tx.balance.update({
          where: { userId },
          data: {
            available: { decrement: amount },
            total: { decrement: amount },
          },
        });

        return updatedBalance;
      });

      reply.send({
        available: Number(updated.available),
        locked: Number(updated.locked),
        total: Number(updated.total),
      });
    }
  );

  // Get transaction history
  fastify.get(
    '/transactions',
    {
      schema: {
        description: 'Get user transaction history',
        tags: ['user'],
        querystring: z.object({
          limit: z.coerce.number().min(1).max(100).default(50),
        }),
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              type: z.enum(['DEPOSIT', 'WITHDRAWAL']),
              amount: z.number(),
              status: z.enum(['PENDING', 'COMPLETED', 'FAILED']),
              createdAt: z.string(),
            })
          ),
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const { limit = 50 } = request.query as { limit?: number };

      const transfers = await fastify.prisma.transfer.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      reply.send(
        transfers.map((t) => ({
          id: t.id,
          type: t.type as 'DEPOSIT' | 'WITHDRAWAL',
          amount: Number(t.amount),
          status: t.status as 'PENDING' | 'COMPLETED' | 'FAILED',
          createdAt: t.createdAt.toISOString(),
        }))
      );
    }
  );
};

export default userRoutes;
