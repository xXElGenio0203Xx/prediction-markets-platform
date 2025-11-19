import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function MarketChart({ priceHistory, isResolved = false }) {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl border-2 border-[#A97142]/30 shadow-lg">
          <p className="text-xs text-[#4E3629]/60 mb-1">{payload[0].payload.date}</p>
          <p className="text-lg font-bold text-[#4E3629]">${payload[0].value.toFixed(2)}</p>
          <p className="text-xs text-[#4E3629]/60">{(payload[0].value * 100).toFixed(0)}% implied</p>
        </div>
      );
    }
    return null;
  };

  // Use grayscale colors when market is resolved
  const strokeColor = isResolved ? '#666666' : '#A97142';
  const fillColor = isResolved ? '#888888' : '#A97142';
  const gridColor = isResolved ? '#999999' : '#4E3629';
  const textColor = isResolved ? '#666666' : '#4E3629';

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={priceHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={isResolved ? "colorPriceGray" : "colorPrice"} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fillColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={fillColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} strokeOpacity={0.1} />
          <XAxis 
            dataKey="date" 
            stroke={gridColor} 
            strokeOpacity={0.5}
            tick={{ fill: textColor, opacity: 0.6 }}
            fontSize={12}
          />
          <YAxis 
            domain={[0, 1]} 
            stroke={gridColor} 
            strokeOpacity={0.5}
            tick={{ fill: textColor, opacity: 0.6 }}
            fontSize={12}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={strokeColor} 
            strokeWidth={3}
            fillOpacity={1} 
            fill={`url(#${isResolved ? 'colorPriceGray' : 'colorPrice'})`} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}