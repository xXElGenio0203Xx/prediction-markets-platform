import { z } from 'zod';

// ============================================================================
// User Types
// ============================================================================

export const UserRoleSchema = z.enum(['USER', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  handle: z.string().optional(),
  fullName: z.string().nullable(),
  role: UserRoleSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export const PublicUserSchema = UserSchema.omit({ role: true });
export type PublicUser = z.infer<typeof PublicUserSchema>;

// ============================================================================
// Market Types
// ============================================================================

export const MarketStatusSchema = z.enum(['OPEN', 'CLOSED', 'RESOLVED', 'CANCELLED']);
export type MarketStatus = z.infer<typeof MarketStatusSchema>;

export const OutcomeSchema = z.enum(['YES', 'NO']);
export type Outcome = z.infer<typeof OutcomeSchema>;

export const MarketSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  imageUrl: z.string().nullable(),
  status: MarketStatusSchema,
  outcome: OutcomeSchema.nullable(),
  featured: z.boolean(),
  yesPrice: z.number(),
  noPrice: z.number(),
  yesShares: z.number(),
  noShares: z.number(),
  volume24h: z.number(),
  liquidity: z.number(),
  closeTime: z.string(),
  resolveTime: z.string().nullable(),
  resolutionSource: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Market = z.infer<typeof MarketSchema>;

// ============================================================================
// Order Types
// ============================================================================

export const OrderSideSchema = z.enum(['BUY', 'SELL']);
export type OrderSide = z.infer<typeof OrderSideSchema>;

export const OrderTypeSchema = z.enum(['LIMIT', 'MARKET']);
export type OrderType = z.infer<typeof OrderTypeSchema>;

export const OrderStatusSchema = z.enum(['PENDING', 'OPEN', 'PARTIAL', 'FILLED', 'CANCELLED']);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  marketId: z.string(),
  side: OrderSideSchema,
  type: OrderTypeSchema,
  outcome: OutcomeSchema,
  price: z.number(),
  quantity: z.number(),
  filled: z.number(),
  status: OrderStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Order = z.infer<typeof OrderSchema>;

// ============================================================================
// Trade Types
// ============================================================================

export const TradeSchema = z.object({
  id: z.string(),
  buyOrderId: z.string(),
  sellOrderId: z.string(),
  marketId: z.string(),
  buyerId: z.string(),
  sellerId: z.string(),
  outcome: OutcomeSchema,
  price: z.number(),
  quantity: z.number(),
  createdAt: z.string(),
});

export type Trade = z.infer<typeof TradeSchema>;

// ============================================================================
// Position Types
// ============================================================================

export const PositionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  marketId: z.string(),
  outcome: OutcomeSchema,
  quantity: z.number(),
  averagePrice: z.number(),
  updatedAt: z.string(),
});

export type Position = z.infer<typeof PositionSchema>;

// ============================================================================
// Balance Types
// ============================================================================

export const BalanceSchema = z.object({
  userId: z.string(),
  available: z.number(),
  locked: z.number(),
  total: z.number(),
});

export type Balance = z.infer<typeof BalanceSchema>;

// ============================================================================
// Orderbook Types
// ============================================================================

export const OrderbookLevelSchema = z.object({
  price: z.number(),
  quantity: z.number(),
  orders: z.number(),
});

export type OrderbookLevel = z.infer<typeof OrderbookLevelSchema>;

export const OrderbookSnapshotSchema = z.object({
  marketId: z.string(),
  outcome: OutcomeSchema,
  bids: z.array(OrderbookLevelSchema),
  asks: z.array(OrderbookLevelSchema),
  lastUpdate: z.string(),
  sequence: z.number(),
});

export type OrderbookSnapshot = z.infer<typeof OrderbookSnapshotSchema>;

// ============================================================================
// WebSocket Event Types
// ============================================================================

export const WSEventTypeSchema = z.enum([
  'orderbook_update',
  'trade_executed',
  'order_placed',
  'order_cancelled',
  'market_updated',
  'balance_updated',
  'position_updated',
  'heartbeat',
]);

export type WSEventType = z.infer<typeof WSEventTypeSchema>;

export interface WSMessage<T = unknown> {
  type: WSEventType;
  payload: T;
  timestamp: string;
  sequence?: number;
}

