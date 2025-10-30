
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Cloud,
  BookOpen,
  Users,
  Mic,
  Calendar as CalendarIcon,
  LayoutGrid,
  Clock,
  TrendingUp,
  ArrowRight,
  Trophy,
  Target,
  BarChart3,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

import MarketCard from "../components/markets/MarketCard";
import FeaturedMarkets from "../components/markets/FeaturedMarkets";

const categories = [
  { name: 'All', value: 'all', icon: LayoutGrid },
  { name: 'Academics', value: 'academics', icon: BookOpen },
  { name: 'Weather', value: 'weather', icon: Cloud },
  { name: 'Politics', value: 'campus_politics', icon: Users },
  { name: 'Commencement', value: 'commencement', icon: Mic },
  { name: 'Seasonal', value: 'seasonal', icon: CalendarIcon }
];

export default function MarketsPage() {
  const [markets, setMarkets] = useState([]);
  const [featuredMarkets, setFeaturedMarkets] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    loadMarkets();
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadMarkets = async () => {
    setIsLoading(true);
    try {
      const data = await Market.list("-created_date");
      
      const targetFeatured = [
        {
          titleSubstr: "Will it snow at Brown this week?",
          imageUrl: "https://images.unsplash.com/photo-1542601098-8fc114e148e2?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          overridePrice: null
        },
        {
          titleSubstr: "Will the median score of principles of ECON midterm I be above 65?",
          imageUrl: "/market-default.svg",
          overridePrice: null
        },
        {
          titleSubstr: "Will another Bajas open this year?",
          imageUrl: "/market-default.svg",
          overridePrice: 0.02
        },
      ];

      const featured = targetFeatured
        .map(target => {
          const market = data.find(m => m.title.includes(target.titleSubstr));
          if (market) {
            const updatedMarket = { ...market, image_url: target.imageUrl };
            if (target.overridePrice !== null) {
              updatedMarket.current_price = target.overridePrice;
            }
            return updatedMarket;
          }
          return null;
        })
        .filter(Boolean);

      setFeaturedMarkets(featured);
      setMarkets(data);
    } catch (error) {
      console.error("Error loading markets:", error);
    }
    setIsLoading(false);
  };

  const filteredMarkets = activeCategory === "all" ?
    markets :
    markets.filter((market) => market.category === activeCategory);

  const activeMarkets = markets.filter((m) => m.status === "active");
  const totalVolume = activeMarkets.reduce((sum, m) => sum + (m.volume || 0), 0);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <motion.div
        className="relative h-[600px] bg-cover bg-center overflow-hidden"
        style={{ 
          backgroundImage: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          backgroundAttachment: 'fixed'
        }}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.5 }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-[#4E3629]/90" />
        
        <div className="relative max-w-7xl mx-auto h-full flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 text-white z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <Badge className="bg-[#A97142] text-white mb-6 text-sm font-medium px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Brown University's Prediction Market
            </Badge>
          </motion.div>

          <motion.h1 
            className="text-5xl sm:text-6xl lg:text-8xl font-black mb-6 leading-tight"
            style={{ textShadow: '3px 3px 8px rgba(0,0,0,0.8)' }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            The Bruno Exchange
          </motion.h1>
          
          <motion.div
            className="space-y-3 mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
          >
            <p className="text-2xl sm:text-3xl lg:text-4xl text-[#FAF3E0] font-semibold" style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.7)' }}>
              Trade on campus events.
            </p>
            <p className="text-xl sm:text-2xl text-[#FAF3E0]/80" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
              Predict what happens next at Brown.
            </p>
          </motion.div>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <a href="#markets-grid" className="scroll-smooth">
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#A97142] to-[#CD853F] hover:from-[#8B5A3C] hover:to-[#A97142] text-white shadow-2xl hover:shadow-3xl transition-all duration-300 text-lg px-10 py-7 rounded-full font-bold"
              >
                Start Trading
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
            <Link to={createPageUrl("RequestMarket")}>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border-2 border-white/40 text-white hover:bg-white/20 text-lg px-10 py-7 rounded-full font-bold"
              >
                Request Market
              </Button>
            </Link>
            <Link to={createPageUrl("Leaderboard")}>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border-2 border-white/40 text-white hover:bg-white/20 text-lg px-10 py-7 rounded-full font-bold"
              >
                <Trophy className="w-5 h-5 mr-2" />
                Leaderboard
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Featured Markets */}
        <FeaturedMarkets featuredMarkets={featuredMarkets} />

        {/* Categories */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-[#4E3629] mb-8 text-center">Browse by Category</h2>
          <div className="flex justify-center">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl">
              {categories.map((cat) =>
                <motion.button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 group ${
                    activeCategory === cat.value ?
                      'bg-[#A97142] border-[#A97142] shadow-xl text-white' :
                      'bg-white/80 border-[#4E3629]/10 hover:border-[#A97142]/40 hover:shadow-lg text-[#4E3629]'
                  }`}
                >
                  <cat.icon className={`w-8 h-8 mb-3 transition-colors ${activeCategory === cat.value ? 'text-white' : 'text-[#A97142] group-hover:text-[#8B5A3C]'}`} />
                  <span className="text-sm font-bold text-center">{cat.name}</span>
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Markets Grid */}
        <div id="markets-grid" className="space-y-8">
          <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-2">
            <h2 className="text-4xl font-bold text-[#4E3629]">
              {activeCategory === "all" ? "All Markets" : `${categories.find((c) => c.value === activeCategory)?.name} Markets`}
            </h2>
            <div className="flex items-center gap-4 text-sm text-[#4E3629]/60">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span>{filteredMarkets.length} markets</span>
              </div>
              <span className="text-[#4E3629]/30">|</span>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>${totalVolume.toLocaleString()} volume</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {isLoading ?
              Array(6).fill(0).map((_, i) =>
                <div key={i} className="h-96 bg-white/60 rounded-3xl animate-pulse shadow-lg" />
              ) :

              filteredMarkets.map((market, index) =>
                <motion.div
                  key={market.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MarketCard market={market} />
                </motion.div>
              )
            }
          </div>

          {filteredMarkets.length === 0 && !isLoading &&
            <div className="text-center py-24">
              <Cloud className="w-24 h-24 text-[#4E3629]/20 mx-auto mb-6" />
              <h3 className="text-3xl font-semibold text-[#4E3629]/60 mb-4">No markets found</h3>
              <p className="text-[#4E3629]/40 text-lg mb-8">No markets in this category yet.</p>
              <Link to={createPageUrl("RequestMarket")}>
                <Button className="bg-gradient-to-r from-[#A97142] to-[#CD853F] text-white">
                  Request a Market
                </Button>
              </Link>
            </div>
          }
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#4E3629] border-t-2 border-[#A97142]/30 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-[#FAF3E0] font-bold mb-4">Markets</h4>
              <ul className="space-y-2 text-[#FAF3E0]/70 text-sm">
                <li><Link to={createPageUrl("Markets")} className="hover:text-[#A97142] transition">Browse All</Link></li>
                <li><Link to={createPageUrl("RequestMarket")} className="hover:text-[#A97142] transition">Request Market</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[#FAF3E0] font-bold mb-4">Trading</h4>
              <ul className="space-y-2 text-[#FAF3E0]/70 text-sm">
                <li><Link to={createPageUrl("Portfolio")} className="hover:text-[#A97142] transition">Portfolio</Link></li>
                <li><Link to={createPageUrl("Leaderboard")} className="hover:text-[#A97142] transition">Leaderboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[#FAF3E0] font-bold mb-4">Learn</h4>
              <ul className="space-y-2 text-[#FAF3E0]/70 text-sm">
                <li><Link to={createPageUrl("LearnMore")} className="hover:text-[#A97142] transition">How It Works</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[#FAF3E0] font-bold mb-4">Bruno Exchange</h4>
              <p className="text-[#FAF3E0]/70 text-sm mb-4">
                Brown University's prediction market platform for campus events.
              </p>
              <div className="w-16 h-16 opacity-30">
                <img 
                  src="/logo.svg"
                  alt="Brown Crest"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-[#FAF3E0]/10 text-center">
            <p className="text-sm text-[#FAF3E0]/50">
              © 2025 Bruno Exchange. Built for Brown University students. Educational use only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
