import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Cloud, 
  Thermometer, 
  Droplets, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Volume2,
  ArrowRight,
  Users,
  Mic,
  BookOpen,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

const categoryIcons = {
  weather: Cloud,
  temperature: Thermometer,
  precipitation: Droplets,
  events: Calendar,
  seasonal: Calendar,
  campus_politics: Users,
  commencement: Mic,
  academics: BookOpen
};

const categoryColors = {
  weather: "bg-blue-100 text-blue-800 border-blue-200",
  temperature: "bg-red-100 text-red-800 border-red-200", 
  precipitation: "bg-cyan-100 text-cyan-800 border-cyan-200",
  events: "bg-purple-100 text-purple-800 border-purple-200",
  seasonal: "bg-green-100 text-green-800 border-green-200",
  campus_politics: "bg-indigo-100 text-indigo-800 border-indigo-200",
  commencement: "bg-violet-100 text-violet-800 border-violet-200",
  academics: "bg-yellow-100 text-yellow-800 border-yellow-200"
};

export default function MarketCard({ market }) {
  const CategoryIcon = categoryIcons[market.category] || Cloud;
  const priceChange = Math.random() > 0.5 ? 1 : -1;
  const changePercent = (Math.random() * 10).toFixed(1);

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="group bg-white/90 backdrop-blur-sm border-2 border-[#4E3629]/10 hover:border-[#A97142]/40 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-3xl overflow-hidden h-full">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start mb-3">
            <Badge 
              variant="secondary" 
              className={`${categoryColors[market.category]} border font-medium`}
            >
              <CategoryIcon className="w-3 h-3 mr-1" />
              {market.category}
            </Badge>
            <div className="flex items-center gap-1 text-sm">
              {priceChange > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={priceChange > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {priceChange > 0 ? "+" : ""}{changePercent}%
              </span>
            </div>
          </div>
          
          <CardTitle className="text-lg leading-tight group-hover:text-[#A97142] transition-colors mb-3">
            {market.title}
          </CardTitle>
          
          <p className="text-sm text-[#4E3629]/60 line-clamp-2">
            {market.description}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Price Display with Mini Chart */}
          <div className="bg-gradient-to-br from-[#FAF3E0] to-[#F5EED8] rounded-2xl p-5 border-2 border-[#A97142]/20">
            <div className="flex justify-between items-center mb-2">
              <div>
                <p className="text-xs text-[#4E3629]/60 mb-1">Current Price</p>
                <p className="text-3xl font-black text-[#A97142]">
                  ${(market.current_price || 0.5).toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#4E3629]/60 mb-1">Implied Probability</p>
                <p className="text-2xl font-bold text-[#4E3629]">
                  {Math.round((market.current_price || 0.5) * 100)}%
                </p>
              </div>
            </div>

            {/* Probability Bar */}
            <div className="h-2 bg-[#4E3629]/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#A97142] to-[#CD853F]"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round((market.current_price || 0.5) * 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#4E3629]/40" />
              <div>
                <p className="text-xs text-[#4E3629]/60">Volume</p>
                <p className="font-bold text-[#4E3629]">${(market.volume || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#4E3629]/40" />
              <div>
                <p className="text-xs text-[#4E3629]/60">Closes</p>
                <p className="font-bold text-[#4E3629]">
                  {format(new Date(market.resolution_date), "MMM d")}
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Link to={createPageUrl(`Market?id=${market.id}`)}>
            <Button 
              className="w-full bg-gradient-to-r from-[#A97142] to-[#CD853F] hover:from-[#8B5A3C] hover:to-[#A97142] text-white font-bold py-6 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300"
            >
              <span>Trade Market</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}