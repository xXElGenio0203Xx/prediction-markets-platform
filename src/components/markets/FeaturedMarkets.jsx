
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Star, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const CarouselCard = ({ market }) => (
  <Card className="bg-white border-2 border-amber-300 shadow-xl hover:shadow-2xl transition-shadow duration-300 overflow-hidden h-full">
    <div 
      className="relative h-48 bg-cover bg-center"
      style={{
        backgroundImage: `url('${market.image_url || "/market-default.svg"}')`
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute top-4 left-4">
        <Badge className="bg-gradient-to-r from-amber-600 to-red-600 text-white shadow-lg">
          <Star className="w-3 h-3 mr-1" />
          Featured
        </Badge>
      </div>
      <div className="absolute bottom-4 right-4 text-white text-right">
        <p className="text-sm font-medium opacity-90">Ends</p>
        <p className="font-bold text-lg">
          {format(new Date(market.resolution_date), "MMM d, yyyy")}
        </p>
      </div>
      <div className="absolute bottom-4 left-4">
        <Badge className="bg-white/20 backdrop-blur-sm text-white border border-white/30 capitalize">
          {market.category.replace('_', ' ')} • Brown Campus
        </Badge>
      </div>
    </div>

    <CardContent className="p-6">
      <CardTitle className="text-2xl text-gray-900 leading-tight mb-3">
        {market.title}
      </CardTitle>
      
      <p className="text-gray-700 mb-6 text-base line-clamp-2">
        {market.description}
      </p>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200 mb-6">
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <p className="text-sm font-medium text-gray-600">YES</p>
            </div>
            <p className="text-4xl font-bold text-green-600 mb-1">
              ${(market.current_price || 0.5).toFixed(2)}
            </p>
            <p className="text-sm text-green-600">
              {Math.round((market.current_price || 0.5) * 100)}% implied
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <p className="text-sm font-medium text-gray-600">NO</p>
            </div>
            <p className="text-4xl font-bold text-red-600 mb-1">
              ${(1 - (market.current_price || 0.5)).toFixed(2)}
            </p>
            <p className="text-sm text-red-600">
              {Math.round((1 - (market.current_price || 0.5)) * 100)}% implied
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-amber-300">
          <div className="flex gap-4">
            <Link to={createPageUrl(`Market?id=${market.id}`)} className="flex-1">
              <Button className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold">
                Buy YES • ${(market.current_price || 0.5).toFixed(2)}
              </Button>
            </Link>
            <Link to={createPageUrl(`Market?id=${market.id}`)} className="flex-1">
              <Button className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold">
                Buy NO • ${(1 - (market.current_price || 0.5)).toFixed(2)}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center text-sm">
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
          <p className="text-gray-600 mb-1">Volume</p>
          <p className="font-bold text-amber-800">${(market.volume || 0).toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
          <p className="text-gray-600 mb-1">Traders</p>
          <p className="font-bold text-amber-800">127</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
          <p className="text-gray-600 mb-1">Liquidity</p>
          <p className="font-bold text-amber-800">${(market.liquidity || 0).toLocaleString()}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function FeaturedMarkets({ featuredMarkets }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (featuredMarkets.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % featuredMarkets.length);
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [featuredMarkets.length]);

  if (!featuredMarkets || featuredMarkets.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-orange-500" />
          <h2 className="text-2xl font-bold text-gray-900">Featured Markets</h2>
        </div>
        <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
          Hot
        </Badge>
      </div>

      <div>
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="h-full"
          >
            <CarouselCard market={featuredMarkets[currentIndex]} />
          </motion.div>
        </AnimatePresence>
        {featuredMarkets.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {featuredMarkets.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                  currentIndex === index ? 'bg-amber-600' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
