
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Shield,
  CheckCircle,
  XCircle,
  Calendar,
  AlertCircle,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Search,
  ArrowUpDown,
  DollarSign as Dollar,
  PiggyBank,
  BarChart2
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { api } from "@/api/client";
import FeesTile from "../components/admin/FeesTile"; // Added import

export default function AdminPage({ user }) {
  const [markets, setMarkets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvingMarket, setResolvingMarket] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, market: null, outcome: null });
  const [systemBalance, setSystemBalance] = useState(null);
  const [economyValidation, setEconomyValidation] = useState(null);
  // New state variables for open positions and filtering
  const [openPositions, setOpenPositions] = useState([]);
  const [filteredPositions, setFilteredPositions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarketFilter, setSelectedMarketFilter] = useState('all');
  const [sortBy, setSortBy] = useState('value_locked'); // 'value_locked', 'shares', 'user_id', 'market_title', 'unrealized_pnl'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  // New state variables for balance reset and health check
  const [healthCheck, setHealthCheck] = useState(null);
  const [isResettingBalances, setIsResettingBalances] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // feesSummary state is removed as FeesTile will manage its own data

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      return;
    }
    loadMarkets();
    loadSystemBalance();
    loadEconomyValidation();
    loadSystemHealth(); // Load system health on mount

    // Removed fees summary loading logic as FeesTile will handle it internally
  }, [user]);

  // New useEffect to apply filters and sorting whenever positions or filter criteria change
  useEffect(() => {
    applyFiltersAndSort();
  }, [openPositions, searchQuery, selectedMarketFilter, sortBy, sortOrder]);

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

  const loadSystemBalance = async () => {
    try {
      const response = await validateSystemBalance({});
      // Access the data property from the axios response
      const data = response.data || response;
      setSystemBalance(data);

      // Extract and store open positions
      if (data?.positions?.detailed_positions) {
        setOpenPositions(data.positions.detailed_positions);
      } else {
        setOpenPositions([]);
      }
    } catch (error) {
      console.error("Error loading system balance:", error);
      setSystemBalance(null);
      setOpenPositions([]);
    }
  };

  const loadEconomyValidation = async () => {
    try {
      const { validateEconomy } = await import('@/api/functions');
      const response = await validateEconomy({});
      const data = response.data || response;
      setEconomyValidation(data);
    } catch (error) {
      console.error("Error loading economy validation:", error);
      setEconomyValidation(null);
    }
  };

  const loadSystemHealth = async () => {
    try {
      const response = await systemHealthCheck({});
      const data = response.data || response;
      setHealthCheck(data);
    } catch (error) {
      console.error("Error loading system health:", error);
      setHealthCheck(null);
    }
  };

  const handleResetBalances = async () => {
    if (!confirm('⚠️ WARNING: This will reset ALL user balances to $100 and fix negative/overcap balances. Are you absolutely sure?')) {
      return;
    }

    if (!confirm('This action will affect ALL users in the system. Type YES in the next prompt to confirm.')) {
      return;
    }

    const confirmText = prompt('Type YES to proceed with balance reset:');
    if (confirmText !== 'YES') {
      alert('Balance reset cancelled');
      return;
    }

    setIsResettingBalances(true);
    try {
      const response = await adminResetBalances({});
      const result = response.data || response;

      if (result.success) {
        alert(`✅ Balance reset complete!\n\n` +
          `Users processed: ${result.summary.total_users_processed}\n` +
          `Negatives fixed: ${result.summary.negatives_fixed}\n` +
          `Overcaps fixed: ${result.summary.overcap_fixed}\n` +
          `Balances reset: ${result.summary.balances_reset}\n\n` +
          `System ${result.system_integrity.is_balanced ? '✅ BALANCED' : '⚠️ IMBALANCED'}`);

        await loadSystemBalance();
        await loadEconomyValidation();
        await loadSystemHealth();
      } else {
        alert(`❌ Balance reset failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error resetting balances:", error);
      alert(`❌ Balance reset failed: ${error.message}`);
    }
    setIsResettingBalances(false);
  };

  const handleHealthCheck = async () => {
    setIsCheckingHealth(true);
    await loadSystemHealth();
    setIsCheckingHealth(false);
  };


  // New function to apply filters and sorting
  const applyFiltersAndSort = () => {
    let filtered = [...openPositions];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.user_id.toLowerCase().includes(query) ||
        p.market_title.toLowerCase().includes(query)
      );
    }

    // Apply market filter
    if (selectedMarketFilter !== 'all') {
      filtered = filtered.filter(p => p.market_id === selectedMarketFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'value_locked':
          aVal = a.value_locked;
          bVal = b.value_locked;
          break;
        case 'shares':
          aVal = a.shares;
          bVal = b.shares;
          break;
        case 'user_id':
          aVal = a.user_id;
          bVal = b.user_id;
          break;
        case 'market_title':
          aVal = a.market_title;
          bVal = b.market_title;
          break;
        case 'unrealized_pnl':
          aVal = a.unrealized_pnl;
          bVal = b.unrealized_pnl;
          break;
        default:
          aVal = a.value_locked; // Default sort
          bVal = b.value_locked;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setFilteredPositions(filtered);
  };

  // New function to toggle sort order
  const toggleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc'); // Default to descending when changing sort column
    }
  };

  const handleResolveClick = (market, outcome) => {
    setConfirmDialog({ open: true, market, outcome });
  };

  const handleConfirmResolve = async () => {
    const { market, outcome } = confirmDialog;
    setConfirmDialog({ open: false, market: null, outcome: null });
    setResolvingMarket(market.id);

    try {
      const response = await resolveMarket({
        market_id: market.id,
        outcome: outcome
      });

      // Access the data property from the axios response
      const result = response.data || response;

      if (result.success) {
        alert(`✅ Market resolved successfully!\n\n` +
          `Winning Outcome: ${result.summary.winning_outcome}\n` +
          `Winners Paid: ${result.payouts.winners_count}\n` +
          `Total Payout: $${result.payouts.total_payout.toFixed(2)}\n` +
          `Orders Refunded: ${result.refunds.refund_count} ($${result.refunds.total_refunded.toFixed(2)})`);
      }

      await loadMarkets();
      await loadSystemBalance(); // Reload system balance to update positions after resolution
      await loadEconomyValidation(); // Reload economy validation after resolution
      await loadSystemHealth(); // Reload system health after resolution
    } catch (error) {
      console.error("Error resolving market:", error);
      alert(`❌ Failed to resolve market: ${error.message}`);
    }

    setResolvingMarket(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4E3629] to-[#2A1F1A]">
        <Card className="bg-[#3A2920] border-2 border-[#A97142] p-8">
          <p className="text-[#FAF3E0] text-center">Please sign in to access admin panel</p>
        </Card>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4E3629] to-[#2A1F1A]">
        <Card className="bg-[#3A2920] border-2 border-[#E34234] p-8">
          <AlertCircle className="w-16 h-16 text-[#E34234] mx-auto mb-4" />
          <p className="text-[#FAF3E0] text-center text-xl font-bold">Access Denied</p>
          <p className="text-[#FAF3E0]/60 text-center mt-2">Admin privileges required</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4E3629] to-[#2A1F1A]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#A97142]"></div>
      </div>
    );
  }

  const activeMarkets = markets.filter(m => m.status === 'active');
  const resolvedMarkets = markets.filter(m => m.status === 'resolved');

  // Get unique markets for filter dropdown from open positions
  const uniqueMarkets = [...new Set(openPositions.map(p => ({
    id: p.market_id,
    title: p.market_title
  })).map(JSON.stringify))].map(JSON.parse);


  return (
    <div className="min-h-screen py-8 bg-gradient-to-br from-[#4E3629] to-[#2A1F1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#A97142] to-[#CD853F] rounded-full flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-[#FAF3E0]">Market Resolution Admin Panel</h1>
            </div>
            <Link to="/PlatformMetrics">
              <Button variant="outline" className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                Platform Metrics
              </Button>
            </Link>
          </div>
          <p className="text-lg text-[#FAF3E0]/70">
            Manage and resolve prediction markets • Verify payouts and system balance
          </p>
        </motion.div>

        {/* Stats Dashboard */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-[#3A2920]/80 backdrop-blur-sm border-2 border-[#A97142] hover:border-[#CD853F] transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[#FAF3E0]/70 text-sm mb-1">Total Markets</p>
                  <p className="text-3xl font-bold text-[#FAF3E0]">{markets.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-[#A97142]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#3A2920]/80 backdrop-blur-sm border-2 border-green-500 hover:border-green-400 transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[#FAF3E0]/70 text-sm mb-1">Active Markets</p>
                  <p className="text-3xl font-bold text-green-400">{activeMarkets.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#3A2920]/80 backdrop-blur-sm border-2 border-gray-500 hover:border-gray-400 transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[#FAF3E0]/70 text-sm mb-1">Resolved Markets</p>
                  <p className="text-3xl font-bold text-gray-400">{resolvedMarkets.length}</p>
                </div>
                <XCircle className="w-8 h-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#3A2920]/80 backdrop-blur-sm border-2 border-[#CD853F] hover:border-[#FFD700] transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[#FAF3E0]/70 text-sm mb-1">System Balance</p>
                  <p className="text-3xl font-bold text-[#CD853F]">
                    {systemBalance && systemBalance.balances ? `$${systemBalance.balances.total_system_value.toFixed(0)}` : '...'}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-[#CD853F]" />
              </div>
            </CardContent>
          </Card>
          {/* The Fees YTD card was removed from here */}
        </div>

        {/* FeesTile component added as a standalone block */}
        <div className="mb-6">
          <FeesTile />
        </div>

        {/* System Health Card */}
        {healthCheck && (
          <Card className="bg-[#3A2920]/80 backdrop-blur-sm border-2 border-[#A97142] mb-12">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl text-[#FAF3E0] flex items-center gap-2">
                  <Activity className="w-6 h-6 text-[#CD853F]" />
                  System Health Check
                </CardTitle>
                <div className="flex gap-3">
                  <Button
                    onClick={handleHealthCheck}
                    disabled={isCheckingHealth}
                    variant="outline"
                    size="sm"
                    className="border-[#A97142] text-[#FAF3E0] hover:bg-[#A97142]/20"
                  >
                    {isCheckingHealth ? 'Checking...' : 'Refresh'}
                  </Button>
                  <Button
                    onClick={handleResetBalances}
                    disabled={isResettingBalances}
                    variant="outline"
                    size="sm"
                    className="border-red-600 text-red-400 hover:bg-red-600/20"
                  >
                    {isResettingBalances ? 'Resetting...' : 'Reset All Balances'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <Badge className={healthCheck.status === 'HEALTHY' ?
                  "bg-green-600 text-white text-lg px-6 py-2" :
                  "bg-red-600 text-white text-lg px-6 py-2"
                }>
                  {healthCheck.status === 'HEALTHY' ? '✅ SYSTEM HEALTHY' : '⚠️ ISSUES DETECTED'}
                </Badge>
                {healthCheck.system && (
                  <span className="text-[#FAF3E0]/60 text-sm">
                    Mode: {healthCheck.system.trading_mode}
                  </span>
                )}
              </div>

              {/* Economy Stats */}
              {healthCheck.economy && (
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-[#2A1F1A]/50 p-4 rounded-lg">
                    <p className="text-[#FAF3E0]/60 text-xs mb-1">Total Cash</p>
                    <p className="text-2xl font-bold text-[#CD853F]">
                      ${typeof healthCheck.economy.total_cash_in_circulation === 'number'
                        ? healthCheck.economy.total_cash_in_circulation.toFixed(2)
                        : healthCheck.economy.total_cash_in_circulation}
                    </p>
                  </div>

                  <div className="bg-[#2A1F1A]/50 p-4 rounded-lg">
                    <p className="text-[#FAF3E0]/60 text-xs mb-1">Locked Value</p>
                    <p className="text-2xl font-bold text-[#A97142]">
                      ${typeof healthCheck.economy.total_value_locked_in_positions === 'number'
                        ? healthCheck.economy.total_value_locked_in_positions.toFixed(2)
                        : healthCheck.economy.total_value_locked_in_positions}
                    </p>
                  </div>

                  <div className="bg-[#2A1F1A]/50 p-4 rounded-lg">
                    <p className="text-[#FAF3E0]/60 text-xs mb-1">Expected Total</p>
                    <p className="text-2xl font-bold text-[#FAF3E0]">
                      ${typeof healthCheck.economy.expected_system_total === 'number'
                        ? healthCheck.economy.expected_system_total.toFixed(2)
                        : healthCheck.economy.expected_system_total}
                    </p>
                  </div>

                  <div className="bg-[#2A1F1A]/50 p-4 rounded-lg">
                    <p className="text-[#FAF3E0]/60 text-xs mb-1">Balance</p>
                    <p className={`text-2xl font-bold ${healthCheck.economy.is_balanced ? 'text-green-400' : 'text-red-400'}`}>
                      {healthCheck.economy.balance_percentage}
                    </p>
                  </div>
                </div>
              )}

              {/* Issues */}
              {healthCheck.issues && (healthCheck.issues.negative_balances > 0 || healthCheck.issues.overcap_balances > 0) && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400 font-semibold mb-2">⚠️ Issues Detected:</p>
                  <ul className="text-[#FAF3E0]/80 text-sm space-y-1">
                    {healthCheck.issues.negative_balances > 0 && (
                      <li>• {healthCheck.issues.negative_balances} users with negative balances</li>
                    )}
                    {healthCheck.issues.overcap_balances > 0 && (
                      <li>• {healthCheck.issues.overcap_balances} users with unrealistic balances (&gt;$10,000)</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {healthCheck.recommendations && healthCheck.recommendations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[#FAF3E0] font-semibold">Recommended Actions:</p>
                  {healthCheck.recommendations.map((rec, idx) => (
                    <p key={idx} className="text-[#FAF3E0]/70 text-sm">
                      {rec}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* System Balance Validation */}
        {systemBalance && systemBalance.balances && (
          <Card className="bg-[#3A2920]/80 backdrop-blur-sm border-2 border-[#A97142] mb-12">
            <CardHeader>
              <CardTitle className="text-lg text-[#FAF3E0] flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#CD853F]" />
                System Balance Validation
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-[#FAF3E0]/60 text-sm mb-1">Cash in Circulation</p>
                <p className="text-2xl font-bold text-[#FAF3E0]">
                  ${systemBalance.balances.total_cash.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[#FAF3E0]/60 text-sm mb-1">Locked in Positions</p>
                <p className="text-2xl font-bold text-[#FAF3E0]">
                  ${systemBalance.balances.total_locked_in_positions.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[#FAF3E0]/60 text-sm mb-1">System Status</p>
                <Badge className={systemBalance.validation.is_balanced ? "bg-green-600 text-white" : "bg-red-600 text-white"}>
                  {systemBalance.validation.is_balanced ? '✅ BALANCED' : '⚠️ IMBALANCED'}
                </Badge>
                {!systemBalance.validation.is_balanced && (
                  <p className="text-xs text-red-400 mt-1">
                    Difference: ${Math.abs(systemBalance.validation.difference).toFixed(2)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Economy Validation Card */}
        {economyValidation && (
          <Card className="bg-[#3A2920]/80 backdrop-blur-sm border-2 border-[#A97142] mb-12">
            <CardHeader>
              <CardTitle className="text-lg text-[#FAF3E0] flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#CD853F]" />
                Economy Sanity Check
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <Badge className={economyValidation.validation.is_balanced ?
                  "bg-green-600 text-white text-lg px-6 py-2" :
                  "bg-red-600 text-white text-lg px-6 py-2"
                }>
                  {economyValidation.validation.is_balanced ? '✅ SYSTEM BALANCED' : '⚠️ IMBALANCE DETECTED'}
                </Badge>
                {!economyValidation.validation.is_balanced && (
                  <span className="text-red-400 font-semibold">
                    Difference: ${Math.abs(economyValidation.validation.difference).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Breakdown */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-[#2A1F1A]/50 p-4 rounded-lg">
                  <p className="text-[#FAF3E0]/60 text-xs mb-1">Expected Total</p>
                  <p className="text-2xl font-bold text-[#FAF3E0]">
                    ${economyValidation.breakdown.total_initial.toFixed(2)}
                  </p>
                  <p className="text-xs text-[#FAF3E0]/40 mt-1">
                    {economyValidation.users.verified} verified users × $100
                  </p>
                </div>

                <div className="bg-[#2A1F1A]/50 p-4 rounded-lg">
                  <p className="text-[#FAF3E0]/60 text-xs mb-1">Cash in Circulation</p>
                  <p className="text-2xl font-bold text-[#CD853F]">
                    ${economyValidation.breakdown.total_cash.toFixed(2)}
                  </p>
                </div>

                <div className="bg-[#2A1F1A]/50 p-4 rounded-lg">
                  <p className="text-[#FAF3E0]/60 text-xs mb-1">Locked in Positions</p>
                  <p className="text-2xl font-bold text-[#A97142]">
                    ${economyValidation.breakdown.total_locked.toFixed(2)}
                  </p>
                  <p className="text-xs text-[#FAF3E0]/40 mt-1">
                    {economyValidation.positions.active} active positions
                  </p>
                </div>

                <div className="bg-[#2A1F1A]/50 p-4 rounded-lg">
                  <p className="text-[#FAF3E0]/60 text-xs mb-1">Actual Total</p>
                  <p className={`text-2xl font-bold ${economyValidation.validation.is_balanced ? 'text-green-400' : 'text-red-400'}`}>
                    ${economyValidation.breakdown.total_actual.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Validation Formula */}
              <div className="bg-[#4E3629]/30 p-4 rounded-lg border border-[#A97142]/30">
                <p className="text-[#FAF3E0] font-mono text-sm">
                  totalInitial ({economyValidation.breakdown.total_initial.toFixed(2)}) =
                  totalCash ({economyValidation.breakdown.total_cash.toFixed(2)}) +
                  totalLocked ({economyValidation.breakdown.total_locked.toFixed(2)}) =
                  <span className={economyValidation.validation.is_balanced ? 'text-green-400' : 'text-red-400'}>
                    {' '}{economyValidation.breakdown.total_actual.toFixed(2)}
                  </span>
                </p>
              </div>

              <Button
                onClick={loadEconomyValidation}
                variant="outline"
                size="sm"
                className="border-[#A97142] text-[#FAF3E0] hover:bg-[#A97142]/20"
              >
                Refresh Validation
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Open Positions Overview */}
        {openPositions.length > 0 && (
          <Card className="bg-[#3A2920]/80 backdrop-blur-sm border-2 border-[#A97142] mb-12">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl text-[#FAF3E0] flex items-center gap-2">
                  <Users className="w-6 h-6 text-[#CD853F]" />
                  Open Positions Overview
                </CardTitle>
                <Badge className="bg-[#CD853F] text-white">
                  {openPositions.length} positions • ${systemBalance?.balances?.total_locked_in_positions.toFixed(2)} locked
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters and Search */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#FAF3E0]/40" />
                  <Input
                    placeholder="Search by user ID or market name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#2A1F1A] border-[#A97142] text-[#FAF3E0] placeholder:text-[#FAF3E0]/40"
                  />
                </div>
                <select
                  value={selectedMarketFilter}
                  onChange={(e) => setSelectedMarketFilter(e.target.value)}
                  className="px-4 py-2 bg-[#2A1F1A] border-2 border-[#A97142] rounded-lg text-[#FAF3E0] focus:outline-none focus:border-[#CD853F]"
                >
                  <option value="all">All Markets</option>
                  {uniqueMarkets.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              {/* Positions Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-[#A97142]">
                      <th className="text-left py-3 px-4 text-[#FAF3E0]/70 font-semibold text-sm cursor-pointer hover:text-[#CD853F]" onClick={() => toggleSort('market_title')}>
                        <div className="flex items-center gap-2">
                          Market
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 text-[#FAF3E0]/70 font-semibold text-sm cursor-pointer hover:text-[#CD853F]" onClick={() => toggleSort('user_id')}>
                        <div className="flex items-center gap-2">
                          User
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 text-[#FAF3E0]/70 font-semibold text-sm">
                        Outcome
                      </th>
                      <th className="text-right py-3 px-4 text-[#FAF3E0]/70 font-semibold text-sm cursor-pointer hover:text-[#CD853F]" onClick={() => toggleSort('shares')}>
                        <div className="flex items-center justify-end gap-2">
                          Shares
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="text-right py-3 px-4 text-[#FAF3E0]/70 font-semibold text-sm">
                        Avg Price
                      </th>
                      <th className="text-right py-3 px-4 text-[#FAF3E0]/70 font-semibold text-sm cursor-pointer hover:text-[#CD853F]" onClick={() => toggleSort('value_locked')}>
                        <div className="flex items-center justify-end gap-2">
                          Value Locked
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="text-right py-3 px-4 text-[#FAF3E0]/70 font-semibold text-sm cursor-pointer hover:text-[#CD853F]" onClick={() => toggleSort('unrealized_pnl')}>
                        <div className="flex items-center justify-end gap-2">
                          Unrealized P/L
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPositions.length > 0 ? (
                      filteredPositions.map((position) => (
                        <tr
                          key={position.position_id}
                          className="border-b border-[#A97142]/30 hover:bg-[#2A1F1A]/50 transition-colors"
                        >
                          <td className="py-3 px-4 text-[#FAF3E0] text-sm max-w-[200px] truncate">
                            {position.market_title}
                          </td>
                          <td className="py-3 px-4 text-[#FAF3E0]/80 text-sm">
                            {position.user_id}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={position.outcome === 'yes' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>
                              {position.outcome.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right text-[#FAF3E0] font-semibold">
                            {position.shares}
                          </td>
                          <td className="py-3 px-4 text-right text-[#FAF3E0]/80 text-sm">
                            ${position.avg_price.toFixed(3)}
                          </td>
                          <td className="py-3 px-4 text-right text-[#CD853F] font-bold">
                            ${position.value_locked.toFixed(2)}
                          </td>
                          <td className={`py-3 px-4 text-right font-semibold ${position.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {position.unrealized_pnl >= 0 ? '+' : ''}${position.unrealized_pnl.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-[#FAF3E0]/60">
                          No positions match your filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredPositions.length > 0 && (
                <div className="mt-4 text-sm text-[#FAF3E0]/60 text-right">
                  Showing {filteredPositions.length} of {openPositions.length} total open positions
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active Markets - Need Resolution */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-[#FAF3E0] mb-6 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            Active Markets
          </h2>
          <div className="space-y-4">
            {activeMarkets.length > 0 ? (
              activeMarkets.map((market, index) => (
                <motion.div
                  key={market.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-[#3A2920]/80 backdrop-blur-sm border-2 border-[#A97142] hover:border-[#CD853F] transition-all">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-3">
                            <Badge className="bg-green-600 text-white font-semibold">ACTIVE</Badge>
                            <Badge variant="outline" className="border-[#A97142] text-[#FAF3E0]">
                              {market.category.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>

                          <h3 className="text-xl font-bold text-[#FAF3E0] mb-2">
                            {market.title}
                          </h3>

                          <p className="text-[#FAF3E0]/70 mb-4">{market.description}</p>

                          <div className="flex items-center gap-4 text-sm text-[#FAF3E0]/60">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>Resolves: {format(new Date(market.resolution_date), 'MMM d, yyyy')}</span>
                            </div>
                            <span>•</span>
                            <span>Price: ${(market.current_price || 0.5).toFixed(2)}</span>
                            <span>•</span>
                            <span>Volume: ${(market.volume || 0).toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 min-w-[200px]">
                          <Button
                            onClick={() => handleResolveClick(market, true)}
                            disabled={resolvingMarket === market.id}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-6 rounded-xl shadow-lg"
                          >
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Resolve as YES
                          </Button>
                          <Button
                            onClick={() => handleResolveClick(market, false)}
                            disabled={resolvingMarket === market.id}
                            className="bg-[#E34234] hover:bg-[#C93529] text-white font-bold py-6 rounded-xl shadow-lg"
                          >
                            <XCircle className="w-5 h-5 mr-2" />
                            Resolve as NO
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card className="bg-[#3A2920]/80 backdrop-blur-sm border-2 border-[#A97142]">
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-[#A97142] mx-auto mb-4 opacity-50" />
                  <p className="text-[#FAF3E0]/60 text-lg">No active markets to resolve</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Resolved Markets */}
        <div>
          <h2 className="text-2xl font-bold text-[#FAF3E0] mb-6 flex items-center gap-2">
            <XCircle className="w-6 h-6 text-gray-500" />
            Resolved Markets
          </h2>
          <div className="space-y-4">
            {resolvedMarkets.length > 0 ? (
              resolvedMarkets.map((market, index) => (
                <motion.div
                  key={market.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-[#3A2920]/80 backdrop-blur-sm border-2 border-gray-600">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-3">
                            <Badge className="bg-gray-600 text-white font-semibold">RESOLVED</Badge>
                            <Badge
                              className={market.resolved_outcome ?
                                "bg-green-600 text-white font-bold" :
                                "bg-[#E34234] text-white font-bold"
                              }
                            >
                              {market.resolved_outcome ? '✅ YES' : '❌ NO'}
                            </Badge>
                          </div>

                          <h3 className="text-xl font-bold text-[#FAF3E0] mb-2">
                            {market.title}
                          </h3>

                          <p className="text-[#FAF3E0]/70 text-sm">
                            Resolved on {format(new Date(market.updated_date), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card className="bg-[#3A2920]/80 backdrop-blur-sm border-2 border-[#A97142]">
                <CardContent className="p-12 text-center">
                  <XCircle className="w-16 h-16 text-[#A97142] mx-auto mb-4 opacity-50" />
                  <p className="text-[#FAF3E0]/60 text-lg">No resolved markets yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, market: null, outcome: null })}>
        <DialogContent className="bg-[#3A2920] border-2 border-[#A97142] text-[#FAF3E0]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Confirm Market Resolution</DialogTitle>
            <DialogDescription className="text-[#FAF3E0]/70 text-lg">
              {confirmDialog.market && (
                <>Are you sure you want to resolve "{confirmDialog.market.title}" as <span className={confirmDialog.outcome ? "text-green-400 font-bold" : "text-red-400 font-bold"}>{confirmDialog.outcome ? 'YES' : 'NO'}</span>?</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="my-6 space-y-3 text-sm">
            <p className="text-[#FAF3E0]/90">This action will:</p>
            <div className="space-y-2 pl-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <span>Pay <span className="font-bold">${'1.00'}/share</span> to <span className={confirmDialog.outcome ? "text-green-400" : "text-red-400"}>{confirmDialog.outcome ? 'YES' : 'NO'}</span> holders</span>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <span>Pay <span className="font-bold">$0.00/share</span> to <span className={confirmDialog.outcome ? "text-red-400" : "text-green-400"}>{confirmDialog.outcome ? 'NO' : 'YES'}</span> holders</span>
              </div>
              <div className="flex items-start gap-2">
                <Dollar className="w-5 h-5 text-[#CD853F] mt-0.5" />
                <span>Refund all unfilled buy orders</span>
              </div>
              <div className="flex items-start gap-2">
                <Activity className="w-5 h-5 text-[#A97142] mt-0.5" />
                <span>Log all transactions for audit trail</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, market: null, outcome: null })}
              className="border-[#A97142] text-[#FAF3E0] hover:bg-[#A97142]/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmResolve}
              className={confirmDialog.outcome ?
                "bg-green-600 hover:bg-green-700 text-white font-bold" :
                "bg-[#E34234] hover:bg-[#C93529] text-white font-bold"
              }
            >
              Confirm Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
