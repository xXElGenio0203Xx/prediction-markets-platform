import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { prisma } from '../lib/prisma.js';
import { MatchingEngine } from '../engine/engine.js';
import { redis, CHANNELS } from '../lib/redis.js';

const PlaceOrderSchema = z.object({
  outcome: z.enum(['YES', 'NO']),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['LIMIT', 'MARKET']),
  price: z.number().min(0).max(1).optional(),
  quantity: z.number().positive(),
});

const ordersRoutes: FastifyPluginAsync = async (fastify) => {
  const matchingEngine = new MatchingEngine(prisma, fastify.log);

  // Place order on a market
  fastify.post('/:slug', { preHandler: [requireAuth] }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const orderData = PlaceOrderSchema.parse(request.body);
    const userId = request.user!.id;

    // Validate price for limit orders
    if (orderData.type === 'LIMIT' && (orderData.price === undefined || orderData.price === null)) {
      throw new AppError('INVALID_INPUT', 400, 'Price is required for limit orders');
    }

    // Get market
    const market = await prisma.market.findUnique({ where: { slug } });
    if (!market) {
      throw new AppError('MARKET_NOT_FOUND', 404, 'Market not found');
    }

    if (market.status !== 'OPEN') {
      throw new AppError('MARKET_CLOSED', 400, 'Market is not open for trading');
    }

    // Check user balance
    const balance = await prisma.balance.findUnique({ where: { userId } });
    if (!balance) {
      throw new AppError('BALANCE_NOT_FOUND', 400, 'Balance not found');
    }

    // Calculate required funds
    if (orderData.side === 'BUY') {
      const requiredFunds = orderData.quantity * (orderData.price || 1);
      if (Number(balance.available) < requiredFunds) {
        throw new AppError('INSUFFICIENT_BALANCE', 400, 'Insufficient balance');
      }

      // Lock funds for buy order
      await prisma.balance.update({
        where: { userId },
        data: {
          available: { decrement: requiredFunds },
          locked: { increment: requiredFunds },
        },
      });
    }

    try {
      // Prepare order object
      const order = {
        id: randomUUID(),
        marketId: market.id,
        userId,
        side: orderData.side,
        type: orderData.type,
        outcome: orderData.outcome,
        price: orderData.price || (orderData.side === 'BUY' ? 1 : 0),
        quantity: orderData.quantity,
        filled: 0,
        status: 'PENDING' as const,
        createdAt: new Date(),
      };

      // Submit to matching engine
      const result = await matchingEngine.submitOrder(order);

      // Broadcast trades via Redis pub/sub
      for (const trade of result.trades) {
        await redis.publish(CHANNELS.TRADES, JSON.stringify({
          type: 'TRADE',
          data: {
            tradeId: trade.id,
            marketId: trade.marketId,
            outcome: trade.outcome,
            price: trade.price,
            quantity: trade.quantity,
            buyOrderId: trade.buyOrderId,
            sellOrderId: trade.sellOrderId,
            timestamp: trade.createdAt,
          },
        }));
      }

      // Broadcast order update
      await redis.publish(CHANNELS.ORDERS, JSON.stringify({
        type: 'ORDER_UPDATE',
        data: {
          orderId: result.order.id,
          marketId: result.order.marketId,
          status: result.order.status,
          filled: result.order.filled,
        },
      }));

      return {
        order: result.order,
        trades: result.trades,
      };
    } catch (error: any) {
      // Unlock funds if order fails
      if (orderData.side === 'BUY') {
        const requiredFunds = orderData.quantity * (orderData.price || 1);
        await prisma.balance.update({
          where: { userId },
          data: {
            available: { increment: requiredFunds },
            locked: { decrement: requiredFunds },
          },
        }).catch(() => {
          fastify.log.error({ userId, error }, 'Failed to unlock funds after order error');
        });
      }

      fastify.log.error({ error, userId, orderData }, 'Failed to place order');
      throw new AppError('ORDER_FAILED', 500, error.message || 'Failed to place order');
    }
  });

  // Cancel an order
  fastify.delete('/:orderId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { orderId } = request.params as { orderId: string };
    const userId = request.user!.id;

    try {
      const cancelledOrder = await matchingEngine.cancelOrder(orderId, userId);
      
      // Broadcast cancellation
      await redis.publish(CHANNELS.ORDERS, JSON.stringify({
        type: 'ORDER_CANCELLED',
        data: {
          orderId: cancelledOrder.id,
          marketId: cancelledOrder.marketId,
        },
      }));

      return { order: cancelledOrder };
    } catch (error: any) {
      fastify.log.error({ error, orderId, userId }, 'Failed to cancel order');
      throw new AppError('CANCEL_FAILED', 400, error.message || 'Failed to cancel order');
    }
  });

  // Get user's orders
  fastify.get('/my-orders', { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user!.id;
    const { status, marketId } = request.query as any;

    const where: any = { userId };
    if (status) where.status = status;
    if (marketId) where.marketId = marketId;

    const orders = await prisma.order.findMany({
      where,
      include: {
        market: {
          select: {
            id: true,
            slug: true,
            question: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return { orders };
  });

  // Get market orderbook
  fastify.get('/orderbook/:slug', async (request) => {
    const { slug } = request.params as { slug: string };
    
    const market = await prisma.market.findUnique({ where: { slug } });
    if (!market) {
      throw new AppError('MARKET_NOT_FOUND', 404, 'Market not found');
    }

    const orderbook = await matchingEngine.getOrderbook(market.id);
    return { orderbook };
  });
};

export default ordersRoutes;