export interface OrderbookUpdatePayload {
  marketId: string;
  outcome: Outcome;
  snapshot: OrderbookSnapshot;
}

export interface TradeExecutedPayload {
  trade: Trade;
  market: Pick<Market, 'id' | 'slug' | 'title' | 'yesPrice' | 'noPrice'>;
}

export interface OrderPlacedPayload {
  order: Order;
  marketId: string;
}

export interface OrderCancelledPayload {
  orderId: string;
  marketId: string;
  userId: string;
}

export interface MarketUpdatedPayload {
  market: Market;
  changes: Partial<Market>;
}

export interface BalanceUpdatedPayload {
  userId: string;
  balance: Balance;
}

export interface PositionUpdatedPayload {
  userId: string;
  position: Position;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export const PlaceOrderRequestSchema = z.object({
  marketId: z.string(),
  side: OrderSideSchema,
  type: OrderTypeSchema,
  outcome: OutcomeSchema,
  price: z.number().min(0.01).max(0.99).optional(),
  quantity: z.number().positive(),
});

export type PlaceOrderRequest = z.infer<typeof PlaceOrderRequestSchema>;

export const PlaceOrderResponseSchema = z.object({
  order: OrderSchema,
  fills: z.array(TradeSchema),
  updatedBalance: BalanceSchema.optional(),
  updatedPosition: PositionSchema.optional(),
});

export type PlaceOrderResponse = z.infer<typeof PlaceOrderResponseSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const AuthResponseSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// ============================================================================
// Error Types
// ============================================================================

export const APIErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  statusCode: z.number(),
});

export type APIError = z.infer<typeof APIErrorSchema>;

// ============================================================================
// Pagination Types
// ============================================================================

export const PaginationSchema = z.object({
  page: z.number().positive().default(1),
  pageSize: z.number().positive().max(100).default(20),
  total: z.number().nonnegative(),
  totalPages: z.number().nonnegative(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// ============================================================================
// Serialization Helpers
// ============================================================================

/**
 * Convert Prisma Date to ISO string for API responses
 */
export function serializeDate(date: Date): string {
  return date.toISOString();
}

/**
 * Convert Prisma Decimal to number for API responses
 */
export function serializeDecimal(decimal: any): number {
  return Number(decimal);
}

/**
 * Serialize Order from Prisma/engine (with Date) to API format (with string)
 */
export function serializeOrder(order: {
  id: string;
  userId: string;
  marketId: string;
  side: OrderSide;
  type: OrderType;
  outcome: Outcome;
  price: any;
  quantity: any;
  filled: any;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}): Order {
  return {
    id: order.id,
    userId: order.userId,
    marketId: order.marketId,
    side: order.side,
    type: order.type,
    outcome: order.outcome,
    price: serializeDecimal(order.price),
    quantity: serializeDecimal(order.quantity),
    filled: serializeDecimal(order.filled),
    status: order.status,
    createdAt: serializeDate(order.createdAt),
    updatedAt: serializeDate(order.updatedAt),
  };
}

/**
 * Serialize Trade from Prisma/engine to API format
 */
export function serializeTrade(trade: {
  id: string;
  marketId: string;
  buyOrderId: string;
  sellOrderId: string;
  buyerId: string;
  sellerId: string;
  outcome: Outcome;
  price: any;
  quantity: any;
  createdAt: Date;
}): Trade {
  return {
    id: trade.id,
    marketId: trade.marketId,
    buyOrderId: trade.buyOrderId,
    sellOrderId: trade.sellOrderId,
    buyerId: trade.buyerId,
    sellerId: trade.sellerId,
    outcome: trade.outcome,
    price: serializeDecimal(trade.price),
    quantity: serializeDecimal(trade.quantity),
    createdAt: serializeDate(trade.createdAt),
  };
}

/**
 * Serialize Position from Prisma to API format
 */
export function serializePosition(position: {
  id: string;
  userId: string;
  marketId: string;
  outcome: Outcome;
  quantity: any;
  averagePrice: any;
  updatedAt: Date;
}): Position {
  return {
    id: position.id,
    userId: position.userId,
    marketId: position.marketId,
    outcome: position.outcome,
    quantity: serializeDecimal(position.quantity),
    averagePrice: serializeDecimal(position.averagePrice),
    updatedAt: serializeDate(position.updatedAt),
  };
}
