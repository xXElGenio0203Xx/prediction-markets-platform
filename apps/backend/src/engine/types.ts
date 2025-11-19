/**
 * Order Types and Interfaces for Matching Engine
 * Extends types from @prediction-markets/shared for internal engine use
 */

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET';
export type OrderStatus = 'PENDING' | 'OPEN' | 'PARTIAL' | 'FILLED' | 'CANCELLED';
export type Outcome = 'YES' | 'NO';

export interface Order {
  id: string;
  marketId: string;
  userId: string;
  side: OrderSide;
  type: OrderType;
  outcome: Outcome;
  price: number;
  quantity: number;
  filled: number;
  status: OrderStatus;
  createdAt: Date;
}

export interface Trade {
  id: string;
  marketId: string;
  buyOrderId: string;
  sellOrderId: string;
  buyerId: string;
  sellerId: string;
  outcome: Outcome;
  price: number;
  quantity: number;
  createdAt: Date;
}

export interface OrderbookLevel {
  price: number;
  quantity: number;
  orders: number;
}

export interface Orderbook {
  bids: OrderbookLevel[]; // Buy orders (sorted by price descending)
  asks: OrderbookLevel[]; // Sell orders (sorted by price ascending)
}

export interface MatchResult {
  order: Order;
  trades: Trade[];
}
