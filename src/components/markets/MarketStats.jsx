import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Activity, Users } from "lucide-react";

export default function MarketStats({ markets }) {
  const totalVolume = markets.reduce((sum, m) => sum + (m.volume || 0), 0);
  const avgPrice = markets.reduce((sum, m) => sum + (m.current_price || 0.5), 0) / (markets.length || 1);
  const totalLiquidity = markets.reduce((sum, m) => sum + (m.liquidity || 0), 0);

  const stats = [
    {
      title: "Active Markets",
      value: markets.length.toLocaleString(),
      icon: Activity,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Total Volume",
      value: `$${totalVolume.toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Avg Market Price",
      value: `$${avgPrice.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-amber-600",
      bgColor: "bg-amber-100"
    },
    {
      title: "Total Liquidity",
      value: `$${totalLiquidity.toLocaleString()}`,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12 relative z-10">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-white/95 backdrop-blur-sm border border-amber-200 hover:shadow-xl transition-all duration-300 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}