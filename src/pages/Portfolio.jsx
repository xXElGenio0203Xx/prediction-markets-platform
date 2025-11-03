
import React, { useEffect, useState } from "react";
import { useAuth } from "@/api/hooks";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Wallet,
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Trophy
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useMarketUpdates } from "../components/utils/marketUpdates"; // Make sure this path is correct

// Helper component to encapsulate the useMarketUpdates hook call
// This ensures React Hook rules are followed when subscribing to multiple dynamic market IDs.
const MarketUpdateSubscriber = React.memo(({ marketId, onUpdate }) => {
  useMarketUpdates(marketId, onUpdate);
  return null; // This component does not render anything
});

export default function PortfolioPage({ user: userFromLayout }) {
  const [positions, setPositions] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [portfolioData, setPortfolioData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMarketIds, setActiveMarketIds] = useState([]);
  const [cancellingOrder, setCancellingOrder] = useState(null);

  // Load portfolio data
  const loadPortfolioData = async () => {
    setIsLoading(true);
    try {
      // Load positions
      const positionsResponse = await api.getPositions();
      const positionsData = positionsResponse.positions || [];
      setPositions(positionsData);

      // Load portfolio summary
      const portfolioResponse = await api.getPortfolio();
      setPortfolioData(portfolioResponse.summary || {});

      // Track which markets user has positions in for realtime updates
      if (positionsData && positionsData.length > 0) {
        const marketIds = [...new Set(positionsData.map(p => p.marketId))];
        setActiveMarketIds(marketIds);
      } else {
        setActiveMarketIds([]);
      }
    } catch (error) {
      console.error("Error loading portfolio:", error);
      // Set default portfolio data on error
      setPortfolioData({
        availableBalance: 0,
        totalValue: 0,
        totalProfitLoss: 0,
        portfolioReturn: 0,
        openPositionsCount: 0,
        totalPositionsCount: 0
      });
      setActiveMarketIds([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (userFromLayout) {
      setUser(userFromLayout);
      loadPortfolioData();
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [userFromLayout]);

  // Callback for handling real-time market updates
  const handlePortfolioUpdate = (update) => {
    console.log('📊 Portfolio update received:', update);

    // Reload portfolio when trades happen in user's markets or market data changes
    if (user && (update.type === 'trade_executed' || update.type === 'market_updated')) {
      loadPortfolioData();
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    setCancellingOrder(orderId);
    try {
      await api.cancelOrder(orderId);
      alert('Order cancelled successfully!');
      await loadPortfolioData(user.email);
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert(`Failed to cancel order: ${error.message}`);
    }
    setCancellingOrder(null);
  };

  const statsCards = portfolioData ? [
    {
      title: "Cash Balance",
      value: `$${(portfolioData.availableBalance || 0).toFixed(2)}`,
      subtext: "Bruno Dollars",
      icon: Wallet,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      borderColor: "border-blue-300"
    },
    {
      title: "Portfolio Value",
      value: `$${(portfolioData.totalValue || 0).toFixed(2)}`,
      subtext: (portfolioData.portfolioReturn || 0) >= 0 ? `+${(portfolioData.portfolioReturn || 0).toFixed(1)}%` : `${(portfolioData.portfolioReturn || 0).toFixed(1)}%`,
      icon: (portfolioData.portfolioReturn || 0) >= 0 ? TrendingUp : TrendingDown,
      color: (portfolioData.portfolioReturn || 0) >= 0 ? "text-green-600" : "text-red-600",
      bgColor: (portfolioData.portfolioReturn || 0) >= 0 ? "bg-green-100" : "bg-red-100",
      borderColor: (portfolioData.portfolioReturn || 0) >= 0 ? "border-green-300" : "border-red-300"
    },
    {
      title: "Unrealized P/L",
      value: `$${(portfolioData.totalProfitLoss || 0).toFixed(2)}`,
      subtext: "Marked to market",
      icon: (portfolioData.totalProfitLoss || 0) >= 0 ? ArrowUpRight : ArrowDownRight,
      color: (portfolioData.totalProfitLoss || 0) >= 0 ? "text-green-600" : "text-red-600",
      bgColor: (portfolioData.totalProfitLoss || 0) >= 0 ? "bg-green-100" : "bg-red-100",
      borderColor: (portfolioData.totalProfitLoss || 0) >= 0 ? "border-green-300" : "border-red-300"
    },
    {
      title: "Open Positions",
      value: (portfolioData.openPositionsCount || 0).toString(),
      subtext: `${portfolioData.totalPositionsCount || 0} total`,
      icon: BarChart3,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      borderColor: "border-amber-300"
    }
  ] : [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#4E3629]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#A97142]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen py-8 bg-[#4E3629]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#FAF3E0] mb-4">Please sign in to view your portfolio</h1>
            <Link to={createPageUrl("Markets")}>
              <Button className="bg-gradient-to-r from-[#A97142] to-[#CD853F] text-white hover:from-[#8B5A3C] hover:to-[#A97142]">
                Go to Markets
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-[#4E3629]">
      {/* Render MarketUpdateSubscriber components for each active market ID */}
      {activeMarketIds.map(marketId => (
        <MarketUpdateSubscriber key={marketId} marketId={marketId} onUpdate={handlePortfolioUpdate} />
      ))}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6"
        >
          <div>
            <h1 className="text-4xl font-bold text-[#FAF3E0] mb-2">
              {user?.full_name}'s Portfolio
            </h1>
            <p className="text-lg text-[#FAF3E0]/70">
              Track your positions and performance • {user?.email}
            </p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl("Markets")}>
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#A97142] to-[#CD853F] hover:from-[#8B5A3C] hover:to-[#A97142] text-white shadow-lg"
              >
                Browse Markets
              </Button>
            </Link>
            <Link to={createPageUrl("Leaderboard")}>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-[#A97142] text-[#FAF3E0] hover:bg-[#A97142]/20"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Leaderboard
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statsCards.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`bg-[#3A2920] border-2 ${stat.borderColor} shadow-lg hover:shadow-xl transition-all duration-300`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#FAF3E0]/70 mb-1">{stat.title}</p>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={stat.value}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="text-2xl font-bold text-[#FAF3E0]"
                        >
                          {stat.value}
                        </motion.p>
                      </AnimatePresence>
                      {stat.subtext && (
                        <p className={`text-sm font-medium ${stat.color} mt-1`}>
                          {stat.subtext}
                        </p>
                      )}
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Portfolio Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="positions" className="space-y-6">
              <TabsList className="bg-[#3A2920] border-2 border-[#A97142]">
                <TabsTrigger
                  value="positions"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#A97142] data-[state=active]:to-[#CD853F] data-[state=active]:text-white text-[#FAF3E0]"
                >
                  Active Positions
                </TabsTrigger>
                <TabsTrigger
                  value="orders"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#A97142] data-[state=active]:to-[#CD853F] data-[state=active]:text-white text-[#FAF3E0]"
                >
                  My Orders
                </TabsTrigger>
              </TabsList>

              <TabsContent value="positions" className="space-y-4">
                {portfolioData && portfolioData.positions && portfolioData.positions.length > 0 ? (
                  portfolioData.positions.map((position, index) => {
                    const market = markets.find(m => m.id === position.market_id);
                    const marketName = market ? market.title : `Market ID: ${position.market_id}`;
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="bg-[#3A2920] border-2 border-[#A97142] hover:border-[#CD853F] transition-all">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-[#FAF3E0] mb-2">{marketName}</h3>
                                <Badge className={position.outcome === "yes" ? "bg-green-600 text-white" : "bg-red-600 text-white"}>
                                  {position.outcome.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <p className={`text-lg font-bold ${(position.unrealized_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {(position.unrealized_pnl || 0) >= 0 ? '+' : ''}${(position.unrealized_pnl || 0).toFixed(2)}
                                </p>
                                <p className="text-xs text-[#FAF3E0]/60">P/L</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-[#FAF3E0]/60">Shares</p>
                                <p className="font-semibold text-[#FAF3E0]">{position.shares || 0}</p>
                              </div>
                              <div>
                                <p className="text-[#FAF3E0]/60">Avg Price</p>
                                <p className="font-semibold text-[#FAF3E0]">
                                  ${((position.entry_price_outcome ?? position.avg_price) || 0).toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[#FAF3E0]/60">Current</p>
                                <p className="font-semibold text-[#FAF3E0]">
                                  ${(position.current_price || 0).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })
                ) : (
                  <Card className="bg-[#3A2920] border-2 border-[#A97142]">
                    <CardContent className="p-12 text-center">
                      <BarChart3 className="w-16 h-16 text-[#A97142] mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-semibold text-[#FAF3E0] mb-2">No positions yet</h3>
                      <p className="text-[#FAF3E0]/60 mb-6">Start trading to see your positions here</p>
                      <Link to={createPageUrl("Markets")}>
                        <Button className="bg-gradient-to-r from-[#A97142] to-[#CD853F] text-white">
                          Browse Markets
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="orders" className="space-y-4">
                {orders.length > 0 ? (
                  orders.slice(0, 10).map((order, index) => {
                    const market = markets.find(m => m.id === order.market_id);
                    const marketName = market ? market.title : `Market ID: ${order.market_id}`;
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="bg-[#3A2920] border-2 border-[#A97142]">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3 flex-1">
                                <Badge className={order.side === 'buy' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>
                                  {order.side.toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className="border-[#A97142] text-[#FAF3E0]">
                                  {order.outcome.toUpperCase()}
                                </Badge>
                                <span className="text-sm font-semibold text-[#FAF3E0] truncate">
                                  {marketName}
                                </span>
                                <span className="text-sm text-[#FAF3E0]/60">
                                  {order.quantity} @ ${(order.price || 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant="outline"
                                  className={
                                    order.status === 'filled' ? 'border-green-400 text-green-400' :
                                    order.status === 'open' ? 'border-blue-400 text-blue-400' :
                                    'border-gray-400 text-gray-400'
                                  }
                                >
                                  {order.status.toUpperCase()}
                                </Badge>
                                {order.status === 'open' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCancelOrder(order.id)}
                                    disabled={cancellingOrder === order.id}
                                    className="border-red-600 text-red-600 hover:bg-red-600/10"
                                  >
                                    {cancellingOrder === order.id ? 'Cancelling...' : 'Cancel'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })
                ) : (
                  <Card className="bg-[#3A2920] border-2 border-[#A97142]">
                    <CardContent className="p-12 text-center">
                      <BarChart3 className="w-16 h-16 text-[#A97142] mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-semibold text-[#FAF3E0] mb-2">No orders yet</h3>
                      <p className="text-[#FAF3E0]/60">Your orders will appear here</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="bg-[#3A2920] border-2 border-[#A97142]">
              <CardHeader>
                <CardTitle className="text-lg text-[#FAF3E0]">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to={createPageUrl("Markets")}>
                  <Button variant="outline" className="w-full justify-start border-[#A97142] text-[#FAF3E0] hover:bg-[#A97142]/20">
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Browse Markets
                  </Button>
                </Link>
                <Link to={createPageUrl("RequestMarket")}>
                  <Button variant="outline" className="w-full justify-start border-[#A97142] text-[#FAF3E0] hover:bg-[#A97142]/20">
                    <Send className="w-4 h-4 mr-2" />
                    Request a Market
                  </Button>
                </Link>
                <Link to={createPageUrl("Leaderboard")}>
                  <Button variant="outline" className="w-full justify-start border-[#A97142] text-[#FAF3E0] hover:bg-[#A97142]/20">
                    <Trophy className="w-4 h-4 mr-2" />
                    View Leaderboard
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Performance Summary */}
            <Card className="bg-gradient-to-br from-[#3A2920] to-[#2A1F1A] border-2 border-[#CD853F]">
              <CardHeader>
                <CardTitle className="text-lg text-[#FAF3E0]">Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[#FAF3E0]/70">Starting Balance</span>
                  <span className="font-semibold text-[#FAF3E0]">$100.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#FAF3E0]/70">Current Value</span>
                  <span className="font-semibold text-[#FAF3E0]">
                    ${portfolioData ? (portfolioData.portfolio_value || 0).toFixed(2) : '100.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-[#A97142]">
                  <span className="text-[#FAF3E0]/70">Total Return</span>
                  <span className={`font-bold text-lg ${portfolioData && (portfolioData.total_return || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {portfolioData ? ((portfolioData.total_return || 0) >= 0 ? '+' : '') + (portfolioData.total_return || 0).toFixed(1) + '%' : '0.0%'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
