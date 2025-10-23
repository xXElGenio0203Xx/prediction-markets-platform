import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { TrendingUp, TrendingDown, Activity, Target, Award, PieChart } from 'lucide-react';

export default function PortfolioAnalytics() {
  const [period, setPeriod] = useState('30d');

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['portfolio-analytics', period],
    queryFn: () => api.getPortfolioAnalytics(period),
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-500">Error loading analytics</div>
      </div>
    );
  }

  const {
    totalPL,
    realizedPL,
    unrealizedPL,
    plOverTime,
    winRate,
    totalTrades,
    avgReturn,
    bestMarkets,
    worstMarkets,
    diversificationScore,
    sharpeRatio,
    activePositions,
  } = analytics;

  const isPositive = totalPL >= 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Analytics</h1>
          <p className="text-muted-foreground">Track your performance and insights</p>
        </div>
        
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="24h">24H</TabsTrigger>
            <TabsTrigger value="7d">7D</TabsTrigger>
            <TabsTrigger value="30d">30D</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              ${totalPL.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground space-y-1 mt-2">
              <div>Realized: ${realizedPL.toFixed(2)}</div>
              <div>Unrealized: ${unrealizedPL.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Award className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Based on {totalTrades} trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sharpeRatio.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Risk-adjusted returns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diversification</CardTitle>
            <PieChart className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{diversificationScore.toFixed(0)}/100</div>
            <p className="text-xs text-muted-foreground">
              {activePositions} active positions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* P&L Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Over Time</CardTitle>
          <CardDescription>Cumulative P&L performance</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={plOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#8884d8"
                fill="#8884d8"
                name="Cumulative P&L"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Performing Markets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Best Performing Markets
            </CardTitle>
            <CardDescription>Top 5 markets by profit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bestMarkets.map((market, idx) => (
                <div key={market.marketId} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">#{idx + 1}</span>
                      <span className="text-sm truncate">{market.marketName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {market.trades} trades
                    </div>
                  </div>
                  <div className="text-sm font-bold text-green-500">
                    +${market.pl.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Worst Performing Markets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Worst Performing Markets
            </CardTitle>
            <CardDescription>Bottom 5 markets by profit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {worstMarkets.map((market, idx) => (
                <div key={market.marketId} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">#{idx + 1}</span>
                      <span className="text-sm truncate">{market.marketName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {market.trades} trades
                    </div>
                  </div>
                  <div className="text-sm font-bold text-red-500">
                    ${market.pl.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Detailed trading statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-muted-foreground">Total Trades</div>
              <div className="text-2xl font-bold">{totalTrades}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avg Return/Trade</div>
              <div className={`text-2xl font-bold ${avgReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${avgReturn.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
              <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
              <div className="text-2xl font-bold">{sharpeRatio.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
