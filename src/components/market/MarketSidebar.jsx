import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, DollarSign, Users, Activity, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculatePortfolio } from "@/api/functions";

export default function MarketSidebar({ market, user, orders }) {
  const [portfolioData, setPortfolioData] = useState(null);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);

  useEffect(() => {
    if (user) {
      loadPortfolio();
    }
  }, [user]);

  const loadPortfolio = async () => {
    if (!user) return;
    setIsLoadingPortfolio(true);
    try {
      const response = await calculatePortfolio({ user_id: user.email });
      if (response && response.data) {
        setPortfolioData(response.data);
      }
    } catch (error) {
      console.error("Error loading portfolio:", error);
      setPortfolioData(null);
    }
    setIsLoadingPortfolio(false);
  };

  const totalVolume = orders.reduce((sum, o) => {
    if (o.status === 'filled') {
      return sum + (o.price * o.filled_quantity);
    }
    return sum;
  }, 0);

  const uniqueTraders = [...new Set(orders.map(o => o.user_id))].length;

  return (
    <div className="space-y-4">
      {/* Portfolio Summary */}
      {user && portfolioData && (
        <Card className="bg-gradient-to-br from-[#4E3629] to-[#6B5446] text-white border-2 border-[#A97142] shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Your Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-white/60 mb-1">Total Value</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={portfolioData.portfolio_value || 0}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="text-2xl font-bold"
                >
                  ${(portfolioData.portfolio_value || 0).toFixed(2)}
                </motion.p>
              </AnimatePresence>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20">
              <div>
                <p className="text-xs text-white/60">Cash</p>
                <p className="font-semibold">${(portfolioData.cash_balance || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-white/60">P/L</p>
                <p className={`font-semibold ${(portfolioData.unrealized_pnl || 0) >= 0 ? 'text-[#50C878]' : 'text-[#E34234]'}`}>
                  {(portfolioData.unrealized_pnl || 0) >= 0 ? '+' : ''}${(portfolioData.unrealized_pnl || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {user && isLoadingPortfolio && (
        <Card className="bg-gradient-to-br from-[#4E3629] to-[#6B5446] text-white border-2 border-[#A97142] shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            <p className="text-xs text-white/60 mt-2">Loading portfolio...</p>
          </CardContent>
        </Card>
      )}

      {/* Market Summary */}
      <Card className="bg-white/80 backdrop-blur-sm border-2 border-[#4E3629]/10 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-[#4E3629]/5 bg-gradient-to-r from-[#FAF3E0] to-[#F5EED8] pb-3">
          <CardTitle className="text-base font-semibold text-[#4E3629] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#A97142]" />
            Market Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-[#4E3629]/60 text-sm">
              <Activity className="w-4 h-4" />
              <span>Volume</span>
            </div>
            <span className="font-bold text-[#4E3629]">${totalVolume.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-[#4E3629]/60 text-sm">
              <Users className="w-4 h-4" />
              <span>Traders</span>
            </div>
            <span className="font-bold text-[#4E3629]">{uniqueTraders}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-[#4E3629]/60 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>Open Interest</span>
            </div>
            <span className="font-bold text-[#4E3629]">{orders.filter(o => o.status === 'open').length}</span>
          </div>

          <div className="pt-3 border-t border-[#4E3629]/10">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#4E3629]/60">Liquidity</span>
              <Badge className="bg-[#50C878]/10 text-[#50C878] border-[#50C878]/20">
                ${(market.liquidity || 1000).toLocaleString()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}