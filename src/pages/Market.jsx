
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/api/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info, TrendingUp, Star, Trophy, Clock, Users, DollarSign } from "lucide-react";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";

import OrderBook from "../components/market/OrderBook";
import TradeWidget from "../components/market/TradeWidget";
import MarketChart from "../components/market/MarketChart";
import MarketDetails from "../components/market/MarketDetails";
import UserPositions from "../components/market/UserPositions";
import MarketSidebar from "../components/market/MarketSidebar";
import { useMarketUpdates } from "../components/utils/marketUpdates"; // Updated import path

// Mock price history for visualization
const mockPriceHistory = [
  { date: "Jan 01", price: 0.52 },
  { date: "Jan 02", price: 0.55 },
  { date: "Jan 03", price: 0.61 },
  { date: "Jan 04", price: 0.58 },
  { date: "Jan 05", price: 0.65 },
  { date: "Jan 06", price: 0.73 },
];

export default function MarketPage({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [market, setMarket] = useState(null);
  const [orders, setOrders] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOutcome, setSelectedOutcome] = useState('yes');
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const userId = user ? user.email : 'anonymous-user';

  useEffect(() => {
    const fetchMarketData = async () => {
      setIsLoading(true);
      const searchParams = new URLSearchParams(location.search);
      const marketId = searchParams.get('id');

      let marketDataForState = null;
      let ordersForState = [];
      let userOrdersForState = [];

      try {
        if (marketId) {
            const allMarkets = await MarketEntity.list();
            const foundMarket = allMarkets.find(m => m.id === marketId);

            if (foundMarket) {
              // Add special override for specific markets
              if (foundMarket.title.includes("Michelle Obama be the 2025 commencement speaker")) {
                foundMarket.image_url = "/market-default.svg";
              }
              marketDataForState = foundMarket;
            } else {
              marketDataForState = createDemoMarket(marketId);
            }
            ordersForState = await Order.filter({ market_id: marketId });
            userOrdersForState = await Order.filter({ market_id: marketId, user_id: userId });
        } else {
            const defaultMarketId = "demo-weather-market";
            marketDataForState = createDemoMarket(defaultMarketId);
            ordersForState = await Order.filter({ market_id: defaultMarketId });
            userOrdersForState = await Order.filter({ market_id: defaultMarketId, user_id: userId });
        }
      } catch (error) {
        console.error("Error loading market:", error);
        marketDataForState = createDemoMarket(`error-market-${Date.now()}`);
        ordersForState = [];
        userOrdersForState = [];
      }

      setMarket(marketDataForState);
      setOrders(ordersForState);
      setUserOrders(userOrdersForState);
      setIsLoading(false);
    };

    fetchMarketData();
  }, [location.search, userId]);

  const createDemoMarket = (id) => ({
    id: id,
    title: "Will it rain today at Brown University?",
    description: "Predict if there will be measurable precipitation (≥0.01 inches) today on Brown's campus",
    category: "weather",
    resolution_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    resolution_criteria: "Resolved YES if Providence weather station records ≥0.01 inches of precipitation today",
    current_price: 0.50,
    volume: 0,
    liquidity: 1000,
    status: "active",
    image_url: "https://images.unsplash.com/photo-1534274942006-218086701831?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  });

  const handleOrderPlaced = async () => {
    if (market && market.id) {
      const searchParams = new URLSearchParams(location.search);
      const originalMarketId = searchParams.get('id') || market.id;

      const marketOrders = await Order.filter({ market_id: originalMarketId });
      setOrders(marketOrders);

      const userMarketOrders = await Order.filter({
        market_id: originalMarketId,
        user_id: userId
      });
      setUserOrders(userMarketOrders);
    }
  };

  // Connect to realtime updates
  const handleMarketUpdate = React.useCallback((update) => {
    console.log('📡 Received market update:', update);
    setLastUpdate(update);

    // Reload orders when update received
    if (update.type === 'order_placed' || update.type === 'trade_executed' || update.type === 'market_updated') {
      const searchParams = new URLSearchParams(location.search);
      const marketId = searchParams.get('id') || market?.id;

      if (marketId) {
        // Reload orders
        Order.filter({ market_id: marketId }).then(setOrders).catch(console.error);
        Order.filter({ market_id: marketId, user_id: userId }).then(setUserOrders).catch(console.error);

        // Reload market data
        MarketEntity.list().then(markets => {
          const updatedMarket = markets.find(m => m.id === marketId);
          if (updatedMarket) {
            setMarket(updatedMarket);
          }
        }).catch(console.error);
      }
    }
  }, [market?.id, userId, location.search, setOrders, setUserOrders, setMarket]);

  // Subscribe to updates
  useMarketUpdates(market?.id, handleMarketUpdate);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAF3E0] to-[#E8DCC8]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#A97142]"></div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#FAF3E0] to-[#E8DCC8] p-4">
        <h1 className="text-2xl font-bold text-[#4E3629] mb-4">Market Not Found</h1>
        <Button onClick={() => navigate(createPageUrl("Markets"))} className="bg-[#A97142] hover:bg-[#8B5A3C]">
          Go back to Markets
        </Button>
      </div>
    );
  }

  const yesConfidence = Math.round((market.current_price || 0.5) * 100);
  const noConfidence = 100 - yesConfidence;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF3E0] via-[#F5EED8] to-[#E8DCC8] relative overflow-hidden">
      {/* Bruno Bear Watermark */}
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] opacity-[0.03] pointer-events-none z-0">
        <img
          src="/logo.svg"
          alt="Bruno Bear"
          className="w-full h-full object-contain"
        />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Markets"))}
            className="mb-6 text-[#4E3629] hover:bg-[#4E3629]/5 flex items-center gap-2 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Markets
          </Button>

          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              {/* Course Tag */}
              {market.category && (
                <Badge className="bg-[#4E3629] text-[#FAF3E0] mb-3 text-xs font-medium px-3 py-1">
                  {market.category.toUpperCase().replace('_', ' ')} MARKET
                </Badge>
              )}

              {/* Main Question */}
              <h1 className="text-3xl md:text-4xl font-bold text-[#4E3629] mb-3 leading-tight">
                {market.title}
              </h1>

              {/* Subtitle */}
              <p className="text-[#4E3629]/60 text-sm mb-4">
                Data collection ends {format(new Date(market.resolution_date), "MMM d, yyyy 'at' p")}
              </p>

              {/* Market Confidence */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#50C878]"></div>
                  <span className="text-sm font-semibold text-[#4E3629]">
                    Market Confidence: {yesConfidence}% YES
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[#4E3629]/40 text-xs">
                  <Users className="w-3 h-3" />
                  {orders.length} orders
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsWatchlisted(!isWatchlisted)}
                className={`border-[#A97142] ${isWatchlisted ? 'bg-[#A97142] text-white' : 'text-[#A97142] hover:bg-[#A97142]/10'}`}
              >
                <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-current' : ''}`} />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl("Leaderboard"))}
                className="border-[#A97142] text-[#A97142] hover:bg-[#A97142]/10 flex items-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                Leaderboard
              </Button>
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Chart & Trade (70% width) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Price Chart */}
            <Card className="bg-white/80 backdrop-blur-sm border-2 border-[#4E3629]/10 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-[#4E3629]/5">
                <CardTitle className="text-lg font-semibold text-[#4E3629] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#A97142]" />
                  Price Chart
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <MarketChart priceHistory={mockPriceHistory} />
              </CardContent>
            </Card>

            {/* Trade Widget */}
            <TradeWidget
              market={market}
              user={user}
              onOrderPlaced={handleOrderPlaced}
              selectedOutcome={selectedOutcome}
              onOutcomeChange={setSelectedOutcome}
            />

            {/* Market Details - Collapsible */}
            <MarketDetails market={market} />
          </div>

          {/* Right Column - Order Book & Sidebar (30% width) */}
          <div className="space-y-6">
            <OrderBook orders={orders} selectedOutcome={selectedOutcome} />
            <MarketSidebar market={market} user={user} orders={orders} />
            <UserPositions userOrders={userOrders} />
          </div>
        </div>
      </div>

      {/* Live indicator */}
      {lastUpdate && (
        <div className="fixed bottom-4 right-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-green-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Live</span>
          </motion.div>
        </div>
      )}
    </div>
  );
}
