# Frontend API Documentation

This directory contains the complete API client for connecting to the Prediction Markets backend.

---

## 📁 Structure

```
src/api/
├── client.js       # REST API client with authentication
├── websocket.js    # WebSocket client for real-time updates
├── hooks.js        # React hooks for easy integration
├── index.js        # Main exports
└── README.md       # This file
```

---

## 🚀 Quick Start

### 1. Configure Environment

Create `.env` file in project root:

```bash
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
```

### 2. Use in Components

```jsx
import { useAuth, useMarket, useOrderbook } from '@/api/hooks';

function MyComponent() {
  const { user, login, logout } = useAuth();
  const { market, loading } = useMarket('btc-100k');
  const { orderbook } = useOrderbook(market?.id, 'YES');
  
  // Component code...
}
```

---

## 🔐 Authentication

### Login

```javascript
import { api } from '@/api';

const response = await api.login('user@example.com', 'password');
// Returns: { user, accessToken }
```

### Register

```javascript
const response = await api.register(
  'user@example.com',
  'password',
  'Display Name'
);
```

### Logout

```javascript
await api.logout();
```

### Get Current User

```javascript
const user = await api.getCurrentUser();
```

### Using Hook

```jsx
import { useAuth } from '@/api/hooks';

function LoginForm() {
  const { user, login, logout, isAuthenticated, loading } = useAuth();
  
  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome {user.displayName}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

---

## 📊 Markets

### Get All Markets

```javascript
import { api } from '@/api';

const markets = await api.getMarkets({
  status: 'OPEN',
  limit: 20,
  offset: 0,
});
```

### Get Single Market

```javascript
const market = await api.getMarket('btc-100k');
```

### Create Market (Admin)

```javascript
const newMarket = await api.createMarket({
  question: 'Will BTC hit $100k by EOY?',
  description: 'Resolves YES if...',
  closeTime: '2025-12-31T23:59:59Z',
});
```

### Using Hook

```jsx
import { useMarket } from '@/api/hooks';

function MarketPage({ slug }) {
  const { market, loading, error } = useMarket(slug);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h1>{market.question}</h1>
      <p>{market.description}</p>
    </div>
  );
}
```

---

## 📈 Orders

### Place Order

```javascript
import { api } from '@/api';

const order = await api.placeOrder('btc-100k', {
  side: 'BUY',        // 'BUY' | 'SELL'
  outcome: 'YES',     // 'YES' | 'NO'
  type: 'LIMIT',      // 'LIMIT' | 'MARKET'
  price: 0.65,        // 0.01 - 0.99
  quantity: 10,       // Number of shares
});
```

### Cancel Order

```javascript
await api.cancelOrder(orderId);
```

### Get Orderbook

```javascript
const orderbook = await api.getOrderbook('btc-100k');
// Returns: { bids: [...], asks: [...], sequence: 123 }
```

### Get Recent Trades

```javascript
const trades = await api.getTrades('btc-100k', 20);
```

### Get User Orders

```javascript
const orders = await api.getUserOrders({
  status: 'OPEN',
  marketId: 'optional-filter',
});
```

### Using Hooks

```jsx
import { usePlaceOrder, useOrderbook } from '@/api/hooks';

