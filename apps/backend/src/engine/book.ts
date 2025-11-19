import type { Order, OrderbookLevel, Orderbook } from './types.js';

/**
 * Orderbook data structure for a single outcome (YES or NO)
 * Maintains price-time priority with efficient matching
 */
export class OrderBook {
  private bids: Order[] = []; // Buy orders (price descending)
  private asks: Order[] = []; // Sell orders (price ascending)

  constructor(
    private readonly outcome: 'YES' | 'NO',
    _marketId: string
  ) {}

  /**
   * Add order to the book
   */
  addOrder(order: Order): void {
    if (order.outcome !== this.outcome) {
      throw new Error(`Order outcome ${order.outcome} does not match book outcome ${this.outcome}`);
    }

    if (order.side === 'BUY') {
      this.insertBid(order);
    } else {
      this.insertAsk(order);
    }
  }

  /**
   * Remove order from the book
   */
  removeOrder(orderId: string): Order | null {
    // Try bids
    const bidIndex = this.bids.findIndex((o) => o.id === orderId);
    if (bidIndex !== -1) {
      return this.bids.splice(bidIndex, 1)[0];
    }

    // Try asks
    const askIndex = this.asks.findIndex((o) => o.id === orderId);
    if (askIndex !== -1) {
      return this.asks.splice(askIndex, 1)[0];
    }

    return null;
  }

  /**
   * Get best bid (highest buy price)
   */
  getBestBid(): Order | null {
    return this.bids[0] || null;
  }

  /**
   * Get best ask (lowest sell price)
   */
  getBestAsk(): Order | null {
    return this.asks[0] || null;
  }

    /**
   * Get orders that match the incoming order
   * For BUY orders: return asks at or below the buy price (or all asks for market orders)
   * For SELL orders: return bids at or above the sell price (or all bids for market orders)
   */
  getMatchingOrders(order: Order): Order[] {
    if (order.side === 'BUY') {
      // Market orders match all available asks
      if (order.type === 'MARKET') {
        return [...this.asks];
      }
      // Limit orders match asks at or below buy price
      return this.asks.filter((ask) => ask.price <= order.price);
    } else {
      // Market orders match all available bids
      if (order.type === 'MARKET') {
        return [...this.bids];
      }
      // Limit orders match bids at or above sell price
      return this.bids.filter((bid) => bid.price >= order.price);
    }
  }

  /**
   * Get orderbook snapshot with aggregated levels
   */
  getSnapshot(): Orderbook {
    return {
      bids: this.aggregateLevels(this.bids, 'BUY'),
      asks: this.aggregateLevels(this.asks, 'SELL'),
    };
  }

  /**
   * Get all bids (for testing/debugging)
   */
  getBids(): Order[] {
    return [...this.bids];
  }

  /**
   * Get all asks (for testing/debugging)
   */
  getAsks(): Order[] {
    return [...this.asks];
  }

  /**
   * Insert bid maintaining price-time priority (descending price)
   */
  private insertBid(order: Order): void {
    let inserted = false;

    for (let i = 0; i < this.bids.length; i++) {
      // Higher price = better bid (goes first)
      if (order.price > this.bids[i].price) {
        this.bids.splice(i, 0, order);
        inserted = true;
        break;
      }
      // Same price, time priority (earlier = first)
      if (order.price === this.bids[i].price && order.createdAt < this.bids[i].createdAt) {
        this.bids.splice(i, 0, order);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.bids.push(order);
    }
  }

  /**
   * Insert ask maintaining price-time priority (ascending price)
   */
  private insertAsk(order: Order): void {
    let inserted = false;

    for (let i = 0; i < this.asks.length; i++) {
      // Lower price = better ask (goes first)
      if (order.price < this.asks[i].price) {
        this.asks.splice(i, 0, order);
        inserted = true;
        break;
      }
      // Same price, time priority (earlier = first)
      if (order.price === this.asks[i].price && order.createdAt < this.asks[i].createdAt) {
        this.asks.splice(i, 0, order);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.asks.push(order);
    }
  }

  /**
   * Aggregate orders into price levels
   */
  private aggregateLevels(orders: Order[], side: 'BUY' | 'SELL'): OrderbookLevel[] {
    const levels = new Map<number, { quantity: number; orders: number }>();

    for (const order of orders) {
      const remaining = order.quantity - order.filled;
      const level = levels.get(order.price);

      if (level) {
        level.quantity += remaining;
        level.orders += 1;
      } else {
        levels.set(order.price, { quantity: remaining, orders: 1 });
      }
    }

    return Array.from(levels.entries())
      .map(([price, { quantity, orders }]) => ({
        price,
        quantity,
        orders,
      }))
      .sort((a, b) => (side === 'BUY' ? b.price - a.price : a.price - b.price));
  }
}
