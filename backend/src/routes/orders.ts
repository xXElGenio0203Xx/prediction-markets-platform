import { FastifyPluginAsync } from 'fastify';
import {
  zPlaceOrder,
  zOrderResponse,
  zOrderbookSnapshot,
  zTrade,
} from '../contracts/orders.js';
import { validateBody, validateParams } from '../utils/validate.js';
import { AppError } from '../utils/errors.js';
import { z } from 'zod';
import { MatchingEngine } from '../engine/engine.js';
import type { Order } from '../engine/types.js';

const ordersRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize matching engine
  const engine = new MatchingEngine(fastify.prisma, fastify.log);

  // Place order
  fastify.post(
    '/:marketSlug',
    {
      schema: {
        description: 'Place a new order on a market',
        tags: ['orders'],
        params: z.object({ marketSlug: z.string() }),
        body: zPlaceOrder,
        response: {
          201: z.object({
            order: zOrderResponse,
            trades: z.array(zTrade),
          }),
        },
      },
      preHandler: [
        fastify.authenticate,
        validateParams(z.object({ marketSlug: z.string() })),
        validateBody(zPlaceOrder),
      ],
    },
    async (request, reply) => {
      const { marketSlug } = request.params as { marketSlug: string };
      const { side, type, quantity, price, outcome } = request.body;
      const userId = request.user.sub;

      // Get market
      const market = await fastify.prisma.market.findUnique({
        where: { slug: marketSlug },
      });

      if (!market) {
        throw new AppError('MARKET_NOT_FOUND', `Market '${marketSlug}' not found`, 404);
      }

      if (market.status !== 'OPEN') {
        throw new AppError('MARKET_CLOSED', 'Market is not open for trading', 400);
      }

      if (new Date() >= market.closeTime) {
        throw new AppError('MARKET_CLOSED', 'Market has closed', 400);
      }

      // Get user balance
      const balance = await fastify.prisma.balance.findUnique({
        where: { userId },
      });

      if (!balance) {
        throw new AppError('BALANCE_NOT_FOUND', 'User balance not found', 404);
      }

      // Validate order price for limit orders
      if (type === 'LIMIT') {
        if (!price || price <= 0 || price >= 1) {
          throw new AppError('INVALID_PRICE', 'Price must be between 0 and 1', 400);
        }
      }

      // Calculate required balance for BUY orders
      let requiredBalance = 0;
      if (side === 'BUY') {
        const orderPrice = type === 'LIMIT' ? price! : (outcome === 'YES' ? market.yesPrice : market.noPrice);
        requiredBalance = quantity * Number(orderPrice);

        if (balance.available < requiredBalance) {
          throw new AppError(
            'INSUFFICIENT_BALANCE',
            `Insufficient balance. Required: ${requiredBalance}, Available: ${balance.available}`,
            400
          );
        }
      }

      // For SELL orders, check if user has enough shares
      if (side === 'SELL') {
        const position = await fastify.prisma.position.findUnique({
          where: {
            userId_marketId_outcome: {
              userId,
              marketId: market.id,
              outcome,
            },
          },
        });

        if (!position || position.quantity < quantity) {
          throw new AppError(
            'INSUFFICIENT_SHARES',
            `Insufficient shares. Required: ${quantity}, Available: ${position?.quantity || 0}`,
            400
          );
        }
      }

      // Submit order to matching engine
      const orderInput: Order = {
        id: '', // Will be set by engine
        marketId: market.id,
        userId,
        side,
        type,
        outcome,
        price: type === 'LIMIT' ? price! : (outcome === 'YES' ? Number(market.yesPrice) : Number(market.noPrice)),
        quantity,
        filled: 0,
        status: 'PENDING',
        createdAt: new Date(),
      };

      const result = await engine.submitOrder(orderInput);

      // Emit WebSocket events
      if (fastify.websocketServer) {
        // Broadcast new order
        fastify.websocketServer.broadcast({
          type: 'order',
          data: result.order,
        });

        // Broadcast trades
        for (const trade of result.trades) {
          fastify.websocketServer.broadcast({
            type: 'trade',
            data: trade,
          });
        }

        // Broadcast updated orderbook
        const orderbook = await engine.getOrderbook(market.id);
        fastify.websocketServer.broadcast({
          type: 'orderbook',
          data: {
            marketId: market.id,
            ...orderbook,
          },
        });
      }

      reply.code(201).send(result);
    }
  );

  // Cancel order
  fastify.delete(
    '/:orderId',
    {
      schema: {
        description: 'Cancel an existing order',
        tags: ['orders'],
        params: z.object({ orderId: z.string() }),
        response: {
          200: zOrderResponse,
        },
      },
      preHandler: [fastify.authenticate, validateParams(z.object({ orderId: z.string() }))],
    },
    async (request, reply) => {
      const { orderId } = request.params as { orderId: string };
      const userId = request.user.sub;

      const order = await fastify.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
      }

      if (order.userId !== userId) {
        throw new AppError('UNAUTHORIZED', 'Not authorized to cancel this order', 403);
      }

      if (order.status !== 'OPEN' && order.status !== 'PARTIAL') {
        throw new AppError('CANNOT_CANCEL', 'Order cannot be cancelled', 400);
      }

      const cancelled = await engine.cancelOrder(orderId, userId);

      // Emit WebSocket event
      if (fastify.websocketServer) {
        fastify.websocketServer.broadcast({
          type: 'order',
          data: cancelled,
        });

        // Broadcast updated orderbook
        const orderbook = await engine.getOrderbook(order.marketId);
        fastify.websocketServer.broadcast({
          type: 'orderbook',
          data: {
            marketId: order.marketId,
            ...orderbook,
          },
        });
      }

      reply.send(cancelled);
    }
  );

  // Get orderbook
  fastify.get(
    '/:marketSlug/orderbook',
    {
      schema: {
        description: 'Get current orderbook for a market',
        tags: ['orders'],
        params: z.object({ marketSlug: z.string() }),
        response: {
          200: zOrderbookSnapshot,
        },
      },
      preHandler: validateParams(z.object({ marketSlug: z.string() })),
    },
    async (request, reply) => {
      const { marketSlug } = request.params as { marketSlug: string };

      const market = await fastify.prisma.market.findUnique({
        where: { slug: marketSlug },
      });

      if (!market) {
        throw new AppError('MARKET_NOT_FOUND', `Market '${marketSlug}' not found`, 404);
      }

      const orderbook = await engine.getOrderbook(market.id);

      reply.send({
        marketId: market.id,
        timestamp: new Date().toISOString(),
        bids: orderbook.bids,
        asks: orderbook.asks,
      });
    }
  );

  // Get recent trades
  fastify.get(
    '/:marketSlug/trades',
    {
      schema: {
        description: 'Get recent trades for a market',
        tags: ['orders'],
        params: z.object({ marketSlug: z.string() }),
        querystring: z.object({
          limit: z.coerce.number().min(1).max(100).default(50),
        }),
        response: {
          200: z.array(zTrade),
        },
      },
      preHandler: validateParams(z.object({ marketSlug: z.string() })),
    },
    async (request, reply) => {
      const { marketSlug } = request.params as { marketSlug: string };
      const { limit = 50 } = request.query as { limit?: number };

      const market = await fastify.prisma.market.findUnique({
        where: { slug: marketSlug },
      });

      if (!market) {
        throw new AppError('MARKET_NOT_FOUND', `Market '${marketSlug}' not found`, 404);
      }

      const trades = await fastify.prisma.trade.findMany({
        where: { marketId: market.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      reply.send(
        trades.map((t) => ({
          id: t.id,
          marketId: t.marketId,
          buyOrderId: t.buyOrderId,
          sellOrderId: t.sellOrderId,
          buyerId: t.buyerId,
          sellerId: t.sellerId,
          outcome: t.outcome,
          price: Number(t.price),
          quantity: Number(t.quantity),
          createdAt: t.createdAt.toISOString(),
        }))
      );
    }
  );

  // Get user's orders
  fastify.get(
    '/user/orders',
    {
      schema: {
        description: 'Get current user orders',
        tags: ['orders'],
        querystring: z.object({
          status: z.enum(['OPEN', 'PARTIAL', 'FILLED', 'CANCELLED']).optional(),
          limit: z.coerce.number().min(1).max(100).default(50),
        }),
        response: {
          200: z.array(zOrderResponse),
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const { status, limit = 50 } = request.query as { status?: string; limit?: number };

      const where: any = { userId };
      if (status) where.status = status;

      const orders = await fastify.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      reply.send(
        orders.map((o) => ({
          id: o.id,
          marketId: o.marketId,
          userId: o.userId,
          side: o.side as 'BUY' | 'SELL',
          type: o.type as 'LIMIT' | 'MARKET',
          outcome: o.outcome as 'YES' | 'NO',
          price: Number(o.price),
          quantity: Number(o.quantity),
          filled: Number(o.filled),
          status: o.status as 'OPEN' | 'PARTIAL' | 'FILLED' | 'CANCELLED',
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString(),
        }))
      );
    }
  );
};

export default ordersRoutes;
