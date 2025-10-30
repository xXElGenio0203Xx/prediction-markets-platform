import { PrismaClient, Prisma } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { OrderBook } from './book.js';
import type { Order, Trade, MatchResult, Orderbook } from './types.js';
import { randomUUID } from 'crypto';

/**
 * Matching Engine
 * Pure, deterministic order matching with price-time priority
 * ACID compliant with transaction-safe settlement
 */
export class MatchingEngine {
  private books = new Map<string, { yes: OrderBook; no: OrderBook }>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: FastifyBaseLogger
  ) {}

  /**
   * Submit order and execute matches
   */
  async submitOrder(order: Order): Promise<MatchResult> {
    const startTime = Date.now();

    // Assign order ID if not present
    if (!order.id) {
      order.id = randomUUID();
    }

    this.logger.info({ orderId: order.id, marketId: order.marketId }, 'Submitting order');

    // Execute in transaction
    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Get or create orderbook
      const book = this.getOrCreateBook(order.marketId);
      const outcomeBook = order.outcome === 'YES' ? book.yes : book.no;

      // Check for self-trade prevention
      const matchingOrders = outcomeBook.getMatchingOrders(order);
      const nonSelfOrders = matchingOrders.filter((o) => o.userId !== order.userId);
      const selfTradesBlocked = matchingOrders.length - nonSelfOrders.length;

      // Log self-trade prevention
      if (selfTradesBlocked > 0) {
        this.logger.warn(
          {
            orderId: order.id,
            userId: order.userId,
            marketId: order.marketId,
            blockedOrders: selfTradesBlocked,
          },
          'Self-trade prevention: blocked matching against own orders'
        );

        // Create order events for self-trade prevention
        for (const selfOrder of matchingOrders.filter((o) => o.userId === order.userId)) {
          await tx.orderEvent.create({
            data: {
              orderId: order.id,
              type: 'SELF_TRADE_PREVENTED',
              data: {
                blockedOrderId: selfOrder.id,
                price: selfOrder.price,
                quantity: selfOrder.quantity - selfOrder.filled,
              },
            },
          });
        }
      }

      // Execute matches
      const trades: Trade[] = [];
      let remainingQty = order.quantity;

      for (const matchOrder of nonSelfOrders) {
        if (remainingQty === 0) break;

        const matchQty = Math.min(remainingQty, matchOrder.quantity - matchOrder.filled);
        const matchPrice = matchOrder.price; // Taker gets maker's price

        // Create trade
        const trade: Trade = {
          id: randomUUID(),
          marketId: order.marketId,
          buyOrderId: order.side === 'BUY' ? order.id : matchOrder.id,
          sellOrderId: order.side === 'SELL' ? order.id : matchOrder.id,
          buyerId: order.side === 'BUY' ? order.userId : matchOrder.userId,
          sellerId: order.side === 'SELL' ? order.userId : matchOrder.userId,
          outcome: order.outcome,
          price: matchPrice,
          quantity: matchQty,
          createdAt: new Date(),
        };

        trades.push(trade);

        // Update filled quantities
        order.filled += matchQty;
        matchOrder.filled += matchQty;
        remainingQty -= matchQty;

        // Update order statuses
        if (matchOrder.filled >= matchOrder.quantity) {
          matchOrder.status = 'FILLED';
          outcomeBook.removeOrder(matchOrder.id);
        } else {
          matchOrder.status = 'PARTIAL';
        }

        // Persist trade
        await tx.trade.create({
          data: {
            id: trade.id,
            marketId: trade.marketId,
            buyOrderId: trade.buyOrderId,
            sellOrderId: trade.sellOrderId,
            buyerId: trade.buyerId,
            sellerId: trade.sellerId,
            outcome: trade.outcome,
            price: trade.price,
            quantity: trade.quantity,
            createdAt: trade.createdAt,
          },
        });

        // Update matched order in database
        await tx.order.update({
          where: { id: matchOrder.id },
          data: {
            filled: matchOrder.filled,
            status: matchOrder.status,
            updatedAt: new Date(),
          },
        });

        // Create order events
        await tx.orderEvent.createMany({
          data: [
            {
              orderId: order.id,
              type: 'TRADE',
              data: { tradeId: trade.id, quantity: matchQty, price: matchPrice },
            },
            {
              orderId: matchOrder.id,
              type: 'TRADE',
              data: { tradeId: trade.id, quantity: matchQty, price: matchPrice },
            },
          ],
        });

        // Settlement logic (update balances and positions)
        await this.settleTradeInTransaction(tx, trade);

        this.logger.info(
          {
            tradeId: trade.id,
            buyOrderId: trade.buyOrderId,
            sellOrderId: trade.sellOrderId,
            price: trade.price,
            quantity: trade.quantity,
          },
          'Trade executed'
        );
      }

      // Update order status
      if (order.filled >= order.quantity) {
        order.status = 'FILLED';
      } else if (order.filled > 0) {
        order.status = 'PARTIAL';
      } else {
        order.status = 'OPEN';
      }

      // Add to book if not fully filled and is limit order
      if (order.status !== 'FILLED' && order.type === 'LIMIT') {
        outcomeBook.addOrder(order);
      }

      // Market orders that don't fill completely are cancelled
      if (order.type === 'MARKET' && order.status !== 'FILLED') {
        order.status = 'CANCELLED';
        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            type: 'CANCELLED',
            data: {
              reason: 'insufficient_liquidity',
              filled: order.filled,
              requested: order.quantity,
            },
          },
        });

        this.logger.info(
          {
            orderId: order.id,
            filled: order.filled,
            requested: order.quantity,
          },
          'Market order partially filled and cancelled due to insufficient liquidity'
        );
      }

      // Persist order
      await tx.order.create({
        data: {
          id: order.id,
          marketId: order.marketId,
          userId: order.userId,
          side: order.side,
          type: order.type,
          outcome: order.outcome,
          price: order.price,
          quantity: order.quantity,
          filled: order.filled,
          status: order.status,
          createdAt: order.createdAt,
        },
      });

      // Create order event
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          type: 'CREATED',
          data: { side: order.side, type: order.type, price: order.price, quantity: order.quantity },
        },
      });

      // Update market prices
      await this.updateMarketPrices(tx, order.marketId);

      return { order, trades };
    });

    const duration = Date.now() - startTime;
    this.logger.info(
      { orderId: order.id, trades: result.trades.length, duration },
      'Order processed'
    );

    return result;
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, userId: string): Promise<Order> {
    return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const dbOrder = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!dbOrder) {
        throw new Error('Order not found');
      }

      if (dbOrder.userId !== userId) {
        throw new Error('Unauthorized');
      }

      if (dbOrder.status === 'FILLED' || dbOrder.status === 'CANCELLED') {
        throw new Error('Cannot cancel order');
      }

      // Remove from book
      const book = this.books.get(dbOrder.marketId);
      if (book) {
        const outcomeBook = dbOrder.outcome === 'YES' ? book.yes : book.no;
        outcomeBook.removeOrder(orderId);
      }

      // Update order
      const cancelled = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date(),
        },
      });

      // Create event
      await tx.orderEvent.create({
        data: {
          orderId,
          type: 'CANCELLED',
          data: { reason: 'user_request' },
        },
      });

      // Unlock funds for unfilled portion
      if (dbOrder.side === 'BUY') {
        const unfilledValue = (Number(dbOrder.quantity) - Number(dbOrder.filled)) * Number(dbOrder.price);
        await tx.balance.update({
          where: { userId },
          data: {
            locked: { decrement: unfilledValue },
            available: { increment: unfilledValue },
          },
        });
      }

      this.logger.info({ orderId, userId }, 'Order cancelled');

      return {
        id: cancelled.id,
        marketId: cancelled.marketId,
        userId: cancelled.userId,
        side: cancelled.side as 'BUY' | 'SELL',
        type: cancelled.type as 'LIMIT' | 'MARKET',
        outcome: cancelled.outcome as 'YES' | 'NO',
        price: Number(cancelled.price),
        quantity: Number(cancelled.quantity),
        filled: Number(cancelled.filled),
        status: cancelled.status as 'CANCELLED',
        createdAt: cancelled.createdAt,
      };
    });
  }

  /**
   * Get orderbook snapshot
   */
  async getOrderbook(marketId: string): Promise<Orderbook> {
    const book = this.getOrCreateBook(marketId);

    const yesBook = book.yes.getSnapshot();
    const noBook = book.no.getSnapshot();

    return {
      bids: [...yesBook.bids, ...noBook.bids].sort((a, b) => b.price - a.price),
      asks: [...yesBook.asks, ...noBook.asks].sort((a, b) => a.price - b.price),
    };
  }

  /**
   * Get or create orderbook for market
   */
  private getOrCreateBook(marketId: string): { yes: OrderBook; no: OrderBook } {
    let book = this.books.get(marketId);

    if (!book) {
      book = {
        yes: new OrderBook('YES', marketId),
        no: new OrderBook('NO', marketId),
      };
      this.books.set(marketId, book);
    }

    return book;
  }

  /**
   * Settle trade within transaction
   * Updates balances and positions atomically
   */
  private async settleTradeInTransaction(tx: Prisma.TransactionClient, trade: Trade): Promise<void> {
    const tradeValue = trade.price * trade.quantity;

    // Update buyer: decrease available balance, create/update position
    await tx.balance.update({
      where: { userId: trade.buyerId },
      data: {
        locked: { decrement: tradeValue },
      },
    });

    // Update buyer position
    const buyerPosition = await tx.position.findUnique({
      where: {
        userId_marketId_outcome: {
          userId: trade.buyerId,
          marketId: trade.marketId,
          outcome: trade.outcome,
        },
      },
    });

    if (buyerPosition) {
      const newQuantity = Number(buyerPosition.quantity) + trade.quantity;
      const newAveragePrice =
        (Number(buyerPosition.quantity) * Number(buyerPosition.averagePrice) +
          trade.quantity * trade.price) /
        newQuantity;

      await tx.position.update({
        where: { id: buyerPosition.id },
        data: {
          quantity: newQuantity,
          averagePrice: newAveragePrice,
          updatedAt: new Date(),
        },
      });
    } else {
      await tx.position.create({
        data: {
          userId: trade.buyerId,
          marketId: trade.marketId,
          outcome: trade.outcome,
          quantity: trade.quantity,
          averagePrice: trade.price,
        },
      });
    }

    // Update seller: increase available balance, decrease position
    await tx.balance.update({
      where: { userId: trade.sellerId },
      data: {
        available: { increment: tradeValue },
        total: { increment: tradeValue },
      },
    });

    const sellerPosition = await tx.position.findUnique({
      where: {
        userId_marketId_outcome: {
          userId: trade.sellerId,
          marketId: trade.marketId,
          outcome: trade.outcome,
        },
      },
    });

    if (sellerPosition) {
      await tx.position.update({
        where: { id: sellerPosition.id },
        data: {
          quantity: { decrement: trade.quantity },
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * Update market prices based on recent trades
   */
  private async updateMarketPrices(tx: Prisma.TransactionClient, marketId: string): Promise<void> {
    // Get latest trades
    const recentTrades = await tx.trade.findMany({
      where: { marketId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (recentTrades.length === 0) return;

    const yesTradesSum = recentTrades
      .filter((t: any) => t.outcome === 'YES')
      .reduce((sum: number, t: any) => sum + Number(t.price), 0);
    const yesTradesCount = recentTrades.filter((t: any) => t.outcome === 'YES').length;

    const noTradesSum = recentTrades
      .filter((t: any) => t.outcome === 'NO')
      .reduce((sum: number, t: any) => sum + Number(t.price), 0);
    const noTradesCount = recentTrades.filter((t: any) => t.outcome === 'NO').length;

    const yesPrice = yesTradesCount > 0 ? yesTradesSum / yesTradesCount : 0.5;
    const noPrice = noTradesCount > 0 ? noTradesSum / noTradesCount : 0.5;

    await tx.market.update({
      where: { id: marketId },
      data: {
        yesPrice,
        noPrice,
        updatedAt: new Date(),
      },
    });
  }
}
