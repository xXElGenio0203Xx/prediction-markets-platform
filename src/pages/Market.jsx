
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/api/hooks";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Info, TrendingUp, Star, Trophy, Clock, Users, DollarSign, CheckCircle, XCircle, Shield } from "lucide-react";
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

export default function MarketPage({ user: userProp }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(userProp);
  const [market, setMarket] = useState(null);
  const [orders, setOrders] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOutcome, setSelectedOutcome] = useState('yes');
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Resolution dialog state
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [resolutionOutcome, setResolutionOutcome] = useState(null);
  const [resolutionReason, setResolutionReason] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const userId = user ? user.email : 'anonymous-user';

  // Fetch current user if not provided
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!userProp) {
        try {
          const currentUser = await api.getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          console.log('No user authenticated');
        }
      }
    };
    fetchCurrentUser();
  }, [userProp]);

  useEffect(() => {
    const fetchMarketData = async () => {
      setIsLoading(true);
      const searchParams = new URLSearchParams(location.search);
      const marketSlug = searchParams.get('slug') || searchParams.get('id');

      console.log('📊 Market: Loading market with slug:', marketSlug);

      try {
        if (marketSlug) {
          // Fetch market by slug
          const marketData = await api.getMarket(marketSlug);
          console.log('📊 Market: Got market data:', marketData);
          
          // Map backend fields to frontend format
          const mappedMarket = {
            ...marketData,
            image_url: marketData.imageUrl,
            resolution_date: marketData.closeTime,
            current_price: marketData.yesPrice,
            status: marketData.status.toLowerCase(),
          };
          
          setMarket(mappedMarket);
          
          // Fetch orderbook
          try {
            const orderbookData = await api.getOrderbook(marketSlug);
            console.log('📊 Market: Got orderbook:', orderbookData);
            setOrders(orderbookData.orders || []);
          } catch (err) {
            console.log('📊 Market: No orderbook data');
            setOrders([]);
          }
          
          // TODO: Fetch user orders when endpoint available
          setUserOrders([]);
        } else {
          // No market specified, load first market or show error
          const response = await api.getMarkets();
          if (response.markets && response.markets.length > 0) {
            const firstMarket = response.markets[0];
            navigate(`${location.pathname}?slug=${firstMarket.slug}`, { replace: true });
          } else {
            console.error('No markets available');
            setMarket(null);
          }
        }
      } catch (error) {
        console.error("❌ Error loading market:", error);
        setMarket(null);
        setOrders([]);
        setUserOrders([]);
      }

      setIsLoading(false);
    };

    fetchMarketData();
  }, [location.search, userId, navigate]);

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
    if (market && market.slug) {
      console.log('📊 Market: Order placed, refreshing orderbook...');
      try {
        const orderbookData = await api.getOrderbook(market.slug);
        setOrders(orderbookData.orders || []);
        
        // Refresh market data to get updated prices
        const marketData = await api.getMarket(market.slug);
        const mappedMarket = {
          ...marketData,
          image_url: marketData.imageUrl,
          resolution_date: marketData.closeTime,
          current_price: marketData.yesPrice,
          status: marketData.status.toLowerCase(),
        };
        setMarket(mappedMarket);
      } catch (error) {
        console.error('Error refreshing after order:', error);
      }
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

  // Resolution handlers
  const handleOpenResolutionDialog = (outcome) => {
    setResolutionOutcome(outcome);
    setResolutionReason('');
    setShowResolutionDialog(true);
  };

  const handleConfirmResolution = async () => {
    if (!resolutionReason.trim()) {
      alert('Please provide a resolution reason');
      return;
    }

    setIsResolving(true);
    try {
      const outcome = resolutionOutcome ? 'YES' : 'NO';
      await api.resolveMarket(market.slug, outcome, resolutionReason);
      
      alert(`✅ Market resolved successfully!\n\nOutcome: ${outcome}\nReason: ${resolutionReason}`);
      
      // Reload market data
      const marketData = await api.getMarket(market.slug);
      const mappedMarket = {
        ...marketData,
        image_url: marketData.imageUrl,
        resolution_date: marketData.closeTime,
        current_price: marketData.yesPrice,
        status: marketData.status.toLowerCase(),
        outcome: marketData.outcome,
        resolutionSource: marketData.resolutionSource,
      };
      setMarket(mappedMarket);
      setShowResolutionDialog(false);
    } catch (error) {
      console.error('Error resolving market:', error);
      alert(`❌ Failed to resolve market: ${error.message}`);
    }
    setIsResolving(false);
  };

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
              {/* Admin Resolution Buttons - Only show for ADMIN on OPEN markets */}
              {user?.role === 'ADMIN' && market.status === 'open' && (
                <>
                  <Button
                    onClick={() => handleOpenResolutionDialog(true)}
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Resolve YES
                  </Button>
                  <Button
                    onClick={() => handleOpenResolutionDialog(false)}
                    className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Resolve NO
                  </Button>
                </>
              )}
              
              {/* Regular user actions */}
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

        {/* Market Status Banner - Show if resolved */}
        {market.status === 'resolved' && market.outcome && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-xl border-2 ${
              market.outcome === 'YES' 
                ? 'bg-green-50 border-green-500' 
                : 'bg-red-50 border-red-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield className={`w-6 h-6 ${market.outcome === 'YES' ? 'text-green-600' : 'text-red-600'}`} />
              <div className="flex-1">
                <h3 className={`font-bold text-lg ${market.outcome === 'YES' ? 'text-green-900' : 'text-red-900'}`}>
                  Market Resolved: {market.outcome}
                </h3>
                {market.resolutionSource && (
                  <p className={`text-sm mt-1 ${market.outcome === 'YES' ? 'text-green-700' : 'text-red-700'}`}>
                    <strong>Resolution Reason:</strong> {market.resolutionSource}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Chart & Trade (70% width) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Price Chart */}
            <Card className={`bg-white/80 backdrop-blur-sm border-2 border-[#4E3629]/10 shadow-lg rounded-2xl overflow-hidden ${
              market.status === 'resolved' ? 'grayscale opacity-75' : ''
            }`}>
              <CardHeader className="border-b border-[#4E3629]/5">
                <CardTitle className="text-lg font-semibold text-[#4E3629] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#A97142]" />
                  Price Chart {market.status === 'resolved' && <span className="text-xs text-gray-500">(Market Resolved)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <MarketChart priceHistory={mockPriceHistory} isResolved={market.status === 'resolved'} />
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

      {/* Resolution Dialog */}
      <Dialog open={showResolutionDialog} onOpenChange={setShowResolutionDialog}>
        <DialogContent className="bg-white border-2 border-[#A97142]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#4E3629] flex items-center gap-2">
              <Shield className={`w-6 h-6 ${resolutionOutcome ? 'text-green-600' : 'text-red-600'}`} />
              Resolve Market: {resolutionOutcome ? 'YES' : 'NO'}
            </DialogTitle>
            <DialogDescription className="text-[#4E3629]/70">
              This action will finalize the market outcome and distribute winnings to holders of {resolutionOutcome ? 'YES' : 'NO'} shares.
              All losing shares will become worthless.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-semibold text-[#4E3629] mb-2 block">
                Market Question
              </label>
              <p className="text-[#4E3629]/80 text-sm bg-[#FAF3E0] p-3 rounded-lg">
                {market?.title || market?.question}
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-[#4E3629] mb-2 block">
                Resolution Reason *
              </label>
              <Textarea
                placeholder="Explain why this market is being resolved to this outcome (e.g., 'It did not snow in Providence on this date according to NOAA weather data')"
                value={resolutionReason}
                onChange={(e) => setResolutionReason(e.target.value)}
                className="min-h-[120px] border-[#A97142] focus:border-[#8B5A3C]"
              />
              <p className="text-xs text-[#4E3629]/60 mt-1">
                This reason will be permanently displayed on the market page.
              </p>
            </div>

            <div className={`p-4 rounded-lg border-2 ${resolutionOutcome ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
              <h4 className={`font-bold mb-2 ${resolutionOutcome ? 'text-green-900' : 'text-red-900'}`}>
                ⚠️ Warning: This action is irreversible
              </h4>
              <ul className={`text-sm space-y-1 ${resolutionOutcome ? 'text-green-700' : 'text-red-700'}`}>
                <li>✓ {resolutionOutcome ? 'YES' : 'NO'} share holders will receive $1 per share</li>
                <li>✗ {resolutionOutcome ? 'NO' : 'YES'} share holders will lose their investment</li>
                <li>↩ Open orders will be cancelled and refunded</li>
                <li>🔒 The market will be permanently closed to trading</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResolutionDialog(false)}
              disabled={isResolving}
              className="border-[#A97142] text-[#4E3629]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmResolution}
              disabled={isResolving || !resolutionReason.trim()}
              className={`${resolutionOutcome ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
            >
              {isResolving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Resolving...
                </>
              ) : (
                `Confirm Resolution: ${resolutionOutcome ? 'YES' : 'NO'}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
