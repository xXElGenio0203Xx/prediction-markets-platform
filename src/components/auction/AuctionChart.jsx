import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';

export default function AuctionChart({ cumulativeBids, cumulativeOffers, clearingPrice }) {
  // Transform data for recharts
  const bidData = cumulativeBids.map(b => ({
    price: b.price.toFixed(2),
    bidQty: b.cumQty,
    type: 'bid'
  }));

  const offerData = cumulativeOffers.map(o => ({
    price: o.price.toFixed(2),
    offerQty: o.cumQty,
    type: 'offer'
  }));

  // Merge data for dual-axis chart
  const allPrices = [...new Set([...bidData.map(b => b.price), ...offerData.map(o => o.price)])].sort((a, b) => parseFloat(a) - parseFloat(b));
  
  const chartData = allPrices.map(price => {
    const bid = bidData.find(b => b.price === price);
    const offer = offerData.find(o => o.price === price);
    
    return {
      price: parseFloat(price),
      bidQty: bid ? bid.bidQty : bidData.filter(b => parseFloat(b.price) >= parseFloat(price)).reduce((max, b) => Math.max(max, b.bidQty), 0),
      offerQty: offer ? offer.offerQty : offerData.filter(o => parseFloat(o.price) <= parseFloat(price)).reduce((max, o) => Math.max(max, o.offerQty), 0)
    };
  });

  // Create order depth data (spread from clearing price)
  const depthData = chartData.map(d => ({
    price: d.price.toFixed(2),
    bids: d.bidQty,
    offers: d.offerQty,
    clearing: clearingPrice
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg border-2 border-amber-300 shadow-lg">
          <p className="font-bold text-gray-900">${payload[0].payload.price.toFixed(2)}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toLocaleString()} shares
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Cumulative Supply/Demand Curves */}
      <Card className="bg-white/90 backdrop-blur-sm border-2 border-amber-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Cumulative Bid/Offer Curves
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorBids" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorOffers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
              <XAxis 
                dataKey="price" 
                label={{ value: 'Price ($)', position: 'insideBottom', offset: -5 }}
                domain={[0, 1]}
              />
              <YAxis 
                label={{ value: 'Cumulative Quantity', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {clearingPrice && (
                <Line 
                  type="monotone" 
                  dataKey={() => clearingPrice} 
                  stroke="#f59e0b" 
                  strokeWidth={3} 
                  strokeDasharray="5 5"
                  name="Clearing Price"
                  dot={false}
                />
              )}
              
              <Area 
                type="stepAfter" 
                dataKey="bidQty" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorBids)" 
                name="Bids (Buy YES)"
              />
              <Area 
                type="stepBefore" 
                dataKey="offerQty" 
                stroke="#ef4444" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorOffers)" 
                name="Offers (Sell YES)"
              />
            </AreaChart>
          </ResponsiveContainer>
          
          {clearingPrice && (
            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-300 text-center">
              <p className="text-sm text-gray-700">
                <span className="font-bold text-amber-800">Indicative Clearing Price:</span> ${clearingPrice.toFixed(2)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Where cumulative supply meets demand
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Depth Chart */}
      <Card className="bg-white/90 backdrop-blur-sm border-2 border-amber-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Order Book Depth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={depthData}>
              <defs>
                <linearGradient id="colorBidDepth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorOfferDepth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
              <XAxis 
                dataKey="price" 
                label={{ value: 'Price ($)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Depth (contracts)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              <Area 
                type="monotone" 
                dataKey="bids" 
                stackId="1"
                stroke="#10b981" 
                strokeWidth={2}
                fill="url(#colorBidDepth)" 
                name="Bid Depth"
              />
              <Area 
                type="monotone" 
                dataKey="offers" 
                stackId="2"
                stroke="#ef4444" 
                strokeWidth={2}
                fill="url(#colorOfferDepth)" 
                name="Offer Depth"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}