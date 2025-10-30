import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Activity, TrendingUp, BarChart3, Droplets } from 'lucide-react';

export default function MarketAnalytics() {
  const { slug } = useParams();
  const [period, setPeriod] = useState('7d');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['market-analytics', slug, period],
    queryFn: () => api.getMarketAnalytics(slug, period),
    enabled: !!slug,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  if (!analytics) {
    return <div className="container mx-auto py-8">No data available</div>;
  }

  const {
    market,
    orderBookHeatmap,
    tradeFlow,
    spreadOverTime,
    volumeProfile,
    liquidityDepth,
    probabilityOverTime,
    currentSpread,
    totalVolume,
    totalTrades,
  } = analytics;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Market Analytics</h1>
          <p className="text-muted-foreground">{market.question}</p>
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVolume.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">shares traded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTrades}</div>
            <p className="text-xs text-muted-foreground">transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YES Spread</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(currentSpread.yes * 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">cents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NO Spread</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(currentSpread.no * 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">cents</p>
          </CardContent>
        </Card>
      </div>

      {/* Probability Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Implied Probability Over Time</CardTitle>
          <CardDescription>Market sentiment from trade prices</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={probabilityOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="yesProb" stroke="#22c55e" name="YES" strokeWidth={2} />
              <Line type="monotone" dataKey="noProb" stroke="#ef4444" name="NO" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Book Heatmap - YES */}
        <Card>
          <CardHeader>
            <CardTitle>YES Order Book</CardTitle>
            <CardDescription>Bid and ask depth</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart
                data={[
                  ...orderBookHeatmap.YES.bids.map(b => ({ ...b, side: 'bid', quantity: -b.quantity })),
                  ...orderBookHeatmap.YES.asks.map(a => ({ ...a, side: 'ask' })),
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="price" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" name="Quantity">
                  {[
                    ...orderBookHeatmap.YES.bids.map((_, idx) => (
                      <Cell key={`bid-${idx}`} fill="#22c55e" />
                    )),
                    ...orderBookHeatmap.YES.asks.map((_, idx) => (
                      <Cell key={`ask-${idx}`} fill="#ef4444" />
                    )),
                  ]}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Book Heatmap - NO */}
        <Card>
          <CardHeader>
            <CardTitle>NO Order Book</CardTitle>
            <CardDescription>Bid and ask depth</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart
                data={[
                  ...orderBookHeatmap.NO.bids.map(b => ({ ...b, side: 'bid', quantity: -b.quantity })),
                  ...orderBookHeatmap.NO.asks.map(a => ({ ...a, side: 'ask' })),
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="price" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" name="Quantity">
                  {[
                    ...orderBookHeatmap.NO.bids.map((_, idx) => (
                      <Cell key={`bid-${idx}`} fill="#22c55e" />
                    )),
                    ...orderBookHeatmap.NO.asks.map((_, idx) => (
                      <Cell key={`ask-${idx}`} fill="#ef4444" />
                    )),
                  ]}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Volume Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Volume Profile</CardTitle>
          <CardDescription>Trades by price level</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volumeProfile}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="price" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="volume" fill="#8884d8" name="Volume" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Liquidity Depth */}
      <Card>
        <CardHeader>
          <CardTitle>Liquidity Depth Chart</CardTitle>
          <CardDescription>Cumulative order quantities</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={[...liquidityDepth.YES.bids.reverse(), ...liquidityDepth.YES.asks]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="price" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="stepAfter"
                dataKey="cumulative"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.3}
                name="YES Depth"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Trade Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trade Flow</CardTitle>
          <CardDescription>Last {tradeFlow.length} trades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {tradeFlow.map((trade, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${
                    trade.outcome === 'YES' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {trade.outcome}
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">${trade.price.toFixed(2)} × {trade.quantity}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-bold">
                  ${trade.value.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bid-Ask Spread Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Bid-Ask Spread Over Time</CardTitle>
          <CardDescription>Market liquidity indicator</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={spreadOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="yesSpread" stroke="#22c55e" name="YES Spread" />
              <Line type="monotone" dataKey="noSpread" stroke="#ef4444" name="NO Spread" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
