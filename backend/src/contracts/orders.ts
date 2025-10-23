// src/contracts/orders.ts
import { z } from 'zod';

export const zPlaceOrder = z.object({
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['LIMIT', 'MARKET']),
  outcome: z.enum(['YES', 'NO']),
  price: z.number().min(0).max(1).optional(),
  quantity: z.number().positive(),
});

export const zCancelOrder = z.object({
  orderId: z.string().uuid(),
});

export const zOrderResponse = z.object({
  id: z.string(),
  marketId: z.string(),
  userId: z.string(),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['LIMIT', 'MARKET']),
  outcome: z.enum(['YES', 'NO']),
  price: z.number().nullable(),
  quantity: z.number(),
  filled: z.number(),
  status: z.enum(['PENDING', 'OPEN', 'PARTIAL', 'FILLED', 'CANCELLED']),
  createdAt: z.date(),
});

export const zOrderbookLevel = z.object({
  price: z.number(),
  quantity: z.number(),
  orders: z.number(),
});

export const zOrderbookSnapshot = z.object({
  bids: z.array(zOrderbookLevel),
  asks: z.array(zOrderbookLevel),
  lastUpdate: z.date(),
});

export const zTradeResponse = z.object({
  id: z.string(),
  buyOrderId: z.string(),
  sellOrderId: z.string(),
  marketId: z.string(),
  buyerId: z.string(),
  sellerId: z.string(),
  outcome: z.enum(['YES', 'NO']),
  price: z.number(),
  quantity: z.number(),
  createdAt: z.date(),
});

export const zListOrdersQuery = z.object({
  marketId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'OPEN', 'PARTIAL', 'FILLED', 'CANCELLED']).optional(),
  page: z.number().positive().optional().default(1),
  pageSize: z.number().positive().max(100).optional().default(20),
});

export const zListTradesQuery = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type PlaceOrderInput = z.infer<typeof zPlaceOrder>;
export type OrderResponse = z.infer<typeof zOrderResponse>;
export type OrderbookSnapshot = z.infer<typeof zOrderbookSnapshot>;
export type TradeResponse = z.infer<typeof zTradeResponse>;
export type ListOrdersQuery = z.infer<typeof zListOrdersQuery>;
export type ListTradesQuery = z.infer<typeof zListTradesQuery>;
