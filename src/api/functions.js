/**
 * Legacy functions compatibility layer
 * Maps old Base44 function calls to new API client
 * TODO: Refactor components to use api client directly
 */
import { api } from './client';

// ==================== IMPLEMENTED ====================

export const calculatePortfolio = async () => {
  return api.getPortfolio();
};

export const cancelOrder = async (orderId) => {
  return api.cancelOrder(orderId);
};

export const placeOrder = async (marketId, orderData) => {
  return api.placeOrder(marketId, orderData);
};

export const resolveMarket = async (slug, outcome) => {
  return api.resolveMarket(slug, outcome);
};

// ==================== STUBS (Not Yet Implemented) ====================

export const broadcastMarketUpdate = async (marketId, data) => {
  console.warn('broadcastMarketUpdate not implemented yet');
  return { success: false, message: 'WebSocket updates not implemented' };
};

export const getLeaderboard = async () => {
  console.warn('getLeaderboard not implemented yet');
  return { users: [] };
};

export const ensureUserBonus = async (userId) => {
  // Bonus initialization is handled by backend on first login
  // This function is kept for compatibility but doesn't need to do anything
  return { success: true };
};

export const validateSystemBalance = async () => {
  console.warn('validateSystemBalance not implemented yet');
  return { valid: true };
};

export const systemHealthCheck = async () => {
  console.warn('systemHealthCheck not implemented yet');
  return { healthy: true };
};

export const adminResetBalances = async () => {
  console.warn('adminResetBalances not implemented yet');
  return { success: false, message: 'Not implemented' };
};

// ==================== DEPRECATED (No Longer Needed) ====================

// Auction-based functions - not used in CLOB architecture
export const sendVerificationEmail = async () => {
  throw new Error('Deprecated: Email verification handled differently now');
};

export const verifyEmail = async () => {
  throw new Error('Deprecated: Email verification handled differently now');
};

export const clearAuction = async () => {
  throw new Error('Deprecated: Using CLOB, not auctions');
};

export const settleAuction = async () => {
  throw new Error('Deprecated: Using CLOB, not auctions');
};

export const submitAuctionOrder = async () => {
  throw new Error('Deprecated: Using CLOB, not auctions');
};

export const getIndicativePrice = async () => {
  throw new Error('Deprecated: Using CLOB, not auctions');
};

export const autoSettleAuction = async () => {
  throw new Error('Deprecated: Using CLOB, not auctions');
};

export const initializeBrunoBonus = async () => {
  throw new Error('Deprecated: Bonus system redesigned');
};

export const marketUpdatesSSE = async () => {
  throw new Error('Deprecated: Use WebSocket client instead');
};

export const validateEconomy = async () => {
  throw new Error('Deprecated: Validation logic moved to backend');
};

export const getAuctionStats = async () => {
  throw new Error('Deprecated: Using CLOB, not auctions');
};

export const validateUserBalance = async () => {
  throw new Error('Deprecated: Validation logic moved to backend');
};

export const recalculateUserPortfolio = async () => {
  throw new Error('Deprecated: Portfolio calculation moved to backend');
};

export const autoFixBalances = async () => {
  throw new Error('Deprecated: Balance fixing moved to backend');
};

// Additional deprecated functions - all Base44 specific
export const auctionPreopen = async () => {
  throw new Error('Deprecated: Using CLOB, not auctions');
};

export const auctionClose = async () => {
  throw new Error('Deprecated: Using CLOB, not auctions');
};

export const liveOpen = async () => {
  throw new Error('Deprecated: Market lifecycle handled differently now');
};

export const autoResolveMarket = async () => {
  throw new Error('Deprecated: Use resolveMarket instead');
};

export const getTradingMode = async () => {
  throw new Error('Deprecated: Trading mode concept removed');
};

export const migratePositionsEntryPrice = async () => {
  throw new Error('Deprecated: Migration functions no longer needed');
};

export const portfolioMathSelfTest = async () => {
  throw new Error('Deprecated: Testing moved to backend');
};

export const getFeeConfig = async () => {
  console.warn('getFeeConfig not implemented yet');
  return { maker_bps: 0, taker_bps: 0, per_contract_fee: 0 };
};

export const ensureFeesTreasury = async () => {
  throw new Error('Deprecated: Treasury management moved to backend');
};

export const applyClobFees = async () => {
  console.warn('applyClobFees not implemented yet');
  return { success: true };
};

export const getFeesSummary = async () => {
  console.warn('getFeesSummary not implemented yet');
  return { today: 0, thisWeek: 0, thisMonth: 0, allTime: 0 };
};

