import { describe, it, expect, beforeEach } from 'vitest';
import { OrderBook } from '../engine/book.js';
import type { Order } from '../engine/types.js';

describe('OrderBook', () => {
  let book: OrderBook;
  const marketId = 'test-market-id';

  beforeEach(() => {
    book = new OrderBook('YES', marketId);
  });

  describe('Order Insertion', () => {
    it('should insert bids in descending price order', () => {
      const order1: Order = {
        id: '1',
        marketId,
        userId: 'user1',
        side: 'BUY',
        type: 'LIMIT',
        outcome: 'YES',
        price: 0.6,
        quantity: 100,
        filled: 0,
        status: 'OPEN',
        createdAt: new Date(),
      };

      const order2: Order = {
        ...order1,
        id: '2',
        price: 0.8,
      };

      const order3: Order = {
        ...order1,
        id: '3',
        price: 0.5,
      };

      book.addOrder(order1);
      book.addOrder(order2);
      book.addOrder(order3);

      const bids = book.getBids();
      expect(bids[0].price).toBe(0.8);
      expect(bids[1].price).toBe(0.6);
      expect(bids[2].price).toBe(0.5);
    });

    it('should insert asks in ascending price order', () => {
      const order1: Order = {
        id: '1',
        marketId,
        userId: 'user1',
        side: 'SELL',
        type: 'LIMIT',
        outcome: 'YES',
        price: 0.6,
        quantity: 100,
        filled: 0,
        status: 'OPEN',
        createdAt: new Date(),
      };

      const order2: Order = {
        ...order1,
        id: '2',
        price: 0.4,
      };

      const order3: Order = {
        ...order1,
        id: '3',
        price: 0.7,
      };

      book.addOrder(order1);
      book.addOrder(order2);
      book.addOrder(order3);

      const asks = book.getAsks();
      expect(asks[0].price).toBe(0.4);
      expect(asks[1].price).toBe(0.6);
      expect(asks[2].price).toBe(0.7);
    });

    it('should maintain time priority for same price', () => {
      const order1: Order = {
        id: '1',
        marketId,
        userId: 'user1',
        side: 'BUY',
        type: 'LIMIT',
        outcome: 'YES',
        price: 0.6,
        quantity: 100,
        filled: 0,
        status: 'OPEN',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      };

      const order2: Order = {
        ...order1,
        id: '2',
        createdAt: new Date('2024-01-01T10:00:01Z'),
      };

      book.addOrder(order2);
      book.addOrder(order1);

      const bids = book.getBids();
      expect(bids[0].id).toBe('1'); // Earlier timestamp first
      expect(bids[1].id).toBe('2');
    });
  });

  describe('Order Removal', () => {
    it('should remove order from bids', () => {
      const order: Order = {
        id: '1',
        marketId,
        userId: 'user1',
        side: 'BUY',
        type: 'LIMIT',
        outcome: 'YES',
        price: 0.6,
        quantity: 100,
        filled: 0,
        status: 'OPEN',
        createdAt: new Date(),
      };

      book.addOrder(order);
      const removed = book.removeOrder('1');

      expect(removed).toEqual(order);
      expect(book.getBids()).toHaveLength(0);
    });

    it('should remove order from asks', () => {
      const order: Order = {
        id: '1',
        marketId,
        userId: 'user1',
        side: 'SELL',
        type: 'LIMIT',
        outcome: 'YES',
        price: 0.6,
        quantity: 100,
        filled: 0,
        status: 'OPEN',
        createdAt: new Date(),
      };

      book.addOrder(order);
      const removed = book.removeOrder('1');

      expect(removed).toEqual(order);
      expect(book.getAsks()).toHaveLength(0);
    });

    it('should return null for non-existent order', () => {
      const removed = book.removeOrder('nonexistent');
      expect(removed).toBeNull();
    });
  });

  describe('Best Bid/Ask', () => {
    it('should return best bid (highest price)', () => {
      const order1: Order = {
        id: '1',
        marketId,
        userId: 'user1',
        side: 'BUY',
        type: 'LIMIT',
        outcome: 'YES',
        price: 0.6,
        quantity: 100,
        filled: 0,
        status: 'OPEN',
        createdAt: new Date(),
      };

      const order2: Order = {
        ...order1,
        id: '2',
        price: 0.8,
      };

      book.addOrder(order1);
      book.addOrder(order2);

      const best = book.getBestBid();
      expect(best?.price).toBe(0.8);
    });

    it('should return best ask (lowest price)', () => {
      const order1: Order = {
        id: '1',
        marketId,
        userId: 'user1',
        side: 'SELL',
        type: 'LIMIT',
        outcome: 'YES',
        price: 0.6,
        quantity: 100,
        filled: 0,
        status: 'OPEN',
        createdAt: new Date(),
      };

      const order2: Order = {
        ...order1,
        id: '2',
        price: 0.4,
      };

      book.addOrder(order1);
      book.addOrder(order2);

      const best = book.getBestAsk();
      expect(best?.price).toBe(0.4);
    });

    it('should return null for empty book', () => {
      expect(book.getBestBid()).toBeNull();
      expect(book.getBestAsk()).toBeNull();
    });
  });

  describe('Matching Orders', () => {
    it('should find matching asks for buy order', () => {
      const ask1: Order = {
        id: '1',
        marketId,
        userId: 'user1',
        side: 'SELL',
        type: 'LIMIT',
        outcome: 'YES',
        price: 0.6,
        quantity: 100,
        filled: 0,
        status: 'OPEN',
        createdAt: new Date(),
      };

      const ask2: Order = {
        ...ask1,
        id: '2',
        price: 0.7,
      };

      book.addOrder(ask1);
      book.addOrder(ask2);

      const buyOrder: Order = {
        id: '3',
        marketId,
        userId: 'user2',
        side: 'BUY',
        type: 'LIMIT',
        outcome: 'YES',
        price: 0.65,
        quantity: 100,
        filled: 0,
        status: 'OPEN',
        createdAt: new Date(),
      };

      const matches = book.getMatchingOrders(buyOrder);
      expect(matches).toHaveLength(1);
      expect(matches[0].id).toBe('1'); // Only ask1 at 0.6 matches
    });

    it('should find matching bids for sell order', () => {
      const bid1: Order = {
        id: '1',
        marketId,
        userId: 'user1',
        side: 'BUY',
        type: 'LIMIT',
        outcome: 'YES',
        price: 0.6,
        quantity: 100,
        filled: 0,
        status: 'OPEN',
        createdAt: new Date(),
      };

      const bid2: Order = {
        ...bid1,
        id: '2',
        price: 0.5,
      };

      book.addOrder(bid1);
      book.addOrder(bid2);

      const sellOrder: Order = {
        id: '3',
        marketId,
        userId: 'user2',
        side: 'SELL',
        type: 'LIMIT',
        outcome: 'YES',
        price: 0.55,
        quantity: 100,
        filled: 0,
        status: 'OPEN',
        createdAt: new Date(),
      };

      const matches = book.getMatchingOrders(sellOrder);
      expect(matches).toHaveLength(1);
      expect(matches[0].id).toBe('1'); // Only bid1 at 0.6 matches
    });
  });

  describe('Orderbook Snapshot', () => {
    it('should aggregate orders at same price level', () => {
      const order1: Order = {
        id: '1',
        marketId,
        userId: 'user1',
        side: 'BUY',
        type: 'LIMIT',
        outcome: 'YES',
        price: 0.6,
        quantity: 100,
        filled: 0,
        status: 'OPEN',
        createdAt: new Date(),
      };

      const order2: Order = {
        ...order1,
        id: '2',
        quantity: 50,
      };

      book.addOrder(order1);
      book.addOrder(order2);

      const snapshot = book.getSnapshot();
      expect(snapshot.bids).toHaveLength(1);
      expect(snapshot.bids[0].price).toBe(0.6);
      expect(snapshot.bids[0].quantity).toBe(150);
      expect(snapshot.bids[0].orders).toBe(2);
    });

    it('should handle partially filled orders', () => {
      const order: Order = {
        id: '1',
        marketId,
        userId: 'user1',
        side: 'BUY',
        type: 'LIMIT',
        outcome: 'YES',
        price: 0.6,
        quantity: 100,
        filled: 30,
        status: 'PARTIAL',
        createdAt: new Date(),
      };

      book.addOrder(order);

      const snapshot = book.getSnapshot();
      expect(snapshot.bids[0].quantity).toBe(70); // Only unfilled portion
    });
  });
});
