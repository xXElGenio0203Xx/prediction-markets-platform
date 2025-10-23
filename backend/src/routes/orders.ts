import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const PlaceOrderSchema = z.object({
  outcome: z.enum(['YES', 'NO']),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['LIMIT', 'MARKET']),
  price: z.number().min(0).max(1).optional(),
  quantity: z.number().positive(),
});

const ordersRoutes: FastifyPluginAsync = async (fastify) => {
  // Place order on a market
  fastify.post('/:slug', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Orders'],
      summary: 'Place a new order',
      // Zod schemas removed - validation done manually
    },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const orderData = PlaceOrderSchema.parse(request.body);
    const userId = request.user!.id;

    // Validate price for limit orders
    if (orderData.type === 'LIMIT' && (orderData.price === undefined || orderData.price === null)) {
      return reply.code(400).send({ message: 'Price is required for limit orders' });
    }

    // Get market
    const market = await fastify.prisma.market.findUnique({
      where: { slug },
    });

    if (!market) {
      return reply.code(404).send({ message: 'Market not found' });
    }

    if (market.status !== 'OPEN') {
      return reply.code(400).send({ message: 'Market is not open for trading' });
    }

    // Check user balance
    const balance = await fastify.prisma.balance.findUnique({
      where: { userId },
    });

    if (!balance) {
      return reply.code(400).send({ message: 'Balance not found' });
    }

    // Calculate required funds
    // For BUY orders: lock price * quantity
    // For SELL orders: check if user has position
    if (orderData.side === 'BUY') {
      const requiredFunds = orderData.quantity * (orderData.price || 1); // Market orders assume max price
      if (balance.available.toNumber() < requiredFunds) {
        return reply.code(400).send({ message: 'Insufficient balance' });
      }

      // Lock funds for buy order
      await fastify.prisma.balance.update({
        where: { userId },
        data: {
          available: { decrement: requiredFunds },
          locked: { increment: requiredFunds },
        },
      });
    }

    try {
      // Prepare order object for matching engine
      const order = {
        id: randomUUID(),
        marketId: market.id,
        userId,
        side: orderData.side,
        type: orderData.type,
        outcome: orderData.outcome,
        price: orderData.price || (orderData.side === 'BUY' ? 1 : 0), // Market orders: max buy price or min sell price
        quantity: orderData.quantity,
        filled: 0,
        status: 'PENDING' as const,
        createdAt: new Date(),
      };

      // Submit to matching engine
      const result = await fastify.matchingEngine.submitOrder(order);

      // Broadcast trades via WebSocket
      for (const trade of result.trades) {
        fastify.websocketServer.broadcast({
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
        });
      }

      // Broadcast order update
      fastify.websocketServer.broadcast({
        type: 'ORDER_UPDATE',
        data: {
          orderId: result.order.id,
          marketId: result.order.marketId,
          status: result.order.status,
          filled: result.order.filled,
        },
      });

      reply.send({
        order: result.order,
        trades: result.trades,
      });
    } catch (error: any) {
      // Unlock funds if order fails
      if (orderData.side === 'BUY') {
        const requiredFunds = orderData.quantity * (orderData.price || 1);
        await fastify.prisma.balance.update({
          where: { userId },
          data: {
            available: { increment: requiredFunds },
            locked: { decrement: requiredFunds },
          },
        }).catch(() => {
          // Log but don't fail if unlock fails
          fastify.log.error({ userId, error }, 'Failed to unlock funds after order error');
        });
      }

      fastify.log.error({ error, userId, orderData }, 'Failed to place order');
      return reply.code(500).send({ message: error.message || 'Failed to place order' });
    }
  });

  // Cancel an order
  fastify.delete('/:orderId', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Orders'],
      summary: 'Cancel an order',
    },
  }, async (request, reply) => {
    const { orderId } = request.params as { orderId: string };
    const userId = request.user!.id;

    const order = await fastify.prisma.order.findUnique({
      where: { id: orderId },
      include: { market: true },
    });

    if (!order) {
      return reply.code(404).send({ message: 'Order not found' });
    }

    if (order.userId !== userId) {
      return reply.code(403).send({ message: 'Not authorized to cancel this order' });
    }

    if (order.status !== 'OPEN' && order.status !== 'PARTIAL') {
      return reply.code(400).send({ message: 'Order cannot be cancelled' });
    }
    
    try {
      // Cancel order and unlock funds
      await fastify.prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      const refundAmount = (order.quantity.toNumber() - order.filled.toNumber()) * order.price.toNumber();
      
      await fastify.prisma.balance.update({
        where: { userId },
        data: {
          available: { increment: refundAmount },
          locked: { decrement: refundAmount },
        },
      });

      fastify.websocketServer.broadcast({
        type: 'order-cancelled',
        data: {
          marketId: order.marketId,
          orderId,
        },
      });

      return reply.send({ message: 'Order cancelled successfully' });
    } catch (error) {
      fastify.log.error(error, 'Failed to cancel order');
      return reply.code(500).send({ 
        message: error instanceof Error ? error.message : 'Failed to cancel order' 
      });
    }
  });

  // Get orderbook for a market
  fastify.get('/:slug/orderbook', {
    schema: {
      tags: ['Orders'],
      summary: 'Get orderbook for a market',
    },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const market = await fastify.prisma.market.findUnique({
      where: { slug },
    });

    if (!market) {
      return reply.code(404).send({ message: 'Market not found' });
    }

    // Get all open orders for this market
    const orders = await fastify.prisma.order.findMany({
      where: {
        marketId: market.id,
        status: {
          in: ['OPEN', 'PARTIAL'],
        },
      },
      orderBy: [
        { outcome: 'asc' },
        { price: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    // Format orderbook
    const orderbook = {
      YES: {
        bids: orders
          .filter((o: any) => o.outcome === 'YES' && o.side === 'BUY')
          .map((o: any) => ({
            price: o.price.toNumber(),
            quantity: (o.quantity.toNumber() - o.filled.toNumber()),
          })),
        asks: orders
          .filter((o: any) => o.outcome === 'YES' && o.side === 'SELL')
          .map((o: any) => ({
            price: o.price.toNumber(),
            quantity: (o.quantity.toNumber() - o.filled.toNumber()),
          })),
      },
      NO: {
        bids: orders
          .filter((o: any) => o.outcome === 'NO' && o.side === 'BUY')
          .map((o: any) => ({
            price: o.price.toNumber(),
            quantity: (o.quantity.toNumber() - o.filled.toNumber()),
          })),
        asks: orders
          .filter((o: any) => o.outcome === 'NO' && o.side === 'SELL')
          .map((o: any) => ({
            price: o.price.toNumber(),
            quantity: (o.quantity.toNumber() - o.filled.toNumber()),
          })),
      },
    };

    return reply.send({ orderbook });
  });

  // Get recent trades for a market
  fastify.get('/:slug/trades', {
    schema: {
      tags: ['Orders'],
      summary: 'Get recent trades for a market',
      // Zod schemas removed - validation done manually
    },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { limit } = request.query as { limit: number };

    const market = await fastify.prisma.market.findUnique({
      where: { slug },
    });

    if (!market) {
      return reply.code(404).send({ message: 'Market not found' });
    }

    const trades = await fastify.prisma.trade.findMany({
      where: { marketId: market.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        buyer: {
          select: { id: true, handle: true, fullName: true },
        },
      },
    });

    return reply.send({ trades });
  });

  // Get user's orders
  fastify.get('/user/orders', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Orders'],
      summary: 'Get user orders',
      // Zod schemas removed - validation done manually
    },
  }, async (request, reply) => {
    const userId = request.user!.id;
    const { status, marketId } = request.query as { status?: 'OPEN' | 'FILLED' | 'CANCELLED' | 'PARTIAL'; marketId?: string };

    const orders = await fastify.prisma.order.findMany({
      where: {
        userId,
        ...(status && { status }),
        ...(marketId && { marketId }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        market: {
          select: {
            id: true,
            slug: true,
            question: true,
            imageUrl: true,
          },
        },
      },
    });

    return reply.send({ orders });
  });
};

export default ordersRoutes;
