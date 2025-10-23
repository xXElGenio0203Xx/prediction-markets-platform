import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Users, TrendingUp, Activity, Clock, DollarSign, BarChart3 } from 'lucide-react';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function PlatformMetrics() {
  const [period, setPeriod] = useState('30d');

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['platform-metrics', period],
    queryFn: () => api.getPlatformMetrics(period),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return <div className="container mx-auto py-8">Loading metrics...</div>;
  }

  if (!metrics) {
    return <div className="container mx-auto py-8">No data available</div>;
  }

  const {
    volume,
    activeUsers,
    markets,
    liquidity,
    activity,
  } = metrics;

  // Prepare data for charts
  const volumeData = [
    { name: '24H', value: volume['24h'] },
    { name: '7D', value: volume['7d'] },
    { name: '30D', value: volume['30d'] },
    { name: 'All Time', value: volume.all },
  ];

  const liquidityTierData = [
    { name: 'Low (<$100)', value: liquidity.tiers.low, color: COLORS[3] },
    { name: 'Medium ($100-1K)', value: liquidity.tiers.medium, color: COLORS[2] },
    { name: 'High (>$1K)', value: liquidity.tiers.high, color: COLORS[0] },
  ];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Metrics</h1>
          <p className="text-muted-foreground">Admin analytics and insights</p>
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${volume[period].toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All time: ${volume.all.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers.dau}</div>
            <p className="text-xs text-muted-foreground">
              DAU/MAU: {activeUsers.dauMauRatio.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Markets</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{markets.total}</div>
            <p className="text-xs text-muted-foreground">
              {markets.open} open, {markets.resolved} resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{markets.avgResolutionHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              {markets.resolutionRate.toFixed(1)}% resolution rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Volume</CardTitle>
          <CardDescription>Volume across time periods</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#22c55e" name="Volume ($)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Trading Activity</CardTitle>
            <CardDescription>Daily trades and volume</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={activity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="trades"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  name="Trades"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="volume"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.3}
                  name="Volume ($)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Liquidity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Liquidity Distribution</CardTitle>
            <CardDescription>Markets by liquidity tier</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={liquidityTierData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {liquidityTierData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* User Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Active Users Over Time</CardTitle>
          <CardDescription>Daily active user count</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={activity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="activeUsers"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Active Users"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Market Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Markets</span>
              <span className="font-bold">{markets.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Created (Period)</span>
              <span className="font-bold">{markets.created}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Resolved</span>
              <span className="font-bold">{markets.resolved}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Open</span>
              <span className="font-bold">{markets.open}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Resolution Rate</span>
              <span className="font-bold">{markets.resolutionRate.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Engagement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Daily Active Users</span>
              <span className="font-bold">{activeUsers.dau}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Monthly Active Users</span>
              <span className="font-bold">{activeUsers.mau}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">DAU/MAU Ratio</span>
              <span className="font-bold">{activeUsers.dauMauRatio.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liquidity Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Liquidity</span>
              <span className="font-bold">${liquidity.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Avg Per Market</span>
              <span className="font-bold">${liquidity.avgPerMarket.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Low Liquidity</span>
              <span className="font-bold">{liquidity.tiers.low}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Medium Liquidity</span>
              <span className="font-bold">{liquidity.tiers.medium}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">High Liquidity</span>
              <span className="font-bold">{liquidity.tiers.high}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
