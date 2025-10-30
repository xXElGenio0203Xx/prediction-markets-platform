/**
 * API Client for Prediction Markets Backend
 * Connects to Fastify backend with JWT authentication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

class APIClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Generic fetch wrapper with authentication
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include HTTP-only cookies
    };

    try {
      const response = await fetch(url, config);
      
      // Handle rate limiting
      if (response.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }

      // Handle authentication errors
      if (response.status === 401) {
        // Try to refresh token
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry original request
          return this.request(endpoint, options);
        }
        throw new Error('Authentication required. Please log in.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `API Error: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken() {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // ==================== AUTH ====================

  async register(email, password, displayName) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
  }

  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // ==================== MARKETS ====================

  async getMarkets(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/markets${query ? '?' + query : ''}`);
  }

  async getMarket(slug) {
    return this.request(`/markets/${slug}`);
  }

  async createMarket(marketData) {
    return this.request('/markets', {
      method: 'POST',
      body: JSON.stringify(marketData),
    });
  }

  async updateMarketStatus(slug, status) {
    return this.request(`/markets/${slug}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // ==================== ORDERS ====================

  async placeOrder(marketSlug, orderData) {
    // Generate idempotency key for duplicate prevention
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return this.request(`/orders/${marketSlug}`, {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(orderData),
    });
  }

  async cancelOrder(orderId) {
    return this.request(`/orders/${orderId}`, {
      method: 'DELETE',
    });
  }

  async getOrderbook(marketSlug) {
    return this.request(`/orders/${marketSlug}/orderbook`);
  }

  async getTrades(marketSlug, limit = 20) {
    return this.request(`/orders/${marketSlug}/trades?limit=${limit}`);
  }

  async getUserOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/orders/user/orders${query ? '?' + query : ''}`);
  }

  // ==================== USER ====================

  async getBalance() {
    return this.request('/user/balance');
  }

  async getPositions() {
    return this.request('/user/positions');
  }

  async getPortfolio() {
    return this.request('/user/portfolio');
  }

  async getLeaderboard(limit = 20) {
    return this.request(`/user/leaderboard?limit=${limit}`);
  }

  async initializeBonus() {
    return this.request('/admin/bonus/initialize', {
      method: 'POST',
    });
  }

  // ==================== ADMIN ====================

  async resolveMarket(slug, outcome, resolutionSource) {
    return this.request(`/admin/markets/${slug}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ outcome, resolutionSource }),
    });
  }

  async getSystemHealth() {
    return this.request('/admin/health');
  }

  async getFeesSummary() {
    return this.request('/admin/fees/summary');
  }

  async getFeeConfig(marketId) {
    const query = marketId ? `?market_id=${marketId}` : '';
    return this.request(`/admin/fees/config${query}`);
  }

  async resetBalances() {
    return this.request('/admin/admin/reset-balances', {
      method: 'POST',
    });
  }

  // ============================================
  // ANALYTICS METHODS
  // ============================================

  /**
   * Get portfolio analytics
   * @param {string} period - Time period: '24h', '7d', '30d', 'all'
   */
  async getPortfolioAnalytics(period = '30d') {
    return this.request(`/analytics/portfolio?period=${period}`);
  }

  /**
   * Get market analytics
   * @param {string} slug - Market slug
   * @param {string} period - Time period: '24h', '7d', '30d', 'all'
   */
  async getMarketAnalytics(slug, period = '7d') {
    return this.request(`/analytics/market/${slug}?period=${period}`);
  }

  /**
   * Get trade history with filters
   * @param {Object} filters - Filter options
   */
  async getTradeHistory(filters = {}) {
    const params = new URLSearchParams();
    if (filters.marketId) params.append('marketId', filters.marketId);
    if (filters.outcome) params.append('outcome', filters.outcome);
    if (filters.side) params.append('side', filters.side);
    if (filters.start) params.append('start', filters.start);
    if (filters.end) params.append('end', filters.end);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const query = params.toString();
    return this.request(`/analytics/trades${query ? '?' + query : ''}`);
  }

  /**
   * Export trades to CSV
   */
  async exportTrades() {
    const response = await fetch(`${this.baseURL}/analytics/trades/export`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get platform metrics (admin only)
   * @param {string} period - Time period: '24h', '7d', '30d', 'all'
   */
  async getPlatformMetrics(period = '30d') {
    return this.request(`/analytics/admin/platform?period=${period}`);
  }
}

// Export singleton instance
export const api = new APIClient();

// Export class for testing
export default APIClient;
