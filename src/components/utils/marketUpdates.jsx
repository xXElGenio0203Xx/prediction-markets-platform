import React from 'react';

/**
 * Client-side utility for connecting to SSE market updates
 */

export class MarketUpdatesClient {
    constructor(marketId, onUpdate, onError) {
        this.marketId = marketId;
        this.onUpdate = onUpdate;
        this.onError = onError;
        this.eventSource = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.reconnectTimer = null;
    }

    connect() {
        if (this.eventSource) {
            this.disconnect();
        }

        try {
            // Connect to SSE endpoint
            const baseUrl = window.location.origin;
            const url = `${baseUrl}/api/functions/marketUpdatesSSE?market_id=${encodeURIComponent(this.marketId)}`;
            
            this.eventSource = new EventSource(url);

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'heartbeat') {
                        // Just keep connection alive
                        return;
                    }

                    if (data.type === 'connected') {
                        console.log('✅ Connected to market updates:', data.marketId);
                        this.reconnectAttempts = 0;
                        return;
                    }

                    // Pass update to callback
                    if (this.onUpdate) {
                        this.onUpdate(data);
                    }
                } catch (error) {
                    console.error('Error parsing SSE message:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                // Silently handle SSE errors - they're expected when connection drops
                console.log('SSE connection closed, will retry if needed');
                
                // Don't spam reconnection attempts
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = Math.min(5000 * this.reconnectAttempts, 15000);
                    
                    // Clear any existing timer
                    if (this.reconnectTimer) {
                        clearTimeout(this.reconnectTimer);
                    }
                    
                    this.reconnectTimer = setTimeout(() => {
                        if (this.eventSource && this.eventSource.readyState === EventSource.CLOSED) {
                            console.log(`Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                            this.connect();
                        }
                    }, delay);
                } else {
                    // Max attempts reached, give up silently
                    console.log('Max SSE reconnection attempts reached, giving up gracefully');
                    this.disconnect();
                }
            };

        } catch (error) {
            console.error('Failed to establish SSE connection:', error);
            // Don't propagate error to user - SSE is not critical
        }
    }

    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            console.log('Disconnected from market updates');
        }
    }
}

// React hook for market updates
export function useMarketUpdates(marketId, onUpdate) {
    const clientRef = React.useRef(null);

    React.useEffect(() => {
        if (!marketId) return;

        // Create client
        clientRef.current = new MarketUpdatesClient(
            marketId,
            onUpdate,
            (error) => {
                // Silently handle errors - SSE is not critical for functionality
                console.log('Market updates unavailable, continuing without real-time updates');
            }
        );

        // Connect
        clientRef.current.connect();

        // Cleanup
        return () => {
            if (clientRef.current) {
                clientRef.current.disconnect();
            }
        };
    }, [marketId, onUpdate]);

    return clientRef.current;
}