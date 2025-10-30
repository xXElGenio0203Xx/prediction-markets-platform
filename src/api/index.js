/**
 * Main API exports
 * Import from here in your components
 * 
 * Example usage:
 * 
 * import { api, ws } from '@/api';
 * import { useAuth, useMarket, useOrderbook } from '@/api/hooks';
 * 
 * // Make API calls
 * const markets = await api.getMarkets();
 * 
 * // Use React hooks
 * const { user, login, logout } = useAuth();
 * const { market, loading } = useMarket('btc-100k');
 * const { orderbook } = useOrderbook(marketId, 'YES');
 */

export { api } from './client.js';
export { ws } from './websocket.js';

export {
  useAuth,
  useMarket,
  useOrderbook,
  useTrades,
  useBalance,
  usePositions,
  usePlaceOrder,
  useCancelOrder,
} from './hooks.js';

// Re-export for convenience
export default {
  api,
  ws,
};
