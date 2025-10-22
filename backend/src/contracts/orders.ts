// src/contracts/orders.ts
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

export const zPlaceOrder = z.object({
  marketId: z.string().uuid(),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['LIMIT', 'MARKET']),
  price: z.string().regex(/^\d+\.?\d*$/).optional(),
  qty: z.string().regex(/^\d+\.?\d*$/),
});

export const zCancelOrder = z.object({
  orderId: z.string().uuid(),
});

export const zOrderSnapshot = z.object({
  id: z.string(),
  marketId: z.string(),
  userId: z.string(),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['LIMIT', 'MARKET']),
  price: z.string().nullable(),
  qty: z.string(),
  qtyFilled: z.string(),
  status: z.enum(['OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED']),
  createdAt: z.date(),
});

export const zOrderbookLevel = z.tuple([z.string(), z.string()]);

export const zOrderbookSnapshot = z.object({
  bids: z.array(zOrderbookLevel),
  asks: z.array(zOrderbookLevel),
  seq: z.number(),
});

export const zTrade = z.object({
  id: z.string(),
  buyOrderId: z.string(),
  sellOrderId: z.string(),
  marketId: z.string(),
  price: z.string(),
  qty: z.string(),
  createdAt: z.date(),
});

export const zListOrdersQuery = z.object({
  marketId: z.string().uuid().optional(),
  status: z.enum(['OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export const zListTradesQuery = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type PlaceOrderInput = z.infer<typeof zPlaceOrder>;
export type CancelOrderInput = z.infer<typeof zCancelOrder>;
export type OrderSnapshot = z.infer<typeof zOrderSnapshot>;
export type OrderbookLevel = z.infer<typeof zOrderbookLevel>;
export type OrderbookSnapshot = z.infer<typeof zOrderbookSnapshot>;
export type TradeResponse = z.infer<typeof zTrade>;
export type ListOrdersQuery = z.infer<typeof zListOrdersQuery>;
export type ListTradesQuery = z.infer<typeof zListTradesQuery>;
