
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Market } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Clock, Users, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MoneyFall from "../components/animations/MoneyFall";
import AuctionChart from "../components/auction/AuctionChart";
import BidCard from "../components/auction/BidCard";
import { submitAuctionOrder } from "@/api/functions";
import { getIndicativePrice } from "@/api/functions";
import { getAuctionStats } from "@/api/functions"; // Added import

export default function LiveAuctionPage({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [markets, setMarkets] = useState([]);
  const [market, setMarket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [indicativePrice, setIndicativePrice] = useState(null);
  const [isAuctionPeriod, setIsAuctionPeriod] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [orderStatus, setOrderStatus] = useState(null);
  const [auctionStats, setAuctionStats] = useState(null); // Added state

  // Check if currently in auction period (9AM - 12PM ET)
  const checkAuctionPeriod = () => {
    // TEMPORARILY DISABLED - Making auction 24/7 for testing
    // const now = new Date();
    // const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    // const hour = et.getHours();
    // const minute = et.getMinutes();
    // const isAuction = hour >= 9 && hour < 12;
    // const isInClearing = hour === 12 && minute < 15;
    
    // TEMPORARY: Force auction to always be active (24/7)
    const isAuction = true;
    const isInClearing = false;
    
    setIsAuctionPeriod(isAuction);
    setIsClearing(isInClearing);

    // Calculate time remaining
    if (isAuction) {
      // const auctionEnd = new Date(et);
      // auctionEnd.setHours(12, 0, 0, 0);
      // const diff = auctionEnd - et;
      // const hours = Math.floor(diff / (1000 * 60 * 60));
      // const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      // const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      // setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      
      // TEMPORARY: Show testing mode message
      setTimeRemaining("🧪 Testing Mode - Auction Active 24/7");
    } else if (isInClearing) {
      setTimeRemaining("Clearing auction...");
    } else {
      setTimeRemaining("Auction closed - Live trading active");
    }
  };

  useEffect(() => {
    checkAuctionPeriod();
    const interval = setInterval(checkAuctionPeriod, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchMarkets = async () => {
      setIsLoading(true);
      const searchParams = new URLSearchParams(location.search);
      const marketId = searchParams.get('id');
      
      try {
        const allMarkets = await Market.list();
        const activeMarkets = allMarkets.filter(m => m.status === 'active');
        setMarkets(activeMarkets);
        
        if (marketId) {
          const foundMarket = activeMarkets.find(m => m.id === marketId);
          if (foundMarket) {
            setMarket(foundMarket);
          } else if (activeMarkets.length > 0) {
            setMarket(activeMarkets[0]);
          }
        } else if (activeMarkets.length > 0) {
          setMarket(activeMarkets[0]);
        }
      } catch (error) {
        console.error("Error loading markets:", error);
      }
      setIsLoading(false);
    };

    fetchMarkets();
  }, [location.search]);

  // Poll market data and auction stats every 2 seconds
  useEffect(() => {
    if (!market) return;

    const pollMarketData = async () => {
      try {
        // Fetch fresh market data
        const allMarkets = await Market.list();
        const updatedMarket = allMarkets.find(m => m.id === market.id);
        if (updatedMarket) {
          setMarket(updatedMarket);
        }

        // Fetch auction stats (live YES/NO percentages)
        const statsResponse = await getAuctionStats({ market_id: market.id });
        if (statsResponse.data && statsResponse.data.success) {
          setAuctionStats(statsResponse.data);
        }

        // Fetch indicative price (for historical context, or if stats isn't the primary source)
        const priceResponse = await getIndicativePrice({ market_id: market.id });
        if (priceResponse.data && priceResponse.data.success) {
          setIndicativePrice(priceResponse.data);
        }
      } catch (error) {
        console.error("Error polling market data:", error);
      }
    };

    // Initial fetch
    pollMarketData();

    // Poll every 2 seconds
    const interval = setInterval(pollMarketData, 2000);
    return () => clearInterval(interval);
  }, [market?.id]);

  const handleMarketChange = (marketId) => {
    const selectedMarket = markets.find(m => m.id === marketId);
    if (selectedMarket) {
      setMarket(selectedMarket);
      window.history.pushState({}, '', `${createPageUrl("LiveAuction")}?id=${marketId}`);
      setIndicativePrice(null);
      setOrderStatus(null);
      setAuctionStats(null); // Reset auction stats on market change
    }
  };

  const handleBidSubmit = async ({ outcome, probability, quantity }) => {
    if (!user) {
      setOrderStatus({ type: 'error', message: 'Please sign in to place bids.' });
      return;
    }

    // Check if clearing is in progress
    if (isClearing) {
      setOrderStatus({ type: 'error', message: 'Auction is currently clearing. Please wait until 12:15 PM ET.' });
      return;
    }

    // Balance validation
    const userBalance = user.bruno_dollars || 0;
    const price = probability / 100;
    const estimatedCost = price * quantity;

    if (userBalance < estimatedCost) {
      setOrderStatus({ 
        type: 'error', 
        message: `Insufficient funds. You need $${estimatedCost.toFixed(2)}, but only have $${userBalance.toFixed(2)}.` 
      });
      return;
    }

    try {
      const response = await submitAuctionOrder({
        market_id: market.id,
        side: outcome.toUpperCase(),
        price: price,
        quantity: quantity
      });

      if (response.data && response.data.success) {
        setOrderStatus({ 
          type: 'success', 
          message: `Auction bid submitted! ${quantity} ${outcome.toUpperCase()} contracts at ${probability}%` 
        });

        // Refresh market data immediately
        setTimeout(async () => {
          const allMarkets = await Market.list();
          const updatedMarket = allMarkets.find(m => m.id === market.id);
          if (updatedMarket) {
            setMarket(updatedMarket);
          }

          const freshPrice = await getIndicativePrice({ market_id: market.id });
          if (freshPrice.data?.success) {
            setIndicativePrice(freshPrice.data);
          }

          const freshStats = await getAuctionStats({ market_id: market.id });
          if (freshStats.data?.success) {
            setAuctionStats(freshStats.data);
          }
        }, 500);
      } else {
        throw new Error(response.data?.error || 'Failed to submit bid');
      }

    } catch (error) {
      console.error("Error placing bid:", error);
      setOrderStatus({ 
        type: 'error', 
        message: `Failed to place bid: ${error.message}` 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-900 to-stone-800">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-stone-900 to-stone-800 text-white p-4">
        <h1 className="text-2xl font-bold mb-4">No Market Available</h1>
        <Button onClick={() => navigate(createPageUrl("Markets"))} className="bg-gradient-to-r from-amber-600 to-red-600">
          Go to Markets
        </Button>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundImage: `url('${market.image_url || "https://images.unsplash.com/photo-1534274942006-218086701831"}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Money Fall Animation */}
      <MoneyFall duration={60000} />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="p-6 flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Markets"))}
            className="text-white hover:bg-white/10 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Markets
          </Button>
          
          <div className="flex items-center gap-4">
            {/* Market Selector */}
            {markets.length > 1 && (
              <Select value={market.id} onValueChange={handleMarketChange}>
                <SelectTrigger className="w-64 bg-white/10 backdrop-blur-sm border-white/30 text-white">
                  <SelectValue placeholder="Select a market" />
                </SelectTrigger>
                <SelectContent>
                  {markets.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title.substring(0, 50)}{m.title.length > 50 ? '...' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Badge className={`${isAuctionPeriod ? 'bg-amber-600' : isClearing ? 'bg-purple-600' : 'bg-green-600'} text-white text-sm px-4 py-2 flex items-center gap-2`}>
              <Clock className="w-4 h-4" />
              {isClearing ? 'Clearing' : isAuctionPeriod ? 'Live Auction' : 'Live Trading'}
            </Badge>
          </div>
        </div>

        {/* Auction Status Banner */}
        {(isAuctionPeriod || isClearing) && (
          <div className="mx-6 mb-6">
            <Card className={`${isClearing ? 'bg-gradient-to-r from-purple-500/90 to-indigo-500/90' : 'bg-gradient-to-r from-amber-500/90 to-orange-500/90'} backdrop-blur-md border-2 border-amber-300`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center text-white">
                  <div>
                    <h3 className="text-lg font-bold">
                      {isClearing ? '⏳ Auction Clearing in Progress' : '🔨 Auction Period Active'}
                    </h3>
                    <p className="text-sm">
                      {isClearing ? 'Orders are being matched - no new bids accepted' : 'Place your bids - auction clears at 12:00 PM ET'}
                    </p>
                    <p className="text-xs mt-1 opacity-80">
                      Last cleared: {Math.round((market.last_clearing_price || 0.5) * 100)}% (previous auction)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{timeRemaining}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex items-start justify-center p-4 overflow-y-auto">
          <div className="max-w-5xl w-full space-y-8 my-8">
            
            {/* Market Question Card */}
            <Card className="bg-white/95 backdrop-blur-md border-2 border-amber-300 shadow-2xl">
              <CardContent className="p-8 text-center">
                <Badge className="bg-amber-100 text-amber-800 mb-4">
                  {market.category?.replace('_', ' ').toUpperCase()}
                </Badge>
                <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                  {market.title}
                </h1>
                <p className="text-lg text-gray-600 mb-6">
                  {market.description}
                </p>
                <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Ends {format(new Date(market.resolution_date), "MMM d, yyyy")}
                  </div>
                  {isAuctionPeriod ? (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      {indicativePrice ? (
                        <>Indicative: {Math.round((indicativePrice.indicativePrice || 0.5) * 100)}% (based on {indicativePrice.totalOrders} bids)</>
                      ) : (
                        <>Last cleared: {Math.round((market.last_clearing_price || 0.5) * 100)}% (previous auction)</>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Last cleared: {Math.round((market.last_clearing_price || 0.5) * 100)}% (previous auction)
                    </div>
                  )}
                  {indicativePrice && indicativePrice.totalOrders > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {indicativePrice.totalOrders} bids placed
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Kalshi-Style Bid Card */}
            <BidCard
              market={market}
              auctionStats={auctionStats} // Added prop
              indicativePrice={indicativePrice}
              user={user}
              onBidSubmit={handleBidSubmit}
              isClearing={isClearing}
            />

            {/* Order Status Message */}
            {orderStatus && (
              <Card className={`${orderStatus.type === 'success' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'} border-2`}>
                <CardContent className="p-4 flex items-center gap-3">
                  {orderStatus.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <p className={`text-sm font-medium ${orderStatus.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                    {orderStatus.message}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Show charts after auction clears */}
            {!isAuctionPeriod && !isClearing && indicativePrice && indicativePrice.cumulativeBids && (
              <AuctionChart
                cumulativeBids={indicativePrice.cumulativeBids}
                cumulativeOffers={indicativePrice.cumulativeOffers}
                clearingPrice={indicativePrice.indicativePrice}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