function TradeWidget({ marketId }) {
  const { placeOrder, loading, error } = usePlaceOrder();
  const { orderbook } = useOrderbook(marketId, 'YES');
  
  const handleOrder = async () => {
    try {
      await placeOrder('btc-100k', {
        side: 'BUY',
        outcome: 'YES',
        type: 'LIMIT',
        price: 0.65,
        quantity: 10,
      });
      alert('Order placed!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };
  
  return (
    <div>
      <div>Best Bid: {orderbook?.bids[0]?.price || 'N/A'}</div>
      <button onClick={handleOrder} disabled={loading}>
        {loading ? 'Placing...' : 'Place Order'}
      </button>
    </div>
  );
}
```

---

## 👤 User Data

### Get Balance

```javascript
const balance = await api.getBalance();
// Returns: { available, locked, total }
```

### Get Positions

```javascript
const positions = await api.getPositions();
// Returns: [{ marketId, outcome, shares, vwap, ... }, ...]
```

### Get Portfolio

```javascript
const portfolio = await api.getPortfolio();
// Returns: { totalValue, unrealizedPnL, ... }
```

### Using Hooks

```jsx
import { useBalance, usePositions } from '@/api/hooks';

function Portfolio() {
  const { balance, loading: balanceLoading } = useBalance();
  const { positions, loading: positionsLoading } = usePositions();
  
  if (balanceLoading || positionsLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>Balance: ${balance.available}</h2>
      <h3>Positions</h3>
      <ul>
        {positions.map(p => (
          <li key={`${p.marketId}-${p.outcome}`}>
            {p.marketId}: {p.shares} shares @ ${p.vwap}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 🔌 WebSocket Real-time Updates

### Manual Connection

```javascript
import { ws } from '@/api';

// Connect with JWT token
ws.connect(accessToken);

// Subscribe to market
ws.subscribeToMarket(marketId);

// Listen to events
ws.on('orderbook_update', (data) => {
  console.log('Orderbook updated:', data);
});

ws.on('trade_executed', (data) => {
  console.log('Trade executed:', data);
});

// Cleanup
ws.unsubscribeFromMarket(marketId);
ws.disconnect();
```

### Using Hooks (Recommended)

The React hooks automatically handle WebSocket subscriptions:

```jsx
import { useOrderbook, useTrades } from '@/api/hooks';

function MarketData({ marketId }) {
  // Automatically subscribes to WebSocket and receives real-time updates
  const { orderbook } = useOrderbook(marketId, 'YES');
  const { trades } = useTrades(marketId);
  
  return (
    <div>
      <div>Latest Trade: ${trades[0]?.price}</div>
      <div>Best Bid: ${orderbook?.bids[0]?.price}</div>
    </div>
  );
}
```

### Available WebSocket Events

| Event | Payload | Description |
|-------|---------|-------------|
| `orderbook_update` | `{ marketId, outcome, snapshot }` | Orderbook changed |
| `trade_executed` | `{ marketId, outcome, price, quantity, ... }` | Trade matched |
| `order_placed` | `{ orderId, marketId, side, outcome, ... }` | Order placed |
| `order_cancelled` | `{ orderId, marketId }` | Order cancelled |
| `market_updated` | `{ marketId, status, ... }` | Market status changed |
| `balance_updated` | `{ userId, available, locked, total }` | User balance changed |
| `position_updated` | `{ userId, marketId, outcome, shares, ... }` | User position changed |

---

## 🛠️ Advanced Usage

### Custom API Requests

```javascript
import { api } from '@/api';

// Direct access to request method
const data = await api.request('/custom-endpoint', {
  method: 'POST',
  body: JSON.stringify({ custom: 'data' }),
});
```

### Error Handling

```javascript
try {
  await api.placeOrder('btc-100k', orderData);
} catch (error) {
  if (error.message.includes('rate limit')) {
    alert('Too many requests. Please wait.');
  } else if (error.message.includes('Authentication')) {
    // Redirect to login
  } else {
    alert('Error: ' + error.message);
  }
}
```

### Automatic Token Refresh

The API client automatically handles token refresh on 401 errors:

```javascript
// If access token expires, it will:
// 1. Call /auth/refresh automatically
// 2. Retry the original request
// 3. Only fail if refresh token is also expired
const data = await api.getMarkets();
```

---

## 🔒 Security Features

- **HTTP-only Cookies**: Access/refresh tokens stored securely
- **Automatic Token Refresh**: Seamless re-authentication
- **Rate Limiting**: Client-side handling of 429 responses
- **CORS**: Configured for `credentials: 'include'`
- **Idempotency**: Order placement uses unique keys

---

## 📝 TypeScript Support (Future)

While currently using JavaScript, the API is designed to be easily convertible to TypeScript:

```typescript
// Future TypeScript example
interface PlaceOrderRequest {
  side: 'BUY' | 'SELL';
  outcome: 'YES' | 'NO';
  type: 'LIMIT' | 'MARKET';
  price: number;
  quantity: number;
}

const order = await api.placeOrder<PlaceOrderRequest>('btc-100k', {
  side: 'BUY',
  outcome: 'YES',
  type: 'LIMIT',
  price: 0.65,
  quantity: 10,
});
```

---

## 🐛 Troubleshooting

### WebSocket Not Connecting

1. Check backend is running: `curl http://localhost:8080/health`
2. Verify environment variables in `.env`
3. Check browser console for errors
4. Ensure JWT token is valid

### CORS Errors

1. Backend must include your frontend URL in `CORS_ORIGIN`
2. Ensure `credentials: 'include'` is set (already configured)
3. Check backend logs for CORS rejections

### Rate Limiting

If you see "Too many requests":
1. Wait 60 seconds
2. Reduce request frequency
3. Check if you're making duplicate requests

---

## 📚 Examples

See the following components for complete examples:

- Login/Register: `src/pages/Auth.jsx` (to be created)
- Market Page: `src/pages/Market.jsx`
- Order Placement: `src/components/market/TradeWidget.jsx`
- Portfolio: `src/pages/Portfolio.jsx`

---

## 🆘 Support

For issues or questions:
1. Check backend logs: `cd backend && npm run dev`
2. Check browser console for errors
3. Review API documentation: `backend/README.md`
4. Check network tab in DevTools

---

**Built with ❤️ for Prediction Markets Platform**
