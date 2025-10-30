# 🎯 How to Use Your Prediction Markets App

**Status**: ✅ READY TO USE  
**Last Updated**: October 29, 2025

---

## 🚀 Your App Is Running!

✅ **Backend API**: http://localhost:4000  
✅ **Frontend App**: http://localhost:5173  
✅ **Database**: Connected (PostgreSQL + Redis)  
✅ **Sample Data**: 5 markets with test users loaded

---

## 🖱️ What to Click - Step by Step

### 1. **Open Your Browser**
```
http://localhost:5173
```
Click this link or copy-paste into your browser.

### 2. **Sign Up / Login**
You have test accounts ready:

**Admin Account**:
- Email: `admin@browncast.com`
- Password: `admin123456`

**Regular Users**:
- Email: `alice@example.com` | Password: `password123`
- Email: `bob@example.com` | Password: `password123`
- Email: `charlie@example.com` | Password: `password123`

### 3. **What You Can Do**

#### **Browse Markets**
- Click "Markets" in navigation
- See 5 live prediction markets:
  - 🏦 US Recession 2025
  - ₿ Bitcoin $100K by 2025
  - 🤖 AGI by 2026
  - ⟁ Ethereum Uptime 2025
  - 🚀 SpaceX Mars Landing 2026

#### **Place Trades**
- Click any market
- Use the trade widget on the right
- Choose YES/NO outcome
- Choose BUY/SELL
- Set price (between $0.01-$0.99)
- Set quantity
- Click "Place Order"

#### **View Analytics** (NEW!)
- Click "Analytics" in navigation
- See your portfolio performance
- View P&L, win rate, Sharpe ratio
- Check best/worst markets

#### **Trade History** (NEW!)
- Click "Trade History" in navigation
- Filter by outcome, side, date
- Export to CSV
- See fees and P&L

#### **Admin Features** (if logged in as admin)
- Click "Admin" page
- Click "Platform Metrics" button
- See volume, DAU/MAU, market stats
- View liquidity distribution

---

## 🔍 Live Features You Can Test

### **Real-Time Trading**
1. Open two browser windows (http://localhost:5173)
2. Login as different users in each window
3. Place opposite orders on same market
4. Watch them match in real-time!

### **Order Book**
- Each market shows live order book
- See all pending BUY/SELL orders
- Watch spreads update as orders are placed

### **Portfolio Tracking**
- Every trade updates your balance
- See positions change real-time
- Track profit/loss automatically

### **Analytics Dashboard**
- Portfolio metrics auto-calculate
- Charts update with your trading activity
- CSV export downloads immediately

---

## 🧪 Test Scenarios

### **Scenario 1: Basic Trading**
1. Login as Alice
2. Go to "Bitcoin $100K" market
3. Place BUY order for YES at $0.65 (current price)
4. Set quantity: 100 shares
5. Click "Place Order"
6. Check your portfolio updated!

### **Scenario 2: Market Making**
1. Login as Bob
2. Same Bitcoin market
3. Place SELL order for YES at $0.70 (above current price)
4. Place BUY order for YES at $0.60 (below current price)
5. You're now providing liquidity!

### **Scenario 3: Analytics Testing**
1. Make several trades on different markets
2. Go to Analytics page
3. Check your win rate calculation
4. Export trade history to CSV
5. View Sharpe ratio (risk-adjusted returns)

### **Scenario 4: Admin Monitoring**
1. Login as admin
2. Go to Admin page
3. Click "Platform Metrics"
4. See all user activity aggregated
5. Check DAU/MAU ratios
6. View volume by time period

---

## 🔧 Dev Tools (For Testing)

### **Backend API** (http://localhost:4000)
```bash
# Get all markets
curl http://localhost:4000/api/markets

# Get specific market
curl http://localhost:4000/api/markets/btc-100k-eoy-2025

# Login and get token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}'

# Get user portfolio (need token from login)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/analytics/portfolio
```

### **Swagger API Docs**
```
http://localhost:4000/docs
```
Complete API documentation with test interface.

---

## 🎨 What You'll See

### **Markets Page**
- Grid of prediction markets
- Market categories (Economics, Crypto, Tech, Science)
- Current prices (YES/NO)
- Volume and liquidity indicators
- Featured markets highlighted

### **Individual Market Page**
- Market question and description
- Current price chart
- Order book (live bids/asks)
- Recent trades feed
- Trade widget for placing orders
- Your current positions

### **Analytics Dashboard**
- Portfolio summary cards
- P&L over time chart
- Best/worst performing markets
- Performance metrics grid
- Sharpe ratio and diversification score

### **Trade History**
- Sortable/filterable trade list
- P&L per trade
- Fee breakdown
- CSV export button
- Pagination controls

### **Admin Dashboard**
- Platform-wide metrics
- Volume charts
- User engagement stats
- Market resolution metrics
- Liquidity distribution

---

## 🐛 If Something Doesn't Work

### **Frontend Won't Load**
```bash
cd /Users/maria_1/Desktop/browncast-3f78c242
npm run dev
# Then visit http://localhost:5173
```

### **Backend API Errors**
```bash
cd /Users/maria_1/Desktop/browncast-3f78c242/backend
npx tsx src/index.ts
# Then test http://localhost:4000/api/markets
```

### **Database Issues**
```bash
cd /Users/maria_1/Desktop/browncast-3f78c242/backend
npm run prisma:seed
# Re-seeds test data
```

### **Check Services Running**
```bash
lsof -i :4000   # Backend
lsof -i :5173   # Frontend
docker ps       # Database containers
```

---

## 📊 Current Sample Data

### **Markets** (5 total)
1. **US Recession 2025** - Economics, 42% YES
2. **Bitcoin $100K** - Crypto, 65% YES  
3. **AGI by 2026** - Tech, 25% YES
4. **Ethereum Uptime** - Crypto, 88% YES
5. **SpaceX Mars** - Science, 8% YES

### **Users** (4 total)
- Admin (admin@browncast.com)
- Alice (alice@example.com) - $10,000 balance
- Bob (bob@example.com) - $10,000 balance
- Charlie (charlie@example.com) - $10,000 balance

### **Initial Orders** (3 sample orders)
- Market maker orders providing liquidity
- Different price levels
- Both YES and NO outcomes

---

## 🎯 Success Metrics

**You'll know it's working when**:
- ✅ You can login with test accounts
- ✅ Markets load with live prices
- ✅ You can place and cancel orders
- ✅ Order book updates in real-time
- ✅ Analytics show your trading data
- ✅ Trade history downloads CSV
- ✅ Admin sees platform metrics

---

## 🚀 Next Steps

**Ready for production?**
1. Add your own markets
2. Invite real users
3. Deploy to cloud (see PRODUCTION_DEPLOYMENT.md)
4. Configure custom domain
5. Set up monitoring

**Want to customize?**
1. Edit market categories in `src/pages/Markets.jsx`
2. Modify UI colors in `tailwind.config.js`
3. Add new analytics in `backend/src/routes/analytics.ts`
4. Create new pages in `src/pages/`

---

**🎉 Your prediction markets platform is fully functional!**

**Frontend**: http://localhost:5173  
**Backend**: http://localhost:4000  
**API Docs**: http://localhost:4000/docs