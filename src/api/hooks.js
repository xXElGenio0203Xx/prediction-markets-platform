/**
 * React hooks for API and WebSocket
 */

import { useEffect, useState, useCallback } from 'react';
import { api } from './client';
import { ws } from './websocket';

/**
 * Hook for authentication state
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await api.getCurrentUser();
      setUser(userData);
      setError(null);
    } catch (err) {
      setUser(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const response = await api.login(email, password);
      setUser(response.user);
      
      // Connect WebSocket with token
      if (response.accessToken) {
        ws.connect(response.accessToken);
      }
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    try {
      const response = await api.register(email, password, displayName);
      setUser(response.user);
      
      // Connect WebSocket with token
      if (response.accessToken) {
        ws.connect(response.accessToken);
      }
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
      setUser(null);
      ws.disconnect();
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    refetch: fetchUser,
    isAuthenticated: !!user,
  };
}

/**
 * Hook for market data
 */
export function useMarket(slug) {
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;

    async function fetchMarket() {
      try {
        setLoading(true);
        const data = await api.getMarket(slug);
        setMarket(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMarket();
  }, [slug]);

  return { market, loading, error };
}

/**
 * Hook for orderbook data with real-time updates
 */
export function useOrderbook(marketId, outcome) {
  const [orderbook, setOrderbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!marketId) return;

    async function fetchOrderbook() {
      try {
        setLoading(true);
        const data = await api.getOrderbook(marketId);
        setOrderbook(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchOrderbook();

    // Subscribe to real-time updates
    ws.subscribeToMarket(marketId);

    const handleOrderbookUpdate = (data) => {
      if (data.marketId === marketId && (!outcome || data.outcome === outcome)) {
        setOrderbook(data.snapshot);
      }
    };

    ws.on('orderbook_update', handleOrderbookUpdate);

    return () => {
      ws.off('orderbook_update', handleOrderbookUpdate);
      ws.unsubscribeFromMarket(marketId);
    };
  }, [marketId, outcome]);

  return { orderbook, loading, error };
}

/**
 * Hook for recent trades with real-time updates
 */
export function useTrades(marketId, limit = 20) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!marketId) return;

    async function fetchTrades() {
      try {
        setLoading(true);
        const data = await api.getTrades(marketId, limit);
        setTrades(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTrades();

    // Subscribe to real-time updates
    ws.subscribeToMarket(marketId);

    const handleTradeExecuted = (data) => {
      if (data.marketId === marketId) {
        setTrades((prev) => [data, ...prev.slice(0, limit - 1)]);
      }
    };

    ws.on('trade_executed', handleTradeExecuted);

    return () => {
      ws.off('trade_executed', handleTradeExecuted);
      ws.unsubscribeFromMarket(marketId);
    };
  }, [marketId, limit]);

  return { trades, loading, error };
}

/**
 * Hook for user balance with real-time updates
 */
export function useBalance() {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getBalance();
      setBalance(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();

    const handleBalanceUpdate = (data) => {
      setBalance(data);
    };

    ws.on('balance_updated', handleBalanceUpdate);

    return () => {
      ws.off('balance_updated', handleBalanceUpdate);
    };
  }, [fetchBalance]);

  return { balance, loading, error, refetch: fetchBalance };
}

/**
 * Hook for user positions with real-time updates
 */
export function usePositions() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPositions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getPositions();
      setPositions(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();

    const handlePositionUpdate = (data) => {
      setPositions((prev) => {
        const index = prev.findIndex(
          (p) => p.marketId === data.marketId && p.outcome === data.outcome
        );
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...data };
          return updated;
        }
        return [...prev, data];
      });
    };

    ws.on('position_updated', handlePositionUpdate);

    return () => {
      ws.off('position_updated', handlePositionUpdate);
    };
  }, [fetchPositions]);

  return { positions, loading, error, refetch: fetchPositions };
}

/**
 * Hook for placing orders
 */
export function usePlaceOrder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const placeOrder = useCallback(async (marketSlug, orderData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.placeOrder(marketSlug, orderData);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { placeOrder, loading, error };
}

/**
 * Hook for cancelling orders
 */
export function useCancelOrder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cancelOrder = useCallback(async (orderId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.cancelOrder(orderId);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { cancelOrder, loading, error };
}
