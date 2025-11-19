import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Filter,
  ArrowUpDown
} from "lucide-react";
import { motion } from "framer-motion";
import { format, differenceInDays } from "date-fns";

export default function AllMarketsPage() {
  const [markets, setMarkets] = useState([]);
  const [filteredMarkets, setFilteredMarkets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("volume");

  useEffect(() => {
    loadMarkets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [markets, searchQuery, categoryFilter, statusFilter, sortBy]);

  const loadMarkets = async () => {
    setIsLoading(true);
    try {
      const data = await Market.list("-created_date");
      setMarkets(data);
    } catch (error) {
      console.error("Error loading markets:", error);
    }
    setIsLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...markets];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(m => m.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    // Sorting
    switch (sortBy) {
      case "volume":
        filtered.sort((a, b) => (b.volume || 0) - (a.volume || 0));
        break;
      case "price_high":
        filtered.sort((a, b) => (b.current_price || 0) - (a.current_price || 0));
        break;
      case "price_low":
        filtered.sort((a, b) => (a.current_price || 0) - (b.current_price || 0));
        break;
      case "closing_soon":
        filtered.sort((a, b) => 
          new Date(a.resolution_date) - new Date(b.resolution_date)
        );
        break;
      case "newest":
        filtered.sort((a, b) => 
          new Date(b.created_date) - new Date(a.created_date)
        );
        break;
      default:
        break;
    }

    setFilteredMarkets(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-300";
      case "resolved": return "bg-blue-100 text-blue-800 border-blue-300";
      case "cancelled": return "bg-gray-100 text-gray-800 border-gray-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-[#4E3629] mb-2">All Markets</h1>
          <p className="text-lg text-[#4E3629]/60">
            Browse all prediction markets on Bruno Exchange
          </p>
        </motion.div>

        {/* Filters */}
        <Card className="bg-white/80 backdrop-blur-sm border-2 border-[#4E3629]/10 shadow-lg rounded-2xl mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#4E3629]/40" />
                <Input
                  placeholder="Search markets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-[#4E3629]/20 focus:border-[#A97142]"
                />
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="border-[#4E3629]/20 focus:border-[#A97142]">
                  <Filter className="w-4 h-4 mr-2 text-[#4E3629]/40" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="academics">Academics</SelectItem>
                  <SelectItem value="weather">Weather</SelectItem>
                  <SelectItem value="campus_politics">Campus Politics</SelectItem>
                  <SelectItem value="commencement">Commencement</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-[#4E3629]/20 focus:border-[#A97142]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="border-[#4E3629]/20 focus:border-[#A97142]">
                  <ArrowUpDown className="w-4 h-4 mr-2 text-[#4E3629]/40" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volume">Volume (High to Low)</SelectItem>
                  <SelectItem value="price_high">Price (High to Low)</SelectItem>
                  <SelectItem value="price_low">Price (Low to High)</SelectItem>
                  <SelectItem value="closing_soon">Closing Soon</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results Count */}
            <div className="mt-4 text-sm text-[#4E3629]/60">
              Showing {filteredMarkets.length} of {markets.length} markets
            </div>
          </CardContent>
        </Card>

        {/* Markets List */}
        <div className="space-y-4">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-32 bg-white/60 rounded-2xl animate-pulse" />
            ))
          ) : filteredMarkets.length > 0 ? (
            filteredMarkets.map((market, index) => (
              <motion.div
                key={market.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={createPageUrl(`Market?id=${market.slug}`)}>
                  <Card className="bg-white/80 backdrop-blur-sm border-2 border-[#4E3629]/10 hover:border-[#A97142]/40 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left: Market Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={getStatusColor(market.status)}>
                              {market.status.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="border-[#A97142] text-[#4E3629] capitalize">
                              {market.category?.replace('_', ' ')}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-[#4E3629]/60">
                              <Clock className="w-3 h-3" />
                              {differenceInDays(new Date(market.resolution_date), new Date())} days left
                            </div>
                          </div>
                          
                          <h3 className="text-lg font-bold text-[#4E3629] mb-2 leading-tight">
                            {market.title}
                          </h3>
                          
                          {market.description && (
                            <p className="text-sm text-[#4E3629]/60 line-clamp-2">
                              {market.description}
                            </p>
                          )}
                        </div>

                        {/* Right: Trading Info */}
                        <div className="flex lg:flex-col items-center lg:items-end gap-4 lg:gap-2 min-w-[200px]">
                          <div className="text-center lg:text-right">
                            <p className="text-xs text-[#4E3629]/60 mb-1">Current Price</p>
                            <div className="flex items-center gap-2">
                              <p className="text-3xl font-bold text-[#A97142]">
                                ${(market.current_price || 0.5).toFixed(2)}
                              </p>
                              {Math.random() > 0.5 ? (
                                <TrendingUp className="w-5 h-5 text-green-500" />
                              ) : (
                                <TrendingDown className="w-5 h-5 text-red-500" />
                              )}
                            </div>
                            <p className="text-xs text-[#4E3629]/60 mt-1">
                              {Math.round((market.current_price || 0.5) * 100)}% probability
                            </p>
                          </div>

                          <div className="text-center lg:text-right">
                            <p className="text-xs text-[#4E3629]/60 mb-1">Volume</p>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-[#A97142]" />
                              <p className="font-bold text-[#4E3629]">
                                {(market.volume || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))
          ) : (
            <Card className="bg-white/80 backdrop-blur-sm border-2 border-[#4E3629]/10 shadow-lg rounded-2xl">
              <CardContent className="p-12 text-center">
                <Search className="w-16 h-16 text-[#4E3629]/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[#4E3629]/60 mb-2">No markets found</h3>
                <p className="text-[#4E3629]/40">Try adjusting your filters or search query</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}