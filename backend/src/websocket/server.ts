import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { FastifyBaseLogger } from 'fastify';
import { verifyAccessToken } from '../middleware/auth.js';

interface MessageEnvelope {
  type: string;
  data: any;
  sequence?: number;
  timestamp?: string;
}

interface ConnectedClient {
  userId: string;
  socketId: string;
  connectedAt: Date;
}

/**
 * WebSocket Server for real-time updates
 * Broadcasts orderbook, trades, and market updates
 */
export class WebSocketServer {
  private io: SocketIOServer;
  private clients = new Map<string, ConnectedClient>();
  private sequence = 0;

  constructor(
    httpServer: HTTPServer,
    private readonly logger: FastifyBaseLogger,
    corsOrigin: string
  ) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: corsOrigin,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupHandlers();
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupHandlers(): void {
    this.io.on('connection', (socket) => {
      this.logger.info({ socketId: socket.id }, 'Client connected');

      // Authenticate client
      socket.on('authenticate', async (data: { token: string }) => {
        try {
          const payload = verifyAccessToken(data.token);

          this.clients.set(socket.id, {
            userId: payload.sub,
            socketId: socket.id,
            connectedAt: new Date(),
          });

          socket.emit('authenticated', { userId: payload.sub });

          this.logger.info(
            { socketId: socket.id, userId: payload.sub },
            'Client authenticated'
          );
        } catch (error) {
          socket.emit('error', { message: 'Authentication failed' });
          socket.disconnect();
        }
      });

      // Subscribe to market updates
      socket.on('subscribe', (data: { marketId: string }) => {
        socket.join(`market:${data.marketId}`);
        this.logger.info({ socketId: socket.id, marketId: data.marketId }, 'Subscribed to market');
      });

      // Unsubscribe from market updates
      socket.on('unsubscribe', (data: { marketId: string }) => {
        socket.leave(`market:${data.marketId}`);
        this.logger.info(
          { socketId: socket.id, marketId: data.marketId },
          'Unsubscribed from market'
        );
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        const client = this.clients.get(socket.id);
        this.clients.delete(socket.id);
        this.logger.info({ socketId: socket.id, userId: client?.userId }, 'Client disconnected');
      });

      // Heartbeat
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: MessageEnvelope): void {
    this.sequence++;
    const envelope: MessageEnvelope = {
      ...message,
      sequence: this.sequence,
      timestamp: new Date().toISOString(),
    };

    this.io.emit('message', envelope);
    this.logger.debug({ type: message.type, sequence: this.sequence }, 'Broadcast message');
  }

  /**
   * Send message to specific market subscribers
   */
  broadcastToMarket(marketId: string, message: MessageEnvelope): void {
    this.sequence++;
    const envelope: MessageEnvelope = {
      ...message,
      sequence: this.sequence,
      timestamp: new Date().toISOString(),
    };

    this.io.to(`market:${marketId}`).emit('message', envelope);
    this.logger.debug(
      { marketId, type: message.type, sequence: this.sequence },
      'Broadcast to market'
    );
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId: string, message: MessageEnvelope): void {
    const client = Array.from(this.clients.values()).find((c) => c.userId === userId);

    if (client) {
      this.io.to(client.socketId).emit('message', {
        ...message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedCount(): number {
    return this.clients.size;
  }

  /**
   * Get connected clients for a user
   */
  getUserClients(userId: string): ConnectedClient[] {
    return Array.from(this.clients.values()).filter((c) => c.userId === userId);
  }

  /**
   * Close all connections
   */
  close(): void {
    this.io.close();
    this.clients.clear();
    this.logger.info('WebSocket server closed');
  }
}
