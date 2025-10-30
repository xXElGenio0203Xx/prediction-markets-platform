/**
 * WebSocket Client for Real-time Updates
 * Connects to Socket.IO backend for orderbook and trade updates
 */

import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  /**
   * Connect to WebSocket server with JWT authentication
   */
  connect(token) {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(WS_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });

    // Setup event listeners
    this.socket.on('orderbook_update', (data) => {
      this.emit('orderbook_update', data);
    });

    this.socket.on('trade_executed', (data) => {
      this.emit('trade_executed', data);
    });

    this.socket.on('order_placed', (data) => {
      this.emit('order_placed', data);
    });

    this.socket.on('order_cancelled', (data) => {
      this.emit('order_cancelled', data);
    });

    this.socket.on('market_updated', (data) => {
      this.emit('market_updated', data);
    });

    this.socket.on('balance_updated', (data) => {
      this.emit('balance_updated', data);
    });

    this.socket.on('position_updated', (data) => {
      this.emit('position_updated', data);
    });

    this.socket.on('pong', (data) => {
      this.emit('pong', data);
    });

    return this;
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Subscribe to market updates
   */
  subscribeToMarket(marketId) {
    if (!this.socket) {
      console.warn('[WebSocket] Not connected. Call connect() first.');
      return;
    }
    this.socket.emit('subscribe:market', { marketId });
  }

  /**
   * Unsubscribe from market updates
   */
  unsubscribeFromMarket(marketId) {
    if (!this.socket) return;
    this.socket.emit('unsubscribe:market', { marketId });
  }

  /**
   * Send ping to server
   */
  ping() {
    if (!this.socket) return;
    this.socket.emit('ping');
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[WebSocket] Error in ${event} listener:`, error);
      }
    });
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }
}

// Export singleton instance
export const ws = new WebSocketClient();

// Export class for testing
export default WebSocketClient;
