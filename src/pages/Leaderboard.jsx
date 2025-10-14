import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp,
  TrendingDown,
  Crown,
  Flame,
  Users,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLeaderboard } from "@/api/functions";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    loadLeaderboard();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadLeaderboard();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard({});
      if (data.success) {
        setLeaderboard(data.leaderboard);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    }
    setIsLoading(false);
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-amber-600" />;
      default: return <span className="text-xl font-bold text-[#FAF3E0]/60">#{rank}</span>;
    }
  };

  const getRankBg = (rank) => {
    switch (rank) {
      case 1: return "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400";
      case 2: return "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400";
      case 3: return "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500";
      default: return "bg-[#3A2920] border-[#A97142]";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#4E3629]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#A97142]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-[#4E3629]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6"
        >
          <div>
            <h1 className="text-4xl font-bold text-[#FAF3E0] mb-2 flex items-center gap-3">
              <Trophy className="w-10 h-10 text-[#CD853F]" />
              Leaderboard
            </h1>
            <p className="text-lg text-[#FAF3E0]/70">
              Top prediction traders at Brown University
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-[#FAF3E0]/60">Last updated</p>
              <p className="text-sm font-semibold text-[#FAF3E0]">
                {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Loading...'}
              </p>
            </div>
            <Button 
              onClick={loadLeaderboard}
              size="icon"
              className="bg-[#A97142] hover:bg-[#8B5A3C]"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </Button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Leaderboard */}
          <div className="lg:col-span-3">
            <Card className="bg-[#3A2920] border-2 border-[#A97142]">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl text-[#FAF3E0] flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-[#CD853F]" />
                    Top Traders
                  </CardTitle>
                  <Badge className="bg-gradient-to-r from-[#A97142] to-[#CD853F] text-white">
                    {leaderboard.length} Traders
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <AnimatePresence>
                    {leaderboard.map((trader, index) => (
                      <motion.div
                        key={trader.user_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] ${getRankBg(trader.rank)}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 flex items-center justify-center">
                            {getRankIcon(trader.rank)}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#A97142] to-[#CD853F] flex items-center justify-center text-2xl">
                              {trader.full_name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-[#FAF3E0] text-lg">{trader.full_name}</h3>
                              <p className="text-sm text-[#FAF3E0]/60">{trader.user_id}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-[#FAF3E0]/60 mb-1">Portfolio Value</p>
                            <p className="text-2xl font-bold text-[#FAF3E0]">
                              ${trader.portfolio_value.toFixed(2)}
                            </p>
                          </div>
                          
                          <div className="text-right min-w-[80px]">
                            <p className="text-sm text-[#FAF3E0]/60 mb-1">Return</p>
                            <div className="flex items-center gap-1">
                              {trader.total_return >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-400" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-400" />
                              )}
                              <p className={`text-lg font-bold ${trader.total_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {trader.total_return >= 0 ? '+' : ''}{trader.total_return.toFixed(1)}%
                              </p>
                            </div>
                          </div>

                          <div className="text-right min-w-[60px]">
                            <p className="text-sm text-[#FAF3E0]/60 mb-1">Trades</p>
                            <p className="text-lg font-semibold text-[#FAF3E0]">
                              {trader.total_trades}
                            </p>
                          </div>

                          {trader.rank <= 3 && (
                            <Badge className="bg-gradient-to-r from-[#CD853F] to-[#FFD700] text-[#4E3629] font-bold">
                              Top {trader.rank}
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            {/* Hall of Fame */}
            {leaderboard.length > 0 && (
              <Card className="bg-gradient-to-br from-[#3A2920] to-[#2A1F1A] border-2 border-[#CD853F]">
                <CardHeader>
                  <CardTitle className="text-lg text-[#FAF3E0] flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    Champion
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl border-2 border-yellow-400">
                    <div className="text-4xl mb-2">🏆</div>
                    <h3 className="font-bold text-[#FAF3E0] text-lg">{leaderboard[0].full_name}</h3>
                    <p className="text-sm text-[#FAF3E0]/60 mb-2">#1 Trader</p>
                    <p className="text-2xl font-bold text-green-400">
                      ${leaderboard[0].portfolio_value.toFixed(2)}
                    </p>
                    <p className="text-sm text-green-400 mt-1">
                      +{leaderboard[0].total_return.toFixed(1)}% return
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#FAF3E0]/60">Total Trades</span>
                      <span className="font-semibold text-[#FAF3E0]">{leaderboard[0].total_trades}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#FAF3E0]/60">Active Positions</span>
                      <span className="font-semibold text-[#FAF3E0]">{leaderboard[0].position_count}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Community Stats */}
            <Card className="bg-[#3A2920] border-2 border-[#A97142]">
              <CardHeader>
                <CardTitle className="text-lg text-[#FAF3E0] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#CD853F]" />
                  Community
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#FAF3E0]/70">Active Traders</span>
                  <span className="font-semibold text-[#FAF3E0]">{leaderboard.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#FAF3E0]/70">Total Volume</span>
                  <span className="font-semibold text-green-400">
                    ${leaderboard.reduce((sum, t) => sum + (t.portfolio_value - 100), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#FAF3E0]/70">Avg Portfolio</span>
                  <span className="font-semibold text-[#FAF3E0]">
                    ${leaderboard.length > 0 ? (leaderboard.reduce((sum, t) => sum + t.portfolio_value, 0) / leaderboard.length).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#FAF3E0]/70">Best Return</span>
                  <span className="font-semibold text-green-400">
                    +{leaderboard.length > 0 ? Math.max(...leaderboard.map(t => t.total_return)).toFixed(1) : '0.0'}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Streak */}
            <Card className="bg-gradient-to-br from-orange-900/30 to-red-900/30 border-2 border-orange-500">
              <CardHeader>
                <CardTitle className="text-lg text-[#FAF3E0] flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Hot Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <h3 className="font-bold text-[#FAF3E0] mb-2">Most Active</h3>
                  <p className="text-3xl font-bold text-orange-400 mb-1">
                    {leaderboard.length > 0 ? Math.max(...leaderboard.map(t => t.total_trades)) : 0}
                  </p>
                  <p className="text-sm text-[#FAF3E0]/60">trades executed</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}